from django.utils import timezone

from apps.firm.services.it_department_service import ITDepartmentService
from apps.firm.services.it_system_report_service import ITSystemReportService
from apps.notifications.services import NotificationService


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
        recent_notifications = NotificationService.dashboard_items(user)
        from apps.cases.services.my_work_service import MyWorkService

        pending_work = MyWorkService.items(user)

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
                "pending_tasks": len(pending_work),
                "overdue_tasks": sum(1 for item in pending_work if item["overdue"]),
                "documents": 0,
                "notifications": NotificationService.unread_count(user),
                "unread_notifications": NotificationService.unread_count(user),
                **({"it_management": it_management} if it_management else {}),
            },
            "permissions": permissions,
            "default_work": default_work(profile),
            **({"system_health": system_report} if profile.firm_role == "IT" else {}),
            "recent_notifications": recent_notifications,
            "recent_activity": recent_notifications,
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
    def _invoice_item(invoice, today):
        overdue = bool(invoice.due_date and invoice.due_date < today and invoice.balance > 0)
        return {
            "id": str(invoice.id),
            "title": f"Invoice {invoice.invoice_number}",
            "subtitle": f"{invoice.client.full_name} · {invoice.matter.case_number} · {invoice.currency} {invoice.balance:,.2f} outstanding",
            "status": invoice.get_status_display(),
            "due_at": invoice.due_date.isoformat() if invoice.due_date else None,
            "overdue": overdue,
        }

    @staticmethod
    def _work_item(item):
        return {
            "id": item["id"],
            "title": item["title"],
            "subtitle": f"{item['case_number']} · {item['client_name']} — {item['description']}".strip(" —"),
            "status": item["status"],
            "due_at": item["due_at"],
            "overdue": item["overdue"],
        }

    @staticmethod
    def items(user, profile_attr, role_label, item_type):
        """Real records for the accountant, HR and IT workspaces. Empty lists are honest, never padded."""
        from apps.billing.models import Invoice, PaymentInstruction
        from apps.cases.services.my_work_service import MyWorkService
        from apps.staff.models import HR, IT, Accountant, Lawyer, Secretary

        profile = StaffWorkspaceService.get_profile(user, profile_attr, role_label)
        firm = profile.law_firm
        today = timezone.localdate()

        if item_type == "notification":
            return NotificationService.list_for_user(user)

        if item_type == "task":
            return [StaffWorkspaceService._work_item(item) for item in MyWorkService.items(user)]

        open_invoices = (
            Invoice.objects.filter(firm=firm)
            .exclude(status__in=["PAID", "CANCELLED", "CREDITED"])
            .select_related("client", "matter")
            .order_by("due_date")
        )

        if item_type == "calendar-event":
            dated = [StaffWorkspaceService._work_item(item) for item in MyWorkService.items(user) if item["due_at"]]
            if profile_attr == "accountant_profile":
                dated += [
                    StaffWorkspaceService._invoice_item(invoice, today)
                    for invoice in open_invoices.filter(due_date__isnull=False, status__in=["ISSUED", "PARTIALLY_PAID", "OVERDUE"])
                ]
            return sorted(dated, key=lambda item: str(item["due_at"]))

        if item_type == "billing":
            pending_payments = PaymentInstruction.objects.filter(firm=firm, status="PENDING_APPROVAL").select_related("matter")
            return [StaffWorkspaceService._invoice_item(invoice, today) for invoice in open_invoices] + [
                {
                    "id": str(payment.id),
                    "title": f"Client-money payment to {payment.beneficiary_name}",
                    "subtitle": f"{payment.matter.case_number} · {payment.currency} {payment.amount:,.2f} — awaiting independent approval",
                    "status": payment.get_status_display(),
                    "due_at": None,
                    "overdue": False,
                }
                for payment in pending_payments
            ]

        if item_type == "document" and profile_attr == "accountant_profile":
            issued = Invoice.objects.filter(firm=firm, issued_at__isnull=False).select_related("client", "matter").order_by("-issued_at")[:100]
            return [StaffWorkspaceService._invoice_item(invoice, today) for invoice in issued]

        if item_type == "staff-record":
            records = []
            for model, role in ((Lawyer, "Advocate"), (Secretary, "Secretary"), (Accountant, "Accountant"), (HR, "HR"), (IT, "IT")):
                for staff in model.objects.filter(law_firm=firm).select_related("user").order_by("user__first_name"):
                    records.append({
                        "id": str(staff.id),
                        "title": staff.user.full_name,
                        "subtitle": " · ".join(filter(None, [
                            role, staff.job_title or "", staff.staff_number,
                            f"hired {staff.date_hired:%d %b %Y}" if staff.date_hired else "",
                            getattr(staff, "admission_number", "") and f"Adm. {staff.admission_number}",
                        ])),
                        "status": staff.get_employment_status_display(),
                        "due_at": None,
                        "overdue": False,
                    })
            return records

        return []
