from rest_framework import serializers

from apps.firm.models import Branch, Department
from apps.firm.services.it_department_service import ITDepartmentService
from apps.users.models import User


class DepartmentSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    head_name = serializers.CharField(source="head.full_name", read_only=True)

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "branch",
            "branch_name",
            "head",
            "head_name",
        ]
        read_only_fields = fields


class DepartmentWriteSerializer(serializers.ModelSerializer):
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        required=False,
        allow_null=True,
    )
    head = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Department
        fields = [
            "name",
            "description",
            "branch",
            "head",
            "is_active",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Department name is required.")

        return value

    def validate_branch(self, value):
        firm = self.context.get("firm")
        if value is not None and firm and value.firm_id != firm.id:
            raise serializers.ValidationError("Branch must belong to this firm.")
        return value

    def validate_head(self, value):
        firm = self.context.get("firm")
        if value is None or firm is None:
            return value

        if value == firm.owner:
            return value

        if not value.firm_memberships.filter(firm=firm, is_active=True).exists():
            raise serializers.ValidationError(
                "Department head must be the firm owner or an active staff member."
            )

        return value

    def validate(self, attrs):
        firm = self.context.get("firm")
        name = attrs.get("name") or getattr(self.instance, "name", "")
        branch = attrs.get("branch", getattr(self.instance, "branch", None))

        if ITDepartmentService.is_it_department_name(name):
            if branch is not None:
                raise serializers.ValidationError(
                    {"branch": "The IT department is firm-wide and cannot belong to a branch."}
                )

            exclude_id = getattr(self.instance, "id", None)
            if ITDepartmentService.it_department_exists(firm, exclude_id):
                raise serializers.ValidationError(
                    {"name": "Only one IT department is allowed for this firm."}
                )

            attrs["name"] = "IT"

        return attrs
