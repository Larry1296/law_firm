from copy import deepcopy
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.clients.models import (
    ClientMatterConflictCheck,
    ProposedMatterJurisdiction,
    ProposedMatterJurisdictionHistory,
)
from apps.common.choices import ConflictCheckStatus


class JurisdictionSuggestionService:
    """Deterministic decision support; never a jurisdiction decision-maker."""

    RULE_VERSION = "KE-JURISDICTION-2026.1"
    DISCLAIMER = (
        "This is a system-generated jurisdiction suggestion. The responsible "
        "advocate must independently review and confirm the appropriate court or tribunal."
    )
    CATALOGUE = {
        "SUPREME_COURT": {
            "forum": "COURT", "court_type": "SUPREME_COURT", "court_level": "SUPREME_COURT",
            "label": "Supreme Court", "authority": "Constitution of Kenya, Article 163",
            "effective_date": "2010-08-27", "last_legally_reviewed": "2026-07-29",
        },
        "COURT_OF_APPEAL": {
            "forum": "COURT", "court_type": "COURT_OF_APPEAL", "court_level": "COURT_OF_APPEAL",
            "label": "Court of Appeal", "authority": "Constitution of Kenya, Article 164; Appellate Jurisdiction Act",
            "effective_date": "2010-08-27", "last_legally_reviewed": "2026-07-29",
        },
        "SMALL_CLAIMS": {
            "forum": "COURT", "court_type": "SMALL_CLAIMS", "court_level": "SMALL_CLAIMS_COURT",
            "label": "Small Claims Court", "maximum_claim": Decimal("1000000"),
            "authority": "Small Claims Court Act, sections 11–13",
            "effective_date": "2020-04-01", "last_legally_reviewed": "2026-07-29",
            "exclusions": ["LAND", "EMPLOYMENT", "DEFAMATION", "MALICIOUS_PROSECUTION"],
        },
        "MAGISTRATES": {
            "forum": "COURT", "court_type": "MAGISTRATE", "court_level": "CHIEF_MAGISTRATE",
            "label": "Magistrates’ Court", "maximum_claim": Decimal("20000000"),
            "authority": "Magistrates’ Courts Act, sections 5–9",
            "effective_date": "2016-01-02", "last_legally_reviewed": "2026-07-29",
        },
        "HIGH_COURT": {
            "forum": "COURT", "court_type": "HIGH_COURT", "court_level": "HIGH_COURT",
            "label": "High Court", "authority": "Constitution of Kenya, Article 165",
            "effective_date": "2010-08-27", "last_legally_reviewed": "2026-07-29",
        },
        "ELRC": {
            "forum": "COURT", "court_type": "EMPLOYMENT_LABOUR", "court_level": "SUPERIOR_COURT",
            "label": "Employment and Labour Relations Court",
            "authority": "Constitution, Article 162(2)(a); Employment and Labour Relations Court Act, section 12",
            "effective_date": "2012-08-30", "last_legally_reviewed": "2026-07-29",
        },
        "ELC": {
            "forum": "COURT", "court_type": "ENVIRONMENT_LAND", "court_level": "SUPERIOR_COURT",
            "label": "Environment and Land Court",
            "authority": "Constitution, Article 162(2)(b); Environment and Land Court Act, section 13",
            "effective_date": "2011-08-30", "last_legally_reviewed": "2026-07-29",
        },
        "CHILDRENS": {
            "forum": "COURT", "court_type": "CHILDRENS_COURT", "court_level": "SUBORDINATE_COURT",
            "label": "Children’s Court", "authority": "Children Act, 2022",
            "effective_date": "2022-07-26", "last_legally_reviewed": "2026-07-29",
        },
        "KADHIS": {
            "forum": "COURT", "court_type": "KADHI", "court_level": "SUBORDINATE_COURT",
            "label": "Kadhis’ Court", "authority": "Constitution, Article 170(5); Kadhis’ Courts Act",
            "effective_date": "2010-08-27", "last_legally_reviewed": "2026-07-29",
        },
        "STATUTORY_TRIBUNAL": {
            "forum": "TRIBUNAL", "court_type": "TRIBUNAL", "court_level": "STATUTORY_TRIBUNAL",
            "label": "Applicable statutory tribunal or preliminary mechanism",
            "authority": "Applicable enabling statute (advocate must identify and confirm)",
            "effective_date": "2010-08-27", "last_legally_reviewed": "2026-07-29",
        },
    }

    @staticmethod
    def _advocate(user, check):
        lawyer = getattr(user, "lawyer_profile", None)
        if not lawyer or not lawyer.is_active or lawyer.law_firm_id != check.firm_id:
            raise PermissionDenied("Only an active advocate in this firm may make a jurisdiction decision.")
        if lawyer.id != check.responsible_lawyer_id and check.firm.owner_id != user.id:
            raise PermissionDenied("Only the responsible advocate or advocate firm owner may decide jurisdiction.")
        return lawyer

    @staticmethod
    def _decimal(value):
        try:
            return Decimal(str(value)) if value not in (None, "") else None
        except (InvalidOperation, ValueError):
            return None

    @classmethod
    def _snapshot(cls, record):
        return {
            "input_facts": deepcopy(record.input_facts),
            "suggestion": deepcopy(record.suggestion),
            "alternatives": deepcopy(record.alternatives),
            "warnings": deepcopy(record.warnings),
            "missing_information": deepcopy(record.missing_information),
            "authorities": deepcopy(record.authorities),
            "rule_version": record.rule_version,
            "completeness": record.completeness,
            "advocate_action": record.advocate_action,
            "final_forum": record.final_forum,
            "final_court_type": record.final_court_type,
            "final_court_level": record.final_court_level,
            "final_station": record.final_station,
            "subject_matter_basis": record.subject_matter_basis,
            "pecuniary_basis": record.pecuniary_basis,
            "territorial_basis": record.territorial_basis,
            "legal_basis": record.legal_basis,
            "advocate_findings": record.advocate_findings,
            "override_reason": record.override_reason,
            "confirmed_by_id": str(record.confirmed_by_id) if record.confirmed_by_id else None,
            "confirmed_at": record.confirmed_at.isoformat() if record.confirmed_at else None,
        }

    @classmethod
    def _history(cls, record, *, action, from_status, actor, reason=""):
        ProposedMatterJurisdictionHistory.objects.create(
            jurisdiction=record, action=action, from_status=from_status,
            to_status=record.status, snapshot=cls._snapshot(record),
            reason=reason, actor=actor,
        )

    @classmethod
    def _recommend(cls, check, facts):
        text = " ".join([
            check.proposed_matter_title, check.proposed_instructions,
            check.factual_summary, check.desired_outcome,
            str(facts.get("practice_area", "")), str(facts.get("matter_nature", "")),
            str(facts.get("relief_sought", "")), str(facts.get("legal_relationship", "")),
        ]).lower()
        claim = cls._decimal(facts.get("claim_value"))
        category = str(facts.get("dispute_category", "")).upper()
        missing = []
        if not (check.factual_summary or check.proposed_instructions):
            missing.append("factual_summary_or_client_instructions")
        if not category and not facts.get("practice_area"):
            missing.append("dispute_category_or_practice_area")
        if not any(facts.get(key) for key in ("cause_of_action_location", "defendant_location", "property_location", "proposed_station")):
            missing.append("territorial_connection")
        warnings = []
        alternative_keys = []
        if facts.get("statutory_process"):
            key = "STATUTORY_TRIBUNAL"
            alternative_keys = ["HIGH_COURT"]
            reasons = ["The intake identifies a statutory process that may have initial jurisdiction."]
            warnings.append("Confirm the enabling statute, exhaustion requirements and any appeal route.")
        elif str(facts.get("proceeding_role", "")).upper() == "APPEAL":
            key = "COURT_OF_APPEAL"
            alternative_keys = ["HIGH_COURT"]
            reasons = ["The intake describes an appeal; the originating decision and statutory appeal route must be confirmed."]
            if not facts.get("existing_decision"):
                missing.append("existing_decision_and_originating_forum")
        elif "employment" in text or "labour" in text or category == "EMPLOYMENT":
            key = "ELRC"
            alternative_keys = ["MAGISTRATES"]
            reasons = ["The supplied facts indicate an employment or labour relationship."]
        elif any(term in text for term in ("land", "title", "boundary", "environment")) or category == "LAND":
            key = "ELC"
            alternative_keys = ["MAGISTRATES"]
            reasons = ["The supplied facts indicate a land, title, use, occupation or environmental dispute."]
        elif "child" in text or category == "CHILDREN":
            key = "CHILDRENS"
            reasons = ["The supplied facts indicate a matter governed by children-law jurisdiction."]
        elif facts.get("religious_status") == "MUSLIM" and category in {"PERSONAL_STATUS", "MARRIAGE", "DIVORCE", "INHERITANCE"}:
            key = "KADHIS"
            alternative_keys = ["HIGH_COURT"]
            reasons = ["The recorded religious status and dispute category may engage Kadhis’ Court jurisdiction."]
            warnings.append("Confirm that every party submits to Kadhis’ Court jurisdiction.")
        elif (
            claim is not None and claim <= cls.CATALOGUE["SMALL_CLAIMS"]["maximum_claim"]
            and category in {"DEBT_RECOVERY", "CONTRACT", "TORT", "PERSONAL_INJURY"}
        ):
            key = "SMALL_CLAIMS"
            alternative_keys = ["MAGISTRATES"]
            reasons = ["The recorded claim category and value fall within the configured Small Claims Court rule."]
            warnings.append("Confirm the remedy and cause of action are not within a statutory exclusion.")
        elif claim is not None and claim <= cls.CATALOGUE["MAGISTRATES"]["maximum_claim"]:
            key = "MAGISTRATES"
            alternative_keys = ["HIGH_COURT"]
            reasons = ["The recorded civil claim value is within the configured Chief Magistrate pecuniary ceiling."]
        else:
            key = "HIGH_COURT"
            reasons = ["The supplied facts do not establish a suitable specialised or subordinate-court recommendation."]
            if claim is None:
                missing.append("claim_value_or_explanation_that_pecuniary_jurisdiction_is_not_applicable")
        rule = cls.CATALOGUE[key]
        station = (
            facts.get("proposed_station") or facts.get("cause_of_action_location")
            or facts.get("defendant_location") or facts.get("property_location") or ""
        )
        if not station:
            warnings.append("Territorial jurisdiction and the appropriate station require advocate confirmation.")
        suggestion = {
            "rule_key": key, "forum": rule["forum"], "court_type": rule["court_type"],
            "court_level": rule["court_level"], "label": rule["label"], "station": station,
            "reasons": reasons,
        }
        if key == "MAGISTRATES" and claim is not None:
            suggestion["court_level"] = (
                "RESIDENT_MAGISTRATE" if claim <= Decimal("5000000")
                else "SENIOR_RESIDENT_MAGISTRATE" if claim <= Decimal("7000000")
                else "PRINCIPAL_MAGISTRATE" if claim <= Decimal("10000000")
                else "SENIOR_PRINCIPAL_MAGISTRATE" if claim <= Decimal("15000000")
                else "CHIEF_MAGISTRATE"
            )
        alternatives = [
            {
                "rule_key": item, "forum": cls.CATALOGUE[item]["forum"],
                "court_type": cls.CATALOGUE[item]["court_type"],
                "court_level": cls.CATALOGUE[item]["court_level"],
                "label": cls.CATALOGUE[item]["label"],
            }
            for item in alternative_keys
        ]
        authorities = [
            {
                "rule_key": key, "authority": rule["authority"],
                "effective_date": rule["effective_date"],
                "last_legally_reviewed": rule["last_legally_reviewed"],
                "rule_version": cls.RULE_VERSION,
                "expiry_date": rule.get("expiry_date"),
                "active": True,
            }
        ]
        completeness = max(0, 100 - min(75, len(set(missing)) * 25))
        return suggestion, alternatives, warnings, sorted(set(missing)), authorities, completeness

    @classmethod
    @transaction.atomic
    def generate(cls, *, user, check, facts):
        check = ClientMatterConflictCheck.objects.select_for_update().get(pk=check.pk)
        if check.status != ConflictCheckStatus.CLEARED:
            raise ValidationError({"conflict_check": "Conflict clearance is required before jurisdiction suggestion."})
        if getattr(check, "created_case_id", None):
            raise ValidationError({"jurisdiction": "Use case jurisdiction review after a matter has been opened."})
        merged = {**(check.jurisdiction_facts or {}), **(facts or {})}
        if isinstance(merged.get("claim_value"), Decimal):
            merged["claim_value"] = str(merged["claim_value"])
        suggestion, alternatives, warnings, missing, authorities, completeness = cls._recommend(check, merged)
        record, _ = ProposedMatterJurisdiction.objects.select_for_update().get_or_create(proposed_matter=check)
        if record.is_final:
            raise ValidationError({"jurisdiction": "The final decision is confirmed. Reopen it through controlled review."})
        previous_status = record.status
        record.input_facts = merged
        record.suggestion = suggestion
        record.alternatives = alternatives
        record.warnings = warnings
        record.missing_information = missing
        record.authorities = authorities
        record.rule_version = cls.RULE_VERSION
        record.completeness = completeness
        record.generated_at = timezone.now()
        record.generated_by = user
        record.status = (
            ProposedMatterJurisdiction.Status.MORE_INFORMATION_REQUIRED
            if completeness < 50
            else ProposedMatterJurisdiction.Status.ADVOCATE_REVIEW_REQUIRED
        )
        record.save()
        check.jurisdiction_facts = merged
        check.save(update_fields=["jurisdiction_facts", "updated_at"])
        cls._history(record, action="SUGGESTION_GENERATED", from_status=previous_status, actor=user)
        return record

    @classmethod
    @transaction.atomic
    def decide(cls, *, user, check, data):
        check = ClientMatterConflictCheck.objects.select_for_update().get(pk=check.pk)
        advocate = cls._advocate(user, check)
        try:
            record = ProposedMatterJurisdiction.objects.select_for_update().get(proposed_matter=check)
        except ProposedMatterJurisdiction.DoesNotExist as exc:
            raise ValidationError({"jurisdiction": "Generate a suggestion before recording the advocate decision."}) from exc
        action = data["action"]
        previous_status = record.status
        if action in {"MODIFY", "REJECT"} and not (data.get("override_reason") or "").strip():
            raise ValidationError({"override_reason": "A concise override reason is required."})
        status_map = {
            "ACCEPT": ProposedMatterJurisdiction.Status.ACCEPTED,
            "MODIFY": ProposedMatterJurisdiction.Status.MODIFIED,
            "REJECT": ProposedMatterJurisdiction.Status.REJECTED,
            "REQUEST_INFORMATION": ProposedMatterJurisdiction.Status.MORE_INFORMATION_REQUIRED,
            "DEFER": ProposedMatterJurisdiction.Status.DEFERRED,
        }
        record.status = status_map[action]
        record.advocate_action = action
        record.override_reason = (data.get("override_reason") or "").strip()
        record.advocate_findings = data.get("advocate_findings", "")
        if action == "ACCEPT":
            record.final_forum = record.suggestion.get("forum", "")
            record.final_court_type = record.suggestion.get("court_type", "")
            record.final_court_level = record.suggestion.get("court_level", "")
            record.final_station = record.suggestion.get("station", "")
        elif action in {"MODIFY", "REJECT"}:
            record.final_forum = data.get("final_forum", "")
            record.final_court_type = data.get("final_court_type", "")
            record.final_court_level = data.get("final_court_level", "")
            record.final_station = data.get("final_station", "")
        record.subject_matter_basis = data.get("subject_matter_basis", "")
        record.pecuniary_basis = data.get("pecuniary_basis", "")
        record.territorial_basis = data.get("territorial_basis", "")
        record.legal_basis = data.get("legal_basis", "")
        record.confirmed_by = advocate
        record.save()
        cls._history(record, action=f"ADVOCATE_{action}", from_status=previous_status, actor=user, reason=record.override_reason)
        return record

    @classmethod
    @transaction.atomic
    def confirm(cls, *, user, check):
        check = ClientMatterConflictCheck.objects.select_for_update().get(pk=check.pk)
        advocate = cls._advocate(user, check)
        record = ProposedMatterJurisdiction.objects.select_for_update().get(proposed_matter=check)
        if record.status not in {
            ProposedMatterJurisdiction.Status.ACCEPTED,
            ProposedMatterJurisdiction.Status.MODIFIED,
            ProposedMatterJurisdiction.Status.REJECTED,
        }:
            raise ValidationError({"jurisdiction": "Record the advocate’s decision before final confirmation."})
        required = {
            "final_forum": record.final_forum, "final_court_type": record.final_court_type,
            "final_court_level": record.final_court_level,
            "subject_matter_basis": record.subject_matter_basis,
            "territorial_basis": record.territorial_basis,
            "legal_basis": record.legal_basis,
            "advocate_findings": record.advocate_findings,
        }
        missing = [key for key, value in required.items() if not str(value or "").strip()]
        if missing:
            raise ValidationError({"missing": missing})
        previous_status = record.status
        record.status = ProposedMatterJurisdiction.Status.FINAL_CONFIRMED
        record.confirmed_by = advocate
        record.confirmed_at = timezone.now()
        record.save(update_fields=["status", "confirmed_by", "confirmed_at", "updated_at"])
        cls._history(record, action="FINAL_JURISDICTION_CONFIRMED", from_status=previous_status, actor=user)
        return record

    @classmethod
    @transaction.atomic
    def reopen(cls, *, user, check, reason):
        check = ClientMatterConflictCheck.objects.select_for_update().get(pk=check.pk)
        cls._advocate(user, check)
        record = ProposedMatterJurisdiction.objects.select_for_update().get(proposed_matter=check)
        if not record.is_final:
            raise ValidationError({"jurisdiction": "Only a confirmed decision can be reopened."})
        if not reason.strip():
            raise ValidationError({"reason": "A jurisdiction-review trigger is required."})
        previous_status = record.status
        record.status = ProposedMatterJurisdiction.Status.UNDER_RECONSIDERATION
        record.confirmed_at = None
        record.save(update_fields=["status", "confirmed_at", "updated_at"])
        cls._history(record, action="JURISDICTION_REOPENED", from_status=previous_status, actor=user, reason=reason)
        return record
