from django.db import migrations


def forwards(apps, schema_editor):
    """Wakili Solo is the advocate alone or with a secretary: one staff seat."""
    Plan = apps.get_model("subscriptions", "Plan")
    Plan.objects.filter(code="SOLO", max_support_staff=2).update(
        max_support_staff=1, tagline="For an advocate practising on their own account, alone or with a secretary.",
    )


def backwards(apps, schema_editor):
    Plan = apps.get_model("subscriptions", "Plan")
    Plan.objects.filter(code="SOLO", max_support_staff=1).update(
        max_support_staff=2, tagline="For an advocate practising on their own account.",
    )


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0007_plan_change_credit"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
