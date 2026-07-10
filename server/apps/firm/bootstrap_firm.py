from datetime import date
from django.db import transaction

from apps.users.models import User
from apps.firm.models import (
    LawFirm,
    LawFirmMember,
    FirmSetting,
)
from apps.staff.models.lawyer import Lawyer, LawyerPermission
from apps.common.choices import FirmRole
from apps.staff.services.admin.lawyers.admin_lawyer_permission_service import (
    AdminLawyerPermissionService,
)


# =========================================================
# CONFIGURATION (ONLY PLACE YOU EDIT IN DEPLOYMENT)
# =========================================================

FIRM_DATA = {
    "owner_email": "admin@email.com",

    "firm": {
        "name": "Prime Law Advocates",
        "registration_number": "REG-001",
        "kra_pin": "",
        "email": "info@primelaw.com",
        "phone_number": "+254700000000",
        "website": "",
        "physical_address": "Nairobi, Kenya",
        "postal_address": "",
        "description": "Full-service commercial law firm",
    },

    "staff": {
        "staff_number": "ADM001",
        "job_title": "Managing Partner",
        "admission_number": "OWNER-ADV-001",
    }
}


# =========================================================
# BOOTSTRAP LOGIC
# =========================================================

@transaction.atomic
def run():
    owner_email = FIRM_DATA["owner_email"]

    # -----------------------------------------------------
    # 1. Ensure admin exists
    # -----------------------------------------------------
    try:
        owner = User.objects.get(email=owner_email)
    except User.DoesNotExist:
        raise Exception(
            f"Owner user '{owner_email}' does not exist. "
            "Create superuser first before running bootstrap."
        )

    # -----------------------------------------------------
    # 2. Create or reuse firm
    # -----------------------------------------------------
    existing_firm = LawFirm.objects.filter(owner=owner).first()
    if existing_firm:
        firm = existing_firm
        print("Firm already exists. Reusing it and syncing bootstrap essentials.")
    else:
        firm = LawFirm.objects.create(
            owner=owner,
            **FIRM_DATA["firm"],
        )

    # -----------------------------------------------------
    # 4. Firm settings (OneToOne safe)
    # -----------------------------------------------------
    FirmSetting.objects.get_or_create(
        firm=firm
    )

    # -----------------------------------------------------
    # 5. Firm membership (idempotent)
    # -----------------------------------------------------
    LawFirmMember.objects.update_or_create(
        firm=firm,
        user=owner,
        defaults={
            "role": FirmRole.LAWYER,
            "created_by": owner,
            "is_active": True,
        },
    )

    # -----------------------------------------------------
    # 6. Owner lawyer profile (idempotent)
    # -----------------------------------------------------
    owner_lawyer, _ = Lawyer.objects.get_or_create(
        user=owner,
        law_firm=firm,
        defaults={
            "staff_number": FIRM_DATA["staff"]["staff_number"],
            "firm_role": FirmRole.LAWYER,
            "job_title": FIRM_DATA["staff"]["job_title"],
            "admission_number": FIRM_DATA["staff"]["admission_number"],
            "date_hired": date.today(),
        },
    )
    AdminLawyerPermissionService.sync_permissions(
        lawyer=owner_lawyer,
        permission_codes=[code for code, _ in LawyerPermission.choices],
        granted_by=owner,
    )

    # -----------------------------------------------------
    # 11. Output summary
    # -----------------------------------------------------
    print("\n===== FIRM BOOTSTRAP COMPLETE =====")
    print(f"Firm: {firm.name}")
    print(f"Owner: {owner.email}")
    print(f"Branches: {firm.branches.count()}")
    print(f"Departments: {firm.departments.count()}")
    print(f"Practice Areas: {firm.practice_areas.count()}")
    print("=====================================\n")


# Optional direct execution
if __name__ == "__main__":
    run()
