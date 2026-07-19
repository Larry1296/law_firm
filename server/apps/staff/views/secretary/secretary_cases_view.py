from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.response import Response

from apps.cases.serializers import CaseCreateSerializer, CaseDetailSerializer
from apps.cases.services import CaseService
from apps.clients.models import Client
from apps.staff.models import SecretaryPermission
from apps.staff.models import Lawyer, Secretary
from apps.staff.serializers.secretary import SecretaryCaseSerializer
from apps.staff.services.secretary import SecretaryCaseService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


def _primary_contact_payload(client):
    contact = client.contacts.filter(is_primary=True).order_by("-created_at").first()
    if not contact:
        return None
    return {
        "id": str(contact.id),
        "full_name": contact.full_name,
        "phone_number": contact.phone_number,
        "email": contact.email,
        "role_or_designation": contact.role_or_designation,
        "contact_type": contact.contact_type,
        "preferred_channel": contact.preferred_channel,
        "is_primary": contact.is_primary,
        "is_verified": contact.is_verified,
    }


def _client_option(client):
    primary_contact = _primary_contact_payload(client)
    return {
        "id": str(client.id),
        "client_id": str(client.id),
        "full_name": client.full_name,
        "client_type": client.client_type,
        "lifecycle_status": client.lifecycle_status,
        "access_type": client.access_type,
        "portal_access_exists": bool(client.user_id),
        "email": client.email,
        "national_id": client.national_id,
        "primary_contact": primary_contact,
        "primary_contact_name": primary_contact["full_name"] if primary_contact else "",
    }


class SecretaryCasesView(SecretaryBaseView):
    def get(self, request, case_id=None):
        try:
            if case_id is not None:
                case = SecretaryCaseService.get_case(request.user, case_id)
                if case is None:
                    return Response(
                        {"detail": "Case not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                serializer = SecretaryCaseSerializer(case)
                return Response({"case": serializer.data}, status=status.HTTP_200_OK)

            cases = SecretaryCaseService.list_cases(request.user)
        except (ValueError, PermissionError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = SecretaryCaseSerializer(cases, many=True)
        return Response({"cases": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            SecretaryCaseService.ensure_can_manage_cases(request.user)

            serializer = CaseCreateSerializer(
                data=request.data,
                context={"firm": CaseService.get_user_firm(request.user)},
            )
            serializer.is_valid(raise_exception=True)
            case = CaseService.create_case(
                user=request.user,
                validated_data=serializer.validated_data,
            )
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Selected client was not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"case": CaseDetailSerializer(case).data},
            status=status.HTTP_201_CREATED,
        )


class SecretaryCaseCreateOptionsView(SecretaryBaseView):
    def get(self, request):
        try:
            secretary = SecretaryCaseService.ensure_can_manage_cases(request.user)
        except (ValueError, PermissionError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        firm = secretary.law_firm
        clients = Client.objects.filter(firm=firm, is_active=True).order_by("full_name")
        lawyers = Lawyer.objects.filter(law_firm=firm, is_active=True).select_related("user").order_by("user__first_name", "user__last_name")
        secretaries = Secretary.objects.filter(law_firm=firm, is_active=True).select_related("user").order_by("user__first_name", "user__last_name")

        return Response(
            {
                "clients": [_client_option(client) for client in clients],
                "lawyers": [
                    {
                        "id": str(lawyer.id),
                        "membership_id": str(lawyer.id),
                        "full_name": lawyer.user.full_name,
                        "email": lawyer.user.email,
                    }
                    for lawyer in lawyers
                ],
                "secretaries": [
                    {
                        "id": str(item.id),
                        "membership_id": str(item.id),
                        "full_name": item.user.full_name,
                        "email": item.user.email,
                    }
                    for item in secretaries
                ],
            },
            status=status.HTTP_200_OK,
        )
