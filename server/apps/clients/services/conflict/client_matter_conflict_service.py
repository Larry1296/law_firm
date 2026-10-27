from django.db import IntegrityError, models, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit_logs.services import AuditService
from . import conflict_search
from .identity_names import client_identity_names

from apps.clients.models import (
    Client,
    ClientMatterConflictCheck,
    ClientMatterConflictReferenceSequence,
    ConflictCheckHistory,
    ConflictCheckParty,
    ConflictSourceReview,
    FirmAcceptanceHistory,
    ProposedMatterJurisdiction,
)
from apps.common.choices import ConflictCheckSourceCategory, ConflictCheckStatus, UserRole
from apps.cases.models import Case
from apps.documents.models import (
    DocumentRequirement, DocumentRequirementTemplate,
)
from apps.staff.models import Lawyer, LawyerPermission


class ClientMatterConflictService:
    ALLOWED_TRANSITIONS = {
        ConflictCheckStatus.NOT_STARTED: {ConflictCheckStatus.IN_PROGRESS},
        ConflictCheckStatus.IN_PROGRESS: {
            ConflictCheckStatus.AWAITING_INFORMATION,
            ConflictCheckStatus.POTENTIAL_CONFLICT,
            ConflictCheckStatus.CLEARED,
            ConflictCheckStatus.CONFLICT_CONFIRMED,
            ConflictCheckStatus.CLOSED_WITHOUT_DECISION,
        },
        ConflictCheckStatus.AWAITING_INFORMATION: {
            ConflictCheckStatus.IN_PROGRESS,
            ConflictCheckStatus.CLOSED_WITHOUT_DECISION,
        },
        ConflictCheckStatus.POTENTIAL_CONFLICT: {
            ConflictCheckStatus.ESCALATED_FOR_REVIEW,
            ConflictCheckStatus.CLOSED_WITHOUT_DECISION,
        },
        ConflictCheckStatus.ESCALATED_FOR_REVIEW: {
            ConflictCheckStatus.CLEARED,
            ConflictCheckStatus.CONFLICT_CONFIRMED,
            ConflictCheckStatus.CLOSED_WITHOUT_DECISION,
        },
        ConflictCheckStatus.CLEARED: set(),
        ConflictCheckStatus.CONFLICT_CONFIRMED: set(),
        ConflictCheckStatus.CLOSED_WITHOUT_DECISION: set(),
    }

    SEARCHABLE_STATUSES = {
        ConflictCheckStatus.IN_PROGRESS,
        ConflictCheckStatus.POTENTIAL_CONFLICT,
        ConflictCheckStatus.ESCALATED_FOR_REVIEW,
    }

    DECISION_STATUSES = {
        ConflictCheckStatus.CLEARED,
        ConflictCheckStatus.CONFLICT_CONFIRMED,
    }

    @classmethod
    def instantiate_proposed_requirements(cls, *, check, actor):
        facts = check.jurisdiction_facts or {}
        stages = {
            DocumentRequirementTemplate.Stage.PROSPECTIVE_KYC,
            DocumentRequirementTemplate.Stage.PROPOSED_MATTER,
            DocumentRequirementTemplate.Stage.CONFLICT_CHECK,
            DocumentRequirementTemplate.Stage.FIRM_ACCEPTANCE,
        }
        for template in DocumentRequirementTemplate.objects.filter(firm=check.firm, is_active=True, stage__in=stages):
            dimensions = {
                "client_type": check.client.client_type,
                "practice_area": facts.get("practice_area", ""),
                "matter_nature": facts.get("matter_nature", ""),
                "forum": facts.get("forum", ""),
                "procedure": facts.get("procedure", ""),
            }
            if any(getattr(template, key) and getattr(template, key) != value for key, value in dimensions.items()):
                continue
            DocumentRequirement.objects.get_or_create(
                template=template, client=check.client, proposed_matter=check,
                defaults={"requested_by": actor, "notes": template.notes},
            )

    @classmethod
    def carry_and_instantiate_matter_requirements(cls, *, check, case, actor):
        for source in check.document_requirements.select_related("template", "selected_document"):
            DocumentRequirement.objects.get_or_create(
                template=source.template, client=case.client, case=case,
                defaults={
                    "selected_document": source.selected_document, "notes": source.notes,
                    "requested_by": actor, "is_client_visible": source.is_client_visible,
                },
            )
        stages = {
            DocumentRequirementTemplate.Stage.MATTER_OPENING,
            DocumentRequirementTemplate.Stage.PRE_FILING,
            DocumentRequirementTemplate.Stage.FILING,
            DocumentRequirementTemplate.Stage.HEARING,
            DocumentRequirementTemplate.Stage.CLOSURE,
        }
        dimensions = {
            "client_type": case.client.client_type,
            "practice_area": case.practice_area,
            "matter_nature": case.matter_nature,
            "forum": case.forum,
            "procedure": case.procedure_type,
        }
        for template in DocumentRequirementTemplate.objects.filter(firm=case.firm, is_active=True, stage__in=stages):
            if any(getattr(template, key) and getattr(template, key) != value for key, value in dimensions.items()):
                continue
            DocumentRequirement.objects.get_or_create(
                template=template, client=case.client, case=case,
                defaults={"requested_by": actor, "notes": template.notes},
            )


    @staticmethod
    def _refresh_search(check):
        check.system_search = conflict_search.run(check)
        return check.system_search

    @classmethod
    @transaction.atomic
    def run_search(cls, *, user, client_id, check_id, data=None):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.PERFORM_CONFLICT_CHECK)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        if check.status not in cls.SEARCHABLE_STATUSES:
            raise ValidationError({"status": "Only a conflict check under way can be searched again."})
        search = cls._refresh_search(check)
        cls._record_history(
            check, from_status=check.status, to_status=check.status, action="SEARCH_RUN",
            summary=f"System conflict search run: {len(search['matches'])} possible match(es).", actor=user,
            metadata={"match_count": len(search["matches"]), "record_count": search["record_count"]},
        )
        check.save(update_fields=["system_search", "updated_at"])
        return check

    @classmethod
    @transaction.atomic
    def review_source(cls, *, user, client_id, check_id, data):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.PERFORM_CONFLICT_CHECK)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        if check.status != ConflictCheckStatus.IN_PROGRESS:
            raise ValidationError({"status": "Sources are confirmed while the conflict check is in progress."})
        source = data.get("source")
        if source not in conflict_search.GUIDED_SOURCE_VALUES:
            raise ValidationError({"source": "Select a source from the checklist."})
        outcome = data.get("outcome")
        if outcome not in ConflictSourceReview.Outcome.values:
            raise ValidationError({"outcome": "Record whether a match was found."})
        matched_name = str(data.get("matched_name") or "").strip()
        relationship = str(data.get("relationship_to_firm") or "").strip()
        if outcome == ConflictSourceReview.Outcome.MATCH_FOUND and (not matched_name or not relationship):
            raise ValidationError({"matched_name": "Record the name found and its relationship to the firm."})
        search = check.system_search or cls._refresh_search(check)
        if search.get("mode") != "GUIDED":
            raise ValidationError({"source": "This firm's conflict searches are automatic; no source needs confirming."})
        system_match_count = sum(1 for match in search.get("matches", []) if match["source"] == source)
        review, _ = ConflictSourceReview.objects.update_or_create(
            conflict_check=check, source=source,
            defaults={
                "outcome": outcome, "system_match_count": system_match_count,
                "matched_name": matched_name if outcome == ConflictSourceReview.Outcome.MATCH_FOUND else "",
                "relationship_to_firm": relationship if outcome == ConflictSourceReview.Outcome.MATCH_FOUND else "",
                "details": str(data.get("details") or "").strip(),
                "reviewed_by": user, "reviewed_at": timezone.now(),
            },
        )
        label = ConflictCheckSourceCategory(source).label
        summary = (f"{label}: match found - {matched_name} ({relationship})."
                   if outcome == ConflictSourceReview.Outcome.MATCH_FOUND else f"{label}: no match.")
        cls._record_history(
            check, from_status=check.status, to_status=check.status, action="SOURCE_REVIEWED", summary=summary, actor=user,
            metadata={"source": source, "outcome": outcome, "missed_by_system": review.missed_by_system},
        )
        check.save(update_fields=["system_search", "updated_at"])
        return check

    @staticmethod
    def get_user_firm(user):
        if user.role == UserRole.ADMIN and hasattr(user, "owned_firm"):
            return user.owned_firm
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer is not None:
            return lawyer.law_firm
        raise PermissionDenied("Only firm admins and active lawyers can access conflict checks.")

    @staticmethod
    def _active_lawyer_for_user(user, firm):
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer is None or lawyer.law_firm_id != firm.id or not lawyer.is_active:
            return None
        return lawyer

    @classmethod
    def _assert_admin_or_lawyer(cls, user, firm):
        is_owner_admin = user.role == UserRole.ADMIN and getattr(firm, "owner_id", None) == user.id
        if is_owner_admin:
            return
        lawyer = cls._active_lawyer_for_user(user, firm)
        if lawyer is None:
            raise PermissionDenied("Only firm admins and active lawyers can manage conflict checks.")
        # Any conflict role opens the register; each command still checks its own grant,
        # so a reviewer holding only the approval grant can reach checks escalated to them.
        if not any(lawyer.has_permission(code) for code in (
            LawyerPermission.CREATE_PROPOSED_MATTER,
            LawyerPermission.PERFORM_CONFLICT_CHECK,
            LawyerPermission.APPROVE_CONFLICT_RESULT,
        )):
            raise PermissionDenied("Lawyer permission is required to manage proposed matters.")

    @classmethod
    def _assert_permission(cls, user, firm, code):
        if user.role == UserRole.ADMIN and getattr(firm, "owner_id", None) == user.id:
            return
        lawyer = cls._active_lawyer_for_user(user, firm)
        permitted = bool(lawyer and lawyer.has_permission(code))
        # CREATE_CASES is the historical grant for this exact command. Preserve it as
        # an opening alias while firms migrate staff to the more explicit OPEN_MATTER grant.
        if code == LawyerPermission.OPEN_MATTER and lawyer:
            permitted = permitted or lawyer.has_permission(LawyerPermission.CREATE_CASES)
        if not permitted:
            raise PermissionDenied(f"Lawyer permission {code} is required.")

    @classmethod
    def _assert_deciding_advocate(cls, user, firm):
        lawyer = cls._active_lawyer_for_user(user, firm)
        if lawyer is None:
            raise PermissionDenied("Only an active advocate in this firm can record conflict decisions.")
        return lawyer

    @staticmethod
    def _resolve_lawyer(firm, lawyer_id, field_name):
        if not lawyer_id:
            raise ValidationError({field_name: "Responsible advocate is required."})
        try:
            return Lawyer.objects.select_related("user").get(id=lawyer_id, law_firm=firm, is_active=True)
        except Lawyer.DoesNotExist as exc:
            raise ValidationError({field_name: "Select an active advocate in this firm."}) from exc

    @classmethod
    def _default_responsible_lawyer(cls, user, firm, lawyer_id=None):
        if lawyer_id:
            return cls._resolve_lawyer(firm, lawyer_id, "responsible_lawyer_id")
        user_lawyer = cls._active_lawyer_for_user(user, firm)
        if user_lawyer is not None:
            return user_lawyer
        owner_lawyer = getattr(firm.owner, "lawyer_profile", None)
        if owner_lawyer is not None and owner_lawyer.law_firm_id == firm.id and owner_lawyer.is_active:
            return owner_lawyer
        raise ValidationError({"responsible_lawyer_id": "Select a responsible advocate."})

    @staticmethod
    def _client_party_type(client):
        return (
            ConflictCheckParty.PartyType.PERSON
            if client.client_type == Client.ClientType.INDIVIDUAL
            else ConflictCheckParty.PartyType.ORGANISATION
        )

    @staticmethod
    def _normalize_list(value):
        if value in (None, ""):
            return []
        if isinstance(value, list):
            return [item for item in value if str(item).strip()]
        return [str(value).strip()]

    @classmethod
    def _validate_parties(cls, parties, no_adverse, explanation):
        has_adverse = any(
            item.get("role") == ConflictCheckParty.PartyRole.PROPOSED_ADVERSE_PARTY
            and str(item.get("name", "")).strip()
            for item in parties
        )
        if not has_adverse and not no_adverse:
            raise ValidationError({
                "parties": "Record at least one proposed adverse party or confirm that no adverse party is currently known."
            })
        if no_adverse and not str(explanation or "").strip():
            raise ValidationError({
                "no_adverse_party_explanation": "Explain why no adverse party is currently known."
            })

    @classmethod
    def _next_reference(cls, firm):
        year = timezone.now().year
        try:
            sequence, _created = ClientMatterConflictReferenceSequence.objects.select_for_update().get_or_create(
                firm=firm,
                defaults={"year": year, "next_number": 1},
            )
        except IntegrityError:
            sequence = ClientMatterConflictReferenceSequence.objects.select_for_update().get(firm=firm)
        if sequence.year != year:
            sequence.year = year
            sequence.next_number = 1
        number = sequence.next_number
        sequence.next_number += 1
        sequence.save(update_fields=["year", "next_number", "updated_at"])
        return f"PMA/CONF/{year}/{number:04d}"

    @staticmethod
    def _record_history(check, *, from_status, to_status, action, summary, actor, metadata=None):
        ConflictCheckHistory.objects.create(
            conflict_check=check,
            from_status=from_status or "",
            to_status=to_status,
            action=action,
            summary=summary,
            actor=actor,
            metadata=metadata or {},
        )

    @classmethod
    def _transition(cls, check, *, to_status, action, summary, actor, metadata=None):
        from_status = check.status
        if to_status not in cls.ALLOWED_TRANSITIONS.get(from_status, set()):
            raise ValidationError({"status": f"Cannot transition from {from_status} to {to_status}."})
        check.status = to_status
        cls._record_history(
            check,
            from_status=from_status,
            to_status=to_status,
            action=action,
            summary=summary,
            actor=actor,
            metadata=metadata,
        )

    @classmethod
    def base_queryset(cls, user):
        firm = cls.get_user_firm(user)
        cls._assert_admin_or_lawyer(user, firm)
        queryset = (
            ClientMatterConflictCheck.objects.filter(firm=firm)
            .select_related(
                "firm",
                "client",
                "responsible_lawyer",
                "responsible_lawyer__user",
                "review_assigned_to",
                "review_assigned_to__user",
                "decided_by",
                "decided_by__user",
                "created_by",
                "created_case",
            )
            .prefetch_related("parties", "history")
        )
        lawyer = cls._active_lawyer_for_user(user, firm)
        if lawyer is not None and not (user.role == UserRole.ADMIN and getattr(firm, "owner_id", None) == user.id):
            queryset = cls._scope_to_lawyer(queryset, lawyer)
        return queryset

    @staticmethod
    def _scope_to_lawyer(queryset, lawyer):
        """An advocate sees the checks they are responsible for or were asked to review."""
        return queryset.filter(models.Q(responsible_lawyer=lawyer) | models.Q(review_assigned_to=lawyer))

    @classmethod
    def list_for_client(cls, *, user, client_id):
        firm = cls.get_user_firm(user)
        cls._assert_admin_or_lawyer(user, firm)
        Client.objects.get(id=client_id, firm=firm, is_active=True)
        return cls.base_queryset(user).filter(client_id=client_id)

    @classmethod
    def get_check(cls, *, user, client_id, check_id, lock=False):
        if lock:
            firm = cls.get_user_firm(user)
            cls._assert_admin_or_lawyer(user, firm)
            queryset = ClientMatterConflictCheck.objects.select_for_update().filter(firm=firm)
            lawyer = cls._active_lawyer_for_user(user, firm)
            if lawyer is not None and not (user.role == UserRole.ADMIN and getattr(firm, "owner_id", None) == user.id):
                queryset = cls._scope_to_lawyer(queryset, lawyer)
        else:
            queryset = cls.base_queryset(user)
        try:
            return queryset.get(id=check_id, client_id=client_id)
        except ClientMatterConflictCheck.DoesNotExist as exc:
            raise ValidationError({"conflict_check_id": "Conflict check was not found for this client."}) from exc


    @classmethod
    def rejected_queryset(cls, user):
        queryset = cls.base_queryset(user).filter(
            models.Q(status=ConflictCheckStatus.CONFLICT_CONFIRMED)
            | models.Q(status=ConflictCheckStatus.CLOSED_WITHOUT_DECISION)
            | models.Q(acceptance_decision__in=[
                ClientMatterConflictCheck.AcceptanceDecision.DECLINED,
                ClientMatterConflictCheck.AcceptanceDecision.CLIENT_WITHDREW,
            ])
        )
        return queryset.distinct()


    @staticmethod
    def rejected_metadata(queryset):
        now = timezone.localdate()
        current_month = queryset.filter(created_at__year=now.year, created_at__month=now.month).count()
        decided = queryset.exclude(completed_at__isnull=True)
        durations = []
        for check in decided:
            durations.append((check.completed_at - check.created_at).total_seconds() / 86400)
        return {
            "total_rejected": queryset.count(),
            "conflict_confirmed": queryset.filter(status=ConflictCheckStatus.CONFLICT_CONFIRMED).count(),
            "cleared_but_declined": queryset.filter(
                status=ConflictCheckStatus.CLEARED,
                acceptance_decision=ClientMatterConflictCheck.AcceptanceDecision.DECLINED,
            ).count(),
            "client_withdrew": queryset.filter(
                acceptance_decision=ClientMatterConflictCheck.AcceptanceDecision.CLIENT_WITHDREW,
            ).count(),
            "closed_without_decision": queryset.filter(status=ConflictCheckStatus.CLOSED_WITHOUT_DECISION).count(),
            "current_month": current_month,
            "average_decision_time_days": round(sum(durations) / len(durations), 2) if durations else None,
            "escalated_reviews": queryset.filter(history__to_status=ConflictCheckStatus.ESCALATED_FOR_REVIEW).distinct().count(),
            "matters_with_limitation_dates": queryset.exclude(limitation_or_deadline_date__isnull=True).count(),
            "clients_that_also_have_accepted_matters": queryset.filter(client__cases__isnull=False).distinct().count(),
        }

    @classmethod
    @transaction.atomic
    def create_proposed_matter(cls, *, user, client_id, data):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.CREATE_PROPOSED_MATTER)
        try:
            client = Client.objects.select_for_update().get(id=client_id, firm=firm, is_active=True)
        except Client.DoesNotExist as exc:
            raise ValidationError({"client_id": "Client was not found for this firm."}) from exc

        parties = list(data.get("parties") or [])
        sensitive = any(len(str(data.get(field, "")).strip()) > limit for field, limit in (("factual_summary", 500), ("desired_outcome", 300), ("urgency_details", 300)))
        urgent_reason = str(data.get("urgent_exception_reason", "")).strip()
        if sensitive and not urgent_reason:
            raise ValidationError({"factual_summary": "Detailed confidential information is unavailable before conflict clearance. Record only limited intake facts or provide an authorised urgent-exception reason."})
        cls._validate_parties(
            parties,
            data.get("no_adverse_party_currently_known", False),
            data.get("no_adverse_party_explanation", ""),
        )
        responsible_lawyer = cls._default_responsible_lawyer(
            user,
            firm,
            data.get("responsible_lawyer_id"),
        )
        check = ClientMatterConflictCheck.objects.create(
            firm=firm,
            client=client,
            reference_number=cls._next_reference(firm),
            proposed_matter_title=data["proposed_matter_title"],
            proposed_instructions=data["proposed_instructions"],
            factual_summary=data.get("factual_summary", ""),
            desired_outcome=data.get("desired_outcome", ""),
            urgency_level=data.get("urgency_level", ""),
            urgency_details=data.get("urgency_details", ""),
            limitation_or_deadline_date=data.get("limitation_or_deadline_date"),
            responsible_lawyer=responsible_lawyer,
            created_by=user,
            no_adverse_party_currently_known=data.get("no_adverse_party_currently_known", False),
            no_adverse_party_explanation=data.get("no_adverse_party_explanation", ""),
            pre_clearance_restricted=bool(sensitive),
            urgent_exception_reason=urgent_reason,
            urgent_exception_received_by=user if urgent_reason else None,
            urgent_exception_received_at=timezone.now() if urgent_reason else None,
            restricted_note="Urgent confidential intake exception; restricted to authorised conflict-review staff." if urgent_reason else "",
        )
        check.full_clean()
        check.save()
        cls.instantiate_proposed_requirements(check=check, actor=user)
        ConflictCheckParty.objects.create(
            conflict_check=check,
            name=client.full_name,
            aliases=client_identity_names(client)[1:],
            party_type=cls._client_party_type(client),
            role=ConflictCheckParty.PartyRole.PROSPECTIVE_CLIENT,
            identification_reference=client.national_id or client.passport_number or "",
            created_by=user,
        )
        for party in parties:
            if str(party.get("name", "")).strip():
                ConflictCheckParty.objects.create(
                    conflict_check=check,
                    name=party["name"].strip(),
                    party_type=party.get("party_type") or ConflictCheckParty.PartyType.PERSON,
                    role=party.get("role") or ConflictCheckParty.PartyRole.OTHER,
                    aliases=cls._normalize_list(party.get("aliases")),
                    identification_reference=party.get("identification_reference", ""),
                    relationship_to_party=party.get("relationship_to_party", ""),
                    contact_information=party.get("contact_information", ""),
                    internal_notes=party.get("internal_notes", ""),
                    created_by=user,
                )
        cls._record_history(
            check,
            from_status="",
            to_status=check.status,
            action="PROPOSED_MATTER_CREATED",
            summary="Proposed matter recorded for conflict checking.",
            actor=user,
            metadata={"client_id": str(client.id)},
        )
        return check

    @classmethod
    @transaction.atomic
    def update_proposed_matter(cls, *, user, client_id, check_id, data):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.CREATE_PROPOSED_MATTER)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        if check.status not in {ConflictCheckStatus.NOT_STARTED, ConflictCheckStatus.AWAITING_INFORMATION}:
            raise ValidationError({"status": "Only not-started or awaiting-information checks can be edited."})
        fields = [
            "proposed_matter_title",
            "proposed_instructions",
            "factual_summary",
            "desired_outcome",
            "urgency_level",
            "urgency_details",
            "jurisdiction_facts",
            "limitation_or_deadline_date",
            "no_adverse_party_currently_known",
            "no_adverse_party_explanation",
        ]
        sensitive_update = any(field in data and len(str(data.get(field) or "").strip()) > limit for field, limit in (("factual_summary", 500), ("desired_outcome", 300), ("urgency_details", 300)))
        urgent_reason = str(data.get("urgent_exception_reason", check.urgent_exception_reason or "")).strip()
        if sensitive_update and check.status != ConflictCheckStatus.CLEARED and not urgent_reason:
            raise ValidationError({"factual_summary": "Detailed confidential information requires an urgent-exception reason until conflict clearance."})
        for field in fields:
            if field in data:
                setattr(check, field, data[field])
        if "responsible_lawyer_id" in data:
            check.responsible_lawyer = cls._default_responsible_lawyer(user, firm, data.get("responsible_lawyer_id"))
        if sensitive_update or urgent_reason:
            check.pre_clearance_restricted = check.status != ConflictCheckStatus.CLEARED
            check.urgent_exception_reason = urgent_reason
            check.urgent_exception_received_by = user if urgent_reason else check.urgent_exception_received_by
            check.urgent_exception_received_at = timezone.now() if urgent_reason and not check.urgent_exception_received_at else check.urgent_exception_received_at
            check.restricted_note = "Urgent confidential intake exception; restricted to authorised conflict-review staff." if check.pre_clearance_restricted else check.restricted_note
        check.save()
        cls._record_history(
            check,
            from_status=check.status,
            to_status=check.status,
            action="PROPOSED_MATTER_UPDATED",
            summary="Proposed matter details updated.",
            actor=user,
        )
        return check

    @classmethod
    @transaction.atomic
    def start_check(cls, *, user, client_id, check_id, data=None):
        data = data or {}
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.PERFORM_CONFLICT_CHECK)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        if check.status != ConflictCheckStatus.NOT_STARTED:
            raise ValidationError({"status": "Only a not-started conflict check can be started."})
        if not check.proposed_matter_title.strip() or not check.proposed_instructions.strip():
            raise ValidationError({"proposed_matter": "Title and proposed instructions are required before starting."})
        parties = list(check.parties.exclude(role=ConflictCheckParty.PartyRole.PROSPECTIVE_CLIENT).values("name", "role"))
        cls._validate_parties(parties, check.no_adverse_party_currently_known, check.no_adverse_party_explanation)
        check.started_at = check.started_at or timezone.now()
        cls._transition(
            check,
            to_status=ConflictCheckStatus.IN_PROGRESS,
            action="CHECK_STARTED",
            summary=data.get("summary") or "Conflict check started.",
            actor=user,
        )
        cls._refresh_search(check)
        check.save(update_fields=["status", "started_at", "system_search", "updated_at"])
        return check

    @classmethod
    @transaction.atomic
    def request_information(cls, *, user, client_id, check_id, data):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.PERFORM_CONFLICT_CHECK)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        missing = str(data.get("information_missing", "")).strip()
        if not missing:
            raise ValidationError({"information_missing": "Record the missing information."})
        check.information_missing = missing
        cls._transition(
            check,
            to_status=ConflictCheckStatus.AWAITING_INFORMATION,
            action="INFORMATION_REQUESTED",
            summary=missing,
            actor=user,
        )
        check.save(update_fields=["status", "information_missing", "updated_at"])
        return check

    @classmethod
    @transaction.atomic
    def resume_check(cls, *, user, client_id, check_id, data=None):
        data = data or {}
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.PERFORM_CONFLICT_CHECK)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        if check.status != ConflictCheckStatus.AWAITING_INFORMATION:
            raise ValidationError({"status": "Only a check awaiting information can be resumed."})
        if "information_missing" in data:
            check.information_missing = data.get("information_missing", "")
        cls._transition(
            check,
            to_status=ConflictCheckStatus.IN_PROGRESS,
            action="CHECK_RESUMED",
            summary=data.get("summary") or "Conflict check resumed after information update.",
            actor=user,
        )
        cls._refresh_search(check)
        check.save(update_fields=["status", "information_missing", "system_search", "updated_at"])
        return check

    @classmethod
    @transaction.atomic
    def record_potential_conflict(cls, *, user, client_id, check_id, data):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.PERFORM_CONFLICT_CHECK)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        findings = str(data.get("first_reviewer_findings", "")).strip()
        if not findings:
            raise ValidationError({"first_reviewer_findings": "Record the first reviewer findings."})
        check.first_reviewer_findings = findings
        cls._transition(
            check,
            to_status=ConflictCheckStatus.POTENTIAL_CONFLICT,
            action="POTENTIAL_CONFLICT_RECORDED",
            summary=findings,
            actor=user,
        )
        check.save(update_fields=["status", "first_reviewer_findings", "updated_at"])
        return check

    @classmethod
    @transaction.atomic
    def escalate_for_review(cls, *, user, client_id, check_id, data):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.PERFORM_CONFLICT_CHECK)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        reviewer = cls._resolve_lawyer(firm, data.get("review_assigned_to_id"), "review_assigned_to_id")
        summary = str(data.get("summary", "")).strip()
        if not summary:
            raise ValidationError({"summary": "Escalation summary is required."})
        if not check.first_reviewer_findings.strip():
            raise ValidationError({"first_reviewer_findings": "First reviewer findings must be preserved before escalation."})
        check.review_assigned_to = reviewer
        cls._transition(
            check,
            to_status=ConflictCheckStatus.ESCALATED_FOR_REVIEW,
            action="ESCALATED_FOR_REVIEW",
            summary=summary,
            actor=user,
            metadata={"review_assigned_to_id": str(reviewer.id)},
        )
        check.save(update_fields=["status", "review_assigned_to", "updated_at"])
        cls._notify_reviewer(check, reviewer, actor=user, summary=summary)
        return check

    @staticmethod
    def _notify_reviewer(check, reviewer, *, actor, summary):
        from apps.notifications.services.notification_service import NotificationService

        area = "admin" if reviewer.user_id == check.firm.owner_id else "lawyer"
        NotificationService.create(
            firm=check.firm,
            recipient=reviewer.user,
            actor=actor,
            title=f"Conflict review requested: {check.reference_number}",
            message=f"{actor.full_name} escalated the conflict check on {check.proposed_matter_title} for your decision. {summary}",
            action_url=f"/{area}/clients/{check.client_id}/conflict-checks/{check.id}",
            event_key=f"CONFLICT_ESCALATED:{check.id}:{reviewer.id}",
        )

    @classmethod
    @transaction.atomic
    def record_final_decision(cls, *, user, client_id, check_id, data):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.APPROVE_CONFLICT_RESULT)
        deciding_lawyer = cls._assert_deciding_advocate(user, firm)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        decision = data.get("decision")
        if decision not in cls.DECISION_STATUSES:
            raise ValidationError({"decision": "Decision must be CLEARED or CONFLICT_CONFIRMED."})
        if not data.get("decision_confirmation"):
            raise ValidationError({"decision_confirmation": "Confirm the professional conflict decision."})
        if decision == ConflictCheckStatus.CLEARED:
            search = cls._refresh_search(check)
            direct_clearance = check.status == ConflictCheckStatus.IN_PROGRESS
            reviews = {review.source: review for review in check.source_reviews.all()}
            guided = search["mode"] == "GUIDED"
            if direct_clearance and any(match["conflict_risk"] for match in search["matches"]):
                raise ValidationError({
                    "conflict_search": "The conflict search found a possible conflict. Record a potential conflict so it is reviewed before clearing."
                })
            if direct_clearance and guided:
                labels = dict(ConflictCheckSourceCategory.choices)
                unconfirmed = [labels[source] for source in conflict_search.GUIDED_SOURCE_VALUES if source not in reviews]
                if unconfirmed:
                    raise ValidationError({"source_reviews": f"Confirm every source before clearing: {', '.join(unconfirmed)}."})
                found = [labels[review.source] for review in reviews.values() if review.outcome == ConflictSourceReview.Outcome.MATCH_FOUND]
                if found:
                    raise ValidationError({
                        "source_reviews": f"A match was recorded in {', '.join(found)}. Record a potential conflict instead of clearing."
                    })
            names_checked = cls._normalize_list(
                [item["name"] for item in search["names_searched"]] + cls._normalize_list(data.get("names_checked"))
            )
            sources = list(reviews) if guided and reviews else search["sources_searched"]
            extra_sources = [item for item in cls._normalize_list(data.get("source_categories_checked")) if item not in sources]
            invalid_sources = [item for item in extra_sources if item not in ConflictCheckSourceCategory.values]
            if invalid_sources:
                raise ValidationError({"source_categories_checked": "One or more source categories are invalid."})
            sources += extra_sources
            result_summary = str(data.get("result_summary", "")).strip() or (
                f"No conflict found. The system searched {len(names_checked)} name(s) against {search['record_count']} firm "
                f"record(s) in {len(search['sources_searched'])} sources"
                + (", and the advocate confirmed each source, including records kept outside the system." if guided and reviews else ".")
            )
            check.names_checked = names_checked
            check.source_categories_checked = sources
            check.other_source_description = data.get("other_source_description", check.other_source_description)
            check.result_summary = result_summary
            summary = result_summary
        else:
            reason = str(data.get("internal_reason", "")).strip()
            if not reason:
                raise ValidationError({"internal_reason": "Record the concise internal reason."})
            check.internal_reason = reason
            check.restricted_note = data.get("restricted_note", check.restricted_note)
            summary = reason
        check.decision_confirmation = True
        check.decided_by = deciding_lawyer
        check.decided_at = timezone.now()
        check.completed_at = check.decided_at
        cls._transition(
            check,
            to_status=decision,
            action="FINAL_DECISION_RECORDED",
            summary=summary,
            actor=user,
            metadata={
                "decided_by_id": str(deciding_lawyer.id),
                "search_mode": (check.system_search or {}).get("mode", ""),
                "searchable_record_count": (check.system_search or {}).get("record_count"),
                "system_match_count": len((check.system_search or {}).get("matches", [])),
            },
        )
        check.save()
        return check

    @classmethod
    @transaction.atomic
    def close_without_decision(cls, *, user, client_id, check_id, data):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.APPROVE_CONFLICT_RESULT)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        reason = str(data.get("closure_reason", "")).strip()
        if not reason:
            raise ValidationError({"closure_reason": "Closure reason is required."})
        check.internal_reason = reason
        check.completed_at = timezone.now()
        cls._transition(
            check,
            to_status=ConflictCheckStatus.CLOSED_WITHOUT_DECISION,
            action="CLOSED_WITHOUT_DECISION",
            summary=reason,
            actor=user,
        )
        check.save(update_fields=["status", "internal_reason", "completed_at", "updated_at"])
        return check

    @classmethod
    @transaction.atomic
    def record_acceptance_decision(cls, *, user, client_id, check_id, data):
        firm = cls.get_user_firm(user)
        cls._assert_permission(user, firm, LawyerPermission.ACCEPT_DECLINE_INSTRUCTIONS)
        deciding_lawyer = cls._assert_deciding_advocate(user, firm)
        check = cls.get_check(user=user, client_id=client_id, check_id=check_id, lock=True)
        decision = data.get("decision")
        if decision not in ClientMatterConflictCheck.AcceptanceDecision.values:
            raise ValidationError({"decision": "Select a valid firm acceptance decision."})
        if check.status != ConflictCheckStatus.CLEARED and decision == ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED:
            raise ValidationError({"status": "Only conflict-cleared proposed matters can be accepted."})
        if decision == ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED and check.client.classification_review_status == "REQUIRES_REVIEW":
            raise ValidationError({"classification_review_status": "Resolve the client's legal classification before firm acceptance."})
        if check.acceptance_decision != ClientMatterConflictCheck.AcceptanceDecision.PENDING:
            raise ValidationError({"acceptance_decision": "Terminal firm acceptance decisions cannot be silently edited."})
        reason_category = data.get("reason_category", "")
        internal_reason = str(data.get("internal_reason", "")).strip()
        scope_confirmation = str(data.get("scope_confirmation", "")).strip()
        engagement_status = data.get("engagement_status") or ClientMatterConflictCheck.EngagementStatus.NOT_STARTED
        if decision in {
            ClientMatterConflictCheck.AcceptanceDecision.DECLINED,
            ClientMatterConflictCheck.AcceptanceDecision.CLIENT_WITHDREW,
        }:
            if not reason_category:
                raise ValidationError({"reason_category": "Record a controlled reason category."})
            if not internal_reason:
                raise ValidationError({"internal_reason": "Record the restricted internal reason."})
        if decision == ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED:
            if not scope_confirmation:
                raise ValidationError({"scope_confirmation": "Confirm the accepted scope of work."})
            if engagement_status == ClientMatterConflictCheck.EngagementStatus.NOT_STARTED:
                raise ValidationError({"engagement_status": "Record the engagement or fee-arrangement status."})
            check.accepted_by = deciding_lawyer
            check.accepted_at = timezone.now()
        check.acceptance_decision = decision
        check.acceptance_reason_category = reason_category
        check.acceptance_internal_reason = internal_reason
        check.scope_confirmation = scope_confirmation
        check.engagement_status = engagement_status
        check.acceptance_decided_by = deciding_lawyer
        check.acceptance_decided_at = timezone.now()
        check.save()
        FirmAcceptanceHistory.objects.create(
            conflict_check=check,
            from_decision=ClientMatterConflictCheck.AcceptanceDecision.PENDING,
            to_decision=decision,
            reason_category=reason_category,
            internal_reason=internal_reason,
            scope_confirmation=scope_confirmation,
            engagement_status=engagement_status,
            actor=user,
            decided_by=deciding_lawyer,
            metadata={"decided_by_id": str(deciding_lawyer.id)},
        )
        cls._record_history(
            check,
            from_status=check.status,
            to_status=check.status,
            action="FIRM_ACCEPTANCE_DECISION_RECORDED",
            summary=f"Firm acceptance decision recorded: {decision}.",
            actor=user,
            metadata={"acceptance_decision": decision},
        )
        AuditService.record(
            firm=firm, user=user, action="FIRM_ACCEPTANCE_DECISION_RECORDED", obj=check,
            previous={"acceptance_decision": ClientMatterConflictCheck.AcceptanceDecision.PENDING},
            new={"acceptance_decision": decision, "accepted_by": deciding_lawyer.id if decision == ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED else None},
            reason=internal_reason,
        )
        return check

    @classmethod
    def validate_for_case_creation(cls, *, user, firm, client, conflict_check_id, opening_context=None):
        if not conflict_check_id:
            raise ValidationError({"conflict_check_id": "Complete conflict clearance and firm acceptance before opening a matter."})
        cls._assert_permission(user, firm, LawyerPermission.OPEN_MATTER)
        try:
            check = ClientMatterConflictCheck.objects.select_for_update().get(id=conflict_check_id)
        except ClientMatterConflictCheck.DoesNotExist as exc:
            raise ValidationError({"conflict_check_id": "Conflict check was not found."}) from exc
        errors = {}
        if check.firm_id != firm.id:
            errors["conflict_check_id"] = "Conflict check belongs to another firm."
        if check.client_id != client.id:
            errors["conflict_check_id"] = "Conflict check belongs to another client."
        if check.status != ConflictCheckStatus.CLEARED:
            errors["conflict_check_id"] = "Conflict check must be cleared before matter opening."
        if not check.decision_confirmation:
            errors["decision_confirmation"] = "Conflict clearance must be confirmed."
        if not check.decided_by_id or not check.decided_by.is_active or check.decided_by.law_firm_id != firm.id:
            errors["decided_by"] = "Conflict decision must be made by an active advocate in this firm."
        if check.acceptance_decision != ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED:
            errors["acceptance_decision"] = "Firm acceptance must be recorded before opening a matter."
        if client.classification_review_status == client.ClassificationReviewStatus.REQUIRES_REVIEW:
            errors["classification_review_status"] = "Resolve the client's legal classification before matter opening."
        if not check.accepted_by_id or not check.accepted_at:
            errors["accepted_by"] = "Firm acceptance must identify the accepting advocate and time."
        elif not check.accepted_by.is_active or check.accepted_by.law_firm_id != firm.id:
            errors["accepted_by"] = "Firm acceptance must be made by an active advocate in this firm."
        from apps.clients.services.engagement_service import EngagementService
        engagement = EngagementService.current_for(check)
        if not engagement or not engagement.permits_opening:
            errors["engagement_status"] = (
                "A formally approved engagement or authorised policy exception is required before matter opening."
            )
        from apps.clients.services.compliance_review_service import ClientComplianceReviewService
        errors.update(ClientComplianceReviewService.opening_errors(client))
        opening_context = opening_context or {}
        if opening_context.get("forum") != Case.Forum.NO_FORMAL_FORUM:
            try:
                jurisdiction = check.jurisdiction
            except ProposedMatterJurisdiction.DoesNotExist:
                jurisdiction = None
            if not jurisdiction or not jurisdiction.is_final:
                errors["jurisdiction"] = "Final advocate-confirmed jurisdiction review is required for this forum."
        if check.created_case_id or check.consumed_at:
            errors["conflict_check_id"] = "This proposed matter has already opened an internal matter."
        if errors:
            raise ValidationError(errors)
        return check

    @classmethod
    def consume_for_case(cls, *, check, case, actor):
        if check.created_case_id or check.consumed_at:
            raise ValidationError({"conflict_check_id": "This conflict check has already been consumed."})
        if check.status != ConflictCheckStatus.CLEARED:
            raise ValidationError({"conflict_check_id": "Only cleared conflict checks can be consumed."})
        cls.carry_and_instantiate_matter_requirements(check=check, case=case, actor=actor)
        check.created_case = case
        check.consumed_at = timezone.now()
        check.save(update_fields=["created_case", "consumed_at", "updated_at"])
        cls._record_history(
            check,
            from_status=check.status,
            to_status=check.status,
            action="CONSUMED_FOR_CASE",
            summary=f"Conflict clearance consumed for case {case.case_number}.",
            actor=actor,
            metadata={"case_id": str(case.id), "case_number": case.case_number},
        )
        AuditService.record(
            firm=check.firm, user=actor, action="PROPOSED_MATTER_CONSUMED", obj=check,
            previous={"created_case": None, "consumed_at": None},
            new={"created_case": case.id, "consumed_at": check.consumed_at},
        )
