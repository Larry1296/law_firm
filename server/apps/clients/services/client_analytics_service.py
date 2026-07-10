from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from apps.clients.models import Client
from apps.firm.models import LawFirmMember


class ClientAnalyticsService:

    @staticmethod
    def _get_user_firm(user):
        membership = (
            LawFirmMember.objects
            .select_related("firm")
            .get(user=user, is_active=True)
        )
        return membership.firm

    @staticmethod
    def get_dashboard_summary(user):

        firm = ClientAnalyticsService._get_user_firm(user)

        queryset = Client.objects.filter(
            firm=firm
        )

        now = timezone.now()

        client_types = (
            queryset
            .values("client_type")
            .annotate(total=Count("id"))
        )

        return {

            # ----------------------------
            # Overall
            # ----------------------------

            "total_clients": queryset.count(),

            "active_clients": queryset.filter(
                is_active=True
            ).count(),

            "inactive_clients": queryset.filter(
                is_active=False
            ).count(),

            # ----------------------------
            # Portal Access
            # ----------------------------

            "portal_clients": queryset.filter(
                access_type=Client.AccessType.PORTAL_CLIENT
            ).count(),

            "assisted_clients": queryset.filter(
                access_type=Client.AccessType.ASSISTED_CLIENT
            ).count(),

            # ----------------------------
            # Lifecycle
            # ----------------------------

            "prospects": queryset.filter(
                lifecycle_status=Client.LifecycleStatus.PROSPECT
            ).count(),

            "official_clients": queryset.filter(
                lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT
            ).count(),

            "archived_clients": queryset.filter(
                lifecycle_status=Client.LifecycleStatus.ARCHIVED
            ).count(),

            # ----------------------------
            # Distribution
            # ----------------------------

            "clients_by_type": {
                item["client_type"]: item["total"]
                for item in client_types
            },

            # ----------------------------
            # Growth
            # ----------------------------

            "recent_clients": queryset.filter(
                created_at__gte=now - timedelta(days=30)
            ).count(),

            "growth_metrics": {

                "new_today": queryset.filter(
                    created_at__date=now.date()
                ).count(),

                "new_this_week": queryset.filter(
                    created_at__gte=now - timedelta(days=7)
                ).count(),

                "new_this_month": queryset.filter(
                    created_at__month=now.month,
                    created_at__year=now.year,
                ).count(),
            },
        }

    @staticmethod
    def get_client_summary(client):

        return {

            # ----------------------------
            # Profile
            # ----------------------------

            "client_type": client.client_type,
            "access_type": client.access_type,
            "lifecycle_status": client.lifecycle_status,
            "is_active": client.is_active,

            # ----------------------------
            # Records
            # ----------------------------

            "addresses": client.addresses.count(),
            "contacts": client.contacts.count(),
            "documents": client.documents.count(),

            # ----------------------------
            # Activity
            # ----------------------------

            "created_at": client.created_at,
            "updated_at": client.updated_at,
            "last_activity": client.updated_at,
        }