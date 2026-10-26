from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


def portal_access_allowed(user):
    client = getattr(user, "client_profile", None)
    if client is None:
        return user.role != "PROSPECT"
    if client.lifecycle_status not in {"PROSPECTIVE", "PROSPECT"}:
        return True
    return client.matter_conflict_checks.filter(
        firm=client.firm, status="CLEARED", acceptance_decision="ACCEPTED"
    ).exists()


class PasswordChangeRequired(PermissionDenied):
    default_detail = "Change your temporary password before continuing."
    error_code = "password_change_required"


def _is_account_view(request):
    """Sign-in, session and password views stay reachable whatever gate applies."""
    view_class = getattr(getattr(request.resolver_match, "func", None), "view_class", None)
    if view_class is None:
        return False
    return view_class.__module__.startswith("apps.authentication.") or view_class.__name__.endswith("ChangePasswordView")


def password_change_pending(user):
    return bool(user.must_change_password)


class AcceptanceGatedJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result and password_change_pending(result[0]) and not _is_account_view(request):
            raise PasswordChangeRequired()
        if result and not portal_access_allowed(result[0]):
            # Account/session endpoints remain available; business data does not.
            if request.resolver_match and getattr(getattr(request.resolver_match.func, "view_class", None), "__module__", "").startswith("apps.authentication."):
                return result
            raise PermissionDenied("Conflict clearance and firm acceptance are required for portal access.")
        if result:
            from apps.subscriptions.enforcement import enforce_subscription

            enforce_subscription(request, result[0])
        return result
