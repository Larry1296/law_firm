from apps.cases.models import Case


class ClientCaseService:
    @staticmethod
    def list_cases(client):
        return (
            Case.objects.filter(client=client, firm=client.firm)
            .select_related(
                "client",
                "assigned_lawyer",
                "assigned_lawyer__user",
                "assigned_secretary",
                "assigned_secretary__user",
            )
            .prefetch_related("timeline", "activities")
            .order_by("-created_at")
        )

    @classmethod
    def get_case(cls, client, case_id):
        try:
            return cls.list_cases(client).get(id=case_id)
        except Case.DoesNotExist:
            return None
