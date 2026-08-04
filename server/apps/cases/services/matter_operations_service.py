from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import (
    Case, DeadlineChangeHistory, DeadlineStatusHistory, LegalAssessment, MatterDeadline, MatterWorkstream,
    MatterWorkstreamStage,
)
from apps.clients.models import ClientDocument
from apps.audit_logs.services import AuditService
from apps.cases.services.case_service import CaseService
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
        if matter.matter_status == Case.MatterStatus.ARCHIVED:
            raise ValidationError({"matter": "Archived matters are read-only."})
        advocate = data["advocate"]
        if advocate.law_firm_id != firm.id:
            raise ValidationError({"advocate": "Advocate belongs to another firm."})
        if data.get("preliminary_generated_suggestions") and not data.get("suggestions_confirmed_by_advocate"):
            raise ValidationError({"suggestions": "Generated suggestions are preliminary and require advocate confirmation."})
        current = matter.legal_assessments.filter(is_current=True).first()
        version = matter.legal_assessments.count() + 1
        if current:
            current.is_current = False
            current.status = LegalAssessment.Status.SUPERSEDED
            current.save(update_fields=["is_current", "status", "updated_at"])
        assessment = LegalAssessment.objects.create(firm=firm, matter=matter, version=version, **data)
        AuditService.record(firm=firm, user=user, action="LEGAL_ASSESSMENT_VERSION_CREATED", obj=assessment, previous={"superseded_version": getattr(current, "version", None)}, new={"version": version, "advocate": advocate.id})
        return assessment

    @classmethod
    @transaction.atomic
    def submit_assessment(cls, *, user, assessment_id):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.COMPLETE_LEGAL_ASSESSMENT)
        assessment = LegalAssessment.objects.select_for_update().get(id=assessment_id, firm=firm)
        if assessment.status != LegalAssessment.Status.DRAFT:
            raise ValidationError({"status": "Only a draft assessment may be submitted."})
        assessment.status = LegalAssessment.Status.SUBMITTED
        assessment.submitted_by, assessment.submitted_at = user, timezone.now()
        assessment.save(update_fields=["status", "submitted_by", "submitted_at", "updated_at"])
        AuditService.record(firm=firm, user=user, action="LEGAL_ASSESSMENT_SUBMITTED", obj=assessment, new={"status": assessment.status})
        return assessment

    @classmethod
    @transaction.atomic
    def approve_assessment(cls, *, user, assessment_id):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.COMPLETE_LEGAL_ASSESSMENT)
        assessment = LegalAssessment.objects.select_for_update().get(id=assessment_id, firm=firm)
        if assessment.status != LegalAssessment.Status.SUBMITTED:
            raise ValidationError({"status": "Only a submitted assessment may be approved."})
        if assessment.advocate.user_id == user.id:
            raise ValidationError({"approver": "The completing advocate cannot approve their own assessment."})
        assessment.status = LegalAssessment.Status.APPROVED
        assessment.approved_by, assessment.approved_at = user, timezone.now()
        assessment.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        AuditService.record(firm=firm, user=user, action="LEGAL_ASSESSMENT_APPROVED", obj=assessment, new={"status": assessment.status, "approved_by": user.id})
        return assessment

    @classmethod
    @transaction.atomic
    def set_workstream(cls, *, user, matter_id, workstream_type, stage, stage_data):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.MANAGE_ASSIGNED_CASES)
        matter = Case.objects.select_for_update().get(id=matter_id, firm=firm)
        if matter.matter_status == Case.MatterStatus.ARCHIVED:
            raise ValidationError({"matter": "Archived matters are read-only."})
        if stage not in cls.STAGES.get(workstream_type, []):
            raise ValidationError({"current_stage": "Stage is invalid for the selected workstream."})
        record = MatterWorkstream.objects.select_for_update().filter(matter=matter).first()
        history = list(record.stage_history) if record else []
        if record:
            if record.workstream_type != workstream_type:
                raise ValidationError({"workstream_type": "A workstream type cannot be silently replaced."})
            current_stage = record.stage_records.select_for_update().order_by("-sequence").first()
            if not current_stage or not current_stage.completed_at:
                raise ValidationError({"current_stage": "Complete the current stage before advancing."})
            stages = cls.STAGES[workstream_type]
            expected_index = stages.index(record.current_stage) + 1
            if expected_index >= len(stages) or stage != stages[expected_index]:
                raise ValidationError({"current_stage": f"The next controlled stage is {stages[expected_index] if expected_index < len(stages) else 'none; the workstream is complete'}."})
            history.append({"stage": record.current_stage, "changed_at": timezone.now().isoformat(), "actor": str(user.id)})
            record.workstream_type, record.current_stage, record.stage_data = workstream_type, stage, stage_data
            record.stage_history, record.updated_by = history, user
            record.save()
            MatterWorkstreamStage.objects.create(
                workstream=record, sequence=current_stage.sequence + 1, stage=stage,
                stage_data=stage_data, entered_by=user,
            )
            AuditService.record(firm=firm, user=user, action="MATTER_WORKSTREAM_STAGE_CHANGED", obj=record, previous={"stage": history[-1]["stage"]}, new={"workstream_type": workstream_type, "stage": stage})
            return record
        if stage != cls.STAGES[workstream_type][0]:
            raise ValidationError({"current_stage": f"A new {workstream_type} workstream must begin at {cls.STAGES[workstream_type][0]}."})
        record = MatterWorkstream.objects.create(
            firm=firm, matter=matter, workstream_type=workstream_type, current_stage=stage,
            stage_data=stage_data, stage_history=[], updated_by=user,
        )
        MatterWorkstreamStage.objects.create(
            workstream=record, sequence=1, stage=stage, stage_data=stage_data, entered_by=user,
        )
        AuditService.record(firm=firm, user=user, action="MATTER_WORKSTREAM_CREATED", obj=record, new={"workstream_type": workstream_type, "stage": stage})
        return record

    @classmethod
    @transaction.atomic
    def complete_workstream_stage(cls, *, user, matter_id, checklist, reason, supporting_document_ids):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.MANAGE_ASSIGNED_CASES)
        if not reason.strip():
            raise ValidationError({"reason": "A stage-completion reason is required."})
        matter = Case.objects.select_for_update().get(id=matter_id, firm=firm)
        if matter.matter_status == Case.MatterStatus.ARCHIVED:
            raise ValidationError({"matter": "Archived matters are read-only."})
        try:
            workstream = MatterWorkstream.objects.select_for_update().get(matter=matter)
        except MatterWorkstream.DoesNotExist:
            raise ValidationError({"workstream": "Create the matter workstream first."})
        stage = workstream.stage_records.select_for_update().order_by("-sequence").first()
        if not stage or stage.completed_at:
            raise ValidationError({"stage": "There is no open stage to complete."})
        incomplete = [key for key, value in checklist.items() if not value]
        if incomplete:
            raise ValidationError({"checklist": f"Complete all recorded controls: {', '.join(incomplete)}."})
        documents = list(ClientDocument.objects.filter(id__in=supporting_document_ids, firm=firm, client=matter.client))
        if len(documents) != len(set(supporting_document_ids)):
            raise ValidationError({"supporting_document_ids": "Every supporting document must belong to this firm and client."})
        stage.checklist = checklist
        stage.completed_by = user
        stage.completed_at = timezone.now()
        stage.completion_reason = reason
        stage.save(update_fields=["checklist", "completed_by", "completed_at", "completion_reason"])
        stage.supporting_documents.set(documents)
        AuditService.record(firm=firm, user=user, action="MATTER_WORKSTREAM_STAGE_COMPLETED", obj=stage, new={"stage": stage.stage, "checklist": checklist, "documents": supporting_document_ids}, reason=reason)
        return stage

    @classmethod
    @transaction.atomic
    def create_deadline(cls, *, user, matter_id, data):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.MANAGE_ASSIGNED_CASES)
        matter = Case.objects.get(id=matter_id, firm=firm)
        if matter.matter_status == Case.MatterStatus.ARCHIVED:
            raise ValidationError({"matter": "Archived matters are read-only."})
        try:
            responsible_firm = CaseService.get_user_firm(data["responsible_staff"])
        except PermissionError:
            responsible_firm = None
        if not responsible_firm or responsible_firm.id != firm.id or data["responsible_staff"].role == "OFFICIAL_CLIENT":
            raise ValidationError({"responsible_staff": "Responsible staff must belong to this firm."})
        deadline = MatterDeadline.objects.create(firm=firm, matter=matter, created_by=user, **data)
        AuditService.record(firm=firm, user=user, action="MATTER_DEADLINE_CREATED", obj=deadline, new={"type": deadline.deadline_type, "due_at": deadline.due_at, "priority": deadline.priority})
        return deadline

    @classmethod
    @transaction.atomic
    def change_deadline(cls, *, user, deadline_id, new_due_at, reason):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.MANAGE_ASSIGNED_CASES)
        if not reason.strip():
            raise ValidationError({"reason": "A reason is required when changing a critical date."})
        deadline = MatterDeadline.objects.select_for_update().get(id=deadline_id, firm=firm)
        previous_due_at = deadline.due_at
        DeadlineChangeHistory.objects.create(
            deadline=deadline, previous_due_at=previous_due_at, new_due_at=new_due_at,
            reason=reason, actor=user,
        )
        deadline.due_at = new_due_at
        deadline.save(update_fields=["due_at", "updated_at"])
        AuditService.record(firm=firm, user=user, action="CRITICAL_DEADLINE_CHANGED", obj=deadline, previous={"due_at": previous_due_at}, new={"due_at": new_due_at}, reason=reason)
        return deadline

    @classmethod
    @transaction.atomic
    def resolve_deadline(cls, *, user, deadline_id, action, reason):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.MANAGE_ASSIGNED_CASES)
        if action not in {"COMPLETE", "CANCEL"}:
            raise ValidationError({"action": "Select COMPLETE or CANCEL."})
        if not reason.strip():
            raise ValidationError({"reason": "A completion or cancellation reason is required."})
        deadline = MatterDeadline.objects.select_for_update().get(id=deadline_id, firm=firm)
        if deadline.matter.matter_status == Case.MatterStatus.ARCHIVED:
            raise ValidationError({"matter": "Archived matters are read-only."})
        if deadline.status != MatterDeadline.Status.OPEN:
            raise ValidationError({"status": "Only open deadlines may be resolved."})
        previous = deadline.status
        if action == "COMPLETE":
            deadline.status = MatterDeadline.Status.COMPLETED
            deadline.completed_by = user
            deadline.completed_at = timezone.now()
            update_fields = ["status", "completed_by", "completed_at", "updated_at"]
        else:
            deadline.status = MatterDeadline.Status.CANCELLED
            deadline.cancellation_reason = reason
            update_fields = ["status", "cancellation_reason", "updated_at"]
        deadline.save(update_fields=update_fields)
        DeadlineStatusHistory.objects.create(
            deadline=deadline, previous_status=previous, new_status=deadline.status,
            reason=reason, actor=user,
        )
        audit_action = "MATTER_DEADLINE_COMPLETED" if action == "COMPLETE" else "MATTER_DEADLINE_CANCELLED"
        AuditService.record(firm=firm, user=user, action=audit_action, obj=deadline, previous={"status": previous}, new={"status": deadline.status}, reason=reason)
        return deadline
