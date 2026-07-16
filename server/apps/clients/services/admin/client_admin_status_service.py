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
    def archive_client(client):
        client.snapshot_state_for_archive()
        client.is_active = False
        client.lifecycle_status = client.LifecycleStatus.ARCHIVED
        client.save(
            update_fields=[
                "is_active",
                "lifecycle_status",
                "previous_lifecycle_status",
                "previous_access_type",
                "previous_is_active",
                "soft_deleted_at",
                "updated_at",
            ]
        )
        return client

    @staticmethod
    def restore_client(client):
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
        client.soft_deleted_at = None
        client.save(
            update_fields=[
                "is_active",
                "lifecycle_status",
                "access_type",
                "previous_lifecycle_status",
                "previous_access_type",
                "previous_is_active",
                "soft_deleted_at",
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
