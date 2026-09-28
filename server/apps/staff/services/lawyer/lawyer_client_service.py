from django.db.models import Max

from apps.cases.models import Case
from apps.clients.models import Client


class LawyerClientService:
    @staticmethod
    def list_clients(user):
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer is None:
            raise ValueError("Only lawyers can access this endpoint.")

        matters = Case.objects.filter(firm=lawyer.law_firm, assigned_lawyer=lawyer)
        clients = (
            Client.objects.filter(cases__in=matters)
            .annotate(last_contact=Max("cases__updated_at"))
            .distinct()
            .order_by("full_name")
        )
        return [
            {
                "id": str(client.id),
                "full_name": client.full_name,
                "email": client.email or "",
                "phone_number": client.phone_number or "",
                "matter_type": ", ".join(sorted({
                    matter.get_case_type_display() for matter in matters if matter.client_id == client.id
                })),
                "status": client.lifecycle_status,
                "last_contact": client.last_contact.date().isoformat() if client.last_contact else None,
            }
            for client in clients
        ]
