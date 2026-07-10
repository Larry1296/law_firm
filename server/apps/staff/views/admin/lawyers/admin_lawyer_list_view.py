from django.db.models import Count

from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.admin.lawyers.admin_lawyer_list_serializer import (
    AdminLawyerListSerializer,
)
from apps.staff.services.admin.lawyers.admin_lawyer_query_service import (
    AdminLawyerQueryService,
)
from apps.staff.views.admin.lawyers.admin_lawyer_base_view import (
    AdminLawyerBaseView,
)


class AdminLawyerListView(AdminLawyerBaseView):

    def get(self, request):
        lawyers = AdminLawyerQueryService.list_lawyers(
            law_firm=self.get_law_firm(),
            employment_status=request.query_params.get("employment_status"),
            is_active=request.query_params.get("is_active"),
            search=request.query_params.get("search"),
        )

        serializer = AdminLawyerListSerializer(lawyers, many=True)

        # -------------------------------
        # BASIC METRICS
        # -------------------------------
        total = lawyers.count()
        active = lawyers.filter(is_active=True).count()
        inactive = lawyers.filter(is_active=False).count()

        # -------------------------------
        # EMPLOYMENT BREAKDOWN
        # -------------------------------
        employment_breakdown = (
            lawyers.values("employment_status")
            .annotate(total=Count("id"))
        )

        employment_types = (
            lawyers.values("employment_type")
            .annotate(total=Count("id"))
        )

        # -------------------------------
        # DEPARTMENT BREAKDOWN
        # -------------------------------
        department_breakdown = (
            lawyers.values("department")
            .annotate(total=Count("id"))
        )

        # -------------------------------
        # PROFESSIONAL FLAGS
        # -------------------------------
        notaries = lawyers.filter(is_notary=True).count()
        court_approved = lawyers.filter(is_court_approved=True).count()
        oath_commissioners = lawyers.filter(can_commission_oaths=True).count()

        # -------------------------------
        # ENGAGEMENT HEALTH
        # -------------------------------
        engagement_health = "no_data"
        if total > 0:
            ratio = active / total
            if ratio == 1:
                engagement_health = "healthy"
            elif ratio >= 0.7:
                engagement_health = "stable"
            else:
                engagement_health = "at_risk"

        # -------------------------------
        # RESPONSE
        # -------------------------------
        return Response(
            {
                "lawyers": serializer.data,

                "metadata": {
                    "total_records": total,

                    "summary": {
                        "active": active,
                        "inactive": inactive,
                        "engagement_health": engagement_health,
                    },

                    "employment_status_breakdown": {
                        item["employment_status"]: item["total"]
                        for item in employment_breakdown
                    },

                    "employment_type_breakdown": {
                        item["employment_type"]: item["total"]
                        for item in employment_types
                    },

                    "department_breakdown": {
                        item["department"] or "Unassigned": item["total"]
                        for item in department_breakdown
                    },

                    "professional_summary": {
                        "notaries": notaries,
                        "court_approved": court_approved,
                        "oath_commissioners": oath_commissioners,
                    },
                },
            },
            status=status.HTTP_200_OK,
        )