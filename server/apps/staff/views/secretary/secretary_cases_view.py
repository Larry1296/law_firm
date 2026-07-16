from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.response import Response

from apps.cases.serializers import CaseCreateSerializer, CaseDetailSerializer
from apps.cases.services import CaseService
from apps.staff.models import SecretaryPermission
from apps.staff.serializers.secretary import SecretaryCaseSerializer
from apps.staff.services.secretary import SecretaryCaseService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


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

            serializer = CaseCreateSerializer(data=request.data)
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
