import re
from decimal import Decimal

from django.conf import settings

from apps.subscriptions.catalog import INCLUDED_IN_EVERY_PLAN, Feature, Limit
from apps.subscriptions.models import Plan

REGISTER_ACTION = {"label": "Register your firm", "path": "/register-firm"}
SIGN_IN_ACTION = {"label": "Sign in", "path": "/login"}
RESET_ACTION = {"label": "Reset your password", "path": "/forgot-password"}
PLANS_ACTION = {"label": "See plans", "path": "/#plans"}

# What the homepage itself says about the platform. Answers and the AI's
# PLATFORM FACTS both come from here, so the assistant never says more than the page.
ABOUT = (
    "Sheria Master is practice management software for law firms. It runs a whole practice from one secure "
    "workspace: matters, the court diary and virtual courts, client accounts, documents and M-Pesa billing. "
    "Each firm gets its own private workspace for its advocates, staff and clients."
)
FEATURES = (
    ("Intake and conflict checks", "walk-in intake, conflict searches, KYC and beneficial ownership records before you accept instructions."),
    ("Matters from opening to archive", "engagement letters, retainers, filings with Civil Procedure Rules deadlines, closure and retention review."),
    ("Court diary", "every mention and hearing across your advocates, with reminders before a matter is called."),
    ("Virtual courts from one screen", "Judiciary virtual court links in one console, so one advocate can follow several courts at once."),
    ("Accounts that follow the rules", "client and office ledgers, VAT invoices and reconciliation under the Advocates (Accounts) Rules."),
    ("Documents and templates", "matter documents, client document requests and generated pleadings and letters."),
    ("Staff roles and client portal", "advocates, secretaries, accountants, HR and IT each see what their role needs, and clients follow their matters online."),
    ("Private to your firm", "your records are separate from every other firm, with an audit log and Data Protection Act, 2019 notices."),
)
GETTING_STARTED_STEPS = (
    "**Register your firm.** Choose **Register your firm** on this page, pick a plan and give the firm's details: BRS number, KRA PIN, offices, practice areas and the owner (the managing partner).",
    "**The owner signs in.** The owner receives a secure link to set a password, then signs in to the firm's own dashboard as its administrator.",
    "**Add your people.** The owner adds advocates and staff with the right role for each, and registers clients as instructions come in.",
    "**Everyone signs in here.** Staff and clients use **Sign in** on this page and land straight in their own firm's workspace.",
)
SECURITY = (
    "Each firm's records are kept separate from every other firm's. Inside a firm, advocates, secretaries, accountants, "
    "HR and IT each see only what their role needs, and clients see only their own matters. Every change is recorded in "
    "an audit log, and the firm's privacy notices follow the Data Protection Act, 2019. The platform team manages firms' "
    "accounts and subscriptions but does not see a firm's clients, matters or documents."
)
CLIENTS = (
    "Sheria Master is used by law firms, so you don't sign up yourself as a client. When a firm that uses Sheria Master "
    "accepts your instructions, it invites you by email to its secure client portal. There you can follow your matter, "
    "see court dates, join virtual court sessions and upload documents the firm asks for.\n\n"
    "If you already have an invitation, choose **Sign in** at the top of this page. If you need a lawyer, contact a law "
    "firm directly: Sheria Master does not refer clients to firms."
)
SIGN_IN = (
    "Choose **Sign in** at the top of this page and use the email address your firm registered for you. You go straight "
    "to your own firm's workspace, whether you are the owner, an advocate, staff or a client.\n\n"
    "If you have forgotten your password, use **Forgot password?** on the sign-in page and we will email you a link to "
    "set a new one. If you have never received an invitation, ask your firm to add you."
)
STAFF = (
    "Only the firm's owner (its administrator) adds people. After signing in, the owner adds each advocate and staff "
    "member with the right role (advocate, secretary, accountant, HR or IT) and registers clients as instructions come "
    "in. Each person receives an email link to set their password. How many advocates and staff a firm can add depends "
    "on its plan."
)
DEVICES = (
    "Sheria Master runs in your web browser, so there is nothing to install. Sign in from a computer, tablet or phone "
    "with an up-to-date browser."
)
ASSISTANT = (
    "I can answer questions about Sheria Master (what it does, plans and pricing, getting started, signing in and "
    "security) and general legal questions such as your rights, court processes, employment, land and family law. "
    "Legal answers are general information, not legal advice."
)
INJECTION_ANSWER = "I can't help with that. Ask me about Sheria Master or a general legal question."

