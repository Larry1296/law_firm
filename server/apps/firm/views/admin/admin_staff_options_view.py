from rest_framework.response import Response

from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminStaffOptionsView(AdminFirmBaseView):
    def get(self, request):
        firm = self.get_firm()
        members = (
            firm.members.filter(is_active=True)
            .select_related("user")
            .order_by("user__first_name", "user__last_name")
        )

        options = [
            {
                "user_id": firm.owner_id,
                "full_name": firm.owner.full_name,
                "email": firm.owner.email,
                "firm_role": "LAWYER",
                "label": f"{firm.owner.full_name} (Firm Owner)",
            }
        ]

        for member in members:
            if member.user_id == firm.owner_id:
                continue
            options.append(
                {
                    "user_id": member.user_id,
                    "full_name": member.user.full_name,
                    "email": member.user.email,
                    "firm_role": member.role,
                    "label": f"{member.user.full_name} ({member.get_role_display()})",
                }
            )

        return Response({"staff": options})
