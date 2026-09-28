import math
import re
from dataclasses import dataclass

from django.conf import settings
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db import connection
from django.db.models import Count, Max, Min

from apps.ai.models import KnowledgeBaseArticle, LegalProvision
from apps.ai.services.public_knowledge_service import PublicKnowledgeEligibility


TOKEN_RE = re.compile(r"[a-zA-ZÀ-ž0-9']{2,}")
STOP_WORDS = {
    "about", "after", "also", "and", "are", "can", "does", "for", "from",
    "have", "how", "kenya", "kenyan", "law", "legal", "the", "this", "what",
    "when", "where", "which", "with", "would", "your",
}


# Plain-English words people use, mapped to the words the Constitution uses.
QUERY_EXPANSIONS = {
    "data": ("information", "privacy"),
    "personal": ("privacy",),
    "arrested": ("arrest", "detained"),
    "arrest": ("arrested", "detained"),
    "police": ("arrested", "custody"),
    "hold": ("detained", "custody", "arrested"),
    "held": ("detained", "custody", "arrested"),
    "bail": ("bond", "release"),
    "vote": ("electoral", "election"),
    "voting": ("electoral", "election"),
    "elected": ("election", "electoral"),
    "land": ("property",),
    "job": ("labour",),
    "work": ("labour",),
    "worker": ("labour",),
    "employee": ("labour",),
    "discrimination": ("equality", "freedom"),
    "court": ("judicial", "judiciary"),
    "judge": ("judicial", "judiciary"),
    "county": ("devolved", "counties"),
    "citizen": ("citizenship",),
    "religion": ("belief", "conscience"),
    "speech": ("expression",),
    "protest": ("assembly", "demonstration", "picket"),
    "impeach": ("removal",),
    "impeachment": ("removal",),
    "long": ("time", "period"),
    "deadline": ("time", "period"),
    "magistrate": ("subordinate",),
    "magistrates": ("subordinate",),
    "notice": ("termination",),
    "sacked": ("termination", "dismissal"),
    "fired": ("termination", "dismissal"),
}
SUFFIXES = ("ations", "ation", "ments", "ment", "ings", "ing", "ions", "ion", "ies", "ied", "ers", "ed", "es", "er", "s")


def stem(token):
    for suffix in SUFFIXES:
        if token.endswith(suffix) and len(token) - len(suffix) >= 4:
            token = token[: -len(suffix)]
            break
    return token[:-1] if token.endswith("e") and len(token) > 4 else token


class ProvisionIndex:
    """BM25 ranking over published legal provisions; headings weigh three times the text."""

    K1 = 1.2
    B = 0.75
    HEADING_WEIGHT = 3
    # A question that restates most of a section heading is almost always asking about that section.
    HEADING_MATCH_BONUS = 0.5
    _cache = {"key": None, "index": None}

    def __init__(self, provisions):
        self.provisions = provisions
        self.documents = []
        self.headings = []
        frequencies = {}
        for provision in provisions:
            self.headings.append(set(self.terms(provision.heading)))
            heading = f"{provision.heading} {provision.chapter} {provision.part}"
            terms = self.terms(heading) * self.HEADING_WEIGHT + self.terms(provision.text)
            counts = {}
            for term in terms:
                counts[term] = counts.get(term, 0) + 1
            self.documents.append((counts, len(terms)))
            for term in counts:
                frequencies[term] = frequencies.get(term, 0) + 1
        total = max(len(self.documents), 1)
        self.average_length = sum(length for _, length in self.documents) / total if self.documents else 1
        self.idf = {term: math.log(1 + (total - count + 0.5) / (count + 0.5)) for term, count in frequencies.items()}

    @staticmethod
    def terms(text):
        return [stem(token) for token in TOKEN_RE.findall(text.lower()) if token not in STOP_WORDS]

    @classmethod
    def query_terms(cls, question):
        words = [token for token in TOKEN_RE.findall(question.lower()) if token not in STOP_WORDS]
        expanded = list(words)
        for word in words:
            expanded.extend(QUERY_EXPANSIONS.get(word, ()))
        return {stem(word) for word in expanded}

    @classmethod
    def current(cls):
        queryset = LegalProvision.objects.filter(is_published=True, document__is_published=True)
        state = queryset.aggregate(
            count=Count("id"), first=Min("created_at"), last=Max("updated_at"),
            latest=Max("document__imported_at"), checksum=Max("checksum"),
        )
        key = tuple(str(state[name]) for name in ("count", "first", "last", "latest", "checksum"))
        if cls._cache["key"] != key:
            cls._cache = {"key": key, "index": cls(list(queryset.select_related("document").order_by("display_order")))}
        return cls._cache["index"]

    def rank(self, question):
        terms = [term for term in self.query_terms(question) if term in self.idf]
        if not terms:
            return []
        # Score as a share of the best achievable score, so it is comparable with article relevance (0..1).
        ceiling = sum(self.idf[term] * (self.K1 + 1) for term in terms)
        query = set(terms)
        results = []
        for provision, (counts, length), heading in zip(self.provisions, self.documents, self.headings):
            score = 0.0
            for term in terms:
                frequency = counts.get(term, 0)
                if frequency:
                    norm = frequency + self.K1 * (1 - self.B + self.B * length / self.average_length)
                    score += self.idf[term] * frequency * (self.K1 + 1) / norm
            if score:
                score /= ceiling
                matched = len(heading & query)
                if matched >= 2:
                    score = min(1.0, score + self.HEADING_MATCH_BONUS * matched / len(heading))
                results.append((provision, score))
        results.sort(key=lambda pair: pair[1], reverse=True)
        return results