# Phrases are matched against the lower-cased question with spaces collapsed.
# Words that are also legal topics ("fees", "privacy", "contract") are left to
# the AI, which sees the same facts and can tell the two apart.
TOPICS = (
    ("register", (
        "register my firm", "register our firm", "register a firm", "register the firm", "register your firm",
        "register my law firm", "register our law firm", "register a law firm", "sign up my firm", "sign up our firm",
        "signup my firm", "add my firm", "list my firm", "onboard my firm", "join sheria", "join the platform",
        "subscribe my firm", "create an account for my firm",
    )),
    ("getting_started", (
        "get started", "getting started", "how do i start", "where do i start", "how do i begin", "start using",
        "how does sheria master work", "how does it work", "how does this work", "set up my firm",
        "set up our firm", "onboarding",
    )),
    ("reset_password", ("forgot password", "forgot my password", "reset my password", "reset password", "change my password", "can't log in", "cannot log in", "can't sign in", "cannot sign in")),
    ("sign_in", ("log in", "login", "sign in", "signin", "my dashboard")),
    ("client", ("client portal", "i am a client", "i'm a client", "track my case", "follow my case", "follow my matter", "my lawyer uses", "my advocate uses")),
    ("find_lawyer", ("find a lawyer", "find an advocate", "need a lawyer", "need an advocate", "recommend a lawyer", "recommend an advocate", "hire a lawyer", "hire an advocate", "get a lawyer", "get an advocate")),
    ("trial", ("free trial", "try it", "try sheria", "demo", "is it free")),
    ("payment", ("m-pesa", "mpesa", "paybill", "how do i pay", "how to pay", "payment method", "pay for sheria", "pay for the subscription", "pay monthly", "pay yearly", "pay annually")),
    ("pricing", (
        "pricing", "how much does sheria", "how much is sheria", "how much does it cost", "how much is it",
        "cost of sheria", "sheria master cost", "what does it cost", "your plans", "the plans", "your prices",
        "basic plan", "pro plan", "which plan", "subscription", "upgrade my plan",
    )),
    ("staff", ("add staff", "add advocates", "add an advocate", "add my staff", "add users", "add a user", "invite staff", "staff roles", "user roles", "add clients")),
    ("security", ("is it secure", "is sheria secure", "how secure", "data safe", "data secure", "our data", "firm's data", "who can see", "encrypt", "audit log")),
    ("devices", ("mobile app", "phone app", "on my phone", "android", "iphone", "ios app", "download the app", "install the app", "install sheria", "tablet")),
    ("contact", ("contact sheria", "contact you", "contact the platform", "contact support", "support team", "customer care", "customer support", "talk to someone", "speak to someone", "help desk", "reach you", "your email", "your phone")),
    ("features", ("features", "what can it do", "what does it do", "what does it include", "what's included", "modules")),
    ("assistant", ("what can you do", "what can you help", "what can i ask", "who are you", "are you a bot", "are you human", "what are you")),
    ("about", ("what is sheria", "what's sheria", "about sheria", "tell me about sheria", "what is this site", "what is this platform", "what is this website", "who is sheria", "who owns sheria", "who made sheria", "who built")),
)
PROMPT_INJECTION_TERMS = ("hidden system prompt", "system prompt", "ignore your instructions", "ignore previous instructions", "act as the administrator")


