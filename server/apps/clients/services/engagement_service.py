from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.clients.models import ClientMatterConflictCheck, EngagementHistory, EngagementRecord
from apps.audit_logs.services import AuditService
from apps.common.choices import UserRole
from apps.staff.models import LawyerPermission


class EngagementService:
    CURRENT = {
        EngagementRecord.Status.DRAFT, EngagementRecord.Status.SENT,
        EngagementRecord.Status.SIGNED, EngagementRecord.Status.FEE_TERMS_CONFIRMED,
        EngagementRecord.Status.RETAINER_PENDING, EngagementRecord.Status.READY,
        EngagementRecord.Status.WAIVED, EngagementRecord.Status.NOT_REQUIRED,
        EngagementRecord.Status.LEGACY_REVIEW_REQUIRED,
    }

    @staticmethod
    def _firm(user):
        from apps.cases.services.case_service import CaseService
        return CaseService.get_user_firm(user)

    @classmethod
    def _can(cls, user, code):
        firm = cls._firm(user)
        if user.role == UserRole.ADMIN and firm.owner_id == user.id:
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        return bool(lawyer and lawyer.law_firm_id == firm.id and lawyer.is_active and lawyer.has_permission(code))

    @staticmethod
    def _history(record, actor, action, previous, reason=""):
        EngagementHistory.objects.create(
            engagement=record, actor=actor, action=action,
            previous_values=previous, new_values={"status": record.status}, reason=reason,
        )

    @classmethod
    def current_for(cls, proposed_matter):
        return proposed_matter.engagements.filter(status__in=cls.CURRENT).select_related(
            "approved_by", "exception_approved_by", "responsible_advocate"
        ).first()

    @classmethod
    @transaction.atomic
    def create(cls, *, user, proposed_matter, data):
        firm = cls._firm(user)
        if proposed_matter.firm_id != firm.id:
            raise PermissionDenied("Proposed matter belongs to another firm.")
        proposed_matter = ClientMatterConflictCheck.objects.select_for_update().get(
            id=proposed_matter.id, firm=firm
        )
        if cls.current_for(proposed_matter):
            raise ValidationError({"engagement": "Supersede the current engagement before creating another version."})
        advocate = data["responsible_advocate"]
        if advocate.law_firm_id != firm.id or not advocate.is_active:
            raise ValidationError({"responsible_advocate": "Select an active advocate in this firm."})
        version = proposed_matter.engagements.count() + 1
        record = EngagementRecord(
            firm=firm, client=proposed_matter.client, proposed_matter=proposed_matter,
            version=version, created_by=user, **data,
        )
        record.full_clean()
        record.save()
        cls._history(record, user, "CREATED", {})
        AuditService.record(firm=firm, user=user, action="ENGAGEMENT_CREATED", obj=record, new={"status": record.status, "version": record.version, "fee_arrangement_type": record.fee_arrangement_type})
        return record

    @classmethod
    @transaction.atomic
    def approve(cls, *, user, engagement_id, proposed_matter_id):
        if not cls._can(user, LawyerPermission.APPROVE_ENGAGEMENT):
            raise PermissionDenied("Engagement approval permission is required.")
        record = EngagementRecord.objects.select_for_update().select_related("firm").get(
            id=engagement_id, proposed_matter_id=proposed_matter_id, firm=cls._firm(user)
        )
        if record.status not in {record.Status.SIGNED, record.Status.FEE_TERMS_CONFIRMED, record.Status.RETAINER_PENDING}:
            raise ValidationError({"status": "Only a signed engagement with confirmed fee terms may be approved."})
        if not record.signed_at or not record.signed_by.strip() or not record.engagement_letter_document_id:
            raise ValidationError({"signature": "Signed date, signatory and engagement letter document are required."})
        settings = getattr(record.firm, "settings", None)
        if settings and settings.require_retainer_before_matter_opening and not record.required_retainer:
            raise ValidationError({"required_retainer": "Firm policy requires a retainer amount before opening."})
        if record.required_retainer and not record.retainer_received:
            record.status = record.Status.RETAINER_PENDING
            raise ValidationError({"retainer": "The required retainer has not been received."})
        previous = {"status": record.status, "approved_by": str(record.approved_by_id or "")}
        record.status = record.Status.READY
        record.approved_by = user
        record.internally_approved_at = timezone.now()
        record.full_clean()
        record.save(update_fields=["status", "approved_by", "internally_approved_at", "updated_at"])
        cls._history(record, user, "APPROVED", previous)
        AuditService.record(firm=record.firm, user=user, action="ENGAGEMENT_APPROVED", obj=record, previous=previous, new={"status": record.status, "approved_by": user.id})
        return record

    @classmethod
    @transaction.atomic
    def approve_exception(cls, *, user, engagement_id, proposed_matter_id, status, reason, policy_basis):
        if status not in {EngagementRecord.Status.WAIVED, EngagementRecord.Status.NOT_REQUIRED}:
            raise ValidationError({"status": "Select WAIVED or NOT_REQUIRED."})
        if not cls._can(user, LawyerPermission.WAIVE_ENGAGEMENT):
            raise PermissionDenied("Engagement waiver permission is required.")
        record = EngagementRecord.objects.select_for_update().select_related("firm").get(
            id=engagement_id, proposed_matter_id=proposed_matter_id, firm=cls._firm(user)
        )
        settings = getattr(record.firm, "settings", None)
        if status == record.Status.WAIVED and settings and not settings.allow_engagement_waiver:
            raise ValidationError({"status": "Firm policy does not permit engagement waivers."})
        if status == record.Status.NOT_REQUIRED and (
            not settings or settings.require_signed_engagement_for_matter_opening
        ):
            raise ValidationError({"status": "Firm policy requires a signed engagement; NOT_REQUIRED is unavailable."})
        if settings and settings.require_independent_engagement_waiver_approval and record.created_by_id == user.id:
            raise PermissionDenied("The engagement maker cannot approve their own exception.")
        previous = {"status": record.status}
        record.status = status
        record.exception_reason = reason.strip()
        record.exception_policy_basis = policy_basis.strip()
        record.exception_approved_by = user
        record.exception_approved_at = timezone.now()
        record.full_clean()
        record.save(update_fields=[
            "status", "exception_reason", "exception_policy_basis",
            "exception_approved_by", "exception_approved_at", "updated_at",
        ])
        cls._history(record, user, "EXCEPTION_APPROVED", previous, reason)
        AuditService.record(firm=record.firm, user=user, action="ENGAGEMENT_EXCEPTION_APPROVED", obj=record, previous=previous, new={"status": record.status, "policy_basis": policy_basis}, reason=reason)
        return record

    @classmethod
    @transaction.atomic
    def supersede(cls, *, user, engagement_id, proposed_matter_id, reason):
        if not cls._can(user, LawyerPermission.APPROVE_ENGAGEMENT):
            raise PermissionDenied("Engagement approval permission is required.")
        if not reason.strip():
            raise ValidationError({"reason": "A supersession reason is required."})
        record = EngagementRecord.objects.select_for_update().get(
            id=engagement_id, proposed_matter_id=proposed_matter_id, firm=cls._firm(user)
        )
        if record.status not in cls.CURRENT:
            raise ValidationError({"status": "This engagement is already terminal."})
        previous = {"status": record.status}
        record.status = record.Status.SUPERSEDED
        record.save(update_fields=["status", "updated_at"])
        cls._history(record, user, "SUPERSEDED", previous, reason)
        AuditService.record(firm=record.firm, user=user, action="ENGAGEMENT_SUPERSEDED", obj=record, previous=previous, new={"status": record.status}, reason=reason)
        return record
