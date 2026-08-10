from rest_framework import serializers

from apps.clients.models import (
    Client,
    ClientAddress,
    ClientContact,
    ClientRepresentative,
    ClientBeneficialOwner,
    ClientPrivacyRecord,
    ClientSectorProfile,
    EducationCurriculum,
    EducationInstitutionProfile,
    ClientDueDiligence,
)
from apps.clients.serializers.client.client_type_profile_serializer import (
    serialize_client_type_profile,
)


class ClientAddressSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = ClientAddress
        fields = "__all__"


class ClientContactSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = ClientContact
        fields = "__all__"


class ClientRepresentativeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientRepresentative
        fields = (
            "id",
            "full_legal_name",
            "representative_category",
            "role_title",
            "nationality",
            "email",
            "telephone",
            "authority_type",
            "authority_document_reference",
            "authority_start_date",
            "authority_end_date",
            "is_primary",
            "is_portal_contact",
            "is_litigation_representative",
            "is_authorized_to_give_instructions",
            "is_verified",
            "notes",
            "created_at",
            "updated_at",
        )


class ClientBeneficialOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientBeneficialOwner
        exclude = ("client",)


class ClientSectorProfileSerializer(serializers.ModelSerializer):
    sector_label = serializers.CharField(source="get_sector_display", read_only=True)
    class Meta:
        model = ClientSectorProfile
        exclude = ("client",)


class ClientPrivacyRecordSerializer(serializers.ModelSerializer):
    lawful_basis_label = serializers.CharField(source="get_lawful_basis_display", read_only=True)
    class Meta:
        model = ClientPrivacyRecord
        exclude = ("client",)


class ClientDueDiligenceDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientDueDiligence
        exclude = ("client",)


class EducationCurriculumSerializer(serializers.ModelSerializer):
    framework_label = serializers.CharField(source="get_framework_display", read_only=True)
    class Meta:
        model = EducationCurriculum
        fields = "__all__"


class EducationInstitutionProfileSerializer(serializers.ModelSerializer):
    education_regime_label = serializers.CharField(source="get_education_regime_display", read_only=True)
    ownership_label = serializers.CharField(source="get_ownership_display", read_only=True)
    curricula = EducationCurriculumSerializer(many=True, read_only=True)
    class Meta:
        model = EducationInstitutionProfile
        exclude = ("client",)