def _kes(value):
    value = Decimal(value)
    return f"KES {value:,.0f}" if value == value.to_integral() else f"KES {value:,.2f}"


def _vat():
    return f"{Decimal(settings.SUBSCRIPTION_VAT_RATE).normalize():f}"


def _plans():
    return list(Plan.objects.filter(is_active=True, is_public=True))


def _plan_line(plan):
    limits = []
    for resource, field in Limit.FIELDS.items():
        value = getattr(plan, field)
        label = Limit.LABELS[resource].lower()
        if value == 1:
            label = label.removesuffix("es" if label.endswith("ches") else "s")
        limits.append(f"unlimited {label}" if value is None else f"up to {value:,} {label}")
    extras = [Feature.LABELS[code].split(" (")[0] for code in Feature.ALL if code in (plan.features or [])]
    line = f"- **{plan.name}:** {_kes(plan.monthly_price)} a month or {_kes(plan.annual_price)} a year. {', '.join(limits).capitalize()}."
    if extras:
        line += f" Includes: {'; '.join(extras)}."
    return line


def _trial_line():
    if settings.ALLOW_PUBLIC_FIRM_SIGNUP:
        return f"A new firm's workspace is created straight away and starts on a {settings.SUBSCRIPTION_TRIAL_DAYS}-day free trial."
    return "After you register, the platform team contacts you to confirm the details and set up your firm's workspace."


def _contact_line():
    email = getattr(settings, "PLATFORM_SUPPORT_EMAIL", "")
    phone = getattr(settings, "PLATFORM_SUPPORT_PHONE", "")
    details = " or ".join(part for part in (f"email **{email}**" if email else "", f"call **{phone}**" if phone else "") if part)
    if details:
        return f"To reach the Sheria Master team, {details}."
    return "To reach the Sheria Master team, use the contact details at the bottom of this page."


