from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("documents", "0003_document_request_secretary_dispatch")]

    operations = [
        migrations.AlterField(
            model_name="documentrequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("AWAITING_SECRETARY_DISPATCH", "Awaiting secretary dispatch"),
                    ("OPEN", "Required"),
                    ("PENDING_SECRETARY", "Uploaded - awaiting secretary verification"),
                    ("UPLOADED", "Physical document received - awaiting advocate review"),
                    ("ACCEPTED", "Accepted"),
                    ("REPLACEMENT_REQUIRED", "Replacement required"),
                    ("CANCELLED", "Cancelled"),
                ],
                db_index=True,
                default="OPEN",
                max_length=30,
            ),
        ),
    ]
