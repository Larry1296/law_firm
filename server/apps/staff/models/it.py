import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.choices import EmploymentStatus, EmploymentType, FirmRole
from apps.common.models.timestamped_model import TimestampedModel


class ITPermission(models.TextChoices):
    MANAGE_USERS = "MANAGE_USERS", "Manage Users"
    MANAGE_SYSTEM_SETTINGS = "MANAGE_SYSTEM_SETTINGS", "Manage System Settings"
    MANAGE_SECURITY = "MANAGE_SECURITY", "Manage Security"
    VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS", "View Audit Logs"
    MANAGE_BACKUPS = "MANAGE_BACKUPS", "Manage Backups"
    MANAGE_INTEGRATIONS = "MANAGE_INTEGRATIONS", "Manage Integrations"


class IT(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="it_profile",
    )
    law_firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="it_staff",
    )

    staff_number = models.CharField(max_length=30)
    employee_number = models.CharField(max_length=30, blank=True, null=True)
    firm_role = models.CharField(
        max_length=40,
        choices=FirmRole.choices,
        default=FirmRole.IT,
        editable=False,
    )
    department = models.CharField(max_length=100, blank=True, null=True)
    branch = models.ForeignKey(
        "firm.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="it_staff",
    )
    department_unit = models.ForeignKey(
        "firm.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="it_staff",
    )
    job_title = models.CharField(max_length=100, default="IT Support")
    work_email = models.EmailField(unique=True, blank=True, null=True)
    work_phone = models.CharField(max_length=20, blank=True, null=True)
    office_location = models.CharField(max_length=255, blank=True, null=True)
    reports_to = models.ForeignKey(
        "staff.HR",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="it_staff_members",
    )

    technical_specialization = models.CharField(max_length=100, blank=True, null=True)
    certification = models.CharField(max_length=100, blank=True, null=True)
    can_manage_users = models.BooleanField(default=False)
    can_manage_system_settings = models.BooleanField(default=False)
    can_manage_security = models.BooleanField(default=False)
    can_access_audit_logs = models.BooleanField(default=True)

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
        db_table = "staff_it"
        ordering = ["user__first_name", "user__last_name"]
        verbose_name = "IT Staff"
        verbose_name_plural = "IT Staff"
        constraints = [
            models.UniqueConstraint(
                fields=["law_firm", "staff_number"],
                name="unique_it_staff_number_per_firm",
            ),
            models.UniqueConstraint(
                fields=["law_firm", "employee_number"],
                name="unique_it_employee_number_per_firm",
                condition=models.Q(employee_number__isnull=False),
            ),
        ]

    def clean(self):
        super().clean()
        if self.firm_role != FirmRole.IT:
            raise ValidationError({"firm_role": "IT records must use the IT firm role."})

    def save(self, *args, **kwargs):
        self.firm_role = FirmRole.IT
        self.full_clean()
        return super().save(*args, **kwargs)

    def has_permission(self, code):
        return self.permissions.filter(code=code, is_active=True).exists()

    def __str__(self):
        return f"{self.user.full_name} - IT"


class ITPermissionGrant(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    it = models.ForeignKey(IT, on_delete=models.CASCADE, related_name="permissions")
    code = models.CharField(max_length=50, choices=ITPermission.choices)
    is_active = models.BooleanField(default=True)
    granted_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="granted_it_permissions",
    )

    class Meta:
        db_table = "staff_it_permissions"
        constraints = [
            models.UniqueConstraint(fields=["it", "code"], name="unique_it_permission")
        ]

    def __str__(self):
        return f"{self.it} - {self.code}"
