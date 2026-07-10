from rest_framework import serializers

from apps.cases.serializers.case_detail_serializer import CaseDetailSerializer
from apps.cases.serializers.case_serializer import CaseSerializer


class LawyerCaseSerializer(CaseDetailSerializer):
    pass
