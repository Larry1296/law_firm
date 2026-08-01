import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0018_clientdocument_received_via"),
        ("documents", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="documentrequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("OPEN", "Required"),
                    ("PENDING_SECRETARY", "Uploaded - awaiting secretary verification"),
                    ("UPLOADED", "Secretary verified - awaiting advocate review"),
                    ("ACCEPTED", "Accepted"),
                    ("REPLACEMENT_REQUIRED", "Replacement required"),
                    ("CANCELLED", "Cancelled"),
                ],
                db_index=True,
                default="OPEN",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="documentrequest",
            name="secretary_verification_notes",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="documentrequest",
            name="secretary_verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="documentrequest",
            name="secretary_verified_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="secretary_verified_document_requests",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
