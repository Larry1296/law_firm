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


class AcceptanceGatedJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result and not portal_access_allowed(result[0]):
            # Account/session endpoints remain available; business data does not.
            if request.resolver_match and getattr(getattr(request.resolver_match.func, "view_class", None), "__module__", "").startswith("apps.authentication."):
                return result
            raise PermissionDenied("Conflict clearance and firm acceptance are required for portal access.")
        return result
