import re

from apps.ai.services.court_process_guide import DISCLAIMER, GUIDE_TITLE, ORDINALS, STEPS
from apps.ai.services.public_knowledge_service import PublicKnowledgeEligibility

OVERVIEW_PHRASES = (
    "steps in a court case", "steps in a case", "stages of a case", "stages in a court case", "court process",
    "court procedure", "how does a case", "how does a court case", "how do court cases", "civil case process",
    "process of a civil case", "how do i sue", "how can i sue", "sue someone", "take someone to court", "go to court",
    "steps involved", "stages involved", "whole process", "court case work", "litigation process",
)
PROCESS_CUES = (
    "step", "stage", "process", "what happens", "how does", "how do", "how is", "explain", "tell me", "what is",
    "what's", "more about", "during", "meaning of", "what does", "how long", "what are",
)
STEP_NUMBER_RE = re.compile(r"\b(?:step|stage|number|no\.?)\s*(\d{1,2})\b")
BARE_NUMBER_RE = re.compile(r"^\s*(\d{1,2})\s*[.?!]*\s*$")
SHOWN_STEP_RE = re.compile(r"\*\*Step (\d{1,2}) of \d+:")
LAW_CITATION_RE = re.compile(r"\b(?:article|section)\s+\d", re.I)


def _normalise(text):
    return " ".join(re.sub(r"[^a-z0-9\s'-]", " ", text.lower()).split())


class CourtProcessGuideService:
    """Answers questions about how a civil case runs, from an overview down to any single step."""

    @classmethod
    def answer(cls, question, history, firm):
        text = _normalise(question)
        if LAW_CITATION_RE.search(question):
            return None
        guide_shown = cls._guide_in(history)
        step = cls._numbered_step(text, guide_shown, history)
        if step is None and any(phrase in text for phrase in OVERVIEW_PHRASES):
            return cls.overview(), 0
        step = step or cls._named_step(text, guide_shown)
        if step is not None:
            return cls.step_answer(step, firm), step["number"]
        return None

    # ------------------------------------------------------------------ recognising the step
    @staticmethod
    def _guide_in(history):
        return any(
            item.get("role") == "assistant" and (GUIDE_TITLE in item.get("content", "") or SHOWN_STEP_RE.search(item.get("content", "")))
            for item in history or []
        )

    @staticmethod
    def _last_shown_step(history):
        for item in reversed(history or []):
            if item.get("role") == "assistant":
                match = SHOWN_STEP_RE.search(item.get("content", ""))
                if match:
                    return int(match.group(1))
        return None

    @classmethod
    def _numbered_step(cls, text, guide_shown, history):
        number = None
        match = STEP_NUMBER_RE.search(text)
        if match:
            number = int(match.group(1))
        if number is None:
            for word, value in ORDINALS.items():
                if re.search(rf"\b{word}\s+(?:step|stage)\b", text):
                    number = value
                    break
        if number is None and guide_shown:
            bare = BARE_NUMBER_RE.match(text)
            if bare:
                number = int(bare.group(1))
            elif re.search(r"\b(?:next|what comes next|then what|after that)\b", text):
                shown = cls._last_shown_step(history)
                number = (shown or 0) + 1
            elif re.search(r"\b(?:previous|before that|go back)\b", text):
                shown = cls._last_shown_step(history)
                number = (shown or 2) - 1
        if number is None:
            return None
        return next((step for step in STEPS if step["number"] == number), None)

    @staticmethod
    def _named_step(text, guide_shown):
        if not (guide_shown or any(cue in text for cue in PROCESS_CUES)):
            return None
        best, best_length = None, 0
        for step in STEPS:
            for alias in step["aliases"]:
                if re.search(rf"\b{re.escape(alias)}\b", text) and len(alias) > best_length:
                    best, best_length = step, len(alias)
        return best

    # ------------------------------------------------------------------ composing answers
    @staticmethod
    def overview():
        lines = [f"**{GUIDE_TITLE}**", ""]
        lines += [f"- **{step['number']}. {step['title']}**: {step['summary']}" for step in STEPS]
        lines += [
            "",
            "Ask me about any step for the full detail, for example \"Tell me more about step 5\" or \"What happens at the hearing?\"",
            "",
            DISCLAIMER,
        ]
        return "\n".join(lines)

    @classmethod
    def step_answer(cls, step, firm):
        published = cls._firm_version(step, firm)
        lines = [f"**Step {step['number']} of {len(STEPS)}: {step['title']}**", ""]
        if published:
            lines.append(published.body.strip())
        else:
            lines.append(step["summary"])
            for heading, points in step["sections"]:
                lines += ["", f"**{heading}**"] + [f"- {point}" for point in points]
        following = next((item for item in STEPS if item["number"] == step["number"] + 1), None)
        lines.append("")
        if following:
            lines.append(f"Next: **Step {following['number']}: {following['title']}**. Ask \"next step\", or about any other step.")
        else:
            lines.append("This is the last step. Ask about any earlier step, or for the overview of all steps.")
        lines += ["", DISCLAIMER]
        return "\n".join(lines)

    @staticmethod
    def article_slug(firm, step):
        return f"court-process-{firm.id.hex[:8]}-step-{step['number']:02d}"

    @classmethod
    def _firm_version(cls, step, firm):
        """The firm's own reviewed wording for this step, if it has published one."""
        if firm is None:
            return None
        return PublicKnowledgeEligibility.queryset(firm=firm).filter(slug=cls.article_slug(firm, step)).first()