@dataclass(frozen=True)
class RetrievedArticle:
    article: KnowledgeBaseArticle
    score: float
    passage: str


@dataclass(frozen=True)
class RetrievedProvision:
    provision: LegalProvision
    score: float
    passage: str


class KnowledgeRetrievalService:
    @classmethod
    def firm_profile(cls, firm):
        """Return only the resolved tenant's approved public profile source."""
        if firm is None:
            return []
        return [RetrievedArticle(article, 1.0, article.body) for article in PublicKnowledgeEligibility.queryset(firm=firm).filter(category__is_active=True).select_related("category", "firm")]

    @staticmethod
    def _tokens(value):
        return {token for token in TOKEN_RE.findall(value.lower()) if token not in STOP_WORDS}

    @classmethod
    def _fallback_score(cls, question, article):
        query_tokens = cls._tokens(question)
        if not query_tokens:
            return 0.0
        title_tokens = cls._tokens(article.title)
        keyword_tokens = cls._tokens(article.keywords.replace(",", " "))
        content_tokens = cls._tokens(f"{article.summary} {article.body}")
        weighted_matches = (
            len(query_tokens & title_tokens) * 1.5
            + len(query_tokens & keyword_tokens) * 1.25
            + len(query_tokens & content_tokens)
        )
        return min(weighted_matches / max(len(query_tokens), 2), 1.0)

    @staticmethod
    def _passage(article, question, limit=1800):
        text = article.body.strip()
        if len(text) <= limit:
            return text
        query_tokens = KnowledgeRetrievalService._tokens(question)
        paragraphs = [part.strip() for part in text.split("\n") if part.strip()]
        ranked = sorted(
            paragraphs,
            key=lambda part: len(query_tokens & KnowledgeRetrievalService._tokens(part)),
            reverse=True,
        )
        return "\n".join(ranked[:3])[:limit]

    @staticmethod
    def _provisions(question, maximum, threshold):
        index = ProvisionIndex.current()
        cited = {
            number for number in re.findall(r"\barticles?\s+(\d{1,3})\b", question, re.I)
        }
        # "Article N" always means the Constitution; statutes are numbered by section.
        cited_provisions = {
            provision.id for provision in index.provisions
            if provision.article_number in cited and provision.unit_type != LegalProvision.UnitType.SECTION
        }
        provisions = [
            RetrievedProvision(provision, 1.0, provision.text[:1800])
            for provision in index.provisions if provision.id in cited_provisions
        ]
        provisions += [
            RetrievedProvision(provision, score, provision.text[:1800])
            for provision, score in index.rank(question)[: maximum * 2]
            if score >= threshold and provision.id not in cited_provisions
        ]
        return provisions

    @classmethod
    def retrieve_law(cls, question):
        """Published Kenyan legal provisions only, for the platform homepage assistant."""
        maximum = settings.KNOWLEDGE_BASE_MAX_CONTEXT_ITEMS
        provisions = cls._provisions(question, maximum, settings.KNOWLEDGE_BASE_MIN_RELEVANCE)
        return sorted(provisions, key=lambda item: item.score, reverse=True)[:maximum]

    @classmethod
    def retrieve(cls, question, section="home", *, firm):
        if firm is None:
            return []
        maximum = settings.KNOWLEDGE_BASE_MAX_CONTEXT_ITEMS
        threshold = settings.KNOWLEDGE_BASE_MIN_RELEVANCE
        queryset = PublicKnowledgeEligibility.queryset(firm=firm).filter(category__is_active=True).select_related("category", "firm")

        if connection.vendor == "postgresql":
            vector = (
                SearchVector("title", weight="A")
                + SearchVector("keywords", weight="A")
                + SearchVector("summary", weight="B")
                + SearchVector("body", weight="C")
            )
            query = SearchQuery(question, search_type="websearch")
            candidates = queryset.annotate(rank=SearchRank(vector, query)).filter(
                rank__gte=threshold
            ).order_by("-rank")[:maximum]
            articles = [
                RetrievedArticle(item, float(item.rank), cls._passage(item, question))
                for item in candidates
            ]
        else:
            scored = [(article, cls._fallback_score(question, article)) for article in queryset]
            scored.sort(key=lambda pair: pair[1], reverse=True)
            articles = [RetrievedArticle(article, score, cls._passage(article, question)) for article, score in scored[:maximum] if score >= threshold]

        provisions = cls._provisions(question, maximum, threshold)
        section_boost = {"about": "firm-services", "practice_areas": "firm-services", "consultation": "firm-services", "contact": "firm-services"}
        boosted = []
        for item in articles + provisions:
            score = item.score
            if hasattr(item, "article") and item.article.category.slug == section_boost.get(section):
                score = min(1.0, score + .12)
                item = RetrievedArticle(item.article, score, item.passage)
            boosted.append(item)
        return sorted(boosted, key=lambda item: item.score, reverse=True)[:maximum]
