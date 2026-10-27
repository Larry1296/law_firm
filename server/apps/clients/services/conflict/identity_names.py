import re
from collections import defaultdict

from apps.clients.services.onboarding_service import PROFILE_MODELS

PROFILE_NAME_FIELDS = (
    "preferred_name", "registered_business_name", "trading_name", "proprietor_name",
    "company_name", "partnership_name", "registered_name", "legal_name", "common_name",
    "trust_name", "estate_name", "deceased_full_name", "official_name",
)


def _identity_names(client, profile, representative_names):
    names = [client.full_name, *re.split(r"[;,\n]+", client.alternative_names or "")]
    if profile:
        for field in PROFILE_NAME_FIELDS:
            names.append(getattr(profile, field, ""))
    names.extend(representative_names)
    return list(dict.fromkeys(name.strip() for name in names if name and name.strip()))


def client_identity_names(client):
    model = PROFILE_MODELS.get(client.client_type)
    profile = model.objects.filter(client=client).first() if model else None
    return _identity_names(client, profile, client.representatives.values_list("full_legal_name", flat=True))


def identity_names_by_client(clients):
    """client_identity_names for many clients, loading profiles and representatives in bulk."""
    from apps.clients.models import Client

    clients = list(clients)
    ids_by_type = defaultdict(list)
    for client in clients:
        ids_by_type[client.client_type].append(client.id)
    profiles = {}
    for client_type, ids in ids_by_type.items():
        model = PROFILE_MODELS.get(client_type)
        for profile in model.objects.filter(client_id__in=ids) if model else []:
            profiles.setdefault(profile.client_id, profile)
    representatives = defaultdict(list)
    representative_model = Client.representatives.rel.related_model
    for client_id, name in representative_model.objects.filter(client__in=clients).values_list("client_id", "full_legal_name"):
        representatives[client_id].append(name)
    return {client.id: _identity_names(client, profiles.get(client.id), representatives[client.id]) for client in clients}
