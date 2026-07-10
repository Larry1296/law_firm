import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.choices import EmploymentStatus, EmploymentType, FirmRole
from apps.common.models.timestamped_model import TimestampedModel


class LawyerPermission(models.TextChoices):
    MANAGE_ASSIGNED_CASES = "MANAGE_ASSIGNED_CASES", "Manage Assigned Cases"
    CREATE_CASES = "CREATE_CASES", "Create Cases"
    MANAGE_CASE_DOCUMENTS = "MANAGE_CASE_DOCUMENTS", "Manage Case Documents"
    SCHEDULE_HEARINGS = "SCHEDULE_HEARINGS", "Schedule Hearings"
    MANAGE_CLIENT_COMMUNICATIONS = (
        "MANAGE_CLIENT_COMMUNICATIONS",
        "Manage Client Communications",
    )
    USE_LEGAL_RESEARCH = "USE_LEGAL_RESEARCH", "Use Legal Research"
    USE_AI_TOOLS = "USE_AI_TOOLS", "Use AI Tools"
    APPROVE_DOCUMENTS = "APPROVE_DOCUMENTS", "Approve Documents"
    VIEW_BILLING = "VIEW_BILLING", "View Billing"


class Lawyer(TimestampedModel):
    """
    Represents a lawyer employed by the law firm.

    Identity and authentication live in User.
    This model stores lawyer employment and professional details.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="lawyer_profile",
    )

    law_firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="lawyers",
    )

    staff_number = models.CharField(
        max_length=30,
    )

    employee_number = models.CharField(
        max_length=30,
        blank=True,
        null=True,
    )

    firm_role = models.CharField(
        max_length=40,
        choices=FirmRole.choices,
        default=FirmRole.LAWYER,
        editable=False,
    )

    department = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    branch = models.ForeignKey(
        "firm.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lawyers",
    )

    department_unit = models.ForeignKey(
        "firm.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lawyers",
    )

    job_title = models.CharField(
        max_length=100,
        default="Lawyer",
    )

    work_email = models.EmailField(
        unique=True,
        blank=True,
        null=True,
    )

    work_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    office_location = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    reports_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="junior_lawyers",
    )

    admission_number = models.CharField(
        max_length=50,
        unique=True,
    )

    practicing_certificate_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    bar_admission_date = models.DateField(
        blank=True,
        null=True,
    )

    practice_areas = models.ManyToManyField(
        "firm.PracticeArea",
        blank=True,
        related_name="lawyers",
    )

    is_notary = models.BooleanField(
        default=False,
    )

    can_commission_oaths = models.BooleanField(
        default=False,
    )

    is_court_approved = models.BooleanField(
        default=True,
    )

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

    probation_end_date = models.DateField(
        blank=True,
        null=True,
    )

    date_terminated = models.DateField(
        blank=True,
        null=True,
    )

    termination_reason = models.TextField(
        blank=True,
        null=True,
    )

    professional_summary = models.TextField(
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        db_table = "staff_lawyers"
        ordering = ["user__first_name", "user__last_name"]
        verbose_name = "Lawyer"
        verbose_name_plural = "Lawyers"
        constraints = [
            models.UniqueConstraint(
                fields=["law_firm", "staff_number"],
                name="unique_lawyer_staff_number_per_firm",
            ),
            models.UniqueConstraint(
                fields=["law_firm", "employee_number"],
                name="unique_lawyer_employee_number_per_firm",
                condition=models.Q(employee_number__isnull=False),
            ),
        ]

    def clean(self):
        super().clean()

        if self.firm_role != FirmRole.LAWYER:
            raise ValidationError(
                {"firm_role": "Lawyer records must use the LAWYER firm role."}
            )

    def save(self, *args, **kwargs):
        self.firm_role = FirmRole.LAWYER
        self.full_clean()
        return super().save(*args, **kwargs)

    def has_permission(self, code):
        return self.permissions.filter(code=code, is_active=True).exists()

    def __str__(self):
        return f"{self.user.full_name} - Lawyer"


class LawyerPermissionGrant(TimestampedModel):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    lawyer = models.ForeignKey(
        Lawyer,
        on_delete=models.CASCADE,
        related_name="permissions",
    )
    code = models.CharField(max_length=50, choices=LawyerPermission.choices)
    is_active = models.BooleanField(default=True)
    granted_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="granted_lawyer_permissions",
    )

    class Meta:
        db_table = "staff_lawyer_permissions"
        constraints = [
            models.UniqueConstraint(
                fields=["lawyer", "code"],
                name="unique_lawyer_permission",
            ),
        ]

    def __str__(self):
        return f"{self.lawyer} - {self.code}"
