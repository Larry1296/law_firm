from apps.clients.services.admin.client_admin_status_service import ClientAdminStatusService


class ClientAdminDeleteService:
    @staticmethod
    def delete_client(client):
        if client.can_hard_delete:
            client.delete()
            return {"action": "deleted", "client": None}

        archived_client = ClientAdminStatusService.archive_client(client)
        return {"action": "archived", "client": archived_client}

    @staticmethod
    def hard_delete_client(client):
        if not client.can_hard_delete:
            raise ValueError("Client has linked cases and cannot be permanently deleted.")
        client.delete()
        return {"action": "deleted", "client": None}
