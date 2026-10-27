"""
The firm's conflict search.

Every proposed matter is searched against the firm's register: its clients,
matters and their parties, the parties of earlier proposed matters, its own
staff, and matches advocates found in records kept outside the system. Names
are compared the way Kenyan names vary in practice: Ltd or Limited, (K),
reversed order, initials and small misspellings. When the firm allows it, an AI
service also reviews near-misses and reads the facts for people not yet listed
as parties. The AI can add possible matches but never removes one.

A firm whose records are all in the system is searched automatically. A firm
that also keeps outside records confirms each source in a guided checklist;
after enough guided checks in a row in which the advocate found nothing the
system had missed, its searches become automatic too.
"""
import difflib
import json
import logging
import re
from dataclasses import dataclass

from django.utils import timezone

from apps.common.choices import ConflictCheckSourceCategory as Source

from .identity_names import client_identity_names, identity_names_by_client

logger = logging.getLogger(__name__)

GUIDED_CHECKS_TO_AUTOMATIC = 25

# The sources an advocate confirms one by one in a guided check, with what to look at in each.
GUIDED_SOURCES = [
    (Source.CURRENT_CLIENTS, "Current clients, including any client file or register kept outside this system."),
    (Source.FORMER_CLIENTS, "Former clients, including archived files and old client registers."),
    (Source.PROSPECTIVE_CLIENTS, "People who consulted the firm without instructing it, including the visitors' and consultation books."),
    (Source.OPEN_MATTERS, "Running matters and the parties on the other side, including the matter register and diary."),
    (Source.CLOSED_MATTERS, "Closed and archived matters and their opposing parties."),
    (Source.RELATED_PARTIES, "Directors, shareholders, guarantors and others connected to earlier instructions."),
    (Source.FIRM_ADVOCATES_AND_STAFF, "The firm's advocates and staff, and their family or business interests where known."),
]
GUIDED_SOURCE_VALUES = [source for source, _ in GUIDED_SOURCES]

# Which side of the firm a name stands on. A match across sides, or with a neutral
# party, is a conflict risk; a match on the same side is shown for information.
FIRM_SIDE, OPPOSING_SIDE, NEUTRAL = "FIRM", "OPPOSING", "NEUTRAL"
_OPPOSING_ROLES = {"PROPOSED_ADVERSE_PARTY", "CO_RESPONDENT", "DIRECTOR", "SHAREHOLDER", "BENEFICIAL_OWNER",
                   "GUARANTOR", "RELATED_ENTITY"}
_FIRM_ROLES = {"PROSPECTIVE_CLIENT", "CO_CLAIMANT"}
_ADVERSARIAL_CASE_ROLES = {"PLAINTIFF", "DEFENDANT", "PETITIONER", "RESPONDENT", "APPLICANT", "APPELLANT", "ACCUSED",
                           "COMPLAINANT", "CLAIMANT", "OBJECTOR", "LANDLORD", "TENANT", "TAXPAYER", "COMMISSIONER",
                           "PROSECUTION", "EX_PARTE_APPLICANT"}


def party_side(role):
    if role in _FIRM_ROLES:
        return FIRM_SIDE
    if role in _OPPOSING_ROLES:
        return OPPOSING_SIDE
    return NEUTRAL


def is_conflict_risk(searched_side, record_side):
    return NEUTRAL in (searched_side, record_side) or searched_side != record_side

_TITLES = {"mr", "mrs", "ms", "miss", "dr", "hon", "prof", "eng", "adv", "sir", "madam", "rev", "fr"}
_ENTITY_WORDS = {"ltd", "limited", "plc", "llp", "llc", "inc", "co", "company", "corp", "corporation", "the", "and"}


def name_tokens(value):
    """The words that identify a name, without titles, punctuation or company suffixes."""
    text = str(value or "").lower().replace("&", " and ")
    text = re.sub(r"\(\s*k\s*\)", " ", text)  # "(K) Ltd" is the Kenyan registration of the same company
    text = re.sub(r"[^\w\s]", " ", text)
    return [word for word in text.split() if word not in _TITLES and word not in _ENTITY_WORDS]


