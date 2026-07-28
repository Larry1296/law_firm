from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cases", "0013_case_client_archive_snapshot"),
    ]

    operations = [
        migrations.AlterField(
            model_name="employmentmatterdetails",
            name="employment_status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("ACTIVE", "Active"),
                    ("PROBATION", "Probation"),
                    ("ON_LEAVE", "On Leave"),
                    ("SUSPENDED", "Suspended"),
                    ("RESIGNED", "Resigned"),
                    ("TERMINATED", "Terminated"),
                    ("RETIRED", "Retired"),
                ],
                default="",
                max_length=80,
            ),
        ),
        migrations.AlterField(
            model_name="employmentmatterdetails",
            name="dismissal_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("NOT_APPLICABLE", "Not applicable"),
                    ("SUMMARY_DISMISSAL", "Summary dismissal"),
                    ("TERMINATION_WITH_NOTICE", "Termination with notice"),
                    ("REDUNDANCY", "Redundancy"),
                    ("CONSTRUCTIVE_DISMISSAL", "Constructive dismissal"),
                    ("UNFAIR_DISMISSAL", "Unfair dismissal"),
                    ("WRONGFUL_DISMISSAL", "Wrongful dismissal"),
                    ("MUTUAL_SEPARATION", "Mutual separation"),
                    ("RESIGNATION", "Resignation"),
                    ("RETIREMENT", "Retirement"),
                    ("OTHER", "Other"),
                ],
                default="",
                max_length=120,
            ),
        ),
    ]