class ClientDetailSerializer(
    serializers.ModelSerializer
):

    type_profile = serializers.SerializerMethodField()
    registered_address = serializers.SerializerMethodField()
    primary_address = serializers.SerializerMethodField()
    primary_contact = serializers.SerializerMethodField()
    next_of_kin = serializers.SerializerMethodField()
    portal_access_exists = serializers.SerializerMethodField()
    portal_login_email = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    representatives = ClientRepresentativeSerializer(many=True, read_only=True)
    beneficial_owners = ClientBeneficialOwnerSerializer(many=True, read_only=True)
    sector_profiles = ClientSectorProfileSerializer(many=True, read_only=True)
    privacy = ClientPrivacyRecordSerializer(read_only=True)
    due_diligence = ClientDueDiligenceDetailSerializer(read_only=True)
    education_profile = EducationInstitutionProfileSerializer(read_only=True)
    client_type_label = serializers.CharField(source="get_client_type_display", read_only=True)
    has_cases = serializers.BooleanField(read_only=True)
    can_hard_delete = serializers.BooleanField(read_only=True)
    can_archive = serializers.BooleanField(read_only=True)
    can_restore = serializers.BooleanField(read_only=True)

    addresses = ClientAddressSerializer(
        many=True,
        read_only=True,
    )

    contacts = ClientContactSerializer(
        many=True,
        read_only=True,
    )

    cases = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    proposed_matters = serializers.SerializerMethodField()
    accepted_matters = serializers.SerializerMethodField()
    kyc_reference_history = serializers.SerializerMethodField()
    document_receipts = serializers.SerializerMethodField()

    class Meta:
        model = Client

        fields = [
            "id",
            "full_name",
            "email",
            "phone_number",
            "national_id",
            "passport_number",
            "kra_pin",
            "date_of_birth",

            "client_type",
            "client_type_label",
            "legacy_client_type",
            "classification_review_status",
            "provisional_legal_description",
            "classification_evidence_reference",
            "access_type",
            "lifecycle_status",
            "is_verified",
            "is_active",
            "created_by",
            "created_by_name",
            "has_cases",
            "can_hard_delete",
            "can_archive",
            "can_restore",
            "soft_deleted_at",

            "created_at",
            "updated_at",
            "kyc_drawer_reference",
            "kyc_cabinet_location",
            "kyc_reference_assigned_at",

            "type_profile",
            "registered_address",
            "primary_address",
            "primary_contact",
            "next_of_kin",
            "portal_access_exists",
            "portal_login_email",
            "addresses",
            "contacts",
            "representatives",
            "beneficial_owners",
            "sector_profiles",
            "privacy",
            "due_diligence",
            "education_profile",

            # Future-ready
            "cases",
            "documents",
            "proposed_matters",
            "accepted_matters",
            "kyc_reference_history",
            "document_receipts",
        ]

    def get_type_profile(
        self,
        obj,
    ):
        return serialize_client_type_profile(obj)

    def get_registered_address(self, obj):
        address = (
            obj.addresses.filter(address_type=ClientAddress.AddressType.REGISTERED)
            .order_by("-is_primary", "-created_at")
            .first()
        )
        return ClientAddressSerializer(address).data if address else None

    def get_primary_address(self, obj):
        address = obj.addresses.order_by("-is_primary", "-created_at").first()
        return ClientAddressSerializer(address).data if address else None

    def get_primary_contact(self, obj):
        contact = obj.contacts.filter(is_primary=True).order_by("-created_at").first()
        return ClientContactSerializer(contact).data if contact else None

    def get_next_of_kin(self, obj):
        contact = obj.contacts.filter(contact_type="EMERGENCY").order_by("-created_at").first()
        return ClientContactSerializer(contact).data if contact else None

    def get_portal_access_exists(self, obj):
        return bool(obj.user_id)

    def get_portal_login_email(self, obj):
        return obj.user.email if obj.user_id else None

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by_id else None

    def get_cases(
        self,
        obj,
    ):
        return self.get_accepted_matters(obj)

    def get_documents(self, obj):
        from apps.documents.services.workflow_service import DocumentWorkflowService
        return [DocumentWorkflowService.serialize_document(item) for item in obj.documents.select_related(
            "client", "uploaded_by", "received_by", "verified_by"
        ).prefetch_related("matter_references__case").filter(archived_at__isnull=True)]

    def get_proposed_matters(self, obj):
        return [{
            "id": str(item.id), "reference": item.reference_number,
            "title": item.proposed_matter_title, "status": item.status,
            "acceptance_decision": item.acceptance_decision,
            "opened_matter_id": str(item.created_case_id) if item.created_case_id else None,
        } for item in obj.matter_conflict_checks.order_by("-created_at")]

    def get_accepted_matters(self, obj):
        return [{
            "id": str(item.id), "reference": item.case_number, "title": item.title,
            "matter_status": item.matter_status, "court_stage": item.court_stage,
            "originating_proposed_matter": item.originating_conflict_check.reference_number
                if hasattr(item, "originating_conflict_check") else None,
        } for item in obj.cases.order_by("-created_at")]

    def get_kyc_reference_history(self, obj):
        return [{
            "previous_reference": item.previous_reference, "new_reference": item.new_reference,
            "previous_cabinet_location": item.previous_cabinet_location,
            "new_cabinet_location": item.new_cabinet_location, "reason": item.reason,
            "changed_by": item.changed_by.full_name, "changed_at": item.changed_at,
        } for item in obj.kyc_reference_history.select_related("changed_by")]

    def get_document_receipts(self, obj):
        return [{
            "id": str(receipt.id), "receipt_number": receipt.receipt_number,
            "received_from": receipt.received_from, "received_by": receipt.received_by.full_name,
            "received_at": receipt.received_at,
            "documents": [{
                "reference": line.document_reference_snapshot, "title": line.title_snapshot,
                "copy_type": line.copy_type_snapshot, "page_count": line.page_count_snapshot,
                "condition": line.condition_snapshot, "return_required": line.return_required_snapshot,
            } for line in receipt.items.all()],
        } for receipt in obj.document_receipts.select_related("received_by").prefetch_related("items")]
