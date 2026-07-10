# Generated while cleanly starting the independent lawyer staff role.

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("firm", "0002_alter_lawfirmmember_role"),
        ("staff", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Lawyer",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("staff_number", models.CharField(max_length=30)),
                ("employee_number", models.CharField(blank=True, max_length=30, null=True)),
                (
                    "firm_role",
                    models.CharField(
                        choices=[
                            ("LAWYER", "Lawyer"),
                            ("SECRETARY", "Secretary"),
                            ("IT", "IT Support"),
                            ("ACCOUNTANT", "Accountant"),
                            ("HR", "Human Resource"),
                            ("OFFICIAL_CLIENT", "Official Client"),
                        ],
                        default="LAWYER",
                        editable=False,
                        max_length=40,
                    ),
                ),
                ("department", models.CharField(blank=True, max_length=100, null=True)),
                ("job_title", models.CharField(default="Lawyer", max_length=100)),
                ("work_email", models.EmailField(blank=True, max_length=254, null=True, unique=True)),
                ("work_phone", models.CharField(blank=True, max_length=20, null=True)),
                ("office_location", models.CharField(blank=True, max_length=255, null=True)),
                ("admission_number", models.CharField(max_length=50, unique=True)),
                ("practicing_certificate_number", models.CharField(blank=True, max_length=50, null=True)),
                ("bar_admission_date", models.DateField(blank=True, null=True)),
                ("is_notary", models.BooleanField(default=False)),
                ("can_commission_oaths", models.BooleanField(default=False)),
                ("is_court_approved", models.BooleanField(default=True)),
                (
                    "employment_type",
                    models.CharField(
                        choices=[
                            ("PERMANENT", "Permanent"),
                            ("CONTRACT", "Contract"),
                            ("PART_TIME", "Part Time"),
                            ("INTERN", "Intern"),
                            ("CONSULTANT", "Consultant"),
                            ("TEMPORARY", "Temporary"),
                        ],
                        default="PERMANENT",
                        max_length=20,
                    ),
                ),
                (
                    "employment_status",
                    models.CharField(
                        choices=[
                            ("ACTIVE", "Active"),
                            ("PROBATION", "Probation"),
                            ("ON_LEAVE", "On Leave"),
                            ("SUSPENDED", "Suspended"),
                            ("RESIGNED", "Resigned"),
                            ("TERMINATED", "Terminated"),
                            ("RETIRED", "Retired"),
                        ],
                        default="ACTIVE",
                        max_length=20,
                    ),
                ),
                ("date_hired", models.DateField()),
                ("probation_end_date", models.DateField(blank=True, null=True)),
                ("date_terminated", models.DateField(blank=True, null=True)),
                ("termination_reason", models.TextField(blank=True, null=True)),
                ("professional_summary", models.TextField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("law_firm", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lawyers", to="firm.lawfirm")),
                ("practice_areas", models.ManyToManyField(blank=True, related_name="lawyers", to="firm.practicearea")),
                ("reports_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="junior_lawyers", to="staff.lawyer")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="lawyer_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Lawyer",
                "verbose_name_plural": "Lawyers",
                "db_table": "staff_lawyers",
                "ordering": ["user__first_name", "user__last_name"],
                "constraints": [
                    models.UniqueConstraint(fields=("law_firm", "staff_number"), name="unique_lawyer_staff_number_per_firm"),
                    models.UniqueConstraint(condition=models.Q(("employee_number__isnull", False)), fields=("law_firm", "employee_number"), name="unique_lawyer_employee_number_per_firm"),
                ],
            },
        ),
    ]