class PlatformGuideService:
    """Answers questions about Sheria Master itself, from the homepage's own facts and the live plans."""

    @staticmethod
    def _normalise(question):
        return " ".join(question.lower().replace("’", "'").split())

    @classmethod
    def is_prompt_injection(cls, question):
        value = cls._normalise(question)
        return any(term in value for term in PROMPT_INJECTION_TERMS)

    @classmethod
    def topic(cls, question):
        value = cls._normalise(question)
        return next((name for name, phrases in TOPICS if any(re.search(rf"\b{re.escape(phrase)}\b", value) for phrase in phrases)), None)

    @classmethod
    def answer(cls, topic):
        """(answer, action) for a topic, or None for an unknown topic."""
        composer = getattr(cls, f"_{topic}", None) if topic else None
        return composer() if composer else None

    @staticmethod
    def _about():
        return f"{ABOUT}\n\n{ASSISTANT}", REGISTER_ACTION

    @staticmethod
    def _assistant():
        return ASSISTANT, None

    @staticmethod
    def _getting_started():
        steps = "\n".join(f"{index}. {step}" for index, step in enumerate(GETTING_STARTED_STEPS, start=1))
        return (
            f"Getting started with Sheria Master takes four steps:\n\n{steps}\n\n{_trial_line()}\n\n"
            "If you are a client of a firm that uses Sheria Master, you don't need to register: your firm invites you "
            "to its client portal by email.",
            REGISTER_ACTION,
        )

    @staticmethod
    def _register():
        return (
            "To put your law firm on Sheria Master, choose **Register your firm** at the top of this page. Enter your "
            f"firm's details and your own details as the firm's owner (the managing advocate). {_trial_line()}\n\n"
            "Once the firm is set up, you sign in as its owner and add your advocates, staff and clients yourself.",
            REGISTER_ACTION,
        )

    @staticmethod
    def _sign_in():
        return SIGN_IN, SIGN_IN_ACTION

    @staticmethod
    def _reset_password():
        return SIGN_IN, RESET_ACTION

    @staticmethod
    def _client():
        return CLIENTS, SIGN_IN_ACTION

    @staticmethod
    def _find_lawyer():
        return (
            "Sheria Master is software that law firms use to run their practice, so it does not recommend or refer "
            "clients to firms. To get a lawyer, contact a law firm or advocate directly. If that firm uses Sheria "
            "Master, it can invite you to its secure client portal once it takes on your matter.\n\n"
            "Meanwhile, I can answer general legal questions to help you understand your situation.",
            None,
        )

    @classmethod
    def _pricing(cls):
        plans = _plans()
        if not plans:
            return (
                "Sheria Master is paid monthly or yearly by M-Pesa, with no setup fee. The current plans are listed "
                "under **Plans** on this page.",
                PLANS_ACTION,
            )
        lines = "\n".join(_plan_line(plan) for plan in plans)
        return (
            f"Sheria Master has {len(plans)} plan{'s' if len(plans) != 1 else ''}, paid monthly or yearly by M-Pesa "
            f"with no setup fee:\n\n{lines}\n\nPrices exclude {_vat()}% VAT. "
            "Every plan includes the statutory compliance features, such as conflict checks, KYC records, client "
            f"account ledgers, the court diary and the audit log.\n\n{_trial_line()}",
            PLANS_ACTION,
        )

    @staticmethod
    def _trial():
        trial = _trial_line() if settings.ALLOW_PUBLIC_FIRM_SIGNUP else (
            f"{_trial_line()} Whether your firm starts on a free trial is agreed with the team at that point."
        )
        return f"{trial}\n\nThere is no setup fee, and you choose a plan when you register.", REGISTER_ACTION

    @staticmethod
    def _payment():
        paybill = settings.SUBSCRIPTION_MPESA_PAYBILL
        how = f"through M-Pesa Paybill **{paybill}**" if paybill else "by M-Pesa"
        return (
            f"Firms pay for Sheria Master {how}, monthly or yearly. The firm's owner raises an invoice from the "
            "Subscription page in their dashboard, pays it and submits the M-Pesa confirmation code; the platform team "
            f"then confirms the payment and the paid period is extended. Prices exclude {_vat()}% VAT.",
            None,
        )

    @staticmethod
    def _staff():
        return STAFF, None

    @staticmethod
    def _security():
        return SECURITY, None

    @staticmethod
    def _devices():
        return DEVICES, SIGN_IN_ACTION

    @staticmethod
    def _contact():
        return (
            f"{_contact_line()}\n\nTo bring your firm onto Sheria Master, choose **Register your firm** and the team "
            "will be in touch. If you are a client with a question about your matter, contact your law firm directly.",
            None,
        )

    @staticmethod
    def _features():
        lines = "\n".join(f"- **{title}:** {text}" for title, text in FEATURES)
        return f"Sheria Master gives each firm:\n\n{lines}", PLANS_ACTION

    @classmethod
    def facts(cls):
        """Everything above as one block of PLATFORM FACTS for the AI to answer other questions from."""
        sections = [
            ("About", ABOUT),
            ("Features", "\n".join(f"- {title}: {text}" for title, text in FEATURES)),
            ("Included in every plan", "\n".join(f"- {line}" for line in INCLUDED_IN_EVERY_PLAN)),
            ("Plans and pricing", cls._pricing()[0]),
            ("Paying", cls._payment()[0]),
            ("Getting started", cls._getting_started()[0]),
            ("Signing in", SIGN_IN),
            ("Adding staff", STAFF),
            ("Clients", CLIENTS),
            ("Security and privacy", SECURITY),
            ("Devices", DEVICES),
            ("Contact", _contact_line()),
            ("This assistant", ASSISTANT),
        ]
        return "\n\n".join(f"## {title}\n{text}" for title, text in sections)
