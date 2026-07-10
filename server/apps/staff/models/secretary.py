import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.choices import EmploymentStatus, EmploymentType, FirmRole
from apps.common.models.timestamped_model import TimestampedModel


class SecretaryPermission(models.TextChoices):
    MANAGE_CLIENTS = "MANAGE_CLIENTS", "Manage Clients"
    MANAGE_CASES = "MANAGE_CASES", "Manage Cases"
    MANAGE_DOCUMENTS = "MANAGE_DOCUMENTS", "Manage Documents"
    MANAGE_CALENDAR = "MANAGE_CALENDAR", "Manage Calendar"
    MANAGE_TASKS = "MANAGE_TASKS", "Manage Tasks"
    SEND_COMMUNICATIONS = "SEND_COMMUNICATIONS", "Send Communications"
    VIEW_REPORTS = "VIEW_REPORTS", "View Reports"
    MANAGE_BILLING = "MANAGE_BILLING", "Manage Billing"


class Secretary(TimestampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="secretary_profile",
    )

    law_firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="secretaries",
    )

    staff_number = models.CharField(max_length=30)
    employee_number = models.CharField(max_length=30, blank=True, null=True)

    firm_role = models.CharField(
        max_length=40,
        choices=FirmRole.choices,
        default=FirmRole.SECRETARY,
        editable=False,
    )

    department = models.CharField(max_length=100, blank=True, null=True)
    branch = models.ForeignKey(
        "firm.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="secretaries",
    )
    department_unit = models.ForeignKey(
        "firm.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="secretaries",
    )
    job_title = models.CharField(max_length=100, default="Secretary")
    work_email = models.EmailField(unique=True, blank=True, null=True)
    work_phone = models.CharField(max_length=20, blank=True, null=True)
    office_location = models.CharField(max_length=255, blank=True, null=True)

    reports_to = models.ForeignKey(
        "staff.Lawyer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="secretaries",
    )

    assigned_lawyers = models.ManyToManyField(
        "staff.Lawyer",
        blank=True,
        related_name="assigned_secretaries",
    )

    can_prepare_documents = models.BooleanField(default=True)
    can_schedule_appointments = models.BooleanField(default=True)
    can_manage_client_intake = models.BooleanField(default=True)
    can_receive_documents = models.BooleanField(default=True)

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
        db_table = "staff_secretaries"
        ordering = ["user__first_name", "user__last_name"]
        verbose_name = "Secretary"
        verbose_name_plural = "Secretaries"
        constraints = [
            models.UniqueConstraint(
                fields=["law_firm", "staff_number"],
                name="unique_secretary_staff_number_per_firm",
            ),
            models.UniqueConstraint(
                fields=["law_firm", "employee_number"],
                name="unique_secretary_employee_number_per_firm",
                condition=models.Q(employee_number__isnull=False),
            ),
        ]

    def clean(self):
        super().clean()
        if self.firm_role != FirmRole.SECRETARY:
            raise ValidationError(
                {"firm_role": "Secretary records must use the SECRETARY firm role."}
            )

    def save(self, *args, **kwargs):
        self.firm_role = FirmRole.SECRETARY
        self.full_clean()
        return super().save(*args, **kwargs)

    def has_permission(self, code):
        return self.permissions.filter(code=code, is_active=True).exists()

    def __str__(self):
        return f"{self.user.full_name} - Secretary"


class SecretaryPermissionGrant(TimestampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    secretary = models.ForeignKey(
        Secretary,
        on_delete=models.CASCADE,
        related_name="permissions",
    )
    code = models.CharField(max_length=40, choices=SecretaryPermission.choices)
    is_active = models.BooleanField(default=True)
    granted_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="granted_secretary_permissions",
    )

    class Meta:
        db_table = "staff_secretary_permissions"
        constraints = [
            models.UniqueConstraint(
                fields=["secretary", "code"],
                name="unique_secretary_permission",
            ),
        ]

    def __str__(self):
        return f"{self.secretary} - {self.code}"
