import re
from dataclasses import dataclass

from django.conf import settings
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db import connection

from apps.ai.models import KnowledgeBaseArticle, LegalProvision
from apps.ai.services.public_knowledge_service import PublicKnowledgeEligibility


TOKEN_RE = re.compile(r"[a-zA-ZÀ-ž0-9']{2,}")
STOP_WORDS = {
    "about", "after", "also", "and", "are", "can", "does", "for", "from",
    "have", "how", "kenya", "kenyan", "law", "legal", "the", "this", "what",
    "when", "where", "which", "with", "would", "your",
}


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

        query_tokens = cls._tokens(question)
        provisions = []
        for provision in LegalProvision.objects.filter(is_published=True, document__is_published=True).select_related("document"):
            searchable = f"article {provision.article_number} {provision.heading} {provision.chapter} {provision.part} {provision.text}"
            tokens = cls._tokens(searchable)
            number_match = bool(provision.article_number and re.search(rf"\barticle\s+{re.escape(provision.article_number)}\b", question, re.I))
            score = 1.0 if number_match else min(len(query_tokens & tokens) / max(len(query_tokens), 2), 1.0)
            if score >= threshold:
                provisions.append(RetrievedProvision(provision, score, provision.text[:1800]))
        section_boost = {"about": "firm-services", "practice_areas": "firm-services", "consultation": "firm-services", "contact": "firm-services"}
        boosted = []
        for item in articles + provisions:
            score = item.score
            if hasattr(item, "article") and item.article.category.slug == section_boost.get(section):
                score = min(1.0, score + .12)
                item = RetrievedArticle(item.article, score, item.passage)
            boosted.append(item)
        return sorted(boosted, key=lambda item: item.score, reverse=True)[:maximum]
