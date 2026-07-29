from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import (
    Case,
    CaseActivity,
    CaseTimeline,
    JudiciaryCTSSnapshot,
    JurisdictionAssessment,
)
from apps.common.choices import JurisdictionStatus, UserRole


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
        if not (data.get("subject_matter_basis") or "").strip():
            missing.append("subject_matter_basis")
        if not (data.get("territorial_basis") or "").strip():
            missing.append("territorial_basis")
        if not (data.get("legal_basis") or "").strip():
            missing.append("legal_basis")
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
        existing_case = case.entry_route == Case.EntryRoute.EXISTING_FILED_COURT_CASE
        assessment = JurisdictionAssessment.objects.create(
            case=case,
            source=(
                JurisdictionAssessment.Source.EXISTING_COURT_RECORD
                if existing_case else JurisdictionAssessment.Source.PRE_FILING_ASSESSMENT
            ),
            status=(
                JurisdictionStatus.CARRIED_OVER_FROM_EXISTING_CASE
                if existing_case else JurisdictionStatus.VERIFIED
            ),
            proposed_court=case.court_name or case.court_type,
            proposed_station=case.court_station,
            subject_matter_basis=data.get("subject_matter_basis", ""),
            pecuniary_basis=data.get("pecuniary_basis", ""),
            territorial_basis=data.get("territorial_basis", ""),
            claim_value=case.claim_amount,
            legal_basis=data.get("legal_basis", ""),
            assessment=notes,
            information_source=data.get("verification_source", ""),
            recorded_by=actor,
            confirmed_by=actor,
        )
        document_ids = data.get("supporting_document_ids", [])
        if document_ids:
            assessment.supporting_documents.set(case.attachments.filter(id__in=document_ids))
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
    def review(cls, *, case, actor, data):
        cls.ensure_can_verify(actor, case)
        trigger = (data.get("trigger") or "").strip()
        assessment_text = (data.get("assessment") or "").strip()
        if not trigger or not assessment_text:
            raise ValidationError({"review": "A trigger and advocate assessment are required."})
        previous = case.jurisdiction_history.order_by("-created_at").first()
        entry = JurisdictionAssessment.objects.create(
            case=case,
            source=JurisdictionAssessment.Source.JURISDICTION_REVIEW,
            status=data["jurisdiction_status"],
            trigger=trigger,
            date_raised=data.get("date_raised") or timezone.now(),
            raised_by=data.get("raised_by", ""),
            subject_matter_basis=data.get("subject_matter_basis", ""),
            pecuniary_basis=data.get("pecuniary_basis", ""),
            territorial_basis=data.get("territorial_basis", ""),
            claim_value=data.get("claim_amount", case.claim_amount),
            legal_basis=data.get("legal_basis", ""),
            assessment=assessment_text,
            court_directions_or_ruling=data.get("court_directions_or_ruling", ""),
            previous_court=data.get("previous_court") or (
                previous.new_court or previous.proposed_court if previous else case.court_name
            ),
            new_court=data.get("new_court", ""),
            effective_date=data.get("effective_date"),
            information_source=data.get("verification_source", ""),
            recorded_by=actor,
            confirmed_by=actor,
        )
        document_ids = data.get("supporting_document_ids", [])
        if document_ids:
            entry.supporting_documents.set(case.attachments.filter(id__in=document_ids))
        if data["jurisdiction_status"] == JurisdictionStatus.TRANSFERRED and data.get("new_court"):
            case.court_name = data["new_court"]
            case.court_station = data.get("new_station", case.court_station)
            case.save(update_fields=["court_name", "court_station", "updated_at"])
        CaseActivity.objects.create(
            case=case, action="JURISDICTION_REVIEW_RECORDED",
            description=assessment_text, actor=actor,
            metadata={"history_id": str(entry.id), "trigger": trigger, "status": entry.status},
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
        official_number = (data.get("official_case_number") or case.official_court_case_number or "").strip()
        if not official_number:
            raise ValidationError({"official_case_number": "The official court case number is required."})

        previous_reference = case.cts_reference
        case.cts_reference = cts_reference
        case.save(update_fields=["cts_reference", "updated_at"])

        court_proceeding = getattr(case, "court_proceeding", None)
        if court_proceeding is not None:
            court_proceeding.cts_reference = cts_reference
            court_proceeding.save(update_fields=["cts_reference", "updated_at"])
        snapshot = JudiciaryCTSSnapshot.objects.create(
            case=case,
            official_case_number=official_number,
            cts_reference=cts_reference,
            efiling_reference=data.get("efiling_reference") or case.efiling_reference,
            court=data.get("court") or case.court_name,
            court_station=data.get("court_station") or case.court_station,
            judiciary_status=data.get("judiciary_status", ""),
            latest_official_court_date=data.get("latest_official_court_date"),
            source=verification_source,
            notes=notes or reason,
            checked_by=actor,
            checked_at=timezone.now(),
        )
        document_ids = data.get("supporting_document_ids", [])
        if document_ids:
            snapshot.supporting_documents.set(case.attachments.filter(id__in=document_ids))

        metadata = {
            "cts_reference": cts_reference,
            "previous_cts_reference": previous_reference,
            "verification_source": verification_source,
            "reason": reason,
            "snapshot_id": str(snapshot.id),
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
        JurisdictionAssessment.objects.create(
            case=case,
            source=JurisdictionAssessment.Source.JURISDICTION_REVIEW,
            status=JurisdictionStatus.UNDER_REVIEW,
            trigger=reason,
            date_raised=timezone.now(),
            raised_by=actor.full_name,
            previous_court=case.court_name,
            assessment="Jurisdiction reopened for controlled review.",
            recorded_by=actor,
            confirmed_by=actor,
        )
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

    @classmethod
    @transaction.atomic
    def record_existing_case_diagnostic(cls, *, case, actor, data):
        cls.ensure_can_verify(actor, case)
        if case.entry_route != Case.EntryRoute.EXISTING_FILED_COURT_CASE:
            raise ValidationError({"entry_route": "Diagnostics on this action are limited to existing filed cases."})
        warning = (data.get("assessment") or "").strip()
        if not warning:
            raise ValidationError({"assessment": "Record the non-binding diagnostic warning."})
        JurisdictionAssessment.objects.create(
            case=case,
            source=JurisdictionAssessment.Source.EXISTING_COURT_RECORD,
            status=JurisdictionStatus.UNDER_REVIEW,
            trigger="NON_BINDING_DIAGNOSTIC",
            date_raised=timezone.now(),
            raised_by=actor.full_name,
            previous_court=case.court_name or case.court_type,
            proposed_station=case.court_station,
            assessment=warning,
            information_source=data.get("verification_source", "Internal diagnostic review"),
            recorded_by=actor,
        )
        CaseActivity.objects.create(
            case=case,
            action="EXISTING_CASE_JURISDICTION_DIAGNOSTIC",
            description=warning,
            actor=actor,
            metadata={"non_binding": True, "official_values_changed": False},
        )
        return case
