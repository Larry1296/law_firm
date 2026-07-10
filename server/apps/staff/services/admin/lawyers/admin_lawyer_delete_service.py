from django.db import transaction


class AdminLawyerDeleteService:
    """
    Permanently deletes a lawyer and their user identity from the database.
    """

    @staticmethod
    @transaction.atomic
    def delete_lawyer(*, lawyer, deleted_by):
        lawyer.user.delete()
        return lawyer