from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.audit_logs.services.audit_service import AuditService
from apps.clients.models import WalkInEnquiry, WalkInEnquirySequence
from apps.clients.serializers.walk_in_enquiry_serializer import WalkInEnquirySerializer
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.services.secretary import SecretaryClientService


class WalkInEnquiryService:
    @staticmethod
    def firm_for(user):
        if user.is_active:
            if user.role == UserRole.ADMIN and hasattr(user, "owned_firm"):
                return user.owned_firm
            if user.role == UserRole.STAFF:
                try:
                    secretary = SecretaryClientService.ensure_can_manage_clients(user)
                except (ValueError, PermissionError) as exc:
                    raise PermissionDenied(str(exc)) from exc
                if secretary.can_manage_client_intake:
                    return secretary.law_firm
        raise PermissionDenied("Active client-intake authority is required to access walk-in enquiries.")

    @classmethod
    def list(cls, *, user):
        return WalkInEnquiry.objects.filter(firm=cls.firm_for(user)).select_related("received_by")

    @classmethod
    @transaction.atomic
    def create(cls, *, user, data):
        firm = cls.firm_for(user)
        serializer = WalkInEnquirySerializer(data=data)
        serializer.is_valid(raise_exception=True)
        # Lock the existing parent before creating a sequence, including the first
        # request of a new year. All allocation and audit writes commit together.
        LawFirm.objects.select_for_update().get(pk=firm.pk)
        year = timezone.now().astimezone(ZoneInfo("Africa/Nairobi")).year
        sequence, _ = WalkInEnquirySequence.objects.get_or_create(firm=firm, year=year)
        reference = f"ENQ-{year}-{sequence.next_number:05d}"
        sequence.next_number += 1
        sequence.save(update_fields=["next_number"])
        enquiry = WalkInEnquiry.objects.create(
            firm=firm, received_by=user, reference=reference, **serializer.validated_data,
        )
        AuditService.record(
            firm=firm, user=user, action="WALK_IN_ENQUIRY_RECORDED", obj=enquiry,
            new={key: getattr(enquiry, key) for key in (
                "reference", "status", "visitor_type", "service_category", "urgency_type", "critical_date",
            )},
        )
        return enquiry
