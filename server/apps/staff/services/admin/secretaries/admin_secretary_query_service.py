from django.db.models import Q

from apps.staff.models import Secretary


class AdminSecretaryQueryService:
    @staticmethod
    def base_queryset(law_firm):
        return (
            Secretary.objects
            .filter(law_firm=law_firm)
            .select_related("user", "law_firm", "reports_to", "reports_to__user")
            .prefetch_related(
                "assigned_lawyers",
                "assigned_lawyers__user",
                "assigned_cases",
                "permissions",
            )
        )

    @staticmethod
    def list_secretaries(*, law_firm, employment_status=None, is_active=None, search=None):
        queryset = AdminSecretaryQueryService.base_queryset(law_firm)

        if employment_status:
            queryset = queryset.filter(employment_status=employment_status)

        if is_active is not None:
            if isinstance(is_active, str):
                is_active = is_active.lower() in ["1", "true", "yes"]
            queryset = queryset.filter(is_active=is_active)

        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(staff_number__icontains=search)
                | Q(employee_number__icontains=search)
            )

        return queryset.distinct()

    @staticmethod
    def get_secretary(*, secretary_id, law_firm):
        return AdminSecretaryQueryService.base_queryset(law_firm).get(id=secretary_id)
