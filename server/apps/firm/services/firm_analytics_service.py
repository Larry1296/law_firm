from django.db.models import Count

from apps.firm.models import Branch, Department, PracticeArea, LawFirmMember


class FirmAnalyticsService:
    """
    Computes firm-level operational analytics.
    """

    @staticmethod
    def get_firm_summary(*, firm):
        members = LawFirmMember.objects.filter(firm=firm)

        active_members = members.filter(is_active=True).count()
        total_members = members.count()

        role_breakdown = (
            members.values("role")
            .annotate(total=Count("id"))
        )

        # --- Engagement health ---
        if total_members == 0:
            engagement_health = "no_data"
        else:
            ratio = active_members / total_members
            if ratio == 1:
                engagement_health = "healthy"
            elif ratio >= 0.7:
                engagement_health = "stable"
            else:
                engagement_health = "at_risk"

        # --- Structure type ---
        branch_count = Branch.objects.filter(firm=firm).count()
        structure_type = (
            "centralized" if branch_count <= 1 else "distributed"
        )

        return {
            "staff_summary": {
                "total_members": total_members,
                "active_members": active_members,
                "inactive_members": members.filter(is_active=False).count(),
                "by_role": {
                    item["role"]: item["total"]
                    for item in role_breakdown
                },
                "engagement_health": engagement_health,
            },

            "organization_summary": {
                "branches": branch_count,
                "departments": Department.objects.filter(firm=firm).count(),
                "practice_areas": PracticeArea.objects.filter(firm=firm).count(),
                "structure_type": structure_type,
            },

            "branch_breakdown": [
                {
                    "id": str(b.id),
                    "name": b.name,
                    "is_head_office": b.is_head_office,
                }
                for b in Branch.objects.filter(firm=firm)
            ],

            "firm_insights": {
                "maturity_stage": "early_stage" if total_members < 10 else "growing",
                "complexity_level": "low" if branch_count <= 1 else "medium",
            },
        }