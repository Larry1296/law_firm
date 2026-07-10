from django.db import transaction


class AdminSecretaryDeleteService:
    @staticmethod
    @transaction.atomic
    def delete_secretary(*, secretary, deleted_by):
        secretary.user.delete()
        return secretary
