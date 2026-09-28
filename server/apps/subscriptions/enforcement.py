"""
Request-level plan enforcement, applied by the API's JWT authentication class.

- A lapsed subscription (expired trial, or past the grace period) makes the firm
  read-only: records stay viewable because advocates must keep client and
  account records available, but writes are refused until renewal.
- Views for features outside the plan are refused.
- Client users of a firm without the client portal feature are refused.
- Every member of a firm the platform administrator has suspended is refused.
"""

from rest_framework.permissions import SAFE_METHODS

from apps.subscriptions.catalog import Feature
from apps.subscriptions.services import (
    FeatureNotInPlan,
    FirmSuspended,
    SubscriptionInactive,
    SubscriptionService,
    firm_for_user,
)

EXEMPT_VIEW_PREFIXES = ("apps.authentication.", "apps.subscriptions.")
SUSPENSION_EXEMPT_VIEW_PREFIXES = ("apps.authentication.views.logout_view.",)

FEATURE_VIEW_PREFIXES = {
    Feature.AI_CASE_ANALYSIS: (
        "apps.ai.views.lawyer_case_assessment_view.",
        "apps.ai.views.court_preparation_view.",
        "apps.ai.views.admin_matter_intelligence_view.",
    ),
    Feature.COURTROOM_ADVANCED: (
        "apps.courtroom.views.CourtroomRecording",
        "apps.courtroom.views.CourtroomAnalyticsView",
        "apps.courtroom.views.CourtroomCauseListSync",
    ),
}


def _view_path(request):
    match = getattr(request, "resolver_match", None)
    view_class = getattr(getattr(match, "func", None), "view_class", None)
    if view_class is None:
        return None
    return f"{view_class.__module__}.{view_class.__qualname__}"


def enforce_subscription(request, user):
    view_path = _view_path(request)
    if view_path is None:
        return
    firm = firm_for_user(user)
    if firm is None:
        return
    if not firm.is_active and not view_path.startswith(SUSPENSION_EXEMPT_VIEW_PREFIXES):
        raise FirmSuspended()
    if view_path.startswith(EXEMPT_VIEW_PREFIXES):
        return
    subscription = SubscriptionService.get(firm)
    features = subscription.plan.features or []

    is_client = getattr(user, "client_profile", None) is not None and not user.firm_memberships.filter(is_active=True).exists()
    if is_client and Feature.CLIENT_PORTAL not in features:
        raise FeatureNotInPlan(Feature.CLIENT_PORTAL)

    for feature, prefixes in FEATURE_VIEW_PREFIXES.items():
        if view_path.startswith(prefixes) and feature not in features:
            raise FeatureNotInPlan(feature)

    if request.method not in SAFE_METHODS and not SubscriptionService.is_writable(subscription):
        raise SubscriptionInactive()
