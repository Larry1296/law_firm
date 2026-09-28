from django.db.models import Q

from apps.cases.models import MatterClosure
from apps.clients.models import ClientMatterConflictCheck
from apps.documents.models import DocumentRequest
from apps.staff.models import LawyerPermission

FINAL_CONFLICT_STATUSES = ["CONFLICT_CONFIRMED", "CLOSED_WITHOUT_DECISION"]


class LawyerApprovalService:
    """Decisions waiting on this advocate, each linked to the page where it is made."""

    @staticmethod
    def list_approvals(user):
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer is None:
            raise ValueError("Only lawyers can access this endpoint.")
        firm = lawyer.law_firm
        items = []

        checks = (
            ClientMatterConflictCheck.objects.filter(firm=firm)
            .filter(Q(responsible_lawyer=lawyer) | Q(review_assigned_to=lawyer))
            .exclude(status__in=FINAL_CONFLICT_STATUSES)
            .exclude(status="CLEARED", acceptance_decision__in=["ACCEPTED", "DECLINED", "CLIENT_WITHDREW"])
            .select_related("client")
            .order_by("created_at")
        )
        for check in checks:
            awaiting_acceptance = check.status == "CLEARED"
            items.append({
                "id": f"conflict-{check.id}",
                "kind": "INSTRUCTIONS" if awaiting_acceptance else "CONFLICT_CHECK",
                "title": ("Accept or decline instructions" if awaiting_acceptance else "Conflict check decision")
                + f": {check.proposed_matter_title}",
                "subtitle": f"{check.client.full_name} · {check.reference_number} · {check.get_status_display()}",
                "created_at": check.created_at,
                "link": f"/lawyer/clients/{check.client_id}/conflict-checks/{check.id}",
            })

        uploads = (
            DocumentRequest.objects.filter(firm=firm, case__assigned_lawyer=lawyer, status=DocumentRequest.Status.UPLOADED)
            .select_related("case", "client")
            .order_by("updated_at")
        )
        for request in uploads:
            items.append({
                "id": f"document-{request.id}",
                "kind": "CLIENT_DOCUMENT",
                "title": f"Review client document: {request.title}",
                "subtitle": f"{request.client.full_name} · {request.case.case_number} · verified by the secretary",
                "created_at": request.updated_at,
                "link": "/lawyer/documents",
            })

        if lawyer.has_permission(LawyerPermission.APPROVE_MATTER_CLOSURE):
            closures = (
                MatterClosure.objects.filter(firm=firm, status=MatterClosure.Status.PENDING_APPROVAL)
                .select_related("matter", "matter__client")
                .order_by("created_at")
            )
            for closure in closures:
                items.append({
                    "id": f"closure-{closure.id}",
                    "kind": "MATTER_CLOSURE",
                    "title": f"Approve closure: {closure.matter.case_number}",
                    "subtitle": f"{closure.matter.client.full_name} · {closure.matter.title}",
                    "created_at": closure.created_at,
                    "link": f"/lawyer/cases/{closure.matter_id}",
                })
        return items
