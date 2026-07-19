from apps.common.choices import FirmRole, UserRole


def _label_for_choice(choice_class, value):
    if not value:
        return ""
    try:
        return choice_class(value).label
    except ValueError:
        return str(value).replace("_", " ").title()


def get_user_firm_role(user, firm=None):
    if user is None:
        return ""

    if firm is not None and hasattr(user, "firm_memberships"):
        membership = user.firm_memberships.filter(firm=firm, is_active=True).first()
        if membership is not None:
            return membership.role

    for profile_name in (
        "lawyer_profile",
        "secretary_profile",
        "accountant_profile",
        "hr_profile",
        "it_profile",
    ):
        profile = getattr(user, profile_name, None)
        if profile is not None:
            return getattr(profile, "firm_role", "") or ""

    membership = (
        user.firm_memberships.filter(is_active=True).first()
        if hasattr(user, "firm_memberships")
        else None
    )
    return membership.role if membership is not None else ""


def get_user_display_role(user, firm=None):
    if user is None:
        return "System"

    # Delegated administrators act as administrators in communications, even if
    # their underlying firm membership remains Lawyer, Secretary, IT, etc.
    if user.role == UserRole.ADMIN:
        return UserRole.ADMIN.label

    if user.role == UserRole.STAFF:
        firm_role = get_user_firm_role(user, firm=firm)
        return _label_for_choice(FirmRole, firm_role) if firm_role else UserRole.STAFF.label

    return _label_for_choice(UserRole, user.role)


def get_user_display_name(user, firm=None):
    if user is None:
        return "System"
    name = user.full_name or user.email or "Someone"
    role_label = get_user_display_role(user, firm=firm)
    return f"{name} ({role_label})" if role_label else name


def serialize_communication_user(user, firm=None):
    if user is None:
        return None
    firm_role = get_user_firm_role(user, firm=firm)
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "role_label": get_user_display_role(user, firm=firm),
        "firm_role": firm_role,
        "firm_role_label": _label_for_choice(FirmRole, firm_role) if firm_role else "",
        "display_name": get_user_display_name(user, firm=firm),
    }
