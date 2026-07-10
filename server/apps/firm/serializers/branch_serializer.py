from rest_framework import serializers

from apps.firm.models import Branch
from apps.staff.models import Lawyer
from apps.users.models import User


class BranchSerializer(serializers.ModelSerializer):
    branch_leader_name = serializers.CharField(
        source="branch_leader.full_name",
        read_only=True,
    )

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "code",
            "email",
            "phone_number",
            "physical_address",
            "postal_address",
            "branch_leader",
            "branch_leader_name",
            "is_head_office",
            "is_active",
        ]
        read_only_fields = fields


class BranchWriteSerializer(serializers.ModelSerializer):
    branch_leader = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Branch
        fields = [
            "name",
            "code",
            "email",
            "phone_number",
            "physical_address",
            "postal_address",
            "branch_leader",
            "is_head_office",
            "is_active",
        ]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Branch name is required.")
        return value

    def validate_branch_leader(self, value):
        firm = self.context.get("firm")
        if firm is None:
            return value

        if value is None:
            raise serializers.ValidationError("Branch head is required.")

        if not Lawyer.objects.filter(
            law_firm=firm,
            user=value,
            is_active=True,
        ).exists():
            raise serializers.ValidationError(
                "Branch head must be a registered active lawyer in this firm."
            )

        return value
