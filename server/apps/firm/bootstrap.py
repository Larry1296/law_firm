from apps.firm.models import LawFirm
from apps.users.models import User


def ensure_default_firm(sender, **kwargs):
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        return

    LawFirm.objects.get_or_create(
        owner=admin,
        defaults={"name": "Default Firm"},
    )