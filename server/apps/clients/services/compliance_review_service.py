from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.clients.models import Client, ClientComplianceHistory, ClientComplianceReview
from apps.audit_logs.services import AuditService
from apps.common.choices import UserRole
from apps.staff.models import LawyerPermission


class ClientComplianceReviewService:
    BENEFICIAL_OWNERSHIP_REQUIRED = {
        Client.ClientType.COMPANY,
        Client.ClientType.PARTNERSHIP,
        Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP,
        Client.ClientType.COOPERATIVE,
        Client.ClientType.NON_PROFIT_ORGANIZATION,
        Client.ClientType.TRUST,
        Client.ClientType.BUSINESS_ENTITY,
        Client.ClientType.FINANCIAL_INSTITUTION,
    }

    @staticmethod
    def _firm(user):
        from apps.cases.services.case_service import CaseService
        return CaseService.get_user_firm(user)

    @classmethod
    def _can_review(cls, user, firm):
        if user.role == UserRole.ADMIN and firm.owner_id == user.id:
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        return bool(
            lawyer and lawyer.law_firm_id == firm.id and lawyer.is_active
            and lawyer.has_permission(LawyerPermission.REVIEW_CLIENT_COMPLIANCE)
        )

    @classmethod
    def get_for_client(cls, *, user, client_id, lock=False):
        firm = cls._firm(user)
        client = Client.objects.get(id=client_id, firm=firm)
        if lock:
            queryset = ClientComplianceReview.objects.select_for_update()
        else:
            queryset = ClientComplianceReview.objects.select_related("reviewed_by")
        review, _ = queryset.get_or_create(firm=firm, client=client)
        return review

    @classmethod
    @transaction.atomic
    def record(cls, *, user, client_id, data):
        firm = cls._firm(user)
        if not cls._can_review(user, firm):
            raise PermissionDenied("Client compliance review permission is required.")
        review = cls.get_for_client(user=user, client_id=client_id, lock=True)
        tracked = [
            "identity_status", "authority_status", "beneficial_ownership_status",
            "due_diligence_status", "source_of_funds_required", "source_of_funds_status",
            "evidence", "review_notes", "restriction_reason",
        ]
        previous = {field: getattr(review, field) for field in tracked}
        for field in tracked:
            if field in data:
                setattr(review, field, data[field])
        if review.client.client_type not in cls.BENEFICIAL_OWNERSHIP_REQUIRED:
            review.beneficial_ownership_status = review.VerificationStatus.NOT_APPLICABLE
        review.reviewed_by = user
        review.reviewed_at = timezone.now()
        review.full_clean()
        review.save()
        current = {field: getattr(review, field) for field in tracked}
        ClientComplianceHistory.objects.create(
            review=review, actor=user, previous_values=previous, new_values=current,
            reason=data.get("reason", ""),
        )
        AuditService.record(firm=firm, user=user, action="CLIENT_COMPLIANCE_REVIEWED", obj=review, previous=previous, new=current, reason=data.get("reason", ""))
        return review

    @classmethod
    def opening_errors(cls, client, *, review=None):
        try:
            review = review or client.compliance_review
        except ClientComplianceReview.DoesNotExist:
            return {"client_compliance": "Client identity, authority and due-diligence review has not been recorded."}
        errors = {}
        verified = ClientComplianceReview.VerificationStatus.VERIFIED
        not_applicable = ClientComplianceReview.VerificationStatus.NOT_APPLICABLE
        if review.identity_status != verified:
            errors["identity_verification"] = "Client identity verification must be complete."
        if review.authority_status != verified:
            errors["authority_to_instruct"] = "Authority to instruct must be verified."
        if client.client_type in cls.BENEFICIAL_OWNERSHIP_REQUIRED:
            if review.beneficial_ownership_status != verified:
                errors["beneficial_ownership"] = "Beneficial ownership must be verified for this client type."
        elif review.beneficial_ownership_status not in {verified, not_applicable}:
            errors["beneficial_ownership"] = "Beneficial-ownership applicability must be resolved."
        if review.due_diligence_status != ClientComplianceReview.DueDiligenceStatus.CLEARED:
            errors["due_diligence"] = "Due diligence must be cleared before matter opening."
        if review.source_of_funds_required and review.source_of_funds_status != verified:
            errors["source_of_funds"] = "Required source-of-funds verification must be complete."
        if review.blocks_opening:
            errors["due_diligence_restriction"] = review.restriction_reason or "Due diligence blocks matter opening."
        return errors
