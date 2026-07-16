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


# ==========================================================
# Case Statuses
# ==========================================================

class CaseStatus(models.TextChoices):
    PENDING = "PENDING", "Pending Review"
    PENDING_FILING = "PENDING_FILING", "Pending Filing"
    FILED = "FILED", "Filed in Court"
    SERVICE_PENDING = "SERVICE_PENDING", "Service Pending"
    SERVED = "SERVED", "Served"
    AWAITING_RESPONSE = "AWAITING_RESPONSE", "Awaiting Response"
    MENTION = "MENTION", "Mention"
    DIRECTIONS = "DIRECTIONS", "Directions"
    PRE_TRIAL = "PRE_TRIAL", "Pre-Trial"
    MEDIATION = "MEDIATION", "Mediation"
    HEARING = "HEARING", "Hearing"
    SUBMISSIONS = "SUBMISSIONS", "Submissions"
    AWAITING_RULING = "AWAITING_RULING", "Awaiting Ruling"
    AWAITING_JUDGMENT = "AWAITING_JUDGMENT", "Awaiting Judgment"
    JUDGMENT_DELIVERED = "JUDGMENT_DELIVERED", "Judgment Delivered"
    DECREE_EXTRACTION = "DECREE_EXTRACTION", "Decree Extraction"
    EXECUTION = "EXECUTION", "Execution"
    APPEAL_WINDOW = "APPEAL_WINDOW", "Appeal Window"
    NOTICE_OF_APPEAL_FILED = "NOTICE_OF_APPEAL_FILED", "Notice of Appeal Filed"
    ON_APPEAL = "ON_APPEAL", "On Appeal"
    APPEAL_DECIDED = "APPEAL_DECIDED", "Appeal Decided"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    ON_HOLD = "ON_HOLD", "On Hold"
    SETTLED = "SETTLED", "Settled"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"
    DISMISSED = "DISMISSED", "Dismissed"
    CLOSED = "CLOSED", "Closed"
    ARCHIVED = "ARCHIVED", "Archived"

    @classmethod
    def inactive_statuses(cls):
        return [
            cls.CLOSED,
            cls.ARCHIVED,
            cls.DISMISSED,
            cls.SETTLED,
            cls.WITHDRAWN,
        ]
