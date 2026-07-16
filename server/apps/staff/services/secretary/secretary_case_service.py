from django.db.models import Q

from apps.staff.models import SecretaryPermission
from apps.cases.models import Case


class SecretaryCaseService:
    @staticmethod
    def get_secretary(user):
        secretary = getattr(user, "secretary_profile", None)
        if secretary is None:
            raise ValueError("Only secretaries can access this endpoint.")

        if not secretary.is_active:
            raise PermissionError("Secretary profile is inactive.")

        return secretary

    @staticmethod
    def ensure_can_manage_cases(user):
        secretary = SecretaryCaseService.get_secretary(user)

        if not secretary.has_permission(SecretaryPermission.MANAGE_CASES):
            raise PermissionError("Admin permission is required to manage cases.")

        return secretary

    @staticmethod
    def list_cases(user):
        secretary = SecretaryCaseService.get_secretary(user)
        assigned_lawyer_ids = secretary.assigned_lawyers.values_list("id", flat=True)

        return (
            Case.objects.filter(
                firm=secretary.law_firm,
                is_active=True,
            )
            .filter(
                Q(assigned_secretary=secretary)
                | Q(assigned_lawyer_id__in=assigned_lawyer_ids)
            )
            .select_related(
                "firm",
                "client",
                "assigned_lawyer",
                "assigned_lawyer__user",
                "assigned_secretary",
                "assigned_secretary__user",
                "created_by",
            )
            .prefetch_related("timeline", "activities")
            .order_by("-created_at")
        )

    @classmethod
    def get_case(cls, user, case_id):
        try:
            secretary = cls.get_secretary(user)
            assigned_lawyer_ids = secretary.assigned_lawyers.values_list("id", flat=True)
            return Case.objects.filter(
                firm=secretary.law_firm,
                is_active=True,
            ).filter(
                Q(assigned_secretary=secretary)
                | Q(assigned_lawyer_id__in=assigned_lawyer_ids)
            ).get(id=case_id)
        except Exception:
            return None
