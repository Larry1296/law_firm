from django.db import migrations, models

import apps.common.choices


class Migration(migrations.Migration):
    dependencies = [
        ("cases", "0012_casefiling_assessment_reference_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="case",
            name="archived_with_client",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="case",
            name="previous_is_active_before_client_archive",
            field=models.BooleanField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="case",
            name="previous_matter_status_before_client_archive",
            field=models.CharField(
                blank=True,
                choices=[
                    ("DRAFT", "Draft"),
                    ("INSTRUCTIONS_RECEIVED", "Instructions received"),
                    ("CONFLICT_CHECK_PENDING", "Conflict check pending"),
                    ("CONFLICT_CLEARED", "Conflict cleared"),
                    ("CONFLICT_IDENTIFIED", "Conflict identified"),
                    ("ENGAGEMENT_PENDING", "Engagement pending"),
                    ("ENGAGEMENT_CONFIRMED", "Engagement confirmed"),
                    ("MATTER_OPEN", "Matter open"),
                    ("ACTIVE", "Active"),
                    ("ON_HOLD", "On hold"),
                    ("SETTLEMENT_IN_PROGRESS", "Settlement in progress"),
                    ("CLOSURE_PENDING", "Closure pending"),
                    ("CLOSED", "Closed"),
                    ("ARCHIVED", "Archived"),
                    ("CANCELLED", "Cancelled"),
                ],
                max_length=50,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="case",
            name="previous_status_before_client_archive",
            field=models.CharField(
                blank=True,
                choices=apps.common.choices.CaseStatus.choices,
                max_length=40,
                null=True,
            ),
        ),
    ]