def _initials_match(first, second):
    """True when one name abbreviates the other, as in "J. Otieno" and "James Otieno"."""
    for short, long in ((first, second), (second, first)):
        initials = [word for word in short if len(word) == 1]
        words = [word for word in short if len(word) > 1]
        if not initials or not words:
            continue
        remaining = list(long)
        if not all(word in remaining for word in words):
            continue
        for word in words:
            remaining.remove(word)
        matched = True
        for initial in initials:
            expanded = next((word for word in remaining if word.startswith(initial)), None)
            if expanded is None:
                matched = False
                break
            remaining.remove(expanded)
        if matched:
            return True
    return False


def _similar_spelling(first, second):
    """True when every word of two equally long names is spelled almost the same."""
    if len(first) != len(second):
        return False
    remaining = list(second)
    for word in first:
        best = max(remaining, key=lambda other: difflib.SequenceMatcher(None, word, other).ratio())
        if len(word) < 4 or difflib.SequenceMatcher(None, word, best).ratio() < 0.85:
            return False
        remaining.remove(best)
    return True


def compare_names(searched, candidate):
    """Why two names may be the same person or organisation, or None."""
    first, second = name_tokens(searched), name_tokens(candidate)
    if not first or not second:
        return None
    if set(first) == set(second):
        return "Same name"
    if min(len(set(first)), len(set(second))) >= 2 and (set(first) <= set(second) or set(second) <= set(first)):
        return "One name contains the other"
    if len(first) >= 2 and len(second) >= 2 and _initials_match(first, second):
        return "Initials match"
    if _similar_spelling(first, second):
        return "Similar spelling"
    return None


def _named_in_text(searched, text):
    """True when a name of two or more words appears in free text such as a matter title."""
    words = name_tokens(searched)
    haystack = name_tokens(text)
    if len(words) < 2:
        return False
    return any(haystack[index:index + len(words)] == words for index in range(len(haystack) - len(words) + 1))


@dataclass
class RegisterRecord:
    source: str
    name: str
    relationship: str
    reference: str
    record_type: str
    record_id: str
    client_id: str = ""
    free_text: bool = False
    side: str = NEUTRAL


def _client_source(client):
    from apps.clients.models import Client

    if not client.is_active or client.lifecycle_status == Client.LifecycleStatus.ARCHIVED:
        return Source.FORMER_CLIENTS
    if client.lifecycle_status in {Client.LifecycleStatus.PROSPECTIVE, Client.LifecycleStatus.PROSPECT}:
        return Source.PROSPECTIVE_CLIENTS
    return Source.CURRENT_CLIENTS


