"""API views for proposed matters."""

from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.models import ProposedMatter
from apps.cases.serializers import (
    CaseDetailSerializer,
    ProposedMatterConvertSerializer,
    ProposedMatterCreateSerializer,
    ProposedMatterDetailSerializer,
    ProposedMatterUpdateSerializer,
    ProposedMatterWithdrawSerializer,
)
from apps.cases.services import ProposedMatterService
from apps.staff.models import Lawyer


class ProposedMatterListCreateView(APIView):
    """List all proposed matters for the firm / create a new one."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            qs = ProposedMatterService.list_proposed_matters(
                request.user,
                search=request.query_params.get("search"),
                status=request.query_params.get("status"),
                urgency_level=request.query_params.get("urgency_level"),
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProposedMatterDetailSerializer(qs, many=True)
        return Response(
            {
                "data": {
                    "summary": ProposedMatterService.summary(qs),
                    "proposed_matters": serializer.data,
                },
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = ProposedMatterCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            proposed = ProposedMatterService.create_proposed_matter(
                user=request.user,
                validated_data=serializer.validated_data,
            )
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Selected advocate was not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"data": ProposedMatterDetailSerializer(proposed).data},
            status=status.HTTP_201_CREATED,
        )


class ProposedMatterDetailView(APIView):
    """Retrieve, update, or partially update a single proposed matter."""

    permission_classes = [IsAuthenticated]

    def _get_proposed(self, user, proposed_matter_id):
        return ProposedMatterService.get_proposed_matter(user, proposed_matter_id)

    def get(self, request, proposed_matter_id):
        try:
            proposed = self._get_proposed(request.user, proposed_matter_id)
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Proposed matter not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"data": ProposedMatterDetailSerializer(proposed).data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request, proposed_matter_id):
        try:
            proposed = self._get_proposed(request.user, proposed_matter_id)
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Proposed matter not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        if proposed.status != ProposedMatter.Status.DRAFT:
            return Response(
                {"detail": "Only draft proposed matters can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ProposedMatterUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        advocate_id = serializer.validated_data.pop("responsible_advocate_id", None)
        for field, value in serializer.validated_data.items():
            setattr(proposed, field, value)

        if advocate_id is not None:
            firm = ProposedMatterService._firm_for_user(request.user)
            if advocate_id:
                try:
                    lawyer = Lawyer.objects.get(
                        id=advocate_id, law_firm=firm, is_active=True
                    )
                    proposed.responsible_advocate = lawyer
                except Lawyer.DoesNotExist:
                    return Response(
                        {"detail": "Selected advocate was not found."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                proposed.responsible_advocate = None

        proposed.save()
        return Response(
            {"data": ProposedMatterDetailSerializer(proposed).data},
            status=status.HTTP_200_OK,
        )


class ProposedMatterSubmitView(APIView):
    """Submit a draft proposed matter for conflict checking."""

    permission_classes = [IsAuthenticated]

    def post(self, request, proposed_matter_id):
        try:
            proposed = ProposedMatterService.get_proposed_matter(
                request.user, proposed_matter_id
            )
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Proposed matter not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            proposed = ProposedMatterService.submit_proposed_matter(
                proposed_matter=proposed,
                actor=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"data": ProposedMatterDetailSerializer(proposed).data},
            status=status.HTTP_200_OK,
        )


class ProposedMatterWithdrawView(APIView):
    """Withdraw a proposed matter."""

    permission_classes = [IsAuthenticated]

    def post(self, request, proposed_matter_id):
        try:
            proposed = ProposedMatterService.get_proposed_matter(
                request.user, proposed_matter_id
            )
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Proposed matter not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProposedMatterWithdrawSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            proposed = ProposedMatterService.withdraw_proposed_matter(
                proposed_matter=proposed,
                actor=request.user,
                reason=serializer.validated_data.get("reason", ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"data": ProposedMatterDetailSerializer(proposed).data},
            status=status.HTTP_200_OK,
        )


class ProposedMatterConvertView(APIView):
    """Convert a proposed matter into a full Case."""

    permission_classes = [IsAuthenticated]

    def post(self, request, proposed_matter_id):
        try:
            proposed = ProposedMatterService.get_proposed_matter(
                request.user, proposed_matter_id
            )
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Proposed matter not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = ProposedMatterConvertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            case = ProposedMatterService.convert_to_matter(
                proposed_matter=proposed,
                actor=request.user,
                client_id=serializer.validated_data["client_id"],
                conflict_check_id=serializer.validated_data["conflict_check_id"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Selected client or conflict check was not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"data": CaseDetailSerializer(case, context={"request": request}).data},
            status=status.HTTP_201_CREATED,
        )
