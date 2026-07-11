from django.db import models


# ==========================================================
# System Roles
# ==========================================================

class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "Admin"
    STAFF = "STAFF", "Staff"
    OFFICIAL_CLIENT = "OFFICIAL_CLIENT", "Official Client"
    PROSPECT = "PROSPECT", "Prospect" 


# ==========================================================
# Law Firm Roles
# ==========================================================

class FirmRole(models.TextChoices):
    LAWYER = "LAWYER", "Lawyer"
    SECRETARY = "SECRETARY", "Secretary"
    IT = "IT", "IT Support"
    ACCOUNTANT = "ACCOUNTANT", "Accountant"
    HR = "HR", "Human Resource"
    OFFICIAL_CLIENT = "OFFICIAL_CLIENT", "Official Client"

    @classmethod
    def lawyer_roles(cls):
        return [cls.LAWYER]

    @classmethod
    def staff_roles(cls):
        return [
            cls.LAWYER,
            cls.SECRETARY,
            cls.IT,
            cls.ACCOUNTANT,
            cls.HR,
        ]
# ==========================================================
# Employment Types
# ==========================================================

class EmploymentType(models.TextChoices):
    PERMANENT = "PERMANENT", "Permanent"
    CONTRACT = "CONTRACT", "Contract"
    PART_TIME = "PART_TIME", "Part Time"
    INTERN = "INTERN", "Intern"
    CONSULTANT = "CONSULTANT", "Consultant"
    TEMPORARY = "TEMPORARY", "Temporary"


# ==========================================================
# Employment Status
# ==========================================================

class EmploymentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    PROBATION = "PROBATION", "Probation"
    ON_LEAVE = "ON_LEAVE", "On Leave"
    SUSPENDED = "SUSPENDED", "Suspended"
    RESIGNED = "RESIGNED", "Resigned"
    TERMINATED = "TERMINATED", "Terminated"
    RETIRED = "RETIRED", "Retired"
