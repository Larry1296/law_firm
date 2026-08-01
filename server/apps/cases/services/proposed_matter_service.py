"""Service layer for proposed-matter operations."""

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.cases.models import Case, ProposedMatter
from apps.cases.services.case_service import CaseService
from apps.staff.models import Lawyer


class ProposedMatterService:
    """Business logic for creating, listing and converting proposed matters."""

    # ── Query helpers ─────────────────────────────────────────────────

    @staticmethod
    def _firm_for_user(user):
        return CaseService.get_user_firm(user)

    @staticmethod
    def base_queryset(user):
        firm = ProposedMatterService._firm_for_user(user)
        qs = ProposedMatter.objects.filter(firm=firm).select_related(
            "firm",
            "client",
            "responsible_advocate",
            "responsible_advocate__user",
            "created_by",
            "converted_to_case",
        )
        return qs

    @staticmethod
    def list_proposed_matters(user, *, search=None, status=None, urgency_level=None):
        qs = ProposedMatterService.base_queryset(user)
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(proposed_instructions__icontains=search)
                | Q(known_adverse_party__icontains=search)
            )
        if status:
            qs = qs.filter(status=status)
        if urgency_level:
            qs = qs.filter(urgency_level=urgency_level)
        return qs.distinct()

    @staticmethod
    def get_proposed_matter(user, proposed_matter_id):
        return ProposedMatterService.base_queryset(user).get(id=proposed_matter_id)

    # ── Resolve advocate ──────────────────────────────────────────────

    @staticmethod
    def _resolve_advocate(firm, lawyer_id, user):
        """Return the Lawyer to assign, falling back to the firm default.

        When *lawyer_id* is ``None`` the system resolves the firm owner's
        lawyer profile (the standard default) so that the field is never
        left blank unless the firm has no registered advocate yet.
        """
        if lawyer_id:
            return Lawyer.objects.get(id=lawyer_id, law_firm=firm, is_active=True)
        try:
            return CaseService.get_default_lawyer(firm)
        except PermissionError:
            return None

    # ── Create ────────────────────────────────────────────────────────

    @staticmethod
    @transaction.atomic
    def create_proposed_matter(*, user, validated_data):
        firm = ProposedMatterService._firm_for_user(user)

        lawyer_id = validated_data.pop("responsible_advocate_id", None)
        advocate = ProposedMatterService._resolve_advocate(firm, lawyer_id, user)

        # When the adverse-party name is blank, infer that no adverse party
        # is known regardless of what the caller sent for the flag.
        known_adverse = (validated_data.get("known_adverse_party") or "").strip()
        if not known_adverse:
            validated_data["no_adverse_party_known"] = True

        proposed = ProposedMatter.objects.create(
            firm=firm,
            created_by=user,
            responsible_advocate=advocate,
            **validated_data,
        )
        return proposed

    # ── Submit ────────────────────────────────────────────────────────

    @staticmethod
    @transaction.atomic
    def submit_proposed_matter(*, proposed_matter, actor):
        """Mark a draft as submitted so conflict checking can begin."""
        if proposed_matter.status != ProposedMatter.Status.DRAFT:
            raise ValueError(
                f"Only draft proposed matters can be submitted "
                f"(current status: {proposed_matter.status})."
            )
        proposed_matter.status = ProposedMatter.Status.SUBMITTED
        proposed_matter.submitted_at = timezone.now()
        proposed_matter.save(update_fields=["status", "submitted_at", "updated_at"])
        return proposed_matter

    # ── Withdraw ──────────────────────────────────────────────────────

    @staticmethod
    @transaction.atomic
    def withdraw_proposed_matter(*, proposed_matter, actor, reason=""):
        terminal = {
            ProposedMatter.Status.CONVERTED_TO_MATTER,
            ProposedMatter.Status.WITHDRAWN,
            ProposedMatter.Status.ABANDONED,
        }
        if proposed_matter.status in terminal:
            raise ValueError(
                f"Cannot withdraw a proposed matter with status "
                f"{proposed_matter.status}."
            )
        proposed_matter.status = ProposedMatter.Status.WITHDRAWN
        proposed_matter.withdrawn_at = timezone.now()
        proposed_matter.withdrawal_reason = reason
        proposed_matter.save(
            update_fields=["status", "withdrawn_at", "withdrawal_reason", "updated_at"]
        )
        return proposed_matter

    # ── Convert to a full Case ────────────────────────────────────────

    @staticmethod
    @transaction.atomic
    def convert_to_matter(*, proposed_matter, actor, client_id, conflict_check_id):
        """Create a :class:`Case` from this proposed matter.

        The proposed matter must have been conflict-cleared (or at least
        submitted) before conversion is allowed.
        """
        if proposed_matter.status == ProposedMatter.Status.CONVERTED_TO_MATTER:
            raise ValueError("This proposed matter has already been converted.")

        allowed_statuses = {
            ProposedMatter.Status.SUBMITTED,
            ProposedMatter.Status.CONFLICT_CHECK_INITIATED,
            ProposedMatter.Status.CONFLICT_CLEARED,
        }
        if proposed_matter.status not in allowed_statuses:
            raise ValueError(
                f"Proposed matter must be at least submitted before conversion "
                f"(current status: {proposed_matter.status})."
            )

        # Build Case creation payload from the proposed matter data.
        case_data = {
            "client_id": client_id,
            "conflict_check_id": conflict_check_id,
            "title": proposed_matter.title,
            "description": proposed_matter.proposed_instructions,
            "entry_route": Case.EntryRoute.NEW_INSTRUCTION,
            "case_type": Case.CaseType.DEBT_RECOVERY,
            "practice_area": Case.PracticeArea.DEBT_RECOVERY,
            "matter_nature": Case.MatterNature.DEBT_RECOVERY,
            "forum": Case.Forum.NO_FORMAL_FORUM,
            "urgency_level": proposed_matter.urgency_level,
            "urgency_reason": proposed_matter.urgency_details,
            "limitation_date": proposed_matter.limitation_date,
            "date_instructions_received": timezone.now().date(),
        }

        if proposed_matter.known_adverse_party:
            case_data["defendant"] = proposed_matter.known_adverse_party
            case_data["parties"] = [
                {
                    "name": proposed_matter.known_adverse_party,
                    "is_adverse": True,
                }
            ]

        if proposed_matter.responsible_advocate_id:
            case_data["assigned_lawyer_membership_id"] = (
                proposed_matter.responsible_advocate_id
            )

        case = CaseService.create_case(
            user=actor,
            validated_data=case_data,
        )

        proposed_matter.converted_to_case = case
        proposed_matter.status = ProposedMatter.Status.CONVERTED_TO_MATTER
        proposed_matter.save(
            update_fields=["converted_to_case", "status", "updated_at"]
        )

        return case

    # ── Summary ───────────────────────────────────────────────────────

    @staticmethod
    def summary(queryset):
        status_counts = {
            row["status"]: row["count"]
            for row in queryset.values("status").annotate(count=Count("id"))
        }
        return {
            "total_proposed": queryset.count(),
            "drafts": status_counts.get(ProposedMatter.Status.DRAFT, 0),
            "submitted": status_counts.get(ProposedMatter.Status.SUBMITTED, 0),
            "conflict_check_initiated": status_counts.get(
                ProposedMatter.Status.CONFLICT_CHECK_INITIATED, 0
            ),
            "conflict_cleared": status_counts.get(
                ProposedMatter.Status.CONFLICT_CLEARED, 0
            ),
            "conflict_identified": status_counts.get(
                ProposedMatter.Status.CONFLICT_IDENTIFIED, 0
            ),
            "converted": status_counts.get(
                ProposedMatter.Status.CONVERTED_TO_MATTER, 0
            ),
            "withdrawn": status_counts.get(ProposedMatter.Status.WITHDRAWN, 0),
        }
