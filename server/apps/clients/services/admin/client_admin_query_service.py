from django.db.models import Count, Q

from apps.clients.models import Client
from apps.common.choices import ConflictCheckStatus


class ClientAdminQueryService:
    @staticmethod
    def get_firm_clients(firm, *, tab=None):
        queryset = (
            Client.objects.filter(firm=firm)
            .annotate(
                accepted_matter_count=Count("cases", distinct=True),
                proposed_matter_count=Count("matter_conflict_checks", distinct=True),
                pending_proposed_matter_count=Count(
                    "matter_conflict_checks",
                    filter=Q(matter_conflict_checks__status__in=[
                        ConflictCheckStatus.NOT_STARTED,
                        ConflictCheckStatus.IN_PROGRESS,
                        ConflictCheckStatus.AWAITING_INFORMATION,
                        ConflictCheckStatus.POTENTIAL_CONFLICT,
                        ConflictCheckStatus.ESCALATED_FOR_REVIEW,
                    ]),
                    distinct=True,
                ),
                awaiting_acceptance_count=Count(
                    "matter_conflict_checks",
                    filter=Q(
                        matter_conflict_checks__status=ConflictCheckStatus.CLEARED,
                        matter_conflict_checks__acceptance_decision="PENDING",
                    ),
                    distinct=True,
                ),
            )
            .order_by("-created_at")
        )
        if tab != "archived":
            queryset = queryset.filter(is_active=True).exclude(lifecycle_status__in=[
                Client.LifecycleStatus.ARCHIVED,
            ])
        if tab == "prospective":
            queryset = queryset.filter(accepted_matter_count=0)
        elif tab == "official":
            queryset = queryset.filter(accepted_matter_count__gt=0)
        elif tab == "pending_proposed_matters":
            queryset = queryset.filter(pending_proposed_matter_count__gt=0)
        elif tab == "awaiting_acceptance":
            queryset = queryset.filter(awaiting_acceptance_count__gt=0)
        elif tab == "archived":
            queryset = queryset.filter(Q(lifecycle_status=Client.LifecycleStatus.ARCHIVED) | Q(is_active=False))
        return queryset

    @staticmethod
    def get_client(firm, client_id):
        return Client.objects.get(id=client_id, firm=firm)
