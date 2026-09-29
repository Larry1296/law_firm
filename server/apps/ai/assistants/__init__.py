from apps.ai.assistants.client import ClientAssistant
from apps.ai.assistants.platform import PlatformAssistant
from apps.ai.assistants.staff import AdvocateAssistant, FirmOwnerAssistant

# The dashboard each assistant lives on; the URL names the assistant, the user decides access.
ASSISTANTS = {
    "client": ClientAssistant,
    "advocate": AdvocateAssistant,
    "firm": FirmOwnerAssistant,
    "platform": PlatformAssistant,
}

__all__ = ["ASSISTANTS"]
