from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import (
    Case, DeadlineChangeHistory, LegalAssessment, MatterDeadline, MatterWorkstream,
)
from apps.cases.services.matter_governance_service import GovernanceAccess
from apps.staff.models import LawyerPermission


class MatterOperationsService:
    STAGES = {
        "LITIGATION": ["PRE_ACTION", "NOTICE", "DRAFTING", "FILING", "REGISTRY_ACCEPTANCE", "SERVICE", "PLEADINGS", "INTERIM_APPLICATIONS", "CASE_MANAGEMENT", "PRE_TRIAL", "HEARING", "SUBMISSIONS", "JUDGMENT", "DECREE", "APPEAL_REVIEW", "ENFORCEMENT", "SETTLEMENT", "CONCLUSION"],
        "TRANSACTIONAL": ["INITIAL_INSTRUCTIONS", "IDENTITY_AUTHORITY", "DUE_DILIGENCE", "SEARCHES", "CONDITIONS_PRECEDENT", "RISK_REPORT", "DRAFTING", "NEGOTIATION", "EXECUTION", "STAKEHOLDER_FUNDS", "CONSENTS_CLEARANCES", "VALUATION", "TAX_STAMP_DUTY", "REGISTRATION", "COMPLETION", "EXCHANGE", "POST_COMPLETION", "ORIGINALS_DELIVERY", "COMPLETION_STATEMENT", "FINAL_REPORT"],
        "CRIMINAL": ["POLICE_STATION", "ARREST_CUSTODY", "CHARGE_SHEET", "PLEA", "BAIL_BOND", "MENTIONS", "DISCLOSURE_EVIDENCE", "TRIAL", "SUBMISSIONS", "JUDGMENT", "MITIGATION", "SENTENCE", "APPEAL", "REVISION", "POST_CONVICTION"],
        "PROBATE": ["DECEASED_DETAILS", "HEIRS_BENEFICIARIES", "ASSETS_LIABILITIES", "AUTHORITY", "PETITION", "GAZETTE", "GRANT", "CONFIRMATION", "DISTRIBUTION", "TRANSMISSION", "ACCOUNTS", "COMPLETION"],
        "FAMILY": ["INTERIM_PROTECTION", "CUSTODY", "MAINTENANCE", "MATRIMONIAL_PROPERTY", "NEGOTIATION", "MEDIATION", "HEARING", "ORDERS", "IMPLEMENTATION"],
        "EMPLOYMENT": ["DISCIPLINARY_REVIEW", "DEMAND_RESPONSE", "CONCILIATION", "CLAIM_DEFENCE", "HEARING", "JUDGMENT", "ENFORCEMENT"],
        "TRIBUNAL": ["PRE_ACTION", "FILING", "SERVICE", "DIRECTIONS", "HEARING", "DECISION", "APPEAL_REVIEW", "ENFORCEMENT", "CONCLUSION"],
        "ADR": ["AGREEMENT_TO_MEDIATE_ARBITRATE", "APPOINTMENT", "PRELIMINARY_MEETING", "PLEADINGS", "EVIDENCE", "HEARING_SESSION", "SETTLEMENT_AWARD", "ENFORCEMENT", "CONCLUSION"],
        "REGULATORY": ["INSTRUCTIONS", "REGULATORY_REVIEW", "REPRESENTATIONS", "HEARING", "DECISION", "REVIEW_APPEAL", "COMPLIANCE", "CONCLUSION"],
        "ADVISORY": ["INSTRUCTIONS", "RESEARCH", "DRAFT_ADVICE", "ADVOCATE_REVIEW", "CLIENT_ADVICE", "FOLLOW_UP", "CONCLUSION"],
    }

    @classmethod
    @transaction.atomic
    def assess(cls, *, user, matter_id, data):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.COMPLETE_LEGAL_ASSESSMENT)
        matter = Case.objects.select_for_update().get(id=matter_id, firm=firm)
        advocate = data["advocate"]
        if advocate.law_firm_id != firm.id:
            raise ValidationError({"advocate": "Advocate belongs to another firm."})
        if data.get("preliminary_generated_suggestions") and not data.get("suggestions_confirmed_by_advocate"):
            raise ValidationError({"suggestions": "Generated suggestions are preliminary and require advocate confirmation."})
        current = matter.legal_assessments.filter(is_current=True).first()
        version = matter.legal_assessments.count() + 1
        if current:
            current.is_current = False
            current.save(update_fields=["is_current", "updated_at"])
        return LegalAssessment.objects.create(firm=firm, matter=matter, version=version, **data)

    @classmethod
    @transaction.atomic
    def set_workstream(cls, *, user, matter_id, workstream_type, stage, stage_data):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.MANAGE_ASSIGNED_CASES)
        matter = Case.objects.select_for_update().get(id=matter_id, firm=firm)
        if stage not in cls.STAGES.get(workstream_type, []):
            raise ValidationError({"current_stage": "Stage is invalid for the selected workstream."})
        record = MatterWorkstream.objects.select_for_update().filter(matter=matter).first()
        history = list(record.stage_history) if record else []
        if record:
            history.append({"stage": record.current_stage, "changed_at": timezone.now().isoformat(), "actor": str(user.id)})
            record.workstream_type, record.current_stage, record.stage_data = workstream_type, stage, stage_data
            record.stage_history, record.updated_by = history, user
            record.save()
            return record
        return MatterWorkstream.objects.create(
            firm=firm, matter=matter, workstream_type=workstream_type, current_stage=stage,
            stage_data=stage_data, stage_history=[], updated_by=user,
        )

    @classmethod
    @transaction.atomic
    def create_deadline(cls, *, user, matter_id, data):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.MANAGE_ASSIGNED_CASES)
        matter = Case.objects.get(id=matter_id, firm=firm)
        if data["responsible_staff"].id != user.id and data["responsible_staff"].role == "OFFICIAL_CLIENT":
            raise ValidationError({"responsible_staff": "A client cannot own an internal deadline."})
        return MatterDeadline.objects.create(firm=firm, matter=matter, created_by=user, **data)

    @classmethod
    @transaction.atomic
    def change_deadline(cls, *, user, deadline_id, new_due_at, reason):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.MANAGE_ASSIGNED_CASES)
        if not reason.strip():
            raise ValidationError({"reason": "A reason is required when changing a critical date."})
        deadline = MatterDeadline.objects.select_for_update().get(id=deadline_id, firm=firm)
        DeadlineChangeHistory.objects.create(
            deadline=deadline, previous_due_at=deadline.due_at, new_due_at=new_due_at,
            reason=reason, actor=user,
        )
        deadline.due_at = new_due_at
        deadline.save(update_fields=["due_at", "updated_at"])
        return deadline
