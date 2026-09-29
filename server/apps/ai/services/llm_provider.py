"""
One entry point to the language model behind every assistant.

Claude answers first and OpenAI takes over when Claude fails, times out or has
no key (AI_PROVIDER="openai" reverses the order). Every caller asks for JSON and
gets a dict back, or AIProviderUnavailable when every provider failed, so each
assistant can fall back to its own record-based answer. API keys are never logged.
"""
import json
import logging
import re
from dataclasses import dataclass

from django.conf import settings

logger = logging.getLogger(__name__)


class AIProviderUnavailable(Exception):
    pass


@dataclass(frozen=True)
class ProviderChoice:
    name: str
    model: str


def provider_order():
    """Configured providers in the order to try them: the preferred one, then the fallback.

    AI_PROVIDER "auto" or "anthropic" tries Claude first, "openai" tries OpenAI
    first. With AI_FALLBACK_ENABLED the other provider is tried when the first fails.
    """
    available = {
        "anthropic": ProviderChoice("anthropic", settings.ANTHROPIC_MODEL) if settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_MODEL else None,
        "openai": ProviderChoice("openai", settings.OPENAI_MODEL) if settings.OPENAI_API_KEY and settings.OPENAI_MODEL else None,
    }
    first = "openai" if (settings.AI_PROVIDER or "auto").lower() == "openai" else "anthropic"
    order = [first, "anthropic" if first == "openai" else "openai"]
    if not settings.AI_FALLBACK_ENABLED:
        order = order[:1]
    return [available[name] for name in order if available[name]]


def configured_provider():
    """The provider that answers first, or None when no AI service is set up."""
    order = provider_order()
    return order[0] if order else None


def _parse_json(text):
    """The model is told to return JSON only; tolerate a code fence or a sentence around it."""
    text = (text or "").strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if fenced:
        text = fenced.group(1)
    elif not text.startswith("{"):
        start, end = text.find("{"), text.rfind("}")
        text = text[start:end + 1] if start != -1 and end > start else text
    try:
        payload = json.loads(text)
    except (TypeError, ValueError) as exc:
        raise AIProviderUnavailable("The AI service returned an unreadable response.") from exc
    if not isinstance(payload, dict):
        raise AIProviderUnavailable("The AI service returned an unreadable response.")
    return payload


def _anthropic_text(choice, instructions, prompt, max_tokens):
    try:
        import anthropic
    except ImportError as exc:
        raise AIProviderUnavailable("The anthropic package is not installed.") from exc
    # One attempt each: a failure moves straight to the fallback instead of retrying.
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=settings.AI_REQUEST_TIMEOUT, max_retries=0)
    response = client.messages.create(
        model=choice.model,
        max_tokens=max_tokens,
        system=instructions,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(block.text for block in response.content if getattr(block, "type", "") == "text")


def _openai_text(choice, instructions, prompt, max_tokens):
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise AIProviderUnavailable("The openai package is not installed.") from exc
    client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.AI_REQUEST_TIMEOUT, max_retries=0)
    response = client.responses.create(
        model=choice.model,
        instructions=instructions,
        input=prompt,
        max_output_tokens=max_tokens,
        text={"format": {"type": "json_object"}},
    )
    return response.output_text


def complete_json(instructions, prompt, *, max_tokens=800):
    """Ask Claude, falling back to OpenAI on any failure; returns (payload dict, ProviderChoice)."""
    order = provider_order()
    if not order:
        raise AIProviderUnavailable("No AI service is configured.")
    for choice in order:
        call = _anthropic_text if choice.name == "anthropic" else _openai_text
        try:
            return _parse_json(call(choice, instructions, prompt, max_tokens)), choice
        except Exception as exc:
            # The exception type only: messages from SDKs can echo request details.
            logger.warning("AI request to %s (%s) failed: %s", choice.name, choice.model, type(exc).__name__)
    raise AIProviderUnavailable("Every configured AI service failed.")
