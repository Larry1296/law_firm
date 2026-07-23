from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.cases.serializers import CaseCreateSerializer, CaseDetailSerializer
from apps.cases.services import CaseService
from apps.clients.models import Client
from apps.staff.models import Lawyer, LawyerPermission, Secretary
from apps.staff.serializers.lawyer.lawyer_case_serializer import LawyerCaseSerializer
from apps.staff.services.lawyer.lawyer_case_service import LawyerCaseService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


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


class LawyerCasesView(LawyerBaseView):
    def get(self, request, case_id=None):
        try:
            if case_id is not None:
                case = LawyerCaseService.get_case(request.user, case_id)
                if case is None:
                    return Response(
                        {"detail": "Case not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                serializer = LawyerCaseSerializer(case)
                return Response({"case": serializer.data}, status=status.HTTP_200_OK)

            cases = LawyerCaseService.list_cases(
                request.user,
                search=request.query_params.get("search"),
                status=request.query_params.get("status"),
                priority=request.query_params.get("priority"),
                case_type=request.query_params.get("case_type"),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerCaseSerializer(cases, many=True)
        return Response({"cases": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        lawyer = getattr(request.user, "lawyer_profile", None)
        if lawyer is None or not lawyer.is_active:
            return Response({"detail": "Only active lawyers can create matters."}, status=status.HTTP_403_FORBIDDEN)
        if not lawyer.has_permission(LawyerPermission.CREATE_CASES):
            return Response({"detail": "Lawyer permission is required to create matters."}, status=status.HTTP_403_FORBIDDEN)

        try:
            serializer = CaseCreateSerializer(
                data=request.data,
                context={"firm": CaseService.get_user_firm(request.user)},
            )
            serializer.is_valid(raise_exception=True)
            case = CaseService.create_case(user=request.user, validated_data=serializer.validated_data)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        except Client.DoesNotExist:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)
        except (Lawyer.DoesNotExist, Secretary.DoesNotExist):
            return Response({"detail": "Selected assignment is not available for this firm."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"case": CaseDetailSerializer(case).data}, status=status.HTTP_201_CREATED)


class LawyerCaseCreateOptionsView(LawyerBaseView):
    def get(self, request):
        lawyer = getattr(request.user, "lawyer_profile", None)
        if lawyer is None or not lawyer.is_active:
            return Response({"detail": "Only active lawyers can create matters."}, status=status.HTTP_403_FORBIDDEN)
        if not lawyer.has_permission(LawyerPermission.CREATE_CASES):
            return Response({"detail": "Lawyer permission is required to create matters."}, status=status.HTTP_403_FORBIDDEN)

        firm = lawyer.law_firm
        clients = Client.objects.filter(firm=firm, is_active=True).order_by("full_name")
        can_assign_other_lawyer = lawyer.has_permission(LawyerPermission.ASSIGN_OTHER_LAWYER)
        lawyers_queryset = Lawyer.objects.filter(law_firm=firm, is_active=True).select_related("user")
        if not can_assign_other_lawyer:
            lawyers_queryset = lawyers_queryset.filter(id=lawyer.id)
        lawyers = lawyers_queryset.order_by("user__first_name", "user__last_name")
        secretaries = Secretary.objects.filter(law_firm=firm, is_active=True).select_related("user").order_by("user__first_name", "user__last_name")
        permission_codes = list(lawyer.permissions.filter(is_active=True).values_list("code", flat=True))

        lawyer_options = [
            {
                "id": str(item.id),
                "membership_id": str(item.id),
                "full_name": item.user.full_name,
                "email": item.user.email,
                "is_current_user": item.id == lawyer.id,
            }
            for item in lawyers
        ]

        return Response(
            {
                "clients": [_client_option(client) for client in clients],
                "lawyers": lawyer_options,
                "secretaries": [
                    {
                        "id": str(item.id),
                        "membership_id": str(item.id),
                        "full_name": item.user.full_name,
                        "email": item.user.email,
                    }
                    for item in secretaries
                ],
                "permissions": permission_codes,
                "can_create_matter": True,
                "can_assign_other_lawyer": can_assign_other_lawyer,
                "current_lawyer": {
                    "id": str(lawyer.id),
                    "membership_id": str(lawyer.id),
                    "full_name": lawyer.user.full_name,
                    "email": lawyer.user.email,
                },
            },
            status=status.HTTP_200_OK,
        )
