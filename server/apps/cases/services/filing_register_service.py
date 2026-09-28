from datetime import datetime, time, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.cases.models import Case, CaseActivity, CaseFiling, MatterDeadline
from apps.common.choices import UserRole


class FilingRegisterService:
    """Records papers issued, filed and served outside the system.

    Filing into the Judiciary e-filing system, service by a process server and
    the other side's response all happen in the real world. The register holds
    the facts and references, and the deadlines that follow from them under the
    Civil Procedure Rules, 2010, are calculated from the recorded dates.
    """

    DEMAND_PERIODS = {7, 14, 21}
    # Summons require appearance within the period they state; 15 days is the ordinary period.
    APPEARANCE_DAYS = 15
    # Order 7 rule 1: defence within 14 days after appearance.
    DEFENCE_DAYS = 14

    ORIGINATING_TYPES = {CaseFiling.FilingType.PLAINT, CaseFiling.FilingType.ORIGINATING_CLAIM}

    # Section 79G Civil Procedure Act: 30 days to appeal a subordinate court's decree to the High Court.
    SUBORDINATE_CIVIL_APPEAL_DAYS = 30
    # Section 349 Criminal Procedure Code; Rule 77(2) Court of Appeal Rules, 2022; Rule 36 Supreme Court Rules, 2020.
    NOTICE_OF_APPEAL_DAYS = 14
    # Rule 84 Court of Appeal Rules, 2022: record of appeal within 60 days of the notice of appeal.
    RECORD_OF_APPEAL_DAYS = 60
    SUBORDINATE_COURTS = {Case.CourtType.MAGISTRATE, Case.CourtType.SMALL_CLAIMS, Case.CourtType.KADHI}
    SUPERIOR_COURTS = {
        Case.CourtType.HIGH_COURT, Case.CourtType.ENVIRONMENT_LAND,
        Case.CourtType.EMPLOYMENT_LABOUR, Case.CourtType.COURT_OF_APPEAL,
    }

    @staticmethod
    def can_record(user, case):
        if user.role == UserRole.ADMIN and case.firm.owner_id == user.id:
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer is not None and lawyer.is_active and case.assigned_lawyer_id == lawyer.id:
            return True
        secretary = getattr(user, "secretary_profile", None)
        return bool(
            secretary is not None
            and secretary.is_active
            and secretary.law_firm_id == case.firm_id
            and (
                case.assigned_secretary_id == secretary.id
                or secretary.assigned_lawyers.filter(id=case.assigned_lawyer_id).exists()
            )
        )

    @classmethod
    @transaction.atomic
    def record(cls, *, user, case, data):
        if not cls.can_record(user, case):
            raise PermissionDenied("Only the assigned advocate, the matter secretary or the firm owner can update the filing register.")
        if case.matter_status in {Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED, Case.MatterStatus.CANCELLED}:
            raise ValidationError({"case": "Closed matters cannot receive new filing-register entries."})

        filing_type = data["filing_type"]
        if filing_type in cls.ORIGINATING_TYPES:
            raise ValidationError({"filing_type": "Record the plaint by moving the matter to Filed, which captures the court number and fees."})
        filed_at = data.get("filed_at") or timezone.now()
        served_at = data.get("served_at")
        response_due_date = None
        if filing_type == CaseFiling.FilingType.DEMAND_LETTER:
            period = data.get("response_period_days")
            if period not in cls.DEMAND_PERIODS:
                raise ValidationError({"response_period_days": "Choose a demand period of 7, 14 or 21 days."})
            response_due_date = timezone.localdate(filed_at) + timedelta(days=period)
        if filing_type in {CaseFiling.FilingType.SUMMONS, CaseFiling.FilingType.AFFIDAVIT_OF_SERVICE} and not served_at:
            raise ValidationError({"served_at": "Record the date the summons was served; the appearance period runs from service."})

        status = CaseFiling.FilingStatus.SERVED if served_at or filing_type == CaseFiling.FilingType.DEMAND_LETTER else CaseFiling.FilingStatus.FILED
        filing = CaseFiling.objects.create(
            case=case,
            filing_type=filing_type,
            status=status,
            title=(data.get("title") or CaseFiling.FilingType(filing_type).label).strip(),
            description=(data.get("description") or "").strip(),
            filed_at=filed_at,
            served_at=served_at,
            response_due_date=response_due_date,
            official_court_case_number=case.official_court_case_number,
            efiling_reference=(data.get("efiling_reference") or "").strip(),
            court_fee_amount=data.get("court_fee_amount"),
            payment_reference=(data.get("payment_reference") or "").strip(),
            payment_date=data.get("payment_date"),
            receipt_number=(data.get("receipt_number") or "").strip(),
            source="FILING_REGISTER",
            filed_by=user,
            is_client_visible=data.get("is_client_visible", True),
        )
        cls._seed_deadlines(case, filing, user)
        CaseActivity.objects.create(
            case=case,
            action="FILING_REGISTER_ENTRY",
            description=f"{filing.get_filing_type_display()}: {filing.title}",
            actor=user,
            metadata={"filing_id": str(filing.id), "filing_type": filing_type},
        )
        from apps.cases.services.proceedings_workflow_service import ProceedingsWorkflowService

        ProceedingsWorkflowService._resync_next_action(case, actor=user)
        return filing

    @classmethod
    @transaction.atomic
    def record_originating_filing(cls, *, case, actor):
        """Called when the matter moves to Filed: keep the register and court record in step."""
        case.refresh_from_db()
        filed_at = timezone.make_aware(datetime.combine(case.filing_date, time(9, 0))) if case.filing_date else timezone.now()
        if not case.filings.filter(filing_type__in=cls.ORIGINATING_TYPES).exclude(status=CaseFiling.FilingStatus.WITHDRAWN).exists():
            CaseFiling.objects.create(
                case=case,
                filing_type=CaseFiling.FilingType.PLAINT,
                status=CaseFiling.FilingStatus.FILED,
                title="Plaint",
                filed_at=filed_at,
                official_court_case_number=case.official_court_case_number,
                efiling_reference=case.efiling_reference,
                assessment_reference=case.assessment_reference,
                court_fee_amount=case.court_fee_amount,
                payment_reference=case.payment_reference,
                payment_date=case.payment_date,
                source="COURT_STAGE_FILED",
                filed_by=actor,
            )
        MatterDeadline.objects.filter(
            matter=case, source__startswith="FILING:", source__endswith=":DEMAND_EXPIRY", status=MatterDeadline.Status.OPEN,
        ).update(status=MatterDeadline.Status.COMPLETED, completed_by=actor, completed_at=timezone.now())
        proceeding = getattr(case, "court_proceeding", None)
        if proceeding is not None:
            for field in [
                "official_court_case_number", "filing_date", "efiling_reference", "assessment_reference",
                "court_fee_amount", "payment_reference", "payment_date", "court_station", "registry", "court_name",
            ]:
                value = getattr(case, field, None)
                if value not in (None, ""):
                    setattr(proceeding, field, value)
            proceeding.save()

    @classmethod
    def _seed_deadlines(cls, case, filing, user):
        if filing.filing_type == CaseFiling.FilingType.DEMAND_LETTER:
            cls._deadline(
                case, user, key=f"FILING:{filing.id}:DEMAND_EXPIRY",
                due=filing.response_due_date, deadline_type=MatterDeadline.Type.RESPONSE, priority="HIGH",
                description="Demand period expires. If unpaid, prepare the plaint for advocate review.",
            )
        elif filing.filing_type in {CaseFiling.FilingType.SUMMONS, CaseFiling.FilingType.AFFIDAVIT_OF_SERVICE} and filing.served_at:
            cls._deadline(
                case, user, key=f"APPEARANCE:{case.id}",
                due=timezone.localdate(filing.served_at) + timedelta(days=cls.APPEARANCE_DAYS),
                deadline_type=MatterDeadline.Type.RESPONSE, priority="HIGH",
                description="Entry of appearance due (15 days from service of summons).",
            )
        elif filing.filing_type == CaseFiling.FilingType.MEMORANDUM_OF_APPEARANCE:
            cls._complete(case, user, key=f"APPEARANCE:{case.id}")
            cls._deadline(
                case, user, key=f"DEFENCE:{case.id}",
                due=timezone.localdate(filing.filed_at) + timedelta(days=cls.DEFENCE_DAYS),
                deadline_type=MatterDeadline.Type.RESPONSE, priority="HIGH",
                description="Defence due (Order 7 rule 1: 14 days after appearance).",
            )
        elif filing.filing_type == CaseFiling.FilingType.DEFENCE:
            cls._complete(case, user, key=f"APPEARANCE:{case.id}")
            cls._complete(case, user, key=f"DEFENCE:{case.id}")
        elif filing.filing_type == CaseFiling.FilingType.JUDGMENT:
            appeal = cls.appeal_window(case)
            if appeal:
                days, description = appeal
                delivered = timezone.localdate(filing.filed_at) if filing.filed_at else timezone.localdate()
                cls._deadline(
                    case, user, key=f"APPEAL_WINDOW:{filing.id}",
                    due=delivered + timedelta(days=days),
                    deadline_type=MatterDeadline.Type.APPEAL_REVIEW, priority="HIGH",
                    description=description,
                )
        elif filing.filing_type in {CaseFiling.FilingType.NOTICE_OF_APPEAL, CaseFiling.FilingType.MEMORANDUM_OF_APPEAL}:
            MatterDeadline.objects.filter(
                matter=case, source__startswith="APPEAL_WINDOW:", status=MatterDeadline.Status.OPEN,
            ).update(status=MatterDeadline.Status.COMPLETED, completed_by=user, completed_at=timezone.now())
            if filing.filing_type == CaseFiling.FilingType.NOTICE_OF_APPEAL and case.court_type in cls.SUPERIOR_COURTS - {Case.CourtType.COURT_OF_APPEAL}:
                lodged = timezone.localdate(filing.filed_at) if filing.filed_at else timezone.localdate()
                cls._deadline(
                    case, user, key=f"RECORD_OF_APPEAL:{case.id}",
                    due=lodged + timedelta(days=cls.RECORD_OF_APPEAL_DAYS),
                    deadline_type=MatterDeadline.Type.APPEAL_REVIEW, priority="HIGH",
                    description=(
                        "Record of appeal due (Rule 84, Court of Appeal Rules, 2022: 60 days from the notice "
                        "of appeal, excluding time certified by the registry for typed proceedings)."
                    ),
                )
        elif filing.filing_type == CaseFiling.FilingType.RECORD_OF_APPEAL:
            cls._complete(case, user, key=f"RECORD_OF_APPEAL:{case.id}")

    @classmethod
    def appeal_window(cls, case):
        """Days to appeal and a description, or None where the governing statute must be checked."""
        is_criminal = case.case_type == Case.CaseType.CRIMINAL or case.court_division == Case.CourtDivision.CRIMINAL
        if is_criminal and case.court_type in cls.SUBORDINATE_COURTS | cls.SUPERIOR_COURTS:
            return cls.NOTICE_OF_APPEAL_DAYS, (
                "Criminal appeal period closes (14 days from judgment or sentence). Take the client's "
                "instructions on appeal; late appeals need leave."
            )
        if case.court_type in cls.SUBORDINATE_COURTS:
            return cls.SUBORDINATE_CIVIL_APPEAL_DAYS, (
                "Appeal period to the High Court closes (section 79G, Civil Procedure Act: 30 days from the "
                "decree). Take the client's instructions on appeal, or on execution once it lapses."
            )
        if case.court_type == Case.CourtType.COURT_OF_APPEAL:
            return cls.NOTICE_OF_APPEAL_DAYS, (
                "Notice of appeal to the Supreme Court due (Rule 36, Supreme Court Rules, 2020: 14 days). "
                "Confirm the appeal lies as of right or certification is obtained."
            )
        if case.court_type in cls.SUPERIOR_COURTS:
            return cls.NOTICE_OF_APPEAL_DAYS, (
                "Notice of appeal to the Court of Appeal due (Rule 77(2), Court of Appeal Rules, 2022: "
                "14 days from the decision). Request typed proceedings at the same time."
            )
        return None

    @staticmethod
    def _deadline(case, user, *, key, due, deadline_type, priority, description):
        if MatterDeadline.objects.filter(matter=case, source=key).exists():
            return
        MatterDeadline.objects.create(
            firm=case.firm,
            matter=case,
            deadline_type=deadline_type,
            due_at=timezone.make_aware(datetime.combine(due, time(17, 0))),
            responsible_staff=case.assigned_lawyer.user if case.assigned_lawyer_id else user,
            priority=priority,
            source=key,
            description=description,
            created_by=user,
        )

    @staticmethod
    def _complete(case, user, *, key):
        MatterDeadline.objects.filter(matter=case, source=key, status=MatterDeadline.Status.OPEN).update(
            status=MatterDeadline.Status.COMPLETED, completed_by=user, completed_at=timezone.now(),
        )

    @staticmethod
    def latest(case, filing_type):
        return (
            case.filings.filter(filing_type=filing_type)
            .exclude(status__in=[CaseFiling.FilingStatus.WITHDRAWN, CaseFiling.FilingStatus.REJECTED])
            .order_by("-filed_at", "-created_at")
            .first()
        )

    @classmethod
    def pre_filing_recommendation(cls, case):
        """Debt recovery starts with a demand; the plaint follows only once the period lapses."""
        if case.case_type != Case.CaseType.DEBT_RECOVERY:
            return None
        demand = cls.latest(case, CaseFiling.FilingType.DEMAND_LETTER)
        if demand is None:
            return "Issue demand letter"
        if demand.response_due_date and timezone.localdate() <= demand.response_due_date:
            return f"Await demand response (due {demand.response_due_date:%d %b %Y})"
        return None

    @classmethod
    def service_recommendation(cls, case):
        if case.court_stage in {Case.CourtStage.FILED, Case.CourtStage.AWAITING_ASSESSMENT_OR_PAYMENT, Case.CourtStage.AWAITING_SERVICE, Case.CourtStage.SERVICE_IN_PROGRESS}:
            if not case.filings.filter(Q(filing_type=CaseFiling.FilingType.SUMMONS) | Q(filing_type=CaseFiling.FilingType.AFFIDAVIT_OF_SERVICE), served_at__isnull=False).exists():
                return "Serve summons and plaint"
        if case.court_stage == Case.CourtStage.AWAITING_RESPONSE:
            if cls.latest(case, CaseFiling.FilingType.DEFENCE):
                return None
            appearance = MatterDeadline.objects.filter(matter=case, source=f"APPEARANCE:{case.id}").first()
            defence = MatterDeadline.objects.filter(matter=case, source=f"DEFENCE:{case.id}").first()
            for deadline in (defence, appearance):
                if deadline and deadline.status == MatterDeadline.Status.OPEN:
                    if deadline.due_at < timezone.now():
                        return "Review default judgment (Order 10) for advocate decision"
                    return f"{deadline.description.split(' (')[0]} by {timezone.localtime(deadline.due_at):%d %b %Y}"
        return None