def build_register(check):
    """Every name the firm has a relationship with, except this proposed matter's own."""
    from apps.cases.models import Case
    from apps.cases.models.case_party import CaseParty
    from apps.clients.models import Client, ClientMatterConflictCheck, ConflictCheckParty, ConflictSourceReview
    from apps.staff.models import HR, IT, Accountant, Lawyer, Secretary

    firm = check.firm
    records = []
    client_labels = {Source.CURRENT_CLIENTS: "Current client", Source.FORMER_CLIENTS: "Former client",
                     Source.PROSPECTIVE_CLIENTS: "Prospective client"}

    clients = list(Client.objects.filter(firm=firm).exclude(id=check.client_id))
    names_by_client = identity_names_by_client(clients)
    for client in clients:
        source = _client_source(client)
        reference = client.kyc_drawer_reference or client.full_name
        for name in names_by_client[client.id]:
            relationship = client_labels[source] if name == client.full_name else f"Named for client {client.full_name}"
            records.append(RegisterRecord(source, name, relationship, reference, "client", str(client.id), str(client.id),
                                          side=FIRM_SIDE))

    role_labels = dict(CaseParty.PartyRole.choices)
    for matter in Case.objects.filter(firm=firm).select_related("client").prefetch_related("parties"):
        source = Source.CLOSED_MATTERS if matter.matter_status == Case.MatterStatus.CLOSED else Source.OPEN_MATTERS
        client_id = str(matter.client_id or "")
        client_name = matter.client.full_name if matter.client_id else ""
        for party in matter.parties.all():
            if party.client_id and party.client_id == check.client_id:
                continue
            if party.client_id or (client_name and compare_names(party.name, client_name)):
                side = FIRM_SIDE
            else:
                side = OPPOSING_SIDE if party.party_role in _ADVERSARIAL_CASE_ROLES else NEUTRAL
            records.append(RegisterRecord(source, party.name, f"{role_labels.get(party.party_role, 'Party')} in matter {matter.case_number}",
                                          matter.case_number, "matter", str(matter.id), client_id, side=side))
        for label, name in (("Plaintiff", matter.plaintiff), ("Defendant", matter.defendant)):
            if name:
                side = FIRM_SIDE if client_name and compare_names(name, client_name) else OPPOSING_SIDE
                records.append(RegisterRecord(source, name, f"{label} in matter {matter.case_number}",
                                              matter.case_number, "matter", str(matter.id), client_id, side=side))
        records.append(RegisterRecord(source, matter.title, f"Named in the title of matter {matter.case_number}",
                                      matter.case_number, "matter", str(matter.id), client_id, free_text=True))

    for earlier in ClientMatterConflictCheck.objects.filter(firm=firm).exclude(id=check.id):
        relationship = f"Named in proposed matter {earlier.reference_number} ({earlier.get_status_display()})"
        for text in (earlier.proposed_matter_title, earlier.proposed_instructions, earlier.factual_summary):
            if text:
                records.append(RegisterRecord(Source.PROSPECTIVE_CLIENTS, text, relationship, earlier.reference_number,
                                              "proposed_matter", str(earlier.id), str(earlier.client_id), free_text=True))

    check_role_labels = dict(ConflictCheckParty.PartyRole.choices)
    parties = (ConflictCheckParty.objects.filter(conflict_check__firm=firm).exclude(conflict_check=check)
               .exclude(role=ConflictCheckParty.PartyRole.PROSPECTIVE_CLIENT).select_related("conflict_check"))
    for party in parties:
        earlier = party.conflict_check
        relationship = f"{check_role_labels.get(party.role, 'Party')} in proposed matter {earlier.reference_number} ({earlier.get_status_display()})"
        for name in [party.name, *(party.aliases or [])]:
            records.append(RegisterRecord(Source.RELATED_PARTIES, name, relationship, earlier.reference_number,
                                          "conflict_party", str(party.id), str(earlier.client_id), side=party_side(party.role)))

    staff_models = ((Lawyer, "Advocate of the firm"), (Secretary, "Staff member of the firm"), (HR, "Staff member of the firm"),
                    (IT, "Staff member of the firm"), (Accountant, "Staff member of the firm"))
    for model, relationship in staff_models:
        for member in model.objects.filter(law_firm=firm).select_related("user"):
            records.append(RegisterRecord(Source.FIRM_ADVOCATES_AND_STAFF, member.user.full_name, relationship,
                                          getattr(member, "staff_number", "") or member.user.full_name, "staff", str(member.user_id),
                                          side=FIRM_SIDE))

    findings = (ConflictSourceReview.objects.filter(conflict_check__firm=firm, outcome=ConflictSourceReview.Outcome.MATCH_FOUND)
                .exclude(conflict_check=check).select_related("conflict_check"))
    for finding in findings:
        records.append(RegisterRecord(finding.source, finding.matched_name,
                                      f"{finding.relationship_to_firm} (found in records outside the system during {finding.conflict_check.reference_number})",
                                      finding.conflict_check.reference_number, "outside_record", str(finding.id)))
    return [record for record in records if record.name and record.name.strip()]


