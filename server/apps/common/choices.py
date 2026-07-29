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


class DismissalType(models.TextChoices):
    NOT_APPLICABLE = "NOT_APPLICABLE", "Not applicable"
    SUMMARY_DISMISSAL = "SUMMARY_DISMISSAL", "Summary dismissal"
    TERMINATION_WITH_NOTICE = "TERMINATION_WITH_NOTICE", "Termination with notice"
    REDUNDANCY = "REDUNDANCY", "Redundancy"
    CONSTRUCTIVE_DISMISSAL = "CONSTRUCTIVE_DISMISSAL", "Constructive dismissal"
    UNFAIR_DISMISSAL = "UNFAIR_DISMISSAL", "Unfair dismissal"
    WRONGFUL_DISMISSAL = "WRONGFUL_DISMISSAL", "Wrongful dismissal"
    MUTUAL_SEPARATION = "MUTUAL_SEPARATION", "Mutual separation"
    RESIGNATION = "RESIGNATION", "Resignation"
    RETIREMENT = "RETIREMENT", "Retirement"
    OTHER = "OTHER", "Other"


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


# Vocabulary shared by the case, events and courtroom domains. Procedural
# transition rules deliberately live in the cases service layer.
class CourtEventType(models.TextChoices):
    INTERNAL = "INTERNAL", "Internal matter activity"
    FILING = "FILING", "Filing"
    REGISTRATION = "REGISTRATION", "Registry registration"
    REGISTRY_ACTION = "REGISTRY_ACTION", "Registry action"
    SERVICE = "SERVICE", "Service"
    PLEA = "PLEA", "Plea"
    DIRECTIONS = "DIRECTIONS", "Directions"
    CASE_MANAGEMENT = "CASE_MANAGEMENT", "Case-management conference"
    PRE_TRIAL = "PRE_TRIAL", "Pre-trial conference"
    MENTION = "MENTION", "Mention"
    FURTHER_MENTION = "FURTHER_MENTION", "Further mention"
    COMPLIANCE_MENTION = "COMPLIANCE_MENTION", "Compliance mention"
    APPLICATION_HEARING = "APPLICATION_HEARING", "Application hearing"
    PRELIMINARY_OBJECTION = "PRELIMINARY_OBJECTION", "Preliminary objection"
    HEARING = "HEARING", "Hearing"
    FURTHER_HEARING = "FURTHER_HEARING", "Further hearing"
    DEFENCE_HEARING = "DEFENCE_HEARING", "Defence hearing"
    SUBMISSIONS = "SUBMISSIONS", "Submissions"
    RULING = "RULING", "Ruling"
    JUDGMENT = "JUDGMENT", "Judgment"
    SENTENCING = "SENTENCING", "Sentencing"
    MITIGATION = "MITIGATION", "Mitigation"
    PROBATION_REPORT = "PROBATION_REPORT", "Probation report"
    TAXATION = "TAXATION", "Taxation"
    ADR = "ADR", "Alternative dispute resolution"
    MEDIATION = "MEDIATION", "Mediation"
    SETTLEMENT = "SETTLEMENT", "Settlement or consent"
    DECREE = "DECREE", "Decree"
    EXECUTION = "EXECUTION", "Execution"
    REVIEW = "REVIEW", "Review"
    APPEAL = "APPEAL", "Appeal"
    WITHDRAWAL = "WITHDRAWAL", "Withdrawal"
    DISMISSAL = "DISMISSAL", "Dismissal"
    CLOSURE = "CLOSURE", "Closure"
    ADMINISTRATIVE = "ADMINISTRATIVE", "Administrative activity"
    CLIENT_MEETING = "CLIENT_MEETING", "Client meeting"
    OTHER_COURT_DIRECTED = "OTHER_COURT_DIRECTED", "Other court-directed event"
    OTHER = "OTHER", "Other"


class CourtEventOutcome(models.TextChoices):
    PROCEEDED = "PROCEEDED", "Proceeded"
    ADJOURNED = "ADJOURNED", "Adjourned"
    PART_HEARD = "PART_HEARD", "Part-heard"
    DIRECTIONS_ISSUED = "DIRECTIONS_ISSUED", "Directions issued"
    DATE_ISSUED = "DATE_ISSUED", "Next date issued"
    RULING_DELIVERED = "RULING_DELIVERED", "Ruling delivered"
    JUDGMENT_DELIVERED = "JUDGMENT_DELIVERED", "Judgment delivered"
    CONSENT_RECORDED = "CONSENT_RECORDED", "Consent recorded"
    SETTLED = "SETTLED", "Settled"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"
    DISMISSED = "DISMISSED", "Dismissed"
    TAKEN_OUT = "TAKEN_OUT", "Taken out"
    VACATED = "VACATED", "Vacated"
    DID_NOT_PROCEED = "DID_NOT_PROCEED", "Did not proceed"
    OTHER = "OTHER", "Other"


class InternalCaseLifecycleStage(models.TextChoices):
    PRE_FILING = "PRE_FILING", "Pre-filing"
    FILING_PENDING = "FILING_PENDING", "Filing pending"
    FILED_REGISTERED = "FILED_REGISTERED", "Filed / registered"
    AWAITING_DIRECTIONS = "AWAITING_DIRECTIONS", "Awaiting directions"
    AWAITING_MENTION = "AWAITING_MENTION", "Awaiting mention"
    AWAITING_APPLICATION_HEARING = "AWAITING_APPLICATION_HEARING", "Awaiting application hearing"
    AWAITING_HEARING = "AWAITING_HEARING", "Awaiting hearing"
    PART_HEARD = "PART_HEARD", "Part-heard"
    AWAITING_SUBMISSIONS = "AWAITING_SUBMISSIONS", "Awaiting submissions"
    AWAITING_RULING = "AWAITING_RULING", "Awaiting ruling"
    AWAITING_JUDGMENT = "AWAITING_JUDGMENT", "Awaiting judgment"
    JUDGMENT_DELIVERED = "JUDGMENT_DELIVERED", "Judgment delivered"
    EXECUTION = "EXECUTION", "Execution"
    ON_APPEAL = "ON_APPEAL", "On appeal"
    STAYED = "STAYED", "Stayed"
    SETTLED = "SETTLED", "Settled"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"
    DISMISSED = "DISMISSED", "Dismissed"
    CLOSED = "CLOSED", "Closed"


class JurisdictionStatus(models.TextChoices):
    UNDER_REVIEW = "UNDER_REVIEW", "Under review"
    VERIFIED = "VERIFIED", "Verified"
    CARRIED_OVER_FROM_EXISTING_CASE = (
        "CARRIED_OVER_FROM_EXISTING_CASE",
        "Carried over from existing filed case",
    )
    CHALLENGED_BY_PARTY = "CHALLENGED_BY_PARTY", "Challenged by a party"
    RAISED_BY_COURT = "RAISED_BY_COURT", "Raised by the court"
    TRANSFER_PENDING = "TRANSFER_PENDING", "Transfer pending"
    TRANSFERRED = "TRANSFERRED", "Transferred"
    INCORRECT = "INCORRECT", "Found to be incorrect"
