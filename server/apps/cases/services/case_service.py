from django.db import transaction
from django.db.models import Count, Q

from apps.cases.models import Case, CaseActivity, CaseTimeline
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.staff.models import Lawyer, Secretary


class CaseService:
    @staticmethod
    def get_user_firm(user):
        if user.role == UserRole.ADMIN and hasattr(user, "owned_firm"):
            return user.owned_firm
        membership = (
            user.firm_memberships.filter(is_active=True)
            .select_related("firm")
            .first()
            if hasattr(user, "firm_memberships")
            else None
        )
        if membership:
            return membership.firm
        for profile_name in [
            "lawyer_profile",
            "secretary_profile",
            "it_profile",
            "accountant_profile",
            "hr_profile",
        ]:
            profile = getattr(user, profile_name, None)
            if profile is not None:
                return profile.law_firm
        if hasattr(user, "client_profile"):
            return user.client_profile.firm
        raise PermissionError("User is not attached to a law firm.")

    @staticmethod
    def base_queryset(user):
        firm = CaseService.get_user_firm(user)
        queryset = (
            Case.objects.filter(firm=firm)
            .select_related(
                "firm",
                "client",
                "assigned_lawyer",
                "assigned_lawyer__user",
                "assigned_secretary",
                "assigned_secretary__user",
                "created_by",
            )
            .prefetch_related("timeline", "activities")
        )

        if user.role == UserRole.ADMIN:
            return queryset
        if hasattr(user, "lawyer_profile"):
            queryset = queryset.filter(assigned_lawyer=user.lawyer_profile)
        elif hasattr(user, "secretary_profile"):
            queryset = queryset.filter(assigned_secretary=user.secretary_profile)
        elif hasattr(user, "client_profile"):
            queryset = queryset.filter(client=user.client_profile)

        return queryset

    @staticmethod
    def list_cases(user, *, search=None, status=None, priority=None, case_type=None):
        queryset = CaseService.base_queryset(user)

        if search:
            queryset = queryset.filter(
                Q(case_number__icontains=search)
                | Q(title__icontains=search)
                | Q(client__full_name__icontains=search)
                | Q(client__national_id__icontains=search)
                | Q(court_name__icontains=search)
            )
        if status:
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if case_type:
            queryset = queryset.filter(case_type=case_type)

        return queryset.distinct()

    @staticmethod
    def get_case(user, case_id):
        return CaseService.base_queryset(user).get(id=case_id)

    @staticmethod
    def generate_case_number(firm):
        count = Case.objects.filter(firm=firm).count() + 1
        return f"CASE-{count:05d}"

    @staticmethod
    def resolve_lawyer(firm, lawyer_id):
        if not lawyer_id:
            return None
        return Lawyer.objects.get(id=lawyer_id, law_firm=firm, is_active=True)

    @staticmethod
    def resolve_secretary(firm, secretary_id):
        if not secretary_id:
            return None
        return Secretary.objects.get(id=secretary_id, law_firm=firm, is_active=True)

    @staticmethod
    def get_default_lawyer(firm):
        owner_lawyer = getattr(firm.owner, "lawyer_profile", None)
        if (
            owner_lawyer is not None
            and owner_lawyer.law_firm_id == firm.id
            and owner_lawyer.is_active
        ):
            return owner_lawyer
        raise PermissionError(
            "The firm owner must be registered as a lawyer before cases can be assigned."
        )

    @staticmethod
    def get_default_lawyer_for_user(firm, user):
        user_lawyer = getattr(user, "lawyer_profile", None)
        if (
            user.role == UserRole.ADMIN
            and user_lawyer is not None
            and user_lawyer.law_firm_id == firm.id
            and user_lawyer.is_active
        ):
            return user_lawyer
        return CaseService.get_default_lawyer(firm)

    @staticmethod
    def get_default_secretary(firm):
        return (
            Secretary.objects.filter(law_firm=firm, is_active=True)
            .order_by("date_hired", "created_at")
            .first()
        )

    @staticmethod
    def get_case_assignments(firm, user, *, lawyer_id=None, secretary_id=None):
        if user.role == UserRole.ADMIN:
            assigned_lawyer = (
                CaseService.resolve_lawyer(firm, lawyer_id)
                if lawyer_id
                else CaseService.get_default_lawyer_for_user(firm, user)
            )
            assigned_secretary = (
                CaseService.resolve_secretary(firm, secretary_id)
                if secretary_id
                else CaseService.get_default_secretary(firm)
            )
            return assigned_lawyer, assigned_secretary

        return CaseService.get_default_lawyer_for_user(firm, user), CaseService.get_default_secretary(firm)

    @staticmethod
    def record_activity(case, *, action, description="", actor=None, metadata=None):
        CaseTimeline.objects.create(
            case=case,
            action=action,
            description=description,
            created_by=actor,
        )
        CaseActivity.objects.create(
            case=case,
            action=action,
            description=description,
            actor=actor,
            metadata=metadata or {},
        )

    @staticmethod
    @transaction.atomic
    def create_case(*, user, validated_data):
        firm = CaseService.get_user_firm(user)
        client = Client.objects.get(
            id=validated_data.pop("client_id"),
            firm=firm,
            is_active=True,
        )
        lawyer_id = validated_data.pop("assigned_lawyer_membership_id", None)
        secretary_id = validated_data.pop("assigned_secretary_membership_id", None)
        assigned_lawyer, assigned_secretary = CaseService.get_case_assignments(
            firm,
            user,
            lawyer_id=lawyer_id,
            secretary_id=secretary_id,
        )

        case_number = (validated_data.pop("case_number", "") or "").strip()
        if not case_number:
            case_number = CaseService.generate_case_number(firm)
        plaintiff = validated_data.pop("plaintiff", "") or client.full_name

        case = Case.objects.create(
            firm=firm,
            client=client,
            created_by=user,
            case_number=case_number,
            assigned_lawyer=assigned_lawyer,
            assigned_secretary=assigned_secretary,
            plaintiff=plaintiff,
            **validated_data,
        )

        if client.lifecycle_status == Client.LifecycleStatus.PROSPECT:
            client.lifecycle_status = Client.LifecycleStatus.OFFICIAL_CLIENT
            client.save(update_fields=["lifecycle_status", "updated_at"])

            # Sync User role when prospect becomes official client
            if client.user and client.user.role == UserRole.PROSPECT:
                client.user.role = UserRole.OFFICIAL_CLIENT
                client.user.save(update_fields=["role", "updated_at"])


        CaseService.record_activity(
            case,
            action="Case Created",
            description=f"Case {case.case_number} was created for {client.full_name}.",
            actor=user,
            metadata={"client_id": str(client.id)},
        )

        return case

    @staticmethod
    @transaction.atomic
    def update_case(*, case, validated_data, actor):
        for field, value in validated_data.items():
            setattr(case, field, value)
        case.save()
        CaseService.record_activity(
            case,
            action="Case Updated",
            description="Case details were updated.",
            actor=actor,
            metadata={"updated_fields": list(validated_data.keys())},
        )
        return case

    @staticmethod
    @transaction.atomic
    def change_status(*, case, status, actor, note=""):
        case.status = status
        case.is_active = status not in [Case.Status.CLOSED, Case.Status.ARCHIVED, Case.Status.DISMISSED]
        case.save(update_fields=["status", "is_active", "updated_at"])
        CaseService.record_activity(
            case,
            action="Status Changed",
            description=note or f"Case status changed to {status}.",
            actor=actor,
            metadata={"status": status},
        )
        return case

    @staticmethod
    @transaction.atomic
    def reassign_lawyer(*, case, lawyer_id, actor):
        case.assigned_lawyer = CaseService.resolve_lawyer(case.firm, lawyer_id)
        case.save(update_fields=["assigned_lawyer", "updated_at"])
        CaseService.record_activity(
            case,
            action="Lawyer Reassigned",
            description="Assigned lawyer was updated.",
            actor=actor,
            metadata={"lawyer_id": str(lawyer_id)},
        )
        return case

    @staticmethod
    @transaction.atomic
    def reassign_secretary(*, case, secretary_id, actor):
        case.assigned_secretary = CaseService.resolve_secretary(case.firm, secretary_id)
        case.save(update_fields=["assigned_secretary", "updated_at"])
        CaseService.record_activity(
            case,
            action="Secretary Reassigned",
            description="Assigned secretary was updated.",
            actor=actor,
            metadata={"secretary_id": str(secretary_id)},
        )
        return case

    @staticmethod
    def summary(queryset):
        status_counts = {
            row["status"]: row["count"]
            for row in queryset.values("status").annotate(count=Count("id"))
        }
        priority_counts = {
            row["priority"]: row["count"]
            for row in queryset.values("priority").annotate(count=Count("id"))
        }
        return {
            "total_cases": queryset.count(),
            "active_cases": queryset.filter(is_active=True).count(),
            "pending_cases": status_counts.get(Case.Status.PENDING, 0),
            "closed_cases": status_counts.get(Case.Status.CLOSED, 0),
            "urgent_cases": priority_counts.get(Case.Priority.URGENT, 0),
        }
