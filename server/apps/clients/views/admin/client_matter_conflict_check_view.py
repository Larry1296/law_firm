from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.admin.client_matter_conflict_check_serializer import (
    ClearedUnconsumedConflictCheckSerializer,
    ClientMatterConflictCheckDetailSerializer,
    ClientMatterConflictCheckListSerializer,
    CloseWithoutDecisionSerializer,
    EscalationSerializer,
    FinalDecisionSerializer,
    FirmAcceptanceDecisionSerializer,
    PotentialConflictSerializer,
    ProposedMatterSerializer,
    RequestInformationSerializer,
    ResumeCheckSerializer,
    StartCheckSerializer,
    JurisdictionAdvocateDecisionSerializer,
    JurisdictionReopenSerializer,
    JurisdictionSuggestionInputSerializer,
    ProposedMatterJurisdictionSerializer,
    ProposedMatterDocumentReferenceSerializer,
)
from apps.clients.services.conflict import ClientMatterConflictService
from apps.clients.services.jurisdiction_suggestion_service import JurisdictionSuggestionService
from apps.common.choices import ConflictCheckStatus


class ClientMatterConflictCheckListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        try:
            checks = ClientMatterConflictService.list_for_client(
                user=request.user,
                client_id=client_id,
            )
        except (PermissionDenied, ValidationError) as exc:
            status_code = status.HTTP_403_FORBIDDEN if isinstance(exc, PermissionDenied) else status.HTTP_400_BAD_REQUEST
            return Response({"detail": str(exc.detail if hasattr(exc, "detail") else exc)}, status=status_code)
        return Response(
            {"conflict_checks": ClientMatterConflictCheckListSerializer(checks, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request, client_id):
        serializer = ProposedMatterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        check = ClientMatterConflictService.create_proposed_matter(
            user=request.user,
            client_id=client_id,
            data=serializer.validated_data,
        )
        return Response(
            {"conflict_check": ClientMatterConflictCheckDetailSerializer(check).data},
            status=status.HTTP_201_CREATED,
        )


class ClientMatterConflictCheckDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id, check_id):
        check = ClientMatterConflictService.get_check(
            user=request.user,
            client_id=client_id,
            check_id=check_id,
        )
        return Response(
            {"conflict_check": ClientMatterConflictCheckDetailSerializer(check).data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request, client_id, check_id):
        serializer = ProposedMatterSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        check = ClientMatterConflictService.update_proposed_matter(
            user=request.user, client_id=client_id, check_id=check_id,
            data=serializer.validated_data,
        )
        return Response(
            {"conflict_check": ClientMatterConflictCheckDetailSerializer(check).data},
            status=status.HTTP_200_OK,
        )


class ProposedMatterDocumentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id, check_id):
        documents = ClientMatterConflictService.available_documents(
            user=request.user, client_id=client_id, check_id=check_id,
            query=(request.query_params.get("q") or "").strip(),
        )
        return Response({"documents": [
            {
                "id": str(item.id), "reference": item.reference, "title": item.title,
                "category": item.category, "category_label": item.get_category_display(),
                "subtype": item.subtype, "subtype_label": item.get_subtype_display(),
                "document_identifier": item.document_identifier,
                "verification_status": item.verification_status,
                "copy_type": item.source_copy_type,
                "physical_location": item.physical_storage_location,
                "digital_copy_available": item.digital_copy_available,
                "label": f"{item.reference} — {item.title} — {item.get_subtype_display()} — {item.get_verification_status_display()} — {item.get_source_copy_type_display()}"
                         + (f" — {item.physical_storage_location}" if item.physical_storage_location else ""),
            } for item in documents
        ]})

    def post(self, request, client_id, check_id):
        reference = ClientMatterConflictService.add_document_reference(
            user=request.user, client_id=client_id, check_id=check_id, data=request.data,
        )
        return Response({"document_reference": ProposedMatterDocumentReferenceSerializer(reference).data}, status=201)


class ProposedMatterDocumentReferenceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, client_id, check_id, reference_id):
        reference = ClientMatterConflictService.remove_document_reference(
            user=request.user, client_id=client_id, check_id=check_id,
            reference_id=reference_id, reason=request.data.get("reason"),
        )
        return Response({"document_reference": ProposedMatterDocumentReferenceSerializer(reference).data})


class ClientMatterConflictCheckRejectedListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        checks = ClientMatterConflictService.rejected_queryset(request.user)
        reason = request.query_params.get("reason_category")
        advocate = request.query_params.get("advocate")
        client_type = request.query_params.get("client_type")
        urgency = request.query_params.get("urgency")
        status_filter = request.query_params.get("status")
        if reason:
            checks = checks.filter(acceptance_reason_category=reason)
        if advocate:
            checks = checks.filter(responsible_lawyer_id=advocate)
        if client_type:
            checks = checks.filter(client__client_type=client_type)
        if urgency:
            checks = checks.filter(urgency_level=urgency)
        if status_filter:
            checks = checks.filter(status=status_filter)
        return Response(
            {
                "rejected_matters": ClientMatterConflictCheckListSerializer(checks, many=True).data,
                "metadata": ClientMatterConflictService.rejected_metadata(checks),
            },
            status=status.HTTP_200_OK,
        )


class ClientMatterConflictCheckRejectedDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, check_id):
        check = ClientMatterConflictService.rejected_queryset(request.user).get(id=check_id)
        return Response(
            {"rejected_matter": ClientMatterConflictCheckDetailSerializer(check).data},
            status=status.HTTP_200_OK,
        )


class ClientMatterConflictCheckClearedUnconsumedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        checks = ClientMatterConflictService.list_for_client(
            user=request.user,
            client_id=client_id,
        ).filter(
            status=ConflictCheckStatus.CLEARED,
            acceptance_decision="ACCEPTED",
            accepted_by__isnull=False,
            accepted_at__isnull=False,
            created_case__isnull=True,
            consumed_at__isnull=True,
        )
        return Response(
            {"conflict_checks": ClearedUnconsumedConflictCheckSerializer(checks, many=True).data},
            status=status.HTTP_200_OK,
        )


class ClientMatterConflictCheckActionView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None
    command = None

    def post(self, request, client_id, check_id):
        serializer = self.serializer_class(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        check = self.command(
            user=request.user,
            client_id=client_id,
            check_id=check_id,
            data=serializer.validated_data,
        )
        return Response(
            {"conflict_check": ClientMatterConflictCheckDetailSerializer(check).data},
            status=status.HTTP_200_OK,
        )


class ClientMatterConflictCheckStartView(ClientMatterConflictCheckActionView):
    serializer_class = StartCheckSerializer
    command = staticmethod(ClientMatterConflictService.start_check)


class ClientMatterConflictCheckRequestInformationView(ClientMatterConflictCheckActionView):
    serializer_class = RequestInformationSerializer
    command = staticmethod(ClientMatterConflictService.request_information)


class ClientMatterConflictCheckResumeView(ClientMatterConflictCheckActionView):
    serializer_class = ResumeCheckSerializer
    command = staticmethod(ClientMatterConflictService.resume_check)


class ClientMatterConflictCheckPotentialView(ClientMatterConflictCheckActionView):
    serializer_class = PotentialConflictSerializer
    command = staticmethod(ClientMatterConflictService.record_potential_conflict)


class ClientMatterConflictCheckEscalateView(ClientMatterConflictCheckActionView):
    serializer_class = EscalationSerializer
    command = staticmethod(ClientMatterConflictService.escalate_for_review)


class ClientMatterConflictCheckDecideView(ClientMatterConflictCheckActionView):
    serializer_class = FinalDecisionSerializer
    command = staticmethod(ClientMatterConflictService.record_final_decision)


class ClientMatterConflictCheckCloseView(ClientMatterConflictCheckActionView):
    serializer_class = CloseWithoutDecisionSerializer
    command = staticmethod(ClientMatterConflictService.close_without_decision)


class ClientMatterConflictCheckAcceptanceView(ClientMatterConflictCheckActionView):
    serializer_class = FirmAcceptanceDecisionSerializer
    command = staticmethod(ClientMatterConflictService.record_acceptance_decision)


class ProposedMatterJurisdictionView(APIView):
    permission_classes = [IsAuthenticated]

    def _check(self, request, client_id, check_id):
        return ClientMatterConflictService.get_check(
            user=request.user, client_id=client_id, check_id=check_id
        )

    def get(self, request, client_id, check_id):
        check = self._check(request, client_id, check_id)
        try:
            record = check.jurisdiction
        except Exception:
            record = None
        return Response(
            {"jurisdiction": ProposedMatterJurisdictionSerializer(record).data if record else None},
            status=status.HTTP_200_OK,
        )

    def post(self, request, client_id, check_id):
        serializer = JurisdictionSuggestionInputSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        check = self._check(request, client_id, check_id)
        record = JurisdictionSuggestionService.generate(
            user=request.user, check=check, facts=serializer.validated_data
        )
        return Response({"jurisdiction": ProposedMatterJurisdictionSerializer(record).data})


class ProposedMatterJurisdictionDecisionView(ProposedMatterJurisdictionView):
    def post(self, request, client_id, check_id):
        serializer = JurisdictionAdvocateDecisionSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        check = self._check(request, client_id, check_id)
        record = JurisdictionSuggestionService.decide(
            user=request.user, check=check, data=serializer.validated_data
        )
        return Response({"jurisdiction": ProposedMatterJurisdictionSerializer(record).data})


class ProposedMatterJurisdictionConfirmView(ProposedMatterJurisdictionView):
    def post(self, request, client_id, check_id):
        check = self._check(request, client_id, check_id)
        record = JurisdictionSuggestionService.confirm(user=request.user, check=check)
        return Response({"jurisdiction": ProposedMatterJurisdictionSerializer(record).data})


class ProposedMatterJurisdictionReopenView(ProposedMatterJurisdictionView):
    def post(self, request, client_id, check_id):
        serializer = JurisdictionReopenSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        check = self._check(request, client_id, check_id)
        record = JurisdictionSuggestionService.reopen(
            user=request.user, check=check, reason=serializer.validated_data["reason"]
        )
        return Response({"jurisdiction": ProposedMatterJurisdictionSerializer(record).data})
