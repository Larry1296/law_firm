from decimal import Decimal

from django.db import migrations

ALL_FEATURES = ["CLIENT_PORTAL", "PUBLIC_AI_ASSISTANT", "AI_CASE_ANALYSIS", "COURTROOM_ADVANCED"]

# The catalogue as it stood when this migration was written. Frozen here so the
# migration does not change when apps.subscriptions.catalog does.
PLANS = [
    {
        "code": "SOLO", "name": "Wakili Solo", "tagline": "For an advocate practising on their own account.",
        "monthly_price": Decimal("1500.00"), "annual_price": Decimal("15000.00"),
        "max_advocates": 1, "max_support_staff": 2, "max_active_matters": 75, "max_branches": 1,
        "features": [], "sort_order": 10,
    },
    {
        "code": "BASIC", "name": "Basic", "tagline": "Core practice management for a small firm.",
        "monthly_price": Decimal("2500.00"), "annual_price": Decimal("25000.00"),
        "max_advocates": 3, "max_support_staff": 5, "max_active_matters": 150, "max_branches": 1,
        "features": ["CLIENT_PORTAL"], "sort_order": 20,
    },
    {
        "code": "CHAMBERS", "name": "Chambers", "tagline": "For a small partnership with a client-facing portal.",
        "monthly_price": Decimal("5000.00"), "annual_price": Decimal("50000.00"),
        "max_advocates": 5, "max_support_staff": 12, "max_active_matters": 400, "max_branches": 1,
        "features": ["CLIENT_PORTAL", "PUBLIC_AI_ASSISTANT"], "sort_order": 30,
    },
    {
        "code": "PRO", "name": "Pro", "tagline": "Every feature for a growing firm with a second office.",
        "monthly_price": Decimal("9500.00"), "annual_price": Decimal("95000.00"),
        "max_advocates": 10, "max_support_staff": 25, "max_active_matters": None, "max_branches": 2,
        "features": ALL_FEATURES, "sort_order": 40,
    },
    {
        "code": "FIRM", "name": "Firm", "tagline": "For established firms with several advocates and offices.",
        "monthly_price": Decimal("24000.00"), "annual_price": Decimal("240000.00"),
        "max_advocates": 25, "max_support_staff": 60, "max_active_matters": None, "max_branches": 5,
        "features": ALL_FEATURES, "sort_order": 50,
    },
    {
        "code": "ENTERPRISE", "name": "Enterprise",
        "tagline": "For large and multi-county firms. No seat, matter or branch limits.",
        "monthly_price": Decimal("60000.00"), "annual_price": Decimal("600000.00"),
        "max_advocates": None, "max_support_staff": None, "max_active_matters": None, "max_branches": None,
        "features": ALL_FEATURES, "sort_order": 60,
    },
]


def forwards(apps, schema_editor):
    """Offer the full ladder again, from a sole practitioner to a multi-county firm."""
    Plan = apps.get_model("subscriptions", "Plan")
    for spec in PLANS:
        Plan.objects.update_or_create(code=spec["code"], defaults={**spec, "is_active": True, "is_public": True})


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0005_firmsubscription_has_ever_subscribed"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
