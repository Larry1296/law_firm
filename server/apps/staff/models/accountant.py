import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.choices import EmploymentStatus, EmploymentType, FirmRole
from apps.common.models.timestamped_model import TimestampedModel


class AccountantPermission(models.TextChoices):
    MANAGE_INVOICES = "MANAGE_INVOICES", "Manage Invoices"
    MANAGE_PAYMENTS = "MANAGE_PAYMENTS", "Manage Payments"
    MANAGE_EXPENSES = "MANAGE_EXPENSES", "Manage Expenses"
    VIEW_FINANCIAL_REPORTS = "VIEW_FINANCIAL_REPORTS", "View Financial Reports"
    MANAGE_CLIENT_BILLING = "MANAGE_CLIENT_BILLING", "Manage Client Billing"
    MANAGE_PAYROLL = "MANAGE_PAYROLL", "Manage Payroll"
    MANAGE_TAX_RECORDS = "MANAGE_TAX_RECORDS", "Manage Tax Records"


class Accountant(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="accountant_profile",
    )
    law_firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="accountants",
    )

    staff_number = models.CharField(max_length=30)
    employee_number = models.CharField(max_length=30, blank=True, null=True)
    firm_role = models.CharField(
        max_length=40,
        choices=FirmRole.choices,
        default=FirmRole.ACCOUNTANT,
        editable=False,
    )
    department = models.CharField(max_length=100, blank=True, null=True)
    branch = models.ForeignKey(
        "firm.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accountants",
    )
    department_unit = models.ForeignKey(
        "firm.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accountants",
    )
    job_title = models.CharField(max_length=100, default="Accountant")
    work_email = models.EmailField(unique=True, blank=True, null=True)
    work_phone = models.CharField(max_length=20, blank=True, null=True)
    office_location = models.CharField(max_length=255, blank=True, null=True)
    reports_to = models.ForeignKey(
        "staff.HR",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="accountants",
    )

    accounting_specialization = models.CharField(max_length=100, blank=True, null=True)
    professional_license_number = models.CharField(max_length=80, blank=True, null=True)
    can_manage_invoices = models.BooleanField(default=True)
    can_manage_payments = models.BooleanField(default=True)
    can_manage_expenses = models.BooleanField(default=False)
    can_view_financial_reports = models.BooleanField(default=True)

    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.PERMANENT,
    )
    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )
    date_hired = models.DateField()
    probation_end_date = models.DateField(blank=True, null=True)
    date_terminated = models.DateField(blank=True, null=True)
    termination_reason = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "staff_accountants"
        ordering = ["user__first_name", "user__last_name"]
        verbose_name = "Accountant"
        verbose_name_plural = "Accountants"
        constraints = [
            models.UniqueConstraint(
                fields=["law_firm", "staff_number"],
                name="unique_accountant_staff_number_per_firm",
            ),
            models.UniqueConstraint(
                fields=["law_firm", "employee_number"],
                name="unique_accountant_employee_number_per_firm",
                condition=models.Q(employee_number__isnull=False),
            ),
        ]

    def clean(self):
        super().clean()
        if self.firm_role != FirmRole.ACCOUNTANT:
            raise ValidationError(
                {"firm_role": "Accountant records must use the ACCOUNTANT firm role."}
            )

    def save(self, *args, **kwargs):
        self.firm_role = FirmRole.ACCOUNTANT
        self.full_clean()
        return super().save(*args, **kwargs)

    def has_permission(self, code):
        return self.permissions.filter(code=code, is_active=True).exists()

    def __str__(self):
        return f"{self.user.full_name} - Accountant"


class AccountantPermissionGrant(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    accountant = models.ForeignKey(
        Accountant,
        on_delete=models.CASCADE,
        related_name="permissions",
    )
    code = models.CharField(max_length=50, choices=AccountantPermission.choices)
    is_active = models.BooleanField(default=True)
    granted_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="granted_accountant_permissions",
    )

    class Meta:
        db_table = "staff_accountant_permissions"
        constraints = [
            models.UniqueConstraint(
                fields=["accountant", "code"],
                name="unique_accountant_permission",
            )
        ]

    def __str__(self):
        return f"{self.accountant} - {self.code}"
