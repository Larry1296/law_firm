from apps.staff.models import Secretary


class AdminSecretaryNumberService:
    @staticmethod
    def generate_staff_number(law_firm):
        prefix = "SEC"
        total = Secretary.objects.filter(law_firm=law_firm).count() + 1
        return f"{prefix}-{total:04d}"
