from apps.staff.models.lawyer import Lawyer


class AdminLawyerNumberService:
    """
    Generates lawyer staff numbers scoped to a law firm.
    """

    @staticmethod
    def generate_staff_number(law_firm):
        count = Lawyer.objects.filter(law_firm=law_firm).count() + 1
        return f"LAW-{count:04d}"