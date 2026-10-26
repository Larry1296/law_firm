from django.db.models import Q
from .models import Tutorial


def visible_tutorials(user):
    """Shared sanitized content only; never query a firm's case or client data."""
    roles = user.firm_memberships.filter(is_active=True).values_list('role', flat=True)
    audience = Q(audiences__isnull=True) | (
        (Q(audiences__role='') | Q(audiences__role=user.role)) &
        (Q(audiences__firm_role='') | Q(audiences__firm_role__in=roles))
    )
    return Tutorial.objects.filter(status='published', category__is_active=True).filter(audience).distinct()
