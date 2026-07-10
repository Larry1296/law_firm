from django.shortcuts import get_object_or_404
from apps.firm.models import LawFirmMember


def get_user_membership(user):
    return get_object_or_404(
        LawFirmMember,
        user=user,
        is_active=True,
    )


def get_user_firm(user):
    return get_user_membership(user).firm


def get_user_firm_role(user):
    return get_user_membership(user).role