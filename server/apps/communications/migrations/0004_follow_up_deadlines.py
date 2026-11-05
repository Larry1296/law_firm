from django.db import migrations


def diarise_open_follow_ups(apps, schema_editor):
    """Notes already saved with a follow-up get the client follow-up deadline new notes now create."""
    ClientCommunication = apps.get_model("communications", "ClientCommunication")
    MatterDeadline = apps.get_model("cases", "MatterDeadline")
    for record in ClientCommunication.objects.filter(follow_up_required=True, follow_up_deadline__isnull=False).select_related("client"):
        source = f"COMMUNICATION:{record.id}"
        if MatterDeadline.objects.filter(matter_id=record.matter_id, source=source).exists():
            continue
        MatterDeadline.objects.create(
            firm_id=record.firm_id, matter_id=record.matter_id, deadline_type="CLIENT_FOLLOW_UP",
            due_at=record.follow_up_deadline, responsible_staff_id=record.responsible_staff_id, priority="MEDIUM",
            source=source, description=f"Follow up with {record.client.full_name}: {record.subject}",
            created_by_id=record.created_by_id,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("communications", "0003_clientcommunication_communicationamendment"),
        ("cases", "0037_hearing_notice_and_served_filing"),
    ]

    operations = [migrations.RunPython(diarise_open_follow_ups, migrations.RunPython.noop)]
