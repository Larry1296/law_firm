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
        """Every check reads the firm's own records; none is hardcoded to pass."""
        from datetime import timedelta

        from apps.audit_logs.models import AuditEvent
        from apps.billing.models import FinancialAccount, TaxConfiguration
        from apps.clients.models import ClientComplianceReview, IntakePrivacyConfig
        from apps.documents.models import DocumentRequest
        from apps.firm.models import FirmSetting, LawFirmMember
        from apps.subscriptions.catalog import Feature
        from apps.subscriptions.services import SubscriptionService

        now = timezone.now()
        open_matters = Case.objects.filter(firm=firm).exclude(
            matter_status__in=[Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED, Case.MatterStatus.CANCELLED],
        )
        active_lawyers = Lawyer.objects.filter(law_firm=firm, is_active=True)
        staff_users = [
            profile.user_id
            for model in (Lawyer, Secretary, Accountant, HR, IT)
            for profile in model.objects.filter(law_firm=firm, is_active=True).only("user_id")
        ]
        clients_with_matters = Client.objects.filter(firm=firm, cases__in=open_matters).distinct()
        return [
            cls.dashboard(
                "Admin Dashboard",
                [
                    ("Firm owner exists", bool(firm.owner_id)),
                    ("Firm settings configured", FirmSetting.objects.filter(firm=firm).exists()),
                    ("Firm owner account active", bool(firm.owner and firm.owner.is_active)),
                    ("Firm contact email recorded", bool(firm.email)),
                ],
            ),
            cls.dashboard(
                "Lawyer Dashboard",
                [
                    ("At least one active advocate", active_lawyers.exists()),
                    ("Managing partner has an advocate profile", active_lawyers.filter(user=firm.owner).exists()),
                    ("Every open matter has an assigned advocate", not open_matters.filter(assigned_lawyer__isnull=True).exists()),
                ],
            ),
            cls.dashboard(
                "Secretary Dashboard",
                [
                    ("Active secretary available", Secretary.objects.filter(law_firm=firm, is_active=True).exists()),
                    ("Every active advocate has a secretary", not active_lawyers.exclude(
                        assigned_secretaries__is_active=True,
                    ).exists()),
                    ("Client uploads verified within 3 days", not DocumentRequest.objects.filter(
                        firm=firm, status=DocumentRequest.Status.PENDING_SECRETARY, updated_at__lt=now - timedelta(days=3),
                    ).exists()),
                ],
            ),
            cls.dashboard(
                "Accountant Dashboard",
                [
                    ("Active accountant available", Accountant.objects.filter(law_firm=firm, is_active=True).exists()),
                    ("Client bank account registered", FinancialAccount.objects.filter(firm=firm, account_type="CLIENT").exists()),
                    ("Office bank account registered", FinancialAccount.objects.filter(firm=firm, account_type="OFFICE").exists()),
                    ("Tax (VAT) configuration recorded", TaxConfiguration.objects.filter(firm=firm).exists()),
                ],
            ),
            cls.dashboard(
                "HR Dashboard",
                [
                    ("Active HR officer available", HR.objects.filter(law_firm=firm, is_active=True).exists()),
                    ("Every active staff member has a firm membership", LawFirmMember.objects.filter(
                        firm=firm, is_active=True, user_id__in=staff_users,
                    ).count() >= len(set(staff_users))),
                ],
            ),
            cls.dashboard(
                "IT Dashboard",
                [
                    ("IT department exists", bool(it_department)),
                    ("Active IT staff exists", IT.objects.filter(law_firm=firm, is_active=True).exists()),
                    ("Audit log recorded activity in the last 30 days", AuditEvent.objects.filter(
                        firm=firm, timestamp__gte=now - timedelta(days=30),
                    ).exists()),
                ],
            ),
            cls.dashboard(
                "Client Dashboard",
                [
                    ("Active intake privacy notice", IntakePrivacyConfig.objects.filter(firm=firm, status="ACTIVE").exists()),
                    ("Clients on record", Client.objects.filter(firm=firm, is_active=True).exists()),
                    ("Every client with an open matter has a compliance review", not clients_with_matters.exclude(
                        id__in=ClientComplianceReview.objects.filter(firm=firm).values("client_id"),
                    ).exists()),
                ],
            ),
            cls.dashboard(
                "Portal Dashboard",
                [
                    ("Client portal included in the plan", SubscriptionService.has_feature(firm, Feature.CLIENT_PORTAL)),
                    ("Portal invitations outstanding for under 14 days", not Client.objects.filter(
                        firm=firm, portal_status="INVITED", user__last_login__isnull=True,
                        updated_at__lt=now - timedelta(days=14),
                    ).exists()),
                ],
            ),
            cls.dashboard(
                "Case Management",
                [
                    ("Matters on record", Case.objects.filter(firm=firm).exists()),
                    ("Every open matter has a matter secretary", not open_matters.filter(assigned_secretary__isnull=True).exists()),
                    ("No overdue court or filing deadlines", not open_matters.filter(
                        deadlines__status="OPEN", deadlines__due_at__lt=now,
                    ).exists()),
                ],
            ),
            cls.dashboard(
                "Firm Management",
                [
                    ("Head office branch recorded", firm.branches.filter(is_head_office=True, is_active=True).exists()),
                    ("At least one department recorded", firm.departments.filter(is_active=True).exists()),
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