def searched_names(check):
    """The client's names and every party's names and aliases, each with the role it is searched for."""
    from apps.clients.models import ConflictCheckParty

    role_labels = dict(ConflictCheckParty.PartyRole.choices)
    names = [{"name": name, "role": "Prospective client", "is_client": True, "side": FIRM_SIDE}
             for name in client_identity_names(check.client)]
    for party in check.parties.exclude(role=ConflictCheckParty.PartyRole.PROSPECTIVE_CLIENT):
        for name in [party.name, *(party.aliases or [])]:
            names.append({"name": name, "role": role_labels.get(party.role, "Party"), "is_client": False,
                          "side": party_side(party.role)})
    seen, unique = set(), []
    for item in names:
        key = " ".join(name_tokens(item["name"]))
        if key and key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


def _firm_setting(firm):
    from apps.firm.models import FirmSetting

    return FirmSetting.objects.filter(firm=firm).first()


def _ai_settings(firm):
    from apps.ai.services.llm_provider import configured_provider

    setting = _firm_setting(firm)
    enabled = bool(setting and setting.conflict_ai_matching_enabled)
    provider = configured_provider() if enabled else None
    return enabled, provider


def _ai_review(check, names, records, matched):
    """Near-matches the rules missed, and people the facts mention who are not parties."""
    from apps.ai.services.llm_provider import AIProviderUnavailable, complete_json

    candidates = []
    for index, record in enumerate(records):
        if record.free_text or index in matched:
            continue
        candidate_words = " ".join(sorted(name_tokens(record.name)))
        closeness = max((difflib.SequenceMatcher(None, " ".join(sorted(name_tokens(item["name"]))), candidate_words).ratio()
                         for item in names), default=0)
        if closeness >= 0.6:
            candidates.append((closeness, index))
    candidates = [index for _, index in sorted(candidates, reverse=True)[:40]]
    facts = "\n".join(part for part in (check.proposed_instructions, check.factual_summary) if part)
    if not candidates and not facts:
        return [], []
    instructions = (
        "You help a Kenyan advocate run a conflict of interest search. Decide which candidate records name the same "
        "person or organisation as a searched name, allowing for Kenyan naming: names in any order, initials, "
        "Ltd/Limited/(K), common misspellings and Swahili or English forms. Only pair names that plausibly refer to the "
        "same person or organisation. Then list people or organisations the facts mention who are not among the "
        "searched names and would need a conflict search (opponents, their directors, guarantors, co-parties). "
        'Answer with JSON only: {"matches": [{"searched_name": str, "candidate_id": int, "reason": str}], '
        '"unlisted_parties": [{"name": str, "mentioned_as": str}]}'
    )
    prompt = json.dumps({
        "searched_names": [item["name"] for item in names],
        "candidates": [{"id": index, "name": records[index].name} for index in candidates],
        "facts": facts[:4000],
    })
    try:
        payload, _ = complete_json(instructions, prompt, max_tokens=900)
    except AIProviderUnavailable:
        logger.info("AI conflict review unavailable for proposed matter %s", check.id)
        return None, None

    searched = {item["name"] for item in names}
    ai_matches = []
    for item in payload.get("matches") or []:
        index = item.get("candidate_id")
        if isinstance(index, int) and index in candidates and item.get("searched_name") in searched:
            ai_matches.append((item["searched_name"], index, str(item.get("reason") or "Likely the same name")[:200]))
    known = {" ".join(sorted(name_tokens(item["name"]))) for item in names}
    unlisted = []
    for item in payload.get("unlisted_parties") or []:
        name = str(item.get("name") or "").strip()[:255]
        key = " ".join(sorted(name_tokens(name)))
        if key and key not in known:
            known.add(key)
            unlisted.append({"name": name, "mentioned_as": str(item.get("mentioned_as") or "")[:200]})
    return ai_matches, unlisted[:10]


