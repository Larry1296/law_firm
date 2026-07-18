from rest_framework import serializers

from apps.cases.models import (
    ArbitrationProceeding,
    ConflictRecordAtRegistration,
    CourtProceeding,
    CriminalMatterDetails,
    EmploymentMatterDetails,
    InsuranceMatterDetails,
    LandMatterDetails,
    MonetaryRelief,
    NonContentiousMatterDetails,
    SuccessionMatterDetails,
    TribunalProceeding,
)


class CourtProceedingSerializer(serializers.ModelSerializer):
    jurisdiction_verification_status_label = serializers.CharField(
        source="get_jurisdiction_verification_status_display",
        read_only=True,
    )

    class Meta:
        model = CourtProceeding
        exclude = ["matter"]


class TribunalProceedingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TribunalProceeding
        exclude = ["matter"]


class ArbitrationProceedingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArbitrationProceeding
        exclude = ["matter"]


class NonContentiousMatterDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NonContentiousMatterDetails
        exclude = ["matter"]


class LandMatterDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = LandMatterDetails
        exclude = ["matter"]


class SuccessionMatterDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SuccessionMatterDetails
        exclude = ["matter"]


class InsuranceMatterDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceMatterDetails
        exclude = ["matter"]


class EmploymentMatterDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmploymentMatterDetails
        exclude = ["matter"]


class CriminalMatterDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriminalMatterDetails
        exclude = ["matter"]


class MonetaryReliefSerializer(serializers.ModelSerializer):
    relief_type_label = serializers.CharField(source="get_relief_type_display", read_only=True)

    class Meta:
        model = MonetaryRelief
        exclude = ["matter"]


class ConflictRecordAtRegistrationSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.full_name", read_only=True)

    class Meta:
        model = ConflictRecordAtRegistration
        exclude = ["matter"]
