from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("cases", "0017_caseattachmentreferencesequence_and_more")]
    operations = [
        migrations.AddField(
            model_name="casetask",
            name="priority",
            field=models.CharField(
                choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High"), ("URGENT", "Urgent")],
                default="MEDIUM",
                max_length=20,
            ),
        ),
    ]
