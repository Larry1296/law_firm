import uuid

from django.db import migrations, models
from django.db.models import Q


def assign_drawer_references(apps, schema_editor):
    Client = apps.get_model("clients", "Client")
    for client in Client.objects.filter(
        Q(kyc_drawer_reference="") | Q(kyc_drawer_reference__isnull=True)
    ).iterator():
        client.kyc_drawer_reference = f"KYC-{uuid.uuid4().hex[:10].upper()}"
        client.save(update_fields=["kyc_drawer_reference"])


class Migration(migrations.Migration):
    dependencies = [("clients", "0019_alter_clientdocument_file")]

    operations = [
        migrations.AddField(
            model_name="client",
            name="kyc_drawer_reference",
            field=models.CharField(blank=True, max_length=40, null=True),
        ),
        migrations.RunPython(assign_drawer_references, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="client",
            name="kyc_drawer_reference",
            field=models.CharField(blank=True, db_index=True, max_length=40, unique=True),
        ),
    ]
