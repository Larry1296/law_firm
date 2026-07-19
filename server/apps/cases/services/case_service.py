from django.db import transaction
from django.utils import timezone
from django.db.models import Count, Q

from apps.cases.models import (
    ArbitrationProceeding,
    Case,
    CaseActivity,
    CaseEvent,
    CaseParty,
    CaseTimeline,
    ConflictRecordAtRegistration,
    CourtProceeding,
    CriminalMatterDetails,
    EmploymentMatterDetails,
    InsuranceMatterDetails,
    LandMatterDetails,
    MonetaryRelief,
    NonContentiousMatterDetails,
    SuccessionMatterDetails,
    TribunalProceeding,
)
from apps.cases.services.case_lifecycle_service import CaseLifecycleService
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.notifications.services import NotificationService
from apps.staff.models import Lawyer, LawyerPermission, Secretary, SecretaryPermission


class CaseService:
    STATUS_EVENT_TYPE_MAP = {
        Case.Status.PENDING_FILING: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.FILED: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.SERVICE_PENDING: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.AWAITING_RESPONSE: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.MENTION: CaseEvent.EventType.MENTION,
        Case.Status.DIRECTIONS: CaseEvent.EventType.DIRECTIONS,
        Case.Status.PRE_TRIAL: CaseEvent.EventType.PRE_TRIAL,
        Case.Status.MEDIATION: CaseEvent.EventType.MEDIATION,
        Case.Status.HEARING: CaseEvent.EventType.HEARING,
        Case.Status.SUBMISSIONS: CaseEvent.EventType.SUBMISSIONS,
        Case.Status.AWAITING_RULING: CaseEvent.EventType.RULING,
        Case.Status.AWAITING_JUDGMENT: CaseEvent.EventType.JUDGMENT,
        Case.Status.DECREE_EXTRACTION: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.EXECUTION: CaseEvent.EventType.EXECUTION,
        Case.Status.APPEAL_WINDOW: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.NOTICE_OF_APPEAL_FILED: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.ON_APPEAL: CaseEvent.EventType.MENTION,
        Case.Status.APPEAL_DECIDED: CaseEvent.EventType.JUDGMENT,
        Case.Status.IN_PROGRESS: CaseEvent.EventType.OTHER,
        Case.Status.ON_HOLD: CaseEvent.EventType.OTHER,
    }

    @staticmethod
    def get_user_firm(user):
        if user.role == UserRole.ADMIN and hasattr(user, "owned_firm"):
            return user.owned_firm
        membership = (
            user.firm_memberships.filter(is_active=True)
            .select_related("firm")
            .first()
            if hasattr(user, "firm_memberships")
            else None
        )
        if membership:
            return membership.firm
        for profile_name in [
            "lawyer_profile",
            "secretary_profile",
            "it_profile",
            "accountant_profile",
            "hr_profile",
        ]:
            profile = getattr(user, profile_name, None)
            if profile is not None:
                return profile.law_firm
        if hasattr(user, "client_profile"):
            return user.client_profile.firm
        raise PermissionError("User is not attached to a law firm.")

    @staticmethod
    def base_queryset(user):
        firm = CaseService.get_user_firm(user)
        queryset = (
            Case.objects.filter(firm=firm)
            .select_related(
                "firm",
                "client",
                "assigned_lawyer",
                "assigned_lawyer__user",
                "assigned_secretary",
                "assigned_secretary__user",
                "created_by",
            )
            .prefetch_related(
                "timeline",
                "activities",
                "attachments",
                "events",
                "filings",
                "notes",
                "parties",
                "tasks",
            )
        )

        is_owner_admin = user.role == UserRole.ADMIN and getattr(firm, "owner_id", None) == user.id
        if is_owner_admin:
            return queryset
        if hasattr(user, "lawyer_profile"):
            queryset = queryset.filter(assigned_lawyer=user.lawyer_profile)
        elif hasattr(user, "secretary_profile"):
            queryset = queryset.filter(assigned_secretary=user.secretary_profile)
        elif hasattr(user, "client_profile"):
            queryset = queryset.filter(client=user.client_profile)
        else:
            queryset = queryset.none()

        return queryset

    @staticmethod
    def list_cases(user, *, search=None, status=None, priority=None, case_type=None):
        queryset = CaseService.base_queryset(user)

        if search:
            queryset = queryset.filter(
                Q(case_number__icontains=search)
                | Q(title__icontains=search)
                | Q(client__full_name__icontains=search)
                | Q(client__national_id__icontains=search)
                | Q(court_name__icontains=search)
            )
        if status:
            if status in Case.MatterStatus.values:
                queryset = queryset.filter(matter_status=status)
            elif status in Case.CourtStage.values:
                queryset = queryset.filter(court_stage=status)
            else:
                queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if case_type:
            queryset = queryset.filter(case_type=case_type)

        return queryset.distinct()

    @staticmethod
    def get_case(user, case_id):
        return CaseService.base_queryset(user).get(id=case_id)

    @staticmethod
    def generate_case_number(firm):
        year = timezone.now().year
        prefix = f"MAT-{year}-"
        latest = (
            Case.objects.select_for_update()
            .filter(firm=firm, case_number__startswith=prefix)
            .order_by("-case_number")
            .first()
        )
        next_number = 1
        if latest:
            try:
                next_number = int(latest.case_number.rsplit("-", 1)[1]) + 1
            except (IndexError, ValueError):
                next_number = Case.objects.filter(firm=firm, case_number__startswith=prefix).count() + 1
        return f"{prefix}{next_number:05d}"

    @staticmethod
    def resolve_lawyer(firm, lawyer_id):
        if not lawyer_id:
            return None
        return Lawyer.objects.get(id=lawyer_id, law_firm=firm, is_active=True)

    @staticmethod
    def resolve_secretary(firm, secretary_id):
        if not secretary_id:
            return None
        return Secretary.objects.get(id=secretary_id, law_firm=firm, is_active=True)

    @staticmethod
    def get_default_lawyer(firm):
        owner_lawyer = getattr(firm.owner, "lawyer_profile", None)
        if (
            owner_lawyer is not None
            and owner_lawyer.law_firm_id == firm.id
            and owner_lawyer.is_active
        ):
            return owner_lawyer
        raise PermissionError(
            "The firm owner must be registered as a lawyer before cases can be assigned."
        )

    @staticmethod
    def get_default_lawyer_for_user(firm, user):
        return CaseService.get_default_lawyer(firm)

    @staticmethod
    def get_default_secretary(firm):
        return (
            Secretary.objects.filter(law_firm=firm, is_active=True)
            .order_by("date_hired", "created_at")
            .first()
        )

    @staticmethod
    def get_case_assignments(firm, user, *, lawyer_id=None, secretary_id=None):
        is_owner_admin = user.role == UserRole.ADMIN and firm.owner_id == user.id
        if is_owner_admin:
            assigned_lawyer = (
                CaseService.resolve_lawyer(firm, lawyer_id)
                if lawyer_id
                else CaseService.get_default_lawyer_for_user(firm, user)
            )
            assigned_secretary = (
                CaseService.resolve_secretary(firm, secretary_id)
                if secretary_id
                else CaseService.get_default_secretary(firm)
            )
            return assigned_lawyer, assigned_secretary

        user_secretary = getattr(user, "secretary_profile", None)
        if user_secretary is not None and user_secretary.law_firm_id == firm.id:
            assigned_lawyer = (
                CaseService.resolve_lawyer(firm, lawyer_id)
                if lawyer_id
                else CaseService.get_default_lawyer(firm)
            )
            assigned_secretary = (
                CaseService.resolve_secretary(firm, secretary_id)
                if secretary_id
                else CaseService.get_default_secretary(firm)
            )
            return assigned_lawyer, assigned_secretary

        user_lawyer = getattr(user, "lawyer_profile", None)
        if user_lawyer is not None and user_lawyer.law_firm_id == firm.id:
            if not user_lawyer.is_active:
                raise PermissionError("Only active lawyers can create matters.")
            if not user_lawyer.has_permission(LawyerPermission.CREATE_CASES):
                raise PermissionError("Lawyer permission is required to create matters.")

            if lawyer_id and str(lawyer_id) != str(user_lawyer.id):
                if not user_lawyer.has_permission(LawyerPermission.ASSIGN_OTHER_LAWYER):
                    raise PermissionError(
                        "Lawyer permission is required to assign another responsible advocate."
                    )
                assigned_lawyer = CaseService.resolve_lawyer(firm, lawyer_id)
            else:
                assigned_lawyer = user_lawyer

            assigned_secretary = (
                CaseService.resolve_secretary(firm, secretary_id)
                if secretary_id
                else CaseService.get_default_secretary(firm)
            )
            return assigned_lawyer, assigned_secretary

        raise PermissionError("Only the firm owner, authorized secretary, or authorized lawyer can create matters.")

    @staticmethod
    def record_activity(case, *, action, description="", actor=None, metadata=None):
        CaseActivity.objects.create(
            case=case,
            action=action,
            description=description,
            actor=actor,
            metadata=metadata or {},
        )

    @staticmethod
    def default_event_type_for_status(status):
        return CaseService.STATUS_EVENT_TYPE_MAP.get(status, CaseEvent.EventType.OTHER)

    @staticmethod
    def default_event_title_for_status(case, status):
        return f"{case.get_status_display()} - {case.case_number}"

    @staticmethod
    def create_next_event_for_case(*, case, status, next_event_data, actor):
        if not next_event_data:
            return None

        from apps.events.services import EventService

        payload = {
            "case_id": case.id,
            "event_type": next_event_data.get("event_type") or CaseService.default_event_type_for_status(status),
            "title": next_event_data.get("title") or CaseService.default_event_title_for_status(case, status),
            "description": next_event_data.get("description", ""),
            "starts_at": next_event_data["starts_at"],
            "ends_at": next_event_data.get("ends_at"),
            "court_station": next_event_data.get("court_station", case.court_station),
            "courtroom": next_event_data.get("courtroom", case.courtroom),
            "judicial_officer": next_event_data.get("judicial_officer", case.judicial_officer),
            "cause_list_position": next_event_data.get("cause_list_position", ""),
            "is_client_visible": next_event_data.get("is_client_visible", True),
            "notify_participants": next_event_data.get("notify_participants", True),
        }
        event = EventService.create_event(user=actor, validated_data=payload)
        case.next_court_date = event.starts_at
        case.next_action = event.title
        case.save(update_fields=["next_court_date", "next_action", "updated_at"])
        CaseService.record_activity(
            case,
            action="Next Event Scheduled",
            description=f"{event.title} was scheduled for the case.",
            actor=actor,
            metadata={"event_id": str(event.id), "starts_at": event.starts_at.isoformat()},
        )
        return event

    @staticmethod
    def notify_case_assignments(
        case,
        *,
        actor=None,
        reassigned=False,
        lawyer=None,
        secretary=None,
        include_lawyer=True,
        include_secretary=True,
    ):
        lawyer = lawyer if lawyer is not None else case.assigned_lawyer
        secretary = secretary if secretary is not None else case.assigned_secretary

        if include_lawyer and lawyer and lawyer.user:
            NotificationService.notify_case_assignment(
                case=case,
                recipient=lawyer.user,
                role_label="lawyer",
                actor=actor,
                reassigned=reassigned,
            )

        if include_secretary and secretary and secretary.user:
            NotificationService.notify_case_assignment(
                case=case,
                recipient=secretary.user,
                role_label="secretary",
                actor=actor,
                reassigned=reassigned,
            )

    @staticmethod
    @transaction.atomic
    def create_case(*, user, validated_data):
        firm = CaseService.get_user_firm(user)
        client = Client.objects.get(
            id=validated_data.pop("client_id"),
            firm=firm,
            is_active=True,
        )
        lawyer_id = validated_data.pop("assigned_lawyer_membership_id", None)
        secretary_id = validated_data.pop("assigned_secretary_membership_id", None)
        assigned_lawyer, assigned_secretary = CaseService.get_case_assignments(
            firm,
            user,
            lawyer_id=lawyer_id,
            secretary_id=secretary_id,
        )

        parties_data = validated_data.pop("parties", [])
        court_data = validated_data.pop("court_proceeding", {}) or {}
        tribunal_data = validated_data.pop("tribunal_proceeding", {}) or {}
        arbitration_data = validated_data.pop("arbitration_proceeding", {}) or {}
        non_contentious_data = validated_data.pop("non_contentious_details", {}) or {}
        land_data = validated_data.pop("land_details", {}) or {}
        succession_data = validated_data.pop("succession_details", {}) or {}
        insurance_data = validated_data.pop("insurance_details", {}) or {}
        employment_data = validated_data.pop("employment_details", {}) or {}
        criminal_data = validated_data.pop("criminal_details", {}) or {}
        monetary_data = validated_data.pop("monetary_relief", {}) or {}
        conflict_record_data = validated_data.pop("conflict_record", {}) or {}

        plaintiff = validated_data.pop("plaintiff", "") or client.full_name
        defendant = validated_data.pop("defendant", "")
        client_party_role = validated_data.pop("client_party_role", "") or CaseParty.PartyRole.PLAINTIFF
        if client_party_role not in CaseParty.PartyRole.values:
            client_party_role = CaseParty.PartyRole.OTHER

        entry_route = validated_data.get("entry_route")
        entry_route_explicit = validated_data.pop("_entry_route_explicit", False)
        forum = validated_data.get("forum")
        has_filing_identity = bool(court_data.get("official_court_case_number") and court_data.get("filing_date"))
        court_stage = Case.CourtStage.NOT_APPLICABLE
        if forum == Case.Forum.COURT:
            court_stage = (
                Case.CourtStage.FILED
                if entry_route == Case.EntryRoute.EXISTING_FILED_COURT_CASE or has_filing_identity
                else Case.CourtStage.NOT_FILED
            )
        matter_status = (
            Case.MatterStatus.ACTIVE
            if entry_route_explicit and entry_route != Case.EntryRoute.NEW_INSTRUCTION
            else Case.MatterStatus.INSTRUCTIONS_RECEIVED
        )

        court_to_case = {
            "official_court_case_number": "official_court_case_number",
            "filing_date": "filing_date",
            "court_type": "court_type",
            "court_level": "court_level",
            "court_name": "court_name",
            "court_station": "court_station",
            "registry": "registry",
            "division": "court_division",
            "courtroom": "courtroom",
            "judicial_officer": "judicial_officer",
            "court_location": "court_location",
            "efiling_reference": "efiling_reference",
            "payment_reference": "payment_reference",
            "jurisdiction_notes": "jurisdiction_notes",
        }
        for source, target in court_to_case.items():
            if court_data.get(source) not in ("", None):
                validated_data[target] = court_data[source]

        case_number = (
            court_data.get("official_court_case_number")
            if has_filing_identity and court_data.get("official_court_case_number")
            else CaseService.generate_case_number(firm)
        )
        case_fields = {
            field.name
            for field in Case._meta.fields
            if field.name not in {"id", "firm", "client", "created_by", "case_number"}
        }
        case_payload = {key: value for key, value in validated_data.items() if key in case_fields}
        case_payload.update(
            {
                "matter_status": matter_status,
                "court_stage": court_stage,
                "assigned_lawyer": assigned_lawyer,
                "assigned_secretary": assigned_secretary,
                "plaintiff": plaintiff,
                "defendant": defendant,
            }
        )

        case = Case.objects.create(
            firm=firm,
            client=client,
            created_by=user,
            case_number=case_number,
            **case_payload,
        )

        CaseService._create_related_matter_records(
            case=case,
            client=client,
            actor=user,
            client_party_role=client_party_role,
            plaintiff=plaintiff,
            defendant=defendant,
            parties_data=parties_data,
            court_data=court_data,
            tribunal_data=tribunal_data,
            arbitration_data=arbitration_data,
            non_contentious_data=non_contentious_data,
            land_data=land_data,
            succession_data=succession_data,
            insurance_data=insurance_data,
            employment_data=employment_data,
            criminal_data=criminal_data,
            monetary_data=monetary_data,
            conflict_record_data=conflict_record_data,
        )

        if client.lifecycle_status == Client.LifecycleStatus.PROSPECT:
            client.lifecycle_status = Client.LifecycleStatus.OFFICIAL_CLIENT
            client.is_verified = True
            client.save(update_fields=["lifecycle_status", "is_verified", "updated_at"])

        elif not client.is_verified:
            client.is_verified = True
            client.save(update_fields=["is_verified", "updated_at"])


        action, timeline_title, description = CaseService.creation_event_copy(case)
        CaseService.record_activity(
            case,
            action=action,
            description=description,
            actor=user,
            metadata={
                "client_id": str(client.id),
                "internal_case_number": case.case_number,
                "internal_number_source": "official_court_case_number" if case.entry_route == Case.EntryRoute.EXISTING_FILED_COURT_CASE else "generated",
                "entry_route": case.entry_route,
                "forum": case.forum,
                "official_court_case_number": case.official_court_case_number,
                "filing_date": case.filing_date.isoformat() if case.filing_date else None,
                "efiling_reference": case.efiling_reference,
            },
        )
        CaseLifecycleService.record_initial_case_opening(case, user)
        CaseTimeline.objects.create(
            case=case,
            action=timeline_title,
            description=description,
            created_by=user,
        )
        try:
            conflict_record = case.conflict_record
        except ConflictRecordAtRegistration.DoesNotExist:
            conflict_record = None
        if conflict_record and conflict_record.status == ConflictRecordAtRegistration.Status.REQUIRES_VERIFICATION:
            CaseService.record_activity(
                case,
                action="CONFLICT_RECORD_VERIFICATION_REQUIRED",
                description="Conflict-check position requires verification for this matter.",
                actor=user,
                metadata={"source": "matter_registration", "entry_route": case.entry_route},
            )
        CaseService.notify_case_assignments(case, actor=user)

        return case

    @staticmethod
    def _payload_for_model(model, data, aliases=None):
        aliases = aliases or {}
        normalized = {}
        for key, value in (data or {}).items():
            normalized[aliases.get(key, key)] = value
        field_names = {
            field.name
            for field in model._meta.fields
            if field.name not in {"id", "matter", "created_at", "updated_at"}
        }
        return {
            key: value
            for key, value in normalized.items()
            if key in field_names and value not in ("", None)
        }

    @staticmethod
    def _create_related_matter_records(
        *,
        case,
        client,
        actor,
        client_party_role,
        plaintiff,
        defendant,
        parties_data,
        court_data,
        tribunal_data,
        arbitration_data,
        non_contentious_data,
        land_data,
        succession_data,
        insurance_data,
        employment_data,
        criminal_data,
        monetary_data,
        conflict_record_data,
    ):
        CaseService._create_case_parties(
            case=case,
            client=client,
            client_party_role=client_party_role,
            plaintiff=plaintiff,
            defendant=defendant,
            parties_data=parties_data,
        )

        if case.forum == Case.Forum.COURT or court_data:
            court_payload = CaseService._payload_for_model(
                CourtProceeding,
                {
                    **court_data,
                    "court_stage": case.court_stage,
                    "division": court_data.get("division") or case.court_division,
                    "official_court_case_number": court_data.get("official_court_case_number") or case.official_court_case_number,
                    "filing_date": court_data.get("filing_date") or case.filing_date,
                    "court_type": court_data.get("court_type") or case.court_type,
                    "court_name": court_data.get("court_name") or case.court_name,
                    "court_station": court_data.get("court_station") or case.court_station,
                    "registry": court_data.get("registry") or case.registry,
                    "efiling_reference": court_data.get("efiling_reference") or case.efiling_reference,
                    "payment_reference": court_data.get("payment_reference") or case.payment_reference,
                    "jurisdiction_notes": court_data.get("jurisdiction_notes") or case.jurisdiction_notes,
                },
            )
            CourtProceeding.objects.create(matter=case, **court_payload)

        if tribunal_data:
            TribunalProceeding.objects.create(
                matter=case,
                **CaseService._payload_for_model(TribunalProceeding, tribunal_data),
            )
        if arbitration_data:
            ArbitrationProceeding.objects.create(
                matter=case,
                **CaseService._payload_for_model(
                    ArbitrationProceeding,
                    arbitration_data,
                    aliases={"arbitration_institution": "institution", "arbitration_seat": "seat", "arbitration_rules": "rules"},
                ),
            )
        if non_contentious_data:
            NonContentiousMatterDetails.objects.create(
                matter=case,
                **CaseService._payload_for_model(NonContentiousMatterDetails, non_contentious_data),
            )
        if land_data:
            LandMatterDetails.objects.create(
                matter=case,
                **CaseService._payload_for_model(
                    LandMatterDetails,
                    land_data,
                    aliases={"property_county": "county", "property_value": "estimated_property_value"},
                ),
            )
        if succession_data:
            SuccessionMatterDetails.objects.create(
                matter=case,
                **CaseService._payload_for_model(
                    SuccessionMatterDetails,
                    succession_data,
                    aliases={
                        "estate_value": "estimated_gross_estate_value",
                        "gross_estate_value": "estimated_gross_estate_value",
                        "liabilities": "known_liabilities",
                        "net_estate_value": "estimated_net_estate_value",
                    },
                ),
            )
        if insurance_data:
            InsuranceMatterDetails.objects.create(
                matter=case,
                **CaseService._payload_for_model(
                    InsuranceMatterDetails,
                    insurance_data,
                    aliases={"insurance_claim_number": "claim_number"},
                ),
            )
        if employment_data:
            EmploymentMatterDetails.objects.create(
                matter=case,
                **CaseService._payload_for_model(EmploymentMatterDetails, employment_data),
            )
        if criminal_data:
            CriminalMatterDetails.objects.create(
                matter=case,
                **CaseService._payload_for_model(
                    CriminalMatterDetails,
                    criminal_data,
                    aliases={"bond_bail_status": "bond_bail_status"},
                ),
            )

        if monetary_data or case.claim_amount is not None:
            payload = CaseService._payload_for_model(
                MonetaryRelief,
                monetary_data,
                aliases={
                    "monetary_relief_type": "relief_type",
                    "claim_amount": "principal_amount",
                    "amount_paid": "amount_already_paid",
                },
            )
            if case.claim_amount is not None and "principal_amount" not in payload:
                payload["principal_amount"] = case.claim_amount
            if "currency" not in payload:
                payload["currency"] = case.currency or "KES"
            MonetaryRelief.objects.create(matter=case, **payload)

        conflict_status = conflict_record_data.get("status") or conflict_record_data.get("conflict_record_status") or "REQUIRES_VERIFICATION"
        ConflictRecordAtRegistration.objects.create(
            matter=case,
            status=conflict_status,
            effective_date=conflict_record_data.get("effective_date"),
            result_summary=conflict_record_data.get("result_summary", ""),
            reason=conflict_record_data.get("reason", ""),
            notes=conflict_record_data.get("notes", ""),
            recorded_by=actor,
            recorded_at=timezone.now(),
        )

    @staticmethod
    def _create_case_parties(*, case, client, client_party_role, plaintiff, defendant, parties_data):
        CaseParty.objects.create(
            case=case,
            client=client,
            name=plaintiff,
            individual_name=plaintiff if client.client_type == Client.ClientType.INDIVIDUAL else "",
            organization_name="" if client.client_type == Client.ClientType.INDIVIDUAL else plaintiff,
            party_role=client_party_role,
            party_type=CaseParty.PartyType.INDIVIDUAL
            if client.client_type == Client.ClientType.INDIVIDUAL
            else CaseParty.PartyType.COMPANY,
            is_our_client=True,
            is_adverse=False,
            party_order=1,
            phone_number=client.phone_number or "",
            email=client.email or "",
            national_id=client.national_id or "",
            kra_pin=client.kra_pin or "",
        )
        seen_names = {plaintiff.strip().lower()}
        order = 2
        for raw_party in parties_data or []:
            name = (
                raw_party.get("name")
                or raw_party.get("individual_name")
                or raw_party.get("organization_name")
                or ""
            ).strip()
            if not name or name.lower() in seen_names:
                continue
            seen_names.add(name.lower())
            party_type = raw_party.get("party_type") or CaseParty.PartyType.OTHER
            if party_type not in CaseParty.PartyType.values:
                party_type = CaseParty.PartyType.OTHER
            role = raw_party.get("role") or raw_party.get("party_role") or CaseParty.PartyRole.OTHER
            if role not in CaseParty.PartyRole.values:
                role = CaseParty.PartyRole.OTHER
            CaseParty.objects.create(
                case=case,
                name=name,
                individual_name=raw_party.get("individual_name", ""),
                organization_name=raw_party.get("organization_name", ""),
                party_role=role,
                party_type=party_type,
                is_our_client=bool(raw_party.get("is_client", False)),
                is_adverse=bool(raw_party.get("is_adverse", False)),
                party_order=raw_party.get("display_order") or order,
                identifier=raw_party.get("identifier", ""),
                email=raw_party.get("email", ""),
                phone_number=raw_party.get("phone", "") or raw_party.get("phone_number", ""),
                address=raw_party.get("address", ""),
                representation_status=raw_party.get("representation_status", ""),
                advocate_on_record=raw_party.get("advocate_name", ""),
                law_firm=raw_party.get("advocate_firm", ""),
                notes=raw_party.get("notes", ""),
            )
            order += 1

        if defendant and defendant.strip().lower() not in seen_names:
            CaseParty.objects.create(
                case=case,
                name=defendant.strip(),
                organization_name=defendant.strip(),
                party_role=CaseParty.PartyRole.DEFENDANT,
                party_type=CaseParty.PartyType.OTHER,
                is_adverse=True,
                party_order=order,
            )

    @staticmethod
    def creation_event_copy(case):
        actor_name = case.created_by.full_name if case.created_by else "an authorized user"
        if case.entry_route == Case.EntryRoute.NEW_INSTRUCTION and case.court_stage != Case.CourtStage.FILED:
            return (
                "MATTER_OPENED",
                "Matter Opened",
                f"A new client instruction was opened in Sheria Master as {case.case_number} by {actor_name}.",
            )
        if case.entry_route == Case.EntryRoute.EXISTING_TRIBUNAL_MATTER:
            return (
                "TRIBUNAL_MATTER_REGISTERED",
                "Tribunal Matter Registered",
                f"The tribunal matter was registered in Sheria Master as {case.case_number} by {actor_name}.",
            )
        if case.entry_route == Case.EntryRoute.EXISTING_ARBITRATION:
            return (
                "ARBITRATION_REGISTERED",
                "Arbitration Registered",
                f"The arbitration was registered in Sheria Master as {case.case_number} by {actor_name}.",
            )
        if case.entry_route == Case.EntryRoute.NON_CONTENTIOUS_MATTER:
            return (
                "NON_CONTENTIOUS_MATTER_REGISTERED",
                "Non-Contentious Matter Registered",
                f"The non-contentious matter was registered in Sheria Master as {case.case_number} by {actor_name}.",
            )
        return (
            "FILED_CASE_REGISTERED",
            "Filed Case Registered",
            f"{case.official_court_case_number} was registered in Sheria Master as {case.case_number} by {actor_name}.",
        )

    @staticmethod
    @transaction.atomic
    def update_case(*, case, validated_data, actor):
        next_event_data = validated_data.pop("next_event", None)
        if "priority" in validated_data:
            is_owner_admin = (
                actor.role == UserRole.ADMIN
                and case.firm.owner_id == actor.id
            )
            if not is_owner_admin:
                raise PermissionError("Only the firm owner can update case priority.")

        for field, value in validated_data.items():
            setattr(case, field, value)
        case.save()
        CaseService.record_activity(
            case,
            action="Case Updated",
            description="Case details were updated.",
            actor=actor,
            metadata={"updated_fields": list(validated_data.keys())},
        )
        if next_event_data:
            CaseService.create_next_event_for_case(
                case=case,
                status=case.status,
                next_event_data=next_event_data,
                actor=actor,
            )
        return case

    @staticmethod
    @transaction.atomic
    def change_status(*, case, status, actor, note="", next_event=None):
        is_owner_admin = actor.role == UserRole.ADMIN and case.firm.owner_id == actor.id
        is_assigned_lawyer = (
            getattr(actor, "lawyer_profile", None) is not None
            and case.assigned_lawyer_id == actor.lawyer_profile.id
        )
        if not (is_owner_admin or is_assigned_lawyer):
            raise PermissionError("Only the firm owner or assigned lawyer can update case status.")

        case.status = status
        case.is_active = status not in Case.Status.inactive_statuses()
        update_fields = ["status", "is_active", "updated_at"]
        case.save(update_fields=update_fields)
        CaseService.record_activity(
            case,
            action="Status Changed",
            description=note or f"Case status changed to {status}.",
            actor=actor,
            metadata={"status": status},
        )
        CaseService.create_next_event_for_case(
            case=case,
            status=status,
            next_event_data=next_event,
            actor=actor,
        )
        NotificationService.notify_case_status_update(
            case=case,
            status=status,
            actor=actor,
            note=note,
        )
        return case

    @staticmethod
    @transaction.atomic
    def reassign_lawyer(*, case, lawyer_id, actor):
        assigned_lawyer = CaseService.resolve_lawyer(case.firm, lawyer_id)
        case.assigned_lawyer = assigned_lawyer
        case.save(update_fields=["assigned_lawyer", "updated_at"])
        CaseService.record_activity(
            case,
            action="Lawyer Reassigned",
            description="Assigned lawyer was updated.",
            actor=actor,
            metadata={"lawyer_id": str(lawyer_id)},
        )
        CaseService.notify_case_assignments(
            case,
            actor=actor,
            reassigned=True,
            lawyer=assigned_lawyer,
            include_secretary=False,
        )
        return case

    @staticmethod
    @transaction.atomic
    def reassign_secretary(*, case, secretary_id, actor):
        assigned_secretary = CaseService.resolve_secretary(case.firm, secretary_id)
        case.assigned_secretary = assigned_secretary
        case.save(update_fields=["assigned_secretary", "updated_at"])
        CaseService.record_activity(
            case,
            action="Secretary Reassigned",
            description="Assigned secretary was updated.",
            actor=actor,
            metadata={"secretary_id": str(secretary_id)},
        )
        CaseService.notify_case_assignments(
            case,
            actor=actor,
            reassigned=True,
            secretary=assigned_secretary,
            include_lawyer=False,
        )
        return case

    @staticmethod
    def summary(queryset):
        matter_counts = {
            row["matter_status"]: row["count"]
            for row in queryset.values("matter_status").annotate(count=Count("id"))
        }
        priority_counts = {
            row["priority"]: row["count"]
            for row in queryset.values("priority").annotate(count=Count("id"))
        }
        return {
            "total_cases": queryset.count(),
            "active_cases": queryset.filter(is_active=True).count(),
            "pending_cases": (
                matter_counts.get(Case.MatterStatus.INSTRUCTIONS_RECEIVED, 0)
                + matter_counts.get(Case.MatterStatus.CONFLICT_CHECK_PENDING, 0)
                + matter_counts.get(Case.MatterStatus.ENGAGEMENT_PENDING, 0)
            ),
            "closed_cases": (
                matter_counts.get(Case.MatterStatus.CLOSED, 0)
                + matter_counts.get(Case.MatterStatus.ARCHIVED, 0)
                + matter_counts.get(Case.MatterStatus.CANCELLED, 0)
            ),
            "urgent_cases": priority_counts.get(Case.Priority.URGENT, 0),
        }
