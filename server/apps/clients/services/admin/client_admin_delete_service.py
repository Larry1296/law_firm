class ClientAdminDeleteService:
    @staticmethod
    def delete_client(client):
        client.delete()
        return client
