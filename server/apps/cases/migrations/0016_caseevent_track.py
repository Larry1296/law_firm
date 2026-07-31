from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cases", "0015_judiciaryctssnapshot_jurisdictionassessment_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="caseevent",
            name="track",
            field=models.CharField(
                choices=[
                    ("TRIAL", "Trial"),
                    ("APPEAL", "Appeal"),
                    ("REVIEW", "Review"),
                    ("EXECUTION", "Execution"),
                ],
                default="TRIAL",
                max_length=20,
            ),
        ),
    ]