def _match(item, record, reason, found_by):
    # A match an advocate recorded from outside records is always reviewed.
    risk = record.record_type == "outside_record" or is_conflict_risk(item["side"], record.side)
    return {
        "searched_name": item["name"], "searched_role": item["role"], "matched_name": record.name,
        "source": record.source, "relationship": record.relationship, "reference": record.reference,
        "record_type": record.record_type, "record_id": record.record_id, "reason": reason, "found_by": found_by,
        "conflict_risk": risk,
    }


def search_mode(firm):
    """Automatic or guided, and how far a guided firm is from automatic searches."""
    setting = _firm_setting(firm)
    scope = getattr(setting, "conflict_records_scope", "ALL_IN_SYSTEM") or "ALL_IN_SYSTEM"
    if scope == "ALL_IN_SYSTEM":
        return {"mode": "AUTOMATIC", "reason": "ALL_RECORDS_IN_SYSTEM", "clean_streak": None, "required": GUIDED_CHECKS_TO_AUTOMATIC}
    streak = clean_guided_streak(firm)
    learned = streak >= GUIDED_CHECKS_TO_AUTOMATIC
    return {
        "mode": "AUTOMATIC" if learned else "GUIDED",
        "reason": "LEARNED_FROM_GUIDED_CHECKS" if learned else "OUTSIDE_RECORDS",
        "clean_streak": min(streak, GUIDED_CHECKS_TO_AUTOMATIC),
        "required": GUIDED_CHECKS_TO_AUTOMATIC,
    }


def clean_guided_streak(firm):
    """Completed guided checks in a row, most recent first, where the advocate found nothing the system missed."""
    from apps.clients.models import ClientMatterConflictCheck

    checks = (ClientMatterConflictCheck.objects.filter(firm=firm, decided_at__isnull=False, source_reviews__isnull=False)
              .distinct().order_by("-decided_at").prefetch_related("source_reviews"))
    streak = 0
    for check in checks:
        reviews = list(check.source_reviews.all())
        if any(review.missed_by_system for review in reviews):
            break
        if {review.source for review in reviews} >= set(GUIDED_SOURCE_VALUES):
            streak += 1
        if streak >= GUIDED_CHECKS_TO_AUTOMATIC:
            break
    return streak


def run(check):
    """Search the proposed matter's names against the firm register; the result is stored on the check."""
    names = searched_names(check)
    records = build_register(check)
    matches, matched_records, matched = [], [], set()
    for index, record in enumerate(records):
        for item in names:
            if item["is_client"] and record.client_id and record.client_id == str(check.client_id):
                continue
            if record.free_text:
                reason = "Named in the record" if _named_in_text(item["name"], record.name) else None
            else:
                reason = compare_names(item["name"], record.name)
            if reason:
                matches.append(_match(item, record, reason, "SYSTEM"))
                matched_records.append(record)
                matched.add(index)

    # A name found in a title or the facts adds nothing when the same record lists it as a party.
    structured = {(match["searched_name"], match["reference"]) for match, record in zip(matches, matched_records) if not record.free_text}
    matches = [match for match, record in zip(matches, matched_records)
               if not record.free_text or (match["searched_name"], match["reference"]) not in structured]

    ai_enabled, provider = _ai_settings(check.firm)
    ai = {"enabled": ai_enabled, "used": False, "provider": ""}
    unlisted = []
    if provider:
        ai_matches, ai_unlisted = _ai_review(check, names, records, matched)
        if ai_matches is not None:
            ai.update(used=True, provider=provider.name)
            by_name = {item["name"]: item for item in names}
            for searched_name, index, reason in ai_matches:
                matches.append(_match(by_name[searched_name], records[index], reason, "AI"))
            unlisted = ai_unlisted

    mode = search_mode(check.firm)
    return {
        **mode,
        "ran_at": timezone.now().isoformat(),
        "names_searched": [{"name": item["name"], "role": item["role"]} for item in names],
        "sources_searched": [value for value in Source.values if value != Source.OTHER],
        "record_count": len({(record.record_type, record.record_id) for record in records}),
        "matches": matches,
        "unlisted_parties": unlisted,
        "ai": ai,
    }
