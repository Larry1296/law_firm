from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0020_client_kyc_drawer_reference"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="client",
            name="kyc_drawer_reference",
            field=models.CharField(blank=True, db_index=True, max_length=40, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="clientdocument",
            name="received_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="clientdocument",
            name="received_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="received_physical_client_documents", to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name="clientdocument",
            name="received_from",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
