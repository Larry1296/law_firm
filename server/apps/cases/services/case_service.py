from django.db import transaction
from django.db.models import Count, Q

from apps.cases.models import Case, CaseActivity, CaseEvent, CaseParty, CaseTimeline
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.notifications.services import NotificationService
from apps.staff.models import Lawyer, Secretary


class CaseService:
    STATUS_EVENT_TYPE_MAP = {
        Case.Status.PENDING_FILING: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.FILED: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.SERVICE_PENDING: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.AWAITING_RESPONSE: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.MENTION: CaseEvent.EventType.MENTION,
        Case.Status.DIRECTIONS: CaseEvent.EventType.DIRECTIONS,
        Case.Status.PRE_TRIAL: CaseEvent.EventType.PRE_TRIAL,
        Case.Status.MEDIATION: CaseEvent.EventType.MEDIATION,
        Case.Status.HEARING: CaseEvent.EventType.HEARING,
        Case.Status.SUBMISSIONS: CaseEvent.EventType.SUBMISSIONS,
        Case.Status.AWAITING_RULING: CaseEvent.EventType.RULING,
        Case.Status.AWAITING_JUDGMENT: CaseEvent.EventType.JUDGMENT,
        Case.Status.DECREE_EXTRACTION: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.EXECUTION: CaseEvent.EventType.EXECUTION,
        Case.Status.APPEAL_WINDOW: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.NOTICE_OF_APPEAL_FILED: CaseEvent.EventType.REGISTRY_ACTION,
        Case.Status.ON_APPEAL: CaseEvent.EventType.MENTION,
        Case.Status.APPEAL_DECIDED: CaseEvent.EventType.JUDGMENT,
        Case.Status.IN_PROGRESS: CaseEvent.EventType.OTHER,
        Case.Status.ON_HOLD: CaseEvent.EventType.OTHER,
    }

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
            .prefetch_related(
                "timeline",
                "activities",
                "attachments",
                "events",
                "filings",
                "notes",
                "parties",
                "tasks",
            )
        )

        is_owner_admin = user.role == UserRole.ADMIN and getattr(firm, "owner_id", None) == user.id
        if is_owner_admin:
            return queryset
        if hasattr(user, "lawyer_profile"):
            queryset = queryset.filter(assigned_lawyer=user.lawyer_profile)
        elif hasattr(user, "secretary_profile"):
            queryset = queryset.filter(assigned_secretary=user.secretary_profile)
        elif hasattr(user, "client_profile"):
            queryset = queryset.filter(client=user.client_profile)
        else:
            queryset = queryset.none()

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
        is_owner_admin = user.role == UserRole.ADMIN and firm.owner_id == user.id
        if is_owner_admin:
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

        user_secretary = getattr(user, "secretary_profile", None)
        if user_secretary is not None and user_secretary.law_firm_id == firm.id:
            return CaseService.get_default_lawyer(firm), CaseService.get_default_secretary(firm)

        raise PermissionError("Only the firm owner or secretary can create cases.")

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
    def default_event_type_for_status(status):
        return CaseService.STATUS_EVENT_TYPE_MAP.get(status, CaseEvent.EventType.OTHER)

    @staticmethod
    def default_event_title_for_status(case, status):
        return f"{case.get_status_display()} - {case.case_number}"

    @staticmethod
    def create_next_event_for_case(*, case, status, next_event_data, actor):
        if not next_event_data:
            return None

        from apps.events.services import EventService

        payload = {
            "case_id": case.id,
            "event_type": next_event_data.get("event_type") or CaseService.default_event_type_for_status(status),
            "title": next_event_data.get("title") or CaseService.default_event_title_for_status(case, status),
            "description": next_event_data.get("description", ""),
            "starts_at": next_event_data["starts_at"],
            "ends_at": next_event_data.get("ends_at"),
            "court_station": next_event_data.get("court_station", case.court_station),
            "courtroom": next_event_data.get("courtroom", case.courtroom),
            "judicial_officer": next_event_data.get("judicial_officer", case.judicial_officer),
            "cause_list_position": next_event_data.get("cause_list_position", ""),
            "is_client_visible": next_event_data.get("is_client_visible", True),
            "notify_participants": next_event_data.get("notify_participants", True),
        }
        event = EventService.create_event(user=actor, validated_data=payload)
        case.next_court_date = event.starts_at
        case.next_action = event.title
        case.save(update_fields=["next_court_date", "next_action", "updated_at"])
        CaseService.record_activity(
            case,
            action="Next Event Scheduled",
            description=f"{event.title} was scheduled for the case.",
            actor=actor,
            metadata={"event_id": str(event.id), "starts_at": event.starts_at.isoformat()},
        )
        return event

    @staticmethod
    def notify_case_assignments(
        case,
        *,
        actor=None,
        reassigned=False,
        lawyer=None,
        secretary=None,
        include_lawyer=True,
        include_secretary=True,
    ):
        lawyer = lawyer if lawyer is not None else case.assigned_lawyer
        secretary = secretary if secretary is not None else case.assigned_secretary

        if include_lawyer and lawyer and lawyer.user:
            NotificationService.notify_case_assignment(
                case=case,
                recipient=lawyer.user,
                role_label="lawyer",
                actor=actor,
                reassigned=reassigned,
            )

        if include_secretary and secretary and secretary.user:
            NotificationService.notify_case_assignment(
                case=case,
                recipient=secretary.user,
                role_label="secretary",
                actor=actor,
                reassigned=reassigned,
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
        client_party_role = validated_data.pop("client_party_role", "") or CaseParty.PartyRole.PLAINTIFF
        if client_party_role not in CaseParty.PartyRole.values:
            client_party_role = CaseParty.PartyRole.PLAINTIFF
        is_owner_admin = user.role == UserRole.ADMIN and firm.owner_id == user.id
        if not is_owner_admin:
            validated_data.pop("priority", None)

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
        CaseParty.objects.create(
            case=case,
            client=client,
            name=plaintiff,
            party_role=client_party_role,
            party_type=CaseParty.PartyType.ORGANISATION
            if client.client_type != Client.ClientType.INDIVIDUAL
            else CaseParty.PartyType.INDIVIDUAL,
            is_our_client=True,
            party_order=1,
            phone_number=client.phone_number or "",
            email=client.email or "",
            national_id=client.national_id or "",
            kra_pin=client.kra_pin or "",
        )
        defendant = (case.defendant or "").strip()
        if defendant:
            CaseParty.objects.create(
                case=case,
                name=defendant,
                party_role=CaseParty.PartyRole.DEFENDANT,
                party_type=CaseParty.PartyType.OTHER,
                party_order=2,
            )

        if client.lifecycle_status == Client.LifecycleStatus.PROSPECT:
            client.lifecycle_status = Client.LifecycleStatus.OFFICIAL_CLIENT
            if client.access_type == Client.AccessType.PROSPECT:
                client.access_type = Client.AccessType.ASSISTED_CLIENT
            client.is_verified = True
            client.save(update_fields=["lifecycle_status", "access_type", "is_verified", "updated_at"])

            # Sync User role when prospect becomes official client
            if client.user and client.user.role == UserRole.PROSPECT:
                client.user.role = UserRole.OFFICIAL_CLIENT
                client.user.save(update_fields=["role", "updated_at"])
        elif not client.is_verified:
            client.is_verified = True
            client.save(update_fields=["is_verified", "updated_at"])


        CaseService.record_activity(
            case,
            action="Case Created",
            description=f"Case {case.case_number} was created for {client.full_name}.",
            actor=user,
            metadata={"client_id": str(client.id)},
        )
        CaseService.notify_case_assignments(case, actor=user)

        return case

    @staticmethod
    @transaction.atomic
    def update_case(*, case, validated_data, actor):
        next_event_data = validated_data.pop("next_event", None)
        if "priority" in validated_data:
            is_owner_admin = (
                actor.role == UserRole.ADMIN
                and case.firm.owner_id == actor.id
            )
            if not is_owner_admin:
                raise PermissionError("Only the firm owner can update case priority.")

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
        if next_event_data:
            CaseService.create_next_event_for_case(
                case=case,
                status=case.status,
                next_event_data=next_event_data,
                actor=actor,
            )
        return case

    @staticmethod
    @transaction.atomic
    def change_status(*, case, status, actor, note="", next_event=None):
        is_owner_admin = actor.role == UserRole.ADMIN and case.firm.owner_id == actor.id
        is_assigned_lawyer = (
            getattr(actor, "lawyer_profile", None) is not None
            and case.assigned_lawyer_id == actor.lawyer_profile.id
        )
        if not (is_owner_admin or is_assigned_lawyer):
            raise PermissionError("Only the firm owner or assigned lawyer can update case status.")

        case.status = status
        case.is_active = status not in Case.Status.inactive_statuses()
        update_fields = ["status", "is_active", "updated_at"]
        case.save(update_fields=update_fields)
        CaseService.record_activity(
            case,
            action="Status Changed",
            description=note or f"Case status changed to {status}.",
            actor=actor,
            metadata={"status": status},
        )
        CaseService.create_next_event_for_case(
            case=case,
            status=status,
            next_event_data=next_event,
            actor=actor,
        )
        NotificationService.notify_case_status_update(
            case=case,
            status=status,
            actor=actor,
            note=note,
        )
        return case

    @staticmethod
    @transaction.atomic
    def reassign_lawyer(*, case, lawyer_id, actor):
        assigned_lawyer = CaseService.resolve_lawyer(case.firm, lawyer_id)
        case.assigned_lawyer = assigned_lawyer
        case.save(update_fields=["assigned_lawyer", "updated_at"])
        CaseService.record_activity(
            case,
            action="Lawyer Reassigned",
            description="Assigned lawyer was updated.",
            actor=actor,
            metadata={"lawyer_id": str(lawyer_id)},
        )
        CaseService.notify_case_assignments(
            case,
            actor=actor,
            reassigned=True,
            lawyer=assigned_lawyer,
            include_secretary=False,
        )
        return case

    @staticmethod
    @transaction.atomic
    def reassign_secretary(*, case, secretary_id, actor):
        assigned_secretary = CaseService.resolve_secretary(case.firm, secretary_id)
        case.assigned_secretary = assigned_secretary
        case.save(update_fields=["assigned_secretary", "updated_at"])
        CaseService.record_activity(
            case,
            action="Secretary Reassigned",
            description="Assigned secretary was updated.",
            actor=actor,
            metadata={"secretary_id": str(secretary_id)},
        )
        CaseService.notify_case_assignments(
            case,
            actor=actor,
            reassigned=True,
            secretary=assigned_secretary,
            include_lawyer=False,
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
