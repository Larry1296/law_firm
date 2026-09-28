from decimal import Decimal

from django.db import migrations
from django.utils import timezone

ALL_FEATURES = ["CLIENT_PORTAL", "PUBLIC_AI_ASSISTANT", "AI_CASE_ANALYSIS", "COURTROOM_ADVANCED"]

# The catalogue as it stood when this migration was written. Frozen here so the
# migration does not change when apps.subscriptions.catalog does; 0003 replaces
# these tiers with Basic and Pro.
PLANS = [
    {
        "code": "SOLO", "name": "Wakili Solo", "tagline": "For an advocate practising on their own account.",
        "monthly_price": Decimal("3500.00"), "annual_price": Decimal("35000.00"),
        "max_advocates": 1, "max_support_staff": 2, "max_active_matters": 75, "max_branches": 1,
        "features": [], "sort_order": 10,
    },
    {
        "code": "CHAMBERS", "name": "Chambers", "tagline": "For a small partnership with a client-facing portal.",
        "monthly_price": Decimal("9500.00"), "annual_price": Decimal("95000.00"),
        "max_advocates": 5, "max_support_staff": 12, "max_active_matters": 400, "max_branches": 1,
        "features": ["CLIENT_PORTAL", "PUBLIC_AI_ASSISTANT"], "sort_order": 20,
    },
    {
        "code": "FIRM", "name": "Firm", "tagline": "For established firms with several advocates and offices.",
        "monthly_price": Decimal("24000.00"), "annual_price": Decimal("240000.00"),
        "max_advocates": 25, "max_support_staff": 60, "max_active_matters": None, "max_branches": 5,
        "features": ALL_FEATURES, "sort_order": 30,
    },
    {
        "code": "ENTERPRISE", "name": "Enterprise",
        "tagline": "For large and multi-county firms. No seat, matter or branch limits.",
        "monthly_price": Decimal("60000.00"), "annual_price": Decimal("600000.00"),
        "max_advocates": None, "max_support_staff": None, "max_active_matters": None, "max_branches": None,
        "features": ALL_FEATURES, "sort_order": 40,
    },
]


def seed(apps, schema_editor):
    Plan = apps.get_model("subscriptions", "Plan")
    FirmSubscription = apps.get_model("subscriptions", "FirmSubscription")
    LawFirm = apps.get_model("firm", "LawFirm")

    for spec in PLANS:
        Plan.objects.get_or_create(code=spec["code"], defaults=spec)

    # Firms that existed before subscriptions keep working unchanged: an active
    # subscription with no period end, flagged for platform review.
    enterprise = Plan.objects.get(code="ENTERPRISE")
    for firm in LawFirm.objects.filter(subscription__isnull=True):
        FirmSubscription.objects.create(
            firm=firm,
            plan=enterprise,
            status="ACTIVE",
            current_period_start=timezone.now(),
            current_period_end=None,
            notes="Existing firm migrated when subscriptions were introduced. Review and assign a paid plan.",
        )


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0001_initial"),
        ("firm", "0003_firmsetting_allow_engagement_waiver_and_more"),
    ]

    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
