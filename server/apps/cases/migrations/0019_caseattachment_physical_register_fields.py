from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("cases", "0018_casetask_priority")]

    operations = [
        migrations.AlterField(
            model_name="caseattachment",
            name="file",
            field=models.FileField(blank=True, upload_to="case_attachments/"),
        ),
        migrations.AddField(
            model_name="caseattachment",
            name="document_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="caseattachment",
            name="physical_copy_type",
            field=models.CharField(choices=[("ORIGINAL", "Original"), ("OFFICE_COPY", "Office Copy"), ("CERTIFIED_COPY", "Certified Copy"), ("COURT_STAMPED_COPY", "Court-stamped Copy"), ("PHOTOCOPY", "Photocopy")], default="OFFICE_COPY", max_length=30),
        ),
        migrations.AddField(
            model_name="caseattachment",
            name="physical_storage_location",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
