import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.choices import EmploymentStatus, EmploymentType, FirmRole
from apps.common.models.timestamped_model import TimestampedModel


class HRPermission(models.TextChoices):
    MANAGE_STAFF_RECORDS = "MANAGE_STAFF_RECORDS", "Manage Staff Records"
    MANAGE_RECRUITMENT = "MANAGE_RECRUITMENT", "Manage Recruitment"
    MANAGE_LEAVE = "MANAGE_LEAVE", "Manage Leave"
    MANAGE_PAYROLL_RECORDS = "MANAGE_PAYROLL_RECORDS", "Manage Payroll Records"
    MANAGE_PERFORMANCE = "MANAGE_PERFORMANCE", "Manage Performance"
    VIEW_HR_REPORTS = "VIEW_HR_REPORTS", "View HR Reports"


class HR(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="hr_profile",
    )
    law_firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="hr_staff",
    )

    staff_number = models.CharField(max_length=30)
    employee_number = models.CharField(max_length=30, blank=True, null=True)
    firm_role = models.CharField(
        max_length=40,
        choices=FirmRole.choices,
        default=FirmRole.HR,
        editable=False,
    )
    department = models.CharField(max_length=100, blank=True, null=True)
    branch = models.ForeignKey(
        "firm.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_staff",
    )
    department_unit = models.ForeignKey(
        "firm.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_staff",
    )
    job_title = models.CharField(max_length=100, default="Human Resource Officer")
    work_email = models.EmailField(unique=True, blank=True, null=True)
    work_phone = models.CharField(max_length=20, blank=True, null=True)
    office_location = models.CharField(max_length=255, blank=True, null=True)
    reports_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hr_subordinates",
    )

    hr_specialization = models.CharField(max_length=100, blank=True, null=True)
    can_manage_staff_records = models.BooleanField(default=True)
    can_manage_recruitment = models.BooleanField(default=False)
    can_manage_leave = models.BooleanField(default=True)
    can_manage_payroll_records = models.BooleanField(default=False)

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
        db_table = "staff_hr"
        ordering = ["user__first_name", "user__last_name"]
        verbose_name = "Human Resource Staff"
        verbose_name_plural = "Human Resource Staff"
        constraints = [
            models.UniqueConstraint(
                fields=["law_firm", "staff_number"],
                name="unique_hr_staff_number_per_firm",
            ),
            models.UniqueConstraint(
                fields=["law_firm", "employee_number"],
                name="unique_hr_employee_number_per_firm",
                condition=models.Q(employee_number__isnull=False),
            ),
        ]

    def clean(self):
        super().clean()
        if self.firm_role != FirmRole.HR:
            raise ValidationError({"firm_role": "HR records must use the HR firm role."})

    def save(self, *args, **kwargs):
        self.firm_role = FirmRole.HR
        self.full_clean()
        return super().save(*args, **kwargs)

    def has_permission(self, code):
        return self.permissions.filter(code=code, is_active=True).exists()

    def __str__(self):
        return f"{self.user.full_name} - HR"


class HRPermissionGrant(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hr = models.ForeignKey(HR, on_delete=models.CASCADE, related_name="permissions")
    code = models.CharField(max_length=50, choices=HRPermission.choices)
    is_active = models.BooleanField(default=True)
    granted_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="granted_hr_permissions",
    )

    class Meta:
        db_table = "staff_hr_permissions"
        constraints = [
            models.UniqueConstraint(fields=["hr", "code"], name="unique_hr_permission")
        ]

    def __str__(self):
        return f"{self.hr} - {self.code}"
