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


class ConflictCheckStatus(models.TextChoices):
    NOT_STARTED = "NOT_STARTED", "Not started"
    IN_PROGRESS = "IN_PROGRESS", "In progress"
    AWAITING_INFORMATION = "AWAITING_INFORMATION", "Awaiting information"
    POTENTIAL_CONFLICT = "POTENTIAL_CONFLICT", "Potential conflict"
    ESCALATED_FOR_REVIEW = "ESCALATED_FOR_REVIEW", "Escalated for review"
    CLEARED = "CLEARED", "Cleared for proposed instructions"
    CONFLICT_CONFIRMED = "CONFLICT_CONFIRMED", "Conflict confirmed"
    CLOSED_WITHOUT_DECISION = "CLOSED_WITHOUT_DECISION", "Closed without decision"


class ConflictCheckSourceCategory(models.TextChoices):
    CURRENT_CLIENTS = "CURRENT_CLIENTS", "Current clients"
    FORMER_CLIENTS = "FORMER_CLIENTS", "Former clients"
    OPEN_MATTERS = "OPEN_MATTERS", "Open matters"
    CLOSED_MATTERS = "CLOSED_MATTERS", "Closed matters"
    PROSPECTIVE_CLIENTS = "PROSPECTIVE_CLIENTS", "Prospective clients"
    RELATED_PARTIES = "RELATED_PARTIES", "Related parties"
    FIRM_ADVOCATES_AND_STAFF = "FIRM_ADVOCATES_AND_STAFF", "Firm advocates and staff"
    OTHER = "OTHER", "Other"
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
