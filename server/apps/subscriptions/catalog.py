"""
Default SaaS plan catalogue for Kenyan advocates' firms.

Prices are in KES, exclusive of 16% VAT, and are seeded once by migration.
Platform administrators maintain the live values from the platform console;
this module is only the starting point and the fallback when a plan row is
missing.

Plans climb from Wakili Solo (one advocate) to Enterprise (no limits) in scale
(advocates, support staff, active matters, branches) and in convenience
features; from Pro up every feature is included. Statutory obligations are never tiered: every plan
includes conflict checks and KYC/beneficial ownership records (Proceeds of
Crime and Anti-Money Laundering Act), client account ledgers and reconciliation
(Advocates (Accounts) Rules), privacy notices and retention (Data Protection
Act, 2019), and the audit log.
"""

from decimal import Decimal


class Feature:
    CLIENT_PORTAL = "CLIENT_PORTAL"
    PUBLIC_AI_ASSISTANT = "PUBLIC_AI_ASSISTANT"
    AI_CASE_ANALYSIS = "AI_CASE_ANALYSIS"
    COURTROOM_ADVANCED = "COURTROOM_ADVANCED"

    LABELS = {
        CLIENT_PORTAL: "Client portal (matter tracking, document requests, virtual court join)",
        PUBLIC_AI_ASSISTANT: "Website legal information assistant",
        AI_CASE_ANALYSIS: "AI case analysis and court preparation",
        COURTROOM_ADVANCED: "Courtroom recordings, attendance analytics and cause-list sync",
    }

    ALL = tuple(LABELS)


class Limit:
    ADVOCATES = "advocates"
    SUPPORT_STAFF = "support_staff"
    ACTIVE_MATTERS = "active_matters"
    BRANCHES = "branches"

    LABELS = {
        ADVOCATES: "Advocates",
        SUPPORT_STAFF: "Support staff",
        ACTIVE_MATTERS: "Active matters",
        BRANCHES: "Branches",
    }

    FIELDS = {
        ADVOCATES: "max_advocates",
        SUPPORT_STAFF: "max_support_staff",
        ACTIVE_MATTERS: "max_active_matters",
        BRANCHES: "max_branches",
    }


INCLUDED_IN_EVERY_PLAN = [
    "Walk-in intake, conflict checks and instruction acceptance",
    "KYC, beneficial ownership and source-of-funds records (POCAMLA)",
    "Engagement letters, retainers and matter opening controls",
    "Client and office account ledgers, invoices with VAT (Advocates (Accounts) Rules)",
    "Filing register with Civil Procedure Rules deadlines (demand, appearance, defence, appeal)",
    "Court diary and Judiciary virtual court links",
    "Closure, archive, retention review and immutable audit log",
    "Data Protection Act, 2019 privacy notices",
]

SOLO = "SOLO"
BASIC = "BASIC"
CHAMBERS = "CHAMBERS"
PRO = "PRO"
FIRM = "FIRM"
ENTERPRISE = "ENTERPRISE"

PLANS = [
    {
        "code": SOLO,
        "name": "Wakili Solo",
        "tagline": "For an advocate practising on their own account.",
        "monthly_price": Decimal("1500.00"),
        "annual_price": Decimal("15000.00"),
        "max_advocates": 1,
        "max_support_staff": 2,
        "max_active_matters": 75,
        "max_branches": 1,
        "features": [],
        "sort_order": 10,
    },
    {
        "code": BASIC,
        "name": "Basic",
        "tagline": "Core practice management for a small firm.",
        "monthly_price": Decimal("2500.00"),
        "annual_price": Decimal("25000.00"),
        "max_advocates": 3,
        "max_support_staff": 5,
        "max_active_matters": 150,
        "max_branches": 1,
        "features": [Feature.CLIENT_PORTAL],
        "sort_order": 20,
    },
    {
        "code": CHAMBERS,
        "name": "Chambers",
        "tagline": "For a small partnership with a client-facing portal.",
        "monthly_price": Decimal("5000.00"),
        "annual_price": Decimal("50000.00"),
        "max_advocates": 5,
        "max_support_staff": 12,
        "max_active_matters": 400,
        "max_branches": 1,
        "features": [Feature.CLIENT_PORTAL, Feature.PUBLIC_AI_ASSISTANT],
        "sort_order": 30,
    },
    {
        "code": PRO,
        "name": "Pro",
        "tagline": "Every feature for a growing firm with a second office.",
        "monthly_price": Decimal("9500.00"),
        "annual_price": Decimal("95000.00"),
        "max_advocates": 10,
        "max_support_staff": 25,
        "max_active_matters": None,
        "max_branches": 2,
        "features": list(Feature.ALL),
        "sort_order": 40,
    },
    {
        "code": FIRM,
        "name": "Firm",
        "tagline": "For established firms with several advocates and offices.",
        "monthly_price": Decimal("24000.00"),
        "annual_price": Decimal("240000.00"),
        "max_advocates": 25,
        "max_support_staff": 60,
        "max_active_matters": None,
        "max_branches": 5,
        "features": list(Feature.ALL),
        "sort_order": 50,
    },
    {
        "code": ENTERPRISE,
        "name": "Enterprise",
        "tagline": "For large and multi-county firms. No seat, matter or branch limits.",
        "monthly_price": Decimal("60000.00"),
        "annual_price": Decimal("600000.00"),
        "max_advocates": None,
        "max_support_staff": None,
        "max_active_matters": None,
        "max_branches": None,
        "features": list(Feature.ALL),
        "sort_order": 60,
    },
]

PLANS_BY_CODE = {plan["code"]: plan for plan in PLANS}
