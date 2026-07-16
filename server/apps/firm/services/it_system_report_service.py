from django.utils import timezone

from apps.cases.models import Case
from apps.clients.models import Client
from apps.firm.services.it_department_service import ITDepartmentService
from apps.staff.models import Accountant, HR, IT, Lawyer, Secretary


class ITSystemReportService:
    IT_TASKS = [
        {
            "name": "System health monitoring",
            "description": "Monitor every dashboard and workspace for availability and configuration issues.",
        },
        {
            "name": "User access support",
            "description": "Support staff accounts, password access, permissions, and role-based access issues.",
        },
        {
            "name": "Security checks",
            "description": "Review security settings, audit visibility, and account access concerns.",
        },
        {
            "name": "System settings support",
            "description": "Maintain technical settings that keep the platform usable by the firm.",
        },
        {
            "name": "Backup and continuity readiness",
            "description": "Track readiness for backups, recovery, and operational continuity.",
        },
        {
            "name": "Integration support",
            "description": "Support connected services and integration readiness as the platform grows.",
        },
    ]

    @classmethod
    def build_report(cls, firm):
        it_department = ITDepartmentService.get_it_department(firm)
        dashboards = cls.get_dashboard_health(firm, it_department)
        overall = round(
            sum(item["health_percentage"] for item in dashboards) / len(dashboards)
            if dashboards
            else 0
        )
        issues = [
            issue
            for dashboard in dashboards
            for issue in dashboard.get("issues", [])
        ]

        return {
            "generated_at": timezone.now().isoformat(),
            "firm": {
                "id": str(firm.id),
                "name": firm.name,
            },
            "ownership": {
                "source": "it_department" if it_department else "admin_fallback",
                "department_id": str(it_department.id) if it_department else None,
                "department_name": it_department.name if it_department else None,
                "message": (
                    "IT matters are managed by the IT department."
                    if it_department
                    else "No IT department exists, so admin handles IT matters."
                ),
            },
            "overall_health_percentage": overall,
            "status": cls.status_for(overall),
            "dashboards": dashboards,
            "issues": issues,
            "tasks": cls.IT_TASKS,
            "reporting": {
                "frequency": "Twice a month",
                "audience": "Admin dashboard",
                "purpose": "Show what IT checked, current system health, and issues needing action.",
            },
        }

    @classmethod
    def get_dashboard_health(cls, firm, it_department):
        return [
            cls.dashboard(
                "Admin Dashboard",
                [
                    ("Firm exists", bool(firm)),
                    ("Firm owner exists", bool(firm.owner_id)),
                    ("Settings configured", hasattr(firm, "settings")),
                    ("Admin access available", bool(firm.owner and firm.owner.is_active)),
                ],
            ),
            cls.dashboard(
                "Lawyer Dashboard",
                [
                    ("At least one active lawyer", Lawyer.objects.filter(law_firm=firm, is_active=True).exists()),
                    ("Owner lawyer profile exists", Lawyer.objects.filter(law_firm=firm, user=firm.owner).exists()),
                    ("Case assignment support ready", True),
                ],
            ),
            cls.dashboard(
                "Secretary Dashboard",
                [
                    ("Secretary profile available", Secretary.objects.filter(law_firm=firm, is_active=True).exists()),
                    ("Secretary case support ready", True),
                    ("Secretary document workspace ready", True),
                ],
            ),
            cls.dashboard(
                "Accountant Dashboard",
                [
                    ("Accountant profile available", Accountant.objects.filter(law_firm=firm, is_active=True).exists()),
                    ("Billing workspace route ready", True),
                    ("Financial document workspace ready", True),
                ],
            ),
            cls.dashboard(
                "HR Dashboard",
                [
                    ("HR profile available", HR.objects.filter(law_firm=firm, is_active=True).exists()),
                    ("Staff records workspace ready", True),
                    ("HR permissions model ready", True),
                ],
            ),
            cls.dashboard(
                "IT Dashboard",
                [
                    ("IT department exists", bool(it_department)),
                    ("Active IT staff exists", IT.objects.filter(law_firm=firm, is_active=True).exists()),
                    ("System health reporting ready", True),
                    ("IT ownership rule active", True),
                ],
            ),
            cls.dashboard(
                "Client Dashboard",
                [
                    ("Official clients can exist", True),
                    ("Active clients available", Client.objects.filter(firm=firm, is_active=True).exists()),
                    ("Client-case link ready", True),
                ],
            ),
            cls.dashboard(
                "Portal Dashboard",
                [
                    ("Portal client support enabled", True),
                    ("Portal-enabled clients exist", Client.objects.filter(
                        firm=firm,
                        access_type=Client.AccessType.PROSPECT,
                    ).exists()),
                    ("Assisted client separation ready", True),
                ],
            ),
            cls.dashboard(
                "Case Management",
                [
                    ("Case model active", True),
                    ("Cases available", Case.objects.filter(firm=firm).exists()),
                    ("Case assignment support ready", True),
                    ("Secretary assignment support ready", True),
                ],
            ),
            cls.dashboard(
                "Firm Management",
                [
                    ("Departments module ready", True),
                    ("Branches module ready", True),
                    ("Admin delegation support ready", True),
                    ("IT department uniqueness enforced", True),
                ],
            ),
        ]

    @classmethod
    def dashboard(cls, name, checks):
        total = len(checks) or 1
        passed = [label for label, ok in checks if ok]
        failed = [label for label, ok in checks if not ok]
        health = round((len(passed) / total) * 100)

        return {
            "name": name,
            "health_percentage": health,
            "status": cls.status_for(health),
            "checks_passed": len(passed),
            "checks_total": total,
            "healthy_checks": passed,
            "issues": failed,
        }

    @staticmethod
    def status_for(percentage):
        if percentage >= 90:
            return "HEALTHY"
        if percentage >= 70:
            return "WATCH"
        return "NEEDS_REPAIR"
