import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("documents", "0002_secretary_document_verification"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="documentrequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("AWAITING_SECRETARY_DISPATCH", "Awaiting secretary dispatch"),
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
        migrations.AddField(model_name="documentrequest", name="dispatch_message", field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="documentrequest", name="dispatched_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(
            model_name="documentrequest",
            name="dispatched_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="dispatched_document_requests", to=settings.AUTH_USER_MODEL),
        ),
    ]
