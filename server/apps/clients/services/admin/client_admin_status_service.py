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
        return client
