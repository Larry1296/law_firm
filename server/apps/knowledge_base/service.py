"""
KnowledgeBaseService — thin wrapper around the OpenAI chat completions API.

Uses the OPENAI_API_KEY from environment. Falls back gracefully if the key is
missing (returns a placeholder response so the UI does not break in dev without
a key).
"""
import logging
from decouple import config

logger = logging.getLogger(__name__)

OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
OPENAI_MODEL = config("OPENAI_MODEL", default="gpt-4o-mini")
OPENAI_MAX_TOKENS = config("OPENAI_MAX_TOKENS", default=1024, cast=int)
OPENAI_TEMPERATURE = config("OPENAI_TEMPERATURE", default=0.5, cast=float)


def _build_messages(system_prompt: str, history: list[dict], question: str) -> list[dict]:
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": question})
    return messages


def ask_knowledge_base(question: str, history: list[dict], system_prompt: str) -> str:
    """
    Send the question (with history) to the OpenAI API and return the
    assistant's text reply.

    Raises:
        RuntimeError – if the API call fails or the key is not configured.
    """
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY is not set – returning stub response.")
        return (
            "The AI assistant is not configured yet. Please contact the firm "
            "directly or set the OPENAI_API_KEY environment variable."
        )

    try:
        # Import here so the module loads even without the package installed.
        from openai import OpenAI  # type: ignore
    except ImportError:
        logger.error("openai package is not installed.")
        raise RuntimeError(
            "The openai package is not installed on the server. "
            "Run: pip install openai"
        )

    client = OpenAI(api_key=OPENAI_API_KEY)
    messages = _build_messages(system_prompt, history, question)

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            max_tokens=OPENAI_MAX_TOKENS,
            temperature=OPENAI_TEMPERATURE,
        )
        return response.choices[0].message.content.strip()
    except Exception as exc:
        logger.exception("OpenAI API call failed: %s", exc)
        raise RuntimeError(f"AI service error: {exc}") from exc
