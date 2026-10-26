"""Deterministic integration point for the existing assistant; no external AI calls."""
from django.db.models import Q
from .access import visible_tutorials


def recommend_tutorials(*, user, query, limit=5):
    term = str(query).strip()[:200]
    if not user.is_authenticated or not term:
        return []
    queryset = visible_tutorials(user).filter(
        Q(title__icontains=term) | Q(description__icontains=term) |
        Q(chapters__title__icontains=term) | Q(feature__icontains=term) |
        Q(chapters__feature__icontains=term)
    ).prefetch_related('chapters').distinct()[:max(1, min(limit, 10))]
    results = []
    for tutorial in queryset:
        chapter = next((c for c in tutorial.chapters.all() if term.lower() in c.title.lower() or term.lower() in c.feature.lower()), None)
        results.append({
            'tutorial_id': str(tutorial.pk), 'title': tutorial.title,
            'chapter_title': chapter.title if chapter else None,
            'timestamp': chapter.start if chapter else 0,
            # The frontend chooses the current role's workspace prefix.
            'relative_link': f'help/{tutorial.pk}?t={chapter.start if chapter else 0}',
        })
    return results
