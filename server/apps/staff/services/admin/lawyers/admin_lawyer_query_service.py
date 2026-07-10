from apps.staff.models.lawyer import Lawyer


class AdminLawyerQueryService:
    """
    Read/query service for admin-managed lawyers.
    """

    @staticmethod
    def base_queryset(law_firm):
        return (
            Lawyer.objects
            .filter(law_firm=law_firm)
            .select_related("user", "law_firm", "reports_to", "reports_to__user")
            .prefetch_related("practice_areas", "permissions", "assigned_cases")
        )

    @staticmethod
    def list_lawyers(
        *,
        law_firm,
        employment_status=None,
        is_active=None,
        search=None,
    ):
        queryset = AdminLawyerQueryService.base_queryset(law_firm)

        if employment_status:
            queryset = queryset.filter(employment_status=employment_status)

        if is_active is not None:
            if isinstance(is_active, str):
                is_active = is_active.lower() in ["1", "true", "yes"]
            queryset = queryset.filter(is_active=is_active)

        if search:
            queryset = queryset.filter(
                user__first_name__icontains=search
            ) | queryset.filter(
                user__last_name__icontains=search
            ) | queryset.filter(
                user__email__icontains=search
            ) | queryset.filter(
                admission_number__icontains=search
            )

        return queryset.distinct()

    @staticmethod
    def get_lawyer(*, lawyer_id, law_firm):
        return AdminLawyerQueryService.base_queryset(law_firm).get(
            id=lawyer_id,
        )
