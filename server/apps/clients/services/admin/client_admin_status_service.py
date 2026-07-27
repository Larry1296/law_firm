from django.db import transaction

from apps.cases.models import Case
from apps.common.choices import UserRole


class ClientAdminStatusService:
    @staticmethod
    def _sync_user_role(client):
        if not client.user:
            return

        if client.lifecycle_status == client.LifecycleStatus.OFFICIAL_CLIENT:
            client.user.role = UserRole.OFFICIAL_CLIENT
            client.user.save(update_fields=["role", "updated_at"])
        elif client.lifecycle_status == client.LifecycleStatus.PROSPECT:
            client.user.role = UserRole.PROSPECT
            client.user.save(update_fields=["role", "updated_at"])

    @staticmethod
    @transaction.atomic
    def archive_client(client):
        if client.lifecycle_status == client.LifecycleStatus.ARCHIVED:
            return client
        client.snapshot_state_for_archive()
        if client.user:
            client.previous_user_is_active = client.user.is_active
            client.user.is_active = False
            client.user.save(update_fields=["is_active", "updated_at"])
        client.is_active = False
        client.lifecycle_status = client.LifecycleStatus.ARCHIVED
        client.save(
            update_fields=[
                "is_active",
                "lifecycle_status",
                "previous_lifecycle_status",
                "previous_access_type",
                "previous_is_active",
                "previous_user_is_active",
                "soft_deleted_at",
                "updated_at",
            ]
        )
        cases = client.cases.exclude(matter_status=Case.MatterStatus.ARCHIVED)
        for case in cases.select_for_update():
            case.previous_status_before_client_archive = case.status
            case.previous_matter_status_before_client_archive = case.matter_status
            case.previous_is_active_before_client_archive = case.is_active
            case.archived_with_client = True
            case.status = Case.Status.ARCHIVED
            case.matter_status = Case.MatterStatus.ARCHIVED
            case.is_active = False
            case.save(
                update_fields=[
                    "status",
                    "matter_status",
                    "is_active",
                    "archived_with_client",
                    "previous_status_before_client_archive",
                    "previous_matter_status_before_client_archive",
                    "previous_is_active_before_client_archive",
                    "updated_at",
                ]
            )
        return client

    @staticmethod
    @transaction.atomic
    def restore_client(client):
        if (
            client.lifecycle_status != client.LifecycleStatus.ARCHIVED
            and client.soft_deleted_at is None
        ):
            return client
        client.lifecycle_status = (
            client.previous_lifecycle_status
            or client.LifecycleStatus.OFFICIAL_CLIENT
        )
        client.access_type = client.previous_access_type or client.access_type
        client.is_active = (
            client.previous_is_active
            if client.previous_is_active is not None
            else True
        )
        client.previous_lifecycle_status = None
        client.previous_access_type = None
        client.previous_is_active = None
        previous_user_is_active = client.previous_user_is_active
        client.previous_user_is_active = None
        client.soft_deleted_at = None
        client.save(
            update_fields=[
                "is_active",
                "lifecycle_status",
                "access_type",
                "previous_lifecycle_status",
                "previous_access_type",
                "previous_is_active",
                "previous_user_is_active",
                "soft_deleted_at",
                "updated_at",
            ]
        )
        if client.user and previous_user_is_active is not None:
            client.user.is_active = previous_user_is_active
            client.user.save(update_fields=["is_active", "updated_at"])
        for case in client.cases.filter(archived_with_client=True).select_for_update():
            case.status = (
                case.previous_status_before_client_archive
                or Case.Status.PENDING
            )
            case.matter_status = (
                case.previous_matter_status_before_client_archive
                or Case.MatterStatus.INSTRUCTIONS_RECEIVED
            )
            case.is_active = (
                case.previous_is_active_before_client_archive
                if case.previous_is_active_before_client_archive is not None
                else True
            )
            case.archived_with_client = False
            case.previous_status_before_client_archive = None
            case.previous_matter_status_before_client_archive = None
            case.previous_is_active_before_client_archive = None
            case.save(
                update_fields=[
                    "status",
                    "matter_status",
                    "is_active",
                    "archived_with_client",
                    "previous_status_before_client_archive",
                    "previous_matter_status_before_client_archive",
                    "previous_is_active_before_client_archive",
                    "updated_at",
                ]
            )
        ClientAdminStatusService._sync_user_role(client)
        return client

    @staticmethod
    def set_status(client, action):
        if action == "activate":
            return ClientAdminStatusService.restore_client(client)
        elif action == "deactivate":
            return ClientAdminStatusService.archive_client(client)
        elif action == "restore":
            return ClientAdminStatusService.restore_client(client)
        elif action == "archive":
            return ClientAdminStatusService.archive_client(client)
        else:
            client.lifecycle_status = client.LifecycleStatus.OFFICIAL_CLIENT

        client.save(update_fields=["lifecycle_status", "updated_at"])
        ClientAdminStatusService._sync_user_role(client)

        return client
