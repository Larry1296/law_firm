from rest_framework import status
from rest_framework.response import Response

from apps.audit_logs.services import AuditService
from apps.firm.models import StorageLocation
from apps.firm.services.records_room_service import RecordsRoomService
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminRecordsRoomView(AdminFirmBaseView):
    """The firm administrator lays out the records room: rooms, cabinets, safes, drawers and shelves."""

    def get(self, request):
        firm = self.get_firm()
        return Response({**RecordsRoomService.layout(firm), "next_kyc_reference": RecordsRoomService.preview_kyc_reference(firm)})

    def post(self, request):
        firm = self.get_firm()
        location = RecordsRoomService.create(firm, request.data)
        AuditService.record(
            firm=firm, user=request.user, action="RECORDS_LOCATION_CREATED",
            obj=StorageLocation.objects.get(id=location["id"]), new={"path": location["path"], "purpose": location["purpose"]},
        )
        return Response(location, status=status.HTTP_201_CREATED)


class AdminRecordsRoomDetailView(AdminFirmBaseView):
    def patch(self, request, location_id):
        firm = self.get_firm()
        before = StorageLocation.objects.filter(id=location_id, firm=firm).first()
        if before is None:
            return Response({"detail": "This place is not in your records room."}, status=status.HTTP_404_NOT_FOUND)
        previous = {"path": before.path, "purpose": before.purpose, "is_active": before.is_active}
        location = RecordsRoomService.update(firm, location_id, request.data)
        AuditService.record(
            firm=firm, user=request.user, action="RECORDS_LOCATION_UPDATED", obj=before, previous=previous,
            new={"path": location["path"], "purpose": location["purpose"], "is_active": location["is_active"]},
        )
        return Response(location)
