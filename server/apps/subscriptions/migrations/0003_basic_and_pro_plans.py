from decimal import Decimal

from django.db import migrations

ALL_FEATURES = ["CLIENT_PORTAL", "PUBLIC_AI_ASSISTANT", "AI_CASE_ANALYSIS", "COURTROOM_ADVANCED"]
LEGACY_CODES = ["SOLO", "CHAMBERS", "FIRM", "ENTERPRISE"]

PLANS = [
    {
        "code": "BASIC", "name": "Basic", "tagline": "Core practice management for a small firm.",
        "monthly_price": Decimal("2500.00"), "annual_price": Decimal("25000.00"),
        "max_advocates": 3, "max_support_staff": 5, "max_active_matters": 150, "max_branches": 1,
        "features": ["CLIENT_PORTAL"], "sort_order": 10,
    },
    {
        "code": "PRO", "name": "Pro", "tagline": "Every feature, with no seat, matter or branch limits.",
        "monthly_price": Decimal("5000.00"), "annual_price": Decimal("50000.00"),
        "max_advocates": None, "max_support_staff": None, "max_active_matters": None, "max_branches": None,
        "features": ALL_FEATURES, "sort_order": 20,
    },
]


def forwards(apps, schema_editor):
    """Replace the four launch tiers with Basic and Pro.

    Firms on a retired tier move to Pro so that none of them loses a feature or
    goes over a limit. Their status and paid-up period are kept. The retired
    plans stay (inactive and hidden) because past invoices refer to them.
    """
    Plan = apps.get_model("subscriptions", "Plan")
    FirmSubscription = apps.get_model("subscriptions", "FirmSubscription")

    for spec in PLANS:
        Plan.objects.get_or_create(code=spec["code"], defaults=spec)
    pro = Plan.objects.get(code="PRO")

    legacy = Plan.objects.filter(code__in=LEGACY_CODES)
    FirmSubscription.objects.filter(plan__in=legacy).update(plan=pro)
    legacy.update(is_active=False, is_public=False)


def backwards(apps, schema_editor):
    Plan = apps.get_model("subscriptions", "Plan")
    Plan.objects.filter(code__in=LEGACY_CODES).update(is_active=True, is_public=True)


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0002_seed_plans_and_existing_firms"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
