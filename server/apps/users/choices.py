class UserRole:
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    OFFICIAL_CLIENT = "OFFICIAL_CLIENT"
    PROSPECT = "PROSPECT"


USER_ROLE_CHOICES = [
    (UserRole.ADMIN, "Admin"),
    (UserRole.STAFF, "Staff"),
    (UserRole.OFFICIAL_CLIENT, "Official Client"),
    (UserRole.PROSPECT, "Prospect"),
]


class FirmRole:
    LAWYER = "LAWYER"
    SECRETARY = "SECRETARY"
    IT = "IT"
    ACCOUNTANT = "ACCOUNTANT"
    HR = "HR"
    OFFICIAL_CLIENT = "OFFICIAL_CLIENT"


FIRM_ROLE_CHOICES = [
    (FirmRole.LAWYER, "Lawyer"),
    (FirmRole.SECRETARY, "Secretary"),
    (FirmRole.IT, "IT"),
    (FirmRole.ACCOUNTANT, "Accountant"),
    (FirmRole.HR, "Human Resource"),
    (FirmRole.OFFICIAL_CLIENT, "Official Client"),
]
