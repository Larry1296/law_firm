from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.ai.models import AIAssessmentAudit, AICaseAssessment, LegalProvision
from apps.ai.services.document_analysis_service import DocumentAnalysisService
from apps.cases.models import Case
from apps.cases.services import CaseService


DISCLAIMER = "This is an AI-assisted preparedness and risk assessment. It is not a prediction or guarantee of the court’s decision. The responsible advocate must independently verify all facts, documents, deadlines and legal authorities."
SCORING_VERSION = "priority-v1"


def _iso(value):
    return value.isoformat() if value else None


def _client_name(case):
    return getattr(case.client, "display_name", None) or getattr(case.client, "full_name", None) or str(case.client)


class CaseAssessmentService:
    @staticmethod
    def authorized_cases(user):
        return CaseService.base_queryset(user).filter(is_active=True)

    @staticmethod
    def _state_at(case):
        values = [case.updated_at]
        for relation in (case.events, case.tasks, case.attachments, case.filings):
            latest = relation.aggregate(value=Max("updated_at"))["value"]
            if latest:
                values.append(latest)
        return max(values)

    @classmethod
    def score(cls, case):
        now = timezone.now()
        events = list(case.events.all())
        tasks = list(case.tasks.all())
        attachments = list(case.attachments.all())
        filings = list(case.filings.all())
        upcoming_events = [event for event in events if event.starts_at >= now and event.status not in {"CANCELLED", "VACATED"}]
        upcoming_events.sort(key=lambda item: item.starts_at)
        next_event = upcoming_events[0] if upcoming_events else None
        due_tasks = [task for task in tasks if task.due_at and task.status not in {"DONE", "CANCELLED"}]
        overdue = [task for task in due_tasks if task.due_at < now]
        deadlines = sorted(due_tasks, key=lambda item: item.due_at)
        next_deadline = deadlines[0] if deadlines else None
        dates = [value for value in (next_event.starts_at if next_event else None, next_deadline.due_at if next_deadline else None) if value]
        next_date = min(dates) if dates else None
        days_remaining = (next_date.date() - now.date()).days if next_date else None

        urgency = 10
        urgency_reasons = []
        if overdue:
            urgency = 100
            urgency_reasons.append(f"{len(overdue)} task or deadline item(s) are overdue.")
        elif days_remaining is not None:
            urgency = 95 if days_remaining <= 1 else 80 if days_remaining <= 3 else 65 if days_remaining <= 7 else 45 if days_remaining <= 14 else 25
            urgency_reasons.append(f"The next verified event or deadline is in {days_remaining} day(s).")
        if next_event and next_event.event_type == "JUDGMENT":
            urgency = max(urgency, 80)
            urgency_reasons.append("A recorded judgment date is approaching; this affects time urgency only, not likely outcome.")

        severity = 25
        severity_reasons = []
        severity_map = {
            Case.CaseType.CRIMINAL: (95, "The matter may involve loss of liberty."),
            Case.CaseType.CHILDREN: (90, "The matter concerns children, custody or protection."),
            Case.CaseType.LAND: (80, "The matter may affect land possession, ownership or injunctive relief."),
            Case.CaseType.EMPLOYMENT: (65, "The matter may affect employment or livelihood."),
        }
        if case.case_type in severity_map:
            severity, reason = severity_map[case.case_type]
            severity_reasons.append(reason)
        if case.claim_amount:
            amount = float(case.claim_amount)
            financial = 85 if amount >= 10_000_000 else 70 if amount >= 1_000_000 else 50
            severity = max(severity, financial)
            severity_reasons.append("Recorded financial exposure contributes to consequence severity.")
        if case.urgency_reason:
            severity = max(severity, 55)
            severity_reasons.append("The responsible team recorded a matter-specific urgency reason.")

        procedural = min(100, len(overdue) * 30)
        procedural_reasons = []
        if overdue:
            procedural_reasons.append("Overdue procedural work requires review.")
        unserved = [filing for filing in filings if filing.status == "FILED" and not filing.served_at]
        if unserved:
            procedural = min(100, procedural + 25)
            procedural_reasons.append(f"{len(unserved)} filed item(s) have no recorded service date.")
        unverified_events = [event for event in events if not event.verified_at and event.status in {"COMPLETED", "PROCEEDED", "CONCLUDED"}]
        if unverified_events:
            procedural = min(100, procedural + 15)
            procedural_reasons.append("Completed proceeding records await verification.")
        if not procedural_reasons:
            procedural_reasons.append("No overdue or unserved item was found in the selected records.")

        evidence_readiness = min(100, 20 + len(attachments) * 12)
        evidence_reasons = [f"{len(attachments)} matter document(s) are recorded."]
        gaps = []
        if not attachments:
            gaps.append({"type": "DOCUMENT", "message": "No matter documents are available for assessment."})
            evidence_reasons.append("Documentary support cannot be assessed without selected documents.")
        if attachments and not any(item.attachment_type in {"EVIDENCE", "AFFIDAVIT"} for item in attachments):
            gaps.append({"type": "EVIDENCE", "message": "No document is classified as evidence or affidavit."})
        legal_preparedness = min(100, 20 + len(filings) * 12 + (15 if case.description else 0))
        legal_reasons = [f"{len(filings)} pleading or filing record(s) are available."]
        if not filings:
            gaps.append({"type": "PLEADING", "message": "No filing or pleading is recorded."})
        overall_preparedness = round((evidence_readiness + legal_preparedness + max(0, 100 - procedural)) / 3)

        risk_index = round(urgency * .4 + severity * .25 + procedural * .25 + (100 - overall_preparedness) * .1)
        priority = "CRITICAL" if risk_index >= 80 or overdue and severity >= 80 else "HIGH" if risk_index >= 60 else "MEDIUM" if risk_index >= 35 else "LOW"
        alerts = []
        if overdue:
            alerts.append({"level": "CRITICAL", "type": "OVERDUE", "message": f"{len(overdue)} overdue task/deadline item(s)."})
        if next_event:
            alerts.append({"level": "INFO", "type": "NEXT_EVENT", "message": f"{next_event.get_event_type_display()} on {next_event.starts_at:%d %b %Y}."})
        reasons = {
            "time_urgency": urgency_reasons or ["No imminent verified event or deadline was found."],
            "consequence_severity": severity_reasons or ["No configured high-consequence factor was identified from structured matter data."],
            "procedural_risk": procedural_reasons,
            "evidence_readiness": evidence_reasons,
            "legal_preparedness": legal_reasons,
            "overall_priority": [f"Priority is {priority} from risk index {risk_index}/100 using {SCORING_VERSION}."],
        }
        return {
            "priority": priority,
            "risk_index": risk_index,
            "scores": {"time_urgency": urgency, "consequence_severity": severity, "procedural_risk": procedural, "evidence_readiness": evidence_readiness, "legal_preparedness": legal_preparedness, "overall_preparedness": overall_preparedness},
            "reasons": reasons, "alerts": alerts, "gaps": gaps,
            "next_event": next_event, "next_deadline": next_deadline,
            "days_remaining": days_remaining,
        }

    @classmethod
    def summary(cls, case):
        scored = cls.score(case)
        current = case.ai_assessments.order_by("-version").first()
        state_at = cls._state_at(case)
        stale = not current or current.source_state_at < state_at or current.is_stale
        return {
            "id": str(case.id), "title": case.title, "case_number": case.case_number,
            "client": _client_name(case), "court_stage": case.get_court_stage_display(),
            "practice_area": case.get_practice_area_display(),
            "assigned_advocate": case.assigned_lawyer.user.full_name if case.assigned_lawyer_id else None,
            "next_event": {"type": scored["next_event"].get_event_type_display(), "at": _iso(scored["next_event"].starts_at)} if scored["next_event"] else None,
            "next_deadline": {"title": scored["next_deadline"].title, "at": _iso(scored["next_deadline"].due_at)} if scored["next_deadline"] else None,
            "days_remaining": scored["days_remaining"], "priority": scored["priority"],
            "scores": scored["scores"], "priority_reasons": scored["reasons"]["overall_priority"] + scored["reasons"]["time_urgency"],
            "confidence": current.confidence if current else "LOW", "last_analyzed_at": _iso(current.analyzed_at) if current else None,
            "unresolved_recommendations": len(current.recommendations) if current else len(scored["gaps"]),
            "requires_reassessment": stale, "procedural_stage": case.court_stage,
        }

    @classmethod
    def list_priorities(cls, user, params):
        summaries = [cls.summary(case) for case in cls.authorized_cases(user)]
        for key in ("priority", "practice_area", "procedural_stage"):
            if params.get(key):
                summaries = [item for item in summaries if str(item.get(key, "")).upper() == params[key].upper()]
        if params.get("immediate") in {"1", "true", "True"}:
            summaries = [item for item in summaries if item["priority"] in {"CRITICAL", "HIGH"} or (item["days_remaining"] is not None and item["days_remaining"] <= 3)]
        if params.get("freshness") == "stale":
            summaries = [item for item in summaries if item["requires_reassessment"]]
        order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        sort = params.get("sort", "priority")
        if sort == "deadline":
            summaries.sort(key=lambda item: (item["days_remaining"] is None, item["days_remaining"] or 999999))
        elif sort == "preparedness":
            summaries.sort(key=lambda item: item["scores"]["overall_preparedness"])
        elif sort == "severity":
            summaries.sort(key=lambda item: -item["scores"]["consequence_severity"])
        else:
            summaries.sort(key=lambda item: (order[item["priority"]], item["days_remaining"] is None, item["days_remaining"] or 999999))
        return summaries

    @classmethod
    @transaction.atomic
    def generate(cls, user, case_id, document_ids=None):
        case = cls.authorized_cases(user).select_for_update().get(id=case_id)
        attachments = case.attachments.filter(id__in=document_ids) if document_ids is not None else case.attachments.none()
        scored = cls.score(case)
        previous = case.ai_assessments.order_by("-version").first()
        version = (previous.version if previous else 0) + 1
        from apps.ai.models import MatterOutcome
        comparable_count = MatterOutcome.objects.filter(
            case__firm=case.firm, case__practice_area=case.practice_area,
            quality_status=MatterOutcome.Quality.VERIFIED,
        ).exclude(case_id=case.id).count()
        comparable_data = {"sample_size": comparable_count, "selection_criteria": ["Same firm", "Same practice area", "Reliably recorded completed outcome"], "outcomes": [], "limitations": ["Sample is too small for outcome distribution."] if comparable_count < 5 else ["Internal records may be incomplete or historically biased."], "anonymized": True}
        provisions = LegalProvision.objects.filter(is_published=True, document__is_published=True)
        if case.case_type == Case.CaseType.CRIMINAL:
            provisions = provisions.filter(article_number__in=["49", "50"])
        elif case.case_type == Case.CaseType.CONSTITUTIONAL:
            provisions = provisions.filter(article_number__in=["22", "23", "47", "48", "50"])
        else:
            provisions = provisions.filter(article_number="48")
        provisions = list(provisions[:8])
        source_state = cls._state_at(case)
        assessment = AICaseAssessment.objects.create(
            case=case, version=version, requested_by=user, priority=scored["priority"],
            component_scores=scored["scores"], component_reasons=scored["reasons"], alerts=scored["alerts"], gaps=scored["gaps"],
            recommendations=[{"category": "IMMEDIATE", "action": gap["message"], "status": "OPEN", "support": gap["type"]} for gap in scored["gaps"]],
            preparedness={"overall": scored["scores"]["overall_preparedness"], "factual_completeness": 60 if case.description else 20, "documentary_support": scored["scores"]["evidence_readiness"], "legal_authority_support": scored["scores"]["legal_preparedness"], "procedural_compliance": 100 - scored["scores"]["procedural_risk"]},
            legal_analysis={"issues": [], "authorities": [{"title": item.document.title, "article": item.article_number, "heading": item.heading, "url": item.document.official_url, "last_verified_at": _iso(item.document.last_verified_at)} for item in provisions], "limitations": ["Legal issues and authorities require advocate verification."]},
            outcome_scenarios=[{"label": "Favourable scenario", "description": "A favourable result may be possible if the supported claims or defences are accepted.", "assumptions": ["Facts and authorities are independently verified."]}, {"label": "Adverse scenario", "description": "An adverse or procedural result remains possible if evidence or compliance gaps are material.", "assumptions": ["Identified gaps remain unresolved."]}],
            comparable_matters=comparable_data,
            case_snapshot={"title": case.title, "case_number": case.case_number, "client": _client_name(case), "court_stage": case.court_stage, "practice_area": case.practice_area, "forum": case.forum, "status": case.matter_status},
            proceeding_snapshot=[{"id": str(item.id), "type": item.get_event_type_display(), "scheduled_at": _iso(item.starts_at), "actual_at": _iso(item.actual_start), "court": item.court or item.court_station, "judicial_officer": item.judicial_officer, "outcome": item.outcome, "next_step": item.next_action, "next_date": _iso(item.next_date), "status": item.status, "verified": bool(item.verified_at)} for item in case.events.order_by("starts_at")],
            document_snapshot=[{"id": str(item.id), "title": item.title, "type": item.get_attachment_type_display(), "reference": item.document_reference, "selected": item.id in {doc.id for doc in attachments}, "authenticity_warning": "Presence in the system does not establish authenticity."} for item in case.attachments.all()],
            confidence="MEDIUM" if case.events.exists() and attachments.exists() else "LOW",
            limitations=["Only verified records and explicitly selected documents were assessed.", DISCLAIMER],
            model="deterministic-structured-assessment", model_version="structured-v1",
            prompt_version="case-assessment-v1", retrieval_version="knowledge-retrieval-v1",
            scoring_version="preparedness-v1", priority_version="priority-v1",
            knowledge_index_version=str(source_state.timestamp()),
            change_summary={"previous_version": previous.version if previous else None, "source_state_changed": bool(previous and previous.source_state_at != source_state)},
            analyzed_at=timezone.now(), source_state_at=source_state,
        )
        assessment.included_documents.set(attachments)
        assessment.retrieved_provisions.set(provisions)
        for document in attachments:
            DocumentAnalysisService.analyze(assessment, document)
        if previous:
            previous.is_stale = True
            previous.save(update_fields=("is_stale", "updated_at"))
        AIAssessmentAudit.objects.create(actor=user, case=case, assessment=assessment, action="GENERATE", document_ids=[str(item.id) for item in attachments], source_ids=[str(item.id) for item in provisions], provider="local", model=assessment.model, result_status="COMPLETED")
        return assessment
