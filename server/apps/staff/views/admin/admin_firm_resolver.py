from rest_framework.exceptions import PermissionDenied

from apps.common.choices import UserRole


def get_admin_law_firm(user, *, message="Only admins can manage staff."):
    if user.role != UserRole.ADMIN:
        raise PermissionDenied(message)

    if hasattr(user, "owned_firm"):
        return user.owned_firm

    membership = (
        user.firm_memberships.filter(is_active=True)
        .select_related("firm")
        .first()
        if hasattr(user, "firm_memberships")
        else None
    )
    if membership:
        return membership.firm

    raise PermissionDenied("Admin is not attached to a law firm.")
