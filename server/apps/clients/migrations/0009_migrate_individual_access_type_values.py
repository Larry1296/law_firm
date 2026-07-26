from django.db import migrations


def forwards(apps, schema_editor):
    Client = apps.get_model("clients", "Client")
    Client.objects.filter(
        client_type="INDIVIDUAL",
        access_type="PROSPECT",
    ).update(access_type="PORTAL_ENABLED")
    Client.objects.filter(
        client_type="INDIVIDUAL",
        access_type="ASSISTED_CLIENT",
    ).update(access_type="ASSISTED")


def backwards(apps, schema_editor):
    Client = apps.get_model("clients", "Client")
    Client.objects.filter(
        client_type="INDIVIDUAL",
        access_type="PORTAL_ENABLED",
    ).update(access_type="PROSPECT")
    Client.objects.filter(
        client_type="INDIVIDUAL",
        access_type="ASSISTED",
    ).update(access_type="ASSISTED_CLIENT")


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0008_clientmatterconflictcheck_acceptance_decided_at_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
