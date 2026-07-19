from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import CaseActivity, CaseTimeline
from apps.common.choices import UserRole


class CaseJurisdictionService:
    @staticmethod
    def can_verify(user, case):
        if user.role == UserRole.ADMIN and case.firm.owner_id == user.id:
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        return bool(lawyer and case.assigned_lawyer_id == lawyer.id)

    @classmethod
    def ensure_can_verify(cls, user, case):
        if cls.can_verify(user, case):
            return
        raise PermissionError("You do not have permission to verify jurisdiction.")

    @classmethod
    @transaction.atomic
    def verify(cls, *, case, actor, data):
        cls.ensure_can_verify(actor, case)
        claim_amount = data.get("claim_amount", case.claim_amount)
        court_level = (data.get("court_level") or case.court_level or "").strip()
        notes = (data.get("jurisdiction_notes") or case.jurisdiction_notes or "").strip()
        missing = []
        if claim_amount is None:
            missing.append("claim_amount")
        if not court_level:
            missing.append("court_level")
        if not notes:
            missing.append("jurisdiction_notes")
        if missing:
            raise ValidationError(
                {
                    "jurisdiction": (
                        "Jurisdiction verification requires claim amount, court level "
                        "and assessment notes."
                    ),
                    "missing": missing,
                }
            )

        case.claim_amount = claim_amount
        case.currency = (data.get("currency") or case.currency or "KES").upper()
        case.court_level = court_level
        case.court_type = data.get("court_type") or case.court_type
        case.court_station = data.get("court_station") or case.court_station
        case.jurisdiction_notes = notes
        case.judicial_officer_rank = data.get("judicial_officer_rank") or case.judicial_officer_rank
        case.jurisdiction_verified = True
        case.jurisdiction_verified_by = actor
        case.jurisdiction_verified_at = timezone.now()
        case.save(
            update_fields=[
                "claim_amount",
                "currency",
                "court_level",
                "court_type",
                "court_station",
                "jurisdiction_notes",
                "judicial_officer_rank",
                "jurisdiction_verified",
                "jurisdiction_verified_by",
                "jurisdiction_verified_at",
                "updated_at",
            ]
        )
        CaseActivity.objects.create(
            case=case,
            action="Jurisdiction verified",
            description="Jurisdiction assessment was verified by an authorized user.",
            actor=actor,
            metadata={
                "claim_amount": str(case.claim_amount),
                "currency": case.currency,
                "court_level": case.court_level,
            },
        )
        return case


    @classmethod
    @transaction.atomic
    def verify_cts_reference(cls, *, case, actor, data):
        cls.ensure_can_verify(actor, case)
        cts_reference = (data.get("cts_reference") or "").strip().upper()
        verification_source = (data.get("verification_source") or "").strip()
        reason = (data.get("reason") or "").strip()
        notes = (data.get("jurisdiction_notes") or "").strip()
        if not cts_reference:
            raise ValidationError({"cts_reference": "CTS reference is required."})
        if not verification_source:
            raise ValidationError({"verification_source": "Verification source is required."})
        if not reason:
            raise ValidationError({"reason": "A reason is required to verify the CTS reference."})

        previous_reference = case.cts_reference
        case.cts_reference = cts_reference
        case.save(update_fields=["cts_reference", "updated_at"])

        court_proceeding = getattr(case, "court_proceeding", None)
        if court_proceeding is not None:
            court_proceeding.cts_reference = cts_reference
            court_proceeding.save(update_fields=["cts_reference", "updated_at"])

        metadata = {
            "cts_reference": cts_reference,
            "previous_cts_reference": previous_reference,
            "verification_source": verification_source,
            "reason": reason,
        }
        if notes:
            metadata["notes"] = notes

        CaseActivity.objects.create(
            case=case,
            action="CTS_REFERENCE_VERIFIED",
            description=f"CTS reference verified from {verification_source}.",
            actor=actor,
            metadata=metadata,
        )
        CaseTimeline.objects.create(
            case=case,
            action="Court Record Verified",
            description="The CTS reference was verified against the court or eFiling record.",
            created_by=actor,
        )
        return case

    @classmethod
    @transaction.atomic
    def revoke(cls, *, case, actor, reason):
        cls.ensure_can_verify(actor, case)
        if not reason:
            raise ValidationError({"reason": "A reason is required to revoke jurisdiction verification."})
        case.jurisdiction_verified = False
        case.jurisdiction_verified_by = None
        case.jurisdiction_verified_at = None
        case.save(
            update_fields=[
                "jurisdiction_verified",
                "jurisdiction_verified_by",
                "jurisdiction_verified_at",
                "updated_at",
            ]
        )
        CaseActivity.objects.create(
            case=case,
            action="Jurisdiction verification revoked",
            description=reason,
            actor=actor,
            metadata={},
        )
        return case
