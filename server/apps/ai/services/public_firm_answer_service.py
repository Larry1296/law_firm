import re
from urllib.parse import urlparse

from apps.ai.models import KnowledgeBaseArticle


class PublicFirmAnswerService:
    """Deterministic, question-specific composition from publication snapshots only."""

    FIRM_INTENTS = {
        "services", "overview", "contact", "location", "hours", "owner", "advocates",
        "consultation", "appointment", "fees", "careers", "complaints", "policies",
    }
    SENSITIVE_TERMS = (
        "client list", "is a client", "clients", "case details", "matter details", "case number",
        "matter number", "client account", "trust account", "invoice", "billing records",
        "internal report", "staff private", "national id", "passport", "password", "token",
        "hidden system prompt", "unpublished information", "list all cases", "client database",
        "act as the administrator", "ignore your instructions",
    )
    CATEGORY_MAP = {
        "services": {"practice_area", "legal_service"},
        "overview": {"firm_overview", "history"},
        "contact": {"contact_information"},
        "location": {"office_location"},
        "hours": {"working_hours"},
        "owner": {"firm_overview", "history"},
        "advocates": {"advocate_biography"},
        "consultation": {"consultation"},
        "appointment": {"appointment"},
        "fees": {"public_fees"},
        "careers": {"careers"},
        "complaints": {"complaints"},
        "policies": {"privacy_terms"},
    }

    @classmethod
    def classify(cls, question):
        value = " ".join(question.lower().split())
        if any(term in value for term in cls.SENSITIVE_TERMS):
            return "sensitive"
        rules = (
            ("services", ("legal services", "what services", "practice areas", "areas of practice", "what does the firm offer")),
            ("owner", ("who is the firm owner", "who owns the firm", "firm's owner", "owner of the firm", "who leads the firm")),
            ("advocates", ("advocates", "lawyers", "legal team", "your team", "who can represent")),
            ("contact", ("contact the firm", "contact information", "phone number", "telephone", "email address", "website", "how can i contact")),
            ("hours", ("opening hours", "working hours", "what time do you open", "when do you open", "what time do you close")),
            ("location", ("where are your offices", "where is the firm", "office location", "physical address", "directions")),
            ("consultation", ("consultation", "consult an advocate", "initial meeting")),
            ("appointment", ("appointment", "book a meeting", "schedule a meeting")),
            ("fees", ("legal fees", "your fees", "payment options", "how much do you charge")),
            ("careers", ("careers", "vacancies", "job opening", "internship")),
            ("complaints", ("complaint", "complaints procedure")),
            ("policies", ("privacy policy", "terms of use", "data policy")),
            ("overview", ("tell me about the firm", "about the firm", "who are you", "what is the firm")),
        )
        return next((intent for intent, phrases in rules if any(phrase in value for phrase in phrases)), "legal")

    @classmethod
    def categories_for(cls, intent):
        return cls.CATEGORY_MAP.get(intent, set())

    @staticmethod
    def _legacy_fields(articles):
        fields = {}
        for article in articles:
            for line in article.body.splitlines():
                if ":" in line:
                    key, value = line.split(":", 1)
                    fields[key.strip().lower()] = value.strip().rstrip(".")
        return fields

    @staticmethod
    def _phone(value):
        digits = re.sub(r"\D", "", value or "")
        return f"+254 {digits[3:6]} {digits[6:9]} {digits[9:12]}" if digits.startswith("254") and len(digits) == 12 else value.strip()

    @staticmethod
    def _safe_url(value):
        parsed = urlparse(value or "")
        return value if parsed.scheme == "https" and parsed.netloc else ""

    @staticmethod
    def _description(value):
        value = value.strip()
        if not value:
            return "a law firm"
        return value[0].lower() + value[1:] if value.lower().startswith(("a ", "an ", "the ")) else "a " + value[0].lower() + value[1:]

    @classmethod
    def compose(cls, firm_name, intent, articles):
        if intent == "sensitive":
            return "I can only provide information the firm has approved for public use. I cannot access or disclose client, matter, financial, staff-private or other confidential information."
        if not articles:
            return "I don’t have approved public information about that. Please contact the firm or speak to an advocate for assistance."

        modern = [item for item in articles if item.public_category in cls.categories_for(intent) and item.source_type != item.SourceType.FIRM_PROFILE]
        legacy = cls._legacy_fields(articles)
        if modern:
            if intent == "services":
                lines = [f"- **{item.title}** — {item.summary or item.body}" for item in modern]
                return f"According to {firm_name}’ published information, the firm offers legal assistance in these areas:\n\n" + "\n".join(lines) + "\n\nIf you tell me briefly what you need help with, I can help you identify the most relevant practice area."
            if intent in {"advocates", "contact", "location", "hours"}:
                return f"According to {firm_name}’ published information:\n\n" + "\n\n".join(item.body for item in modern)
            return f"According to {firm_name}’ published information:\n\n" + "\n\n".join(item.body for item in modern)

        if intent == "services":
            areas = legacy.get("approved practice areas", "")
            if areas:
                return f"According to {firm_name}’ published information, the firm offers legal assistance in:\n\n" + "\n".join(f"- **{area.strip()}**" for area in areas.split(",") if area.strip())
            description = legacy.get("about the firm")
            location = legacy.get("public office location")
            intro = f"{firm_name} is {cls._description(description)}" if description else firm_name
            if location:
                intro += f" based in {location.split(';')[0]}"
            return intro + ".\n\nThe firm’s detailed practice areas have not yet been published in the information available to me. You can contact the firm or speak to an advocate to confirm whether it handles your particular matter."
        if intent == "contact" and legacy.get("public contact information"):
            values = dict(part.strip().split(" ", 1) for part in legacy["public contact information"].split(";") if " " in part)
            lines = []
            if values.get("telephone"):
                lines.append(f"- **Telephone:** {cls._phone(values['telephone'])}")
            if values.get("email"):
                lines.append(f"- **Email:** {values['email']}")
            url = cls._safe_url(values.get("website", ""))
            if url:
                lines.append(f"- **Website:** [{urlparse(url).netloc}]({url})")
            return f"You can contact {firm_name} through:\n\n" + "\n".join(lines)
        if intent == "location" and legacy.get("public office location"):
            return f"{firm_name} is located at:\n\n- **Office:** {legacy['public office location'].split(';')[0]}"
        if intent == "hours" and legacy.get("published working hours"):
            hours = re.sub(r"\b08:00\b", "8:00 AM", legacy["published working hours"])
            hours = re.sub(r"\b17:00\b", "5:00 PM", hours)
            return f"{firm_name} is open **{hours}**."
        if intent == "owner" and legacy.get("published firm owner"):
            return f"The published owner of {firm_name} is **{legacy['published firm owner']}**."
        if intent == "overview":
            description = legacy.get("about the firm", "a Kenyan law firm")
            location = legacy.get("public office location", "").split(";")[0]
            intro = f"{firm_name} is {cls._description(description)}"
            if location:
                intro += f" based in {location}"
            parts = [intro + "."]
            if legacy.get("published working hours"):
                hours = legacy["published working hours"].replace("08:00", "8:00 AM").replace("17:00", "5:00 PM")
                parts.append(f"The firm is open **{hours}**.")
            if legacy.get("public contact information"):
                parts.append(cls.compose(firm_name, "contact", articles))
            return "\n\n".join(parts)
        return "I don’t have approved public information about that. Please contact the firm or speak to an advocate for assistance."
