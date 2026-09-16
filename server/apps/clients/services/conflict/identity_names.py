import re
from apps.clients.services.onboarding_service import PROFILE_MODELS


def client_identity_names(client):
    names = [client.full_name, *re.split(r"[;,\n]+", client.alternative_names or "")]
    model = PROFILE_MODELS.get(client.client_type)
    profile = model.objects.filter(client=client).first() if model else None
    if profile:
        for field in ("preferred_name", "registered_business_name", "trading_name", "proprietor_name",
                      "company_name", "partnership_name", "registered_name", "legal_name", "common_name",
                      "trust_name", "estate_name", "deceased_full_name", "official_name"):
            names.append(getattr(profile, field, ""))
    names.extend(client.representatives.values_list("full_legal_name", flat=True))
    return list(dict.fromkeys(name.strip() for name in names if name and name.strip()))
