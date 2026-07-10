from apps.firm.services.it_department_service import ITDepartmentService
from apps.firm.services.it_system_report_service import ITSystemReportService


class StaffWorkspaceService:
    @staticmethod
    def get_profile(user, profile_attr, role_label):
        profile = getattr(user, profile_attr, None)
        if profile is None:
            raise ValueError(f"Only {role_label} staff can access this endpoint.")
        return profile

    @staticmethod
    def update_profile(user, profile_attr, role_label, data):
        profile = StaffWorkspaceService.get_profile(user, profile_attr, role_label)
        allowed_fields = ["work_phone", "office_location", "notes"]

        for field in allowed_fields:
            if field in data:
                setattr(profile, field, data[field])

        profile.save()
        return profile

    @staticmethod
    def dashboard(user, profile_attr, role_label, default_work):
        profile = StaffWorkspaceService.get_profile(user, profile_attr, role_label)
        permissions = list(
            profile.permissions.filter(is_active=True).values_list("code", flat=True)
        )
        it_department = (
            ITDepartmentService.get_it_department(profile.law_firm)
            if profile.firm_role == "IT"
            else None
        )
        it_management = None
        if profile.firm_role == "IT":
            system_report = ITSystemReportService.build_report(profile.law_firm)
            it_management = {
                **system_report["ownership"],
                "overall_health_percentage": system_report["overall_health_percentage"],
                "status": system_report["status"],
            }

        return {
            "profile": {
                "id": str(profile.id),
                "full_name": user.full_name,
                "email": user.email,
                "firm_role": profile.firm_role,
                "job_title": profile.job_title,
                "law_firm": profile.law_firm.name,
            },
            "summary": {
                "active_permissions": len(permissions),
                "pending_tasks": 0,
                "documents": 0,
                "notifications": 0,
                **({"it_management": it_management} if it_management else {}),
            },
            "permissions": permissions,
            "default_work": default_work(profile),
            **({"system_health": system_report} if profile.firm_role == "IT" else {}),
            "recent_activity": [
                {
                    "id": "activity-001",
                    "title": f"{role_label} dashboard ready",
                    "description": "Your workspace is active.",
                }
            ],
        }

    @staticmethod
    def change_password(user, profile_attr, role_label, *, old_password, new_password):
        StaffWorkspaceService.get_profile(user, profile_attr, role_label)

        if not user.check_password(old_password):
            raise ValueError("Old password is incorrect.")

        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])
        return True

    @staticmethod
    def placeholder_items(user, profile_attr, role_label, item_type):
        StaffWorkspaceService.get_profile(user, profile_attr, role_label)
        return [
            {
                "id": f"{item_type}-001",
                "title": f"{role_label} {item_type.replace('-', ' ')} workspace ready",
                "status": "READY",
            }
        ]
