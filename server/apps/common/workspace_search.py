"""Search across the signed-in person's own firm: its matters, clients and staff.

The search box in every workspace finds records only inside the firm the person is working in (a search opened in
Mutiso Advocates never shows another firm's records), and only the ones that person may already open from their
own pages: the firm owner sees the whole firm; an advocate, their own matters (found by the client's name too); a
secretary, the matters they support and the firm's clients; a client, their own matters.
"""

from functools import reduce
from operator import and_, or_

from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.services.case_service import CaseService
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.events.services import EventService
from apps.firm.models import LawFirmMember

LIMIT = 6
MIN_LENGTH = 2


def _matching(terms, fields):
    """Every word typed must appear in at least one of the fields."""
    return reduce(and_, (reduce(or_, (Q(**{f"{field}__icontains": term}) for field in fields)) for term in terms))


def _firm(user):
    try:
        return CaseService.get_user_firm(user)
    except PermissionError:  # a person with no firm (e.g. the platform team) has nothing to search here
        return None


def _is_owner(user, firm):
    return user.role == UserRole.ADMIN and firm.owner_id == user.id


def _clients(user, firm):
    clients = Client.objects.filter(firm=firm, is_active=True)
    if _is_owner(user, firm):
        return clients
    secretary = getattr(user, "secretary_profile", None)
    if secretary is not None and secretary.is_active and secretary.law_firm_id == firm.id:
        return clients
    # An advocate has no client pages of their own: their clients are found through the matters, by the client's name.
    return clients.none()


def search_firm(user, query):
    terms = [term for term in (query or "").split() if term]
    firm = _firm(user)
    if firm is None or len(" ".join(terms)) < MIN_LENGTH:
        return {"firm": firm.name if firm else "", "results": []}

    # The matters this person can open; already limited to their firm and their role.
    matters = EventService.scoped_cases(user)
    results = [
        {"kind": "matter", "id": str(case.pk), "title": case.title,
         "detail": " · ".join(part for part in [case.case_number, case.official_court_case_number, case.client.full_name] if part)}
        for case in matters.filter(_matching(terms, ["title", "case_number", "official_court_case_number", "client__full_name"]))
        .order_by("-updated_at")[:LIMIT]
    ]
    if not hasattr(user, "client_profile"):
        results += [
            {"kind": "client", "id": str(client.pk), "title": client.full_name,
             "detail": " · ".join(part for part in [client.kyc_drawer_reference, client.phone_number, client.email] if part)}
            for client in _clients(user, firm).filter(
                _matching(terms, ["full_name", "alternative_names", "email", "phone_number", "kyc_drawer_reference"]))
            .order_by("full_name")[:LIMIT]
        ]
    if _is_owner(user, firm):
        members = (LawFirmMember.objects.filter(firm=firm).exclude(user=user).select_related("user")
                   .filter(_matching(terms, ["user__first_name", "user__last_name", "user__email"])).order_by("user__first_name")[:LIMIT])
        results += [
            {"kind": "staff", "id": str(member.user_id), "role": member.role, "title": member.user.full_name or member.user.email,
             "detail": " · ".join(part for part in [member.get_role_display(), member.user.email, "" if member.is_active else "Inactive"] if part)}
            for member in members
        ]
    return {"firm": firm.name, "results": results}


class WorkspaceSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(search_firm(request.user, request.query_params.get("q", "")))
