from apps.common.choices import UserRole


class ClientAdminStatusService:

    @staticmethod
    def set_status(client, action):
        if action == "activate":
            client.is_active = True
            client.lifecycle_status = client.LifecycleStatus.OFFICIAL_CLIENT
        elif action == "deactivate":
            client.is_active = False
            client.lifecycle_status = client.LifecycleStatus.ARCHIVED
        else:
            client.lifecycle_status = client.LifecycleStatus.OFFICIAL_CLIENT

        client.save(update_fields=["is_active", "lifecycle_status"])

        # === SYNC USER ROLE ===
        if client.user:
            if action == "activate" and client.user.role == UserRole.PROSPECT:
                client.user.role = UserRole.OFFICIAL_CLIENT
                client.user.save(update_fields=["role", "updated_at"])
            elif action == "deactivate" and client.user.role == UserRole.OFFICIAL_CLIENT:
                client.user.role = UserRole.PROSPECT
                client.user.save(update_fields=["role", "updated_at"])

        return client