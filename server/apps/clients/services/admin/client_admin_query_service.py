from apps.clients.models import Client


class ClientAdminQueryService:
    @staticmethod
    def get_firm_clients(firm):
        return Client.objects.filter(firm=firm).order_by("-created_at")

    @staticmethod
    def get_client(firm, client_id):
        return Client.objects.get(id=client_id, firm=firm)
