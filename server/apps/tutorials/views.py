from django.db import transaction
from django.db.models import Q, Prefetch
from django.utils import timezone
from rest_framework import viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from apps.platform_admin.permissions import IsPlatformAdmin
from .models import Tutorial, TutorialCategory, TutorialProgress
from .access import visible_tutorials
from .serializers import TutorialSerializer, CategorySerializer, ChapterSerializer, ProgressSerializer


class Pagination(PageNumberPagination):
    page_size = 24




class ContentPermission(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.method in ('GET', 'HEAD', 'OPTIONS') or
            getattr(view, 'action', '') == 'progress' or IsPlatformAdmin().has_permission(request, view)
        )


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [ContentPermission]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    def get_queryset(self):
        if self.request.user.is_platform_admin:
            return TutorialCategory.objects.all()
        return TutorialCategory.objects.filter(is_active=True, tutorials__in=visible_tutorials(self.request.user)).distinct()


class TutorialViewSet(viewsets.ModelViewSet):
    serializer_class = TutorialSerializer
    permission_classes = [ContentPermission]
    pagination_class = Pagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        qs = Tutorial.objects.all() if user.is_platform_admin and self.request.query_params.get('manage') == '1' else visible_tutorials(user)
        qs = qs.select_related('category').prefetch_related('chapters', 'audiences', Prefetch('progress_records', queryset=TutorialProgress.objects.filter(user=user), to_attr='own_progress'))
        params = self.request.query_params
        if params.get('category'):
            category_id = serializers.UUIDField().run_validation(params['category'])
            qs = qs.filter(category_id=category_id)
        if params.get('feature'):
            qs = qs.filter(Q(feature=params['feature']) | Q(chapters__feature=params['feature']))
        if params.get('search'):
            term = params['search'][:200]
            qs = qs.filter(Q(title__icontains=term) | Q(description__icontains=term) | Q(category__name__icontains=term) | Q(chapters__title__icontains=term) | Q(feature__icontains=term) | Q(chapters__feature__icontains=term))
        return qs.distinct()

    @action(detail=False)
    def featured(self, request):
        return self._list(self.get_queryset().filter(featured=True))

    @action(detail=False)
    def recommended(self, request):
        return self._list(self.get_queryset().order_by('-featured', 'display_order', 'title'))

    @action(detail=False, url_path='progress')
    def recent_progress(self, request):
        return self._list(self.get_queryset().filter(progress_records__user=request.user).order_by('-progress_records__updated_at'))

    def _list(self, queryset):
        page = self.paginate_queryset(queryset)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    @action(detail=True)
    def chapters(self, request, pk=None):
        return Response(ChapterSerializer(self.get_object().chapters.all(), many=True).data)

    @action(detail=True, methods=['get', 'post', 'patch'])
    def progress(self, request, pk=None):
        tutorial = self.get_object()
        if request.method == 'GET':
            record = TutorialProgress.objects.filter(user=request.user, tutorial=tutorial).first()
            return Response(ProgressSerializer(record).data if record else None)
        class Input(serializers.Serializer):
            position = serializers.IntegerField(min_value=0)
            ranges = serializers.ListField(child=serializers.ListField(child=serializers.IntegerField(min_value=0), min_length=2, max_length=2), max_length=60, default=list)
        data = Input(data=request.data)
        data.is_valid(raise_exception=True)
        position, ranges = data.validated_data['position'], data.validated_data['ranges']
        if position > (tutorial.duration or 604800) or any(b <= a or b - a > 30 or (tutorial.duration and b > tutorial.duration) for a, b in ranges):
            raise serializers.ValidationError('Invalid playback position or watched interval.')
        with transaction.atomic():
            # Lock the identity row as well, serializing first-record creation.
            type(request.user).objects.select_for_update().get(pk=request.user.pk)
            record, _ = TutorialProgress.objects.get_or_create(user=request.user, tutorial=tutorial)
            # Limit client-reported activity to elapsed server time; seeking sends no ranges.
            elapsed = max(0, (timezone.now() - record.updated_at).total_seconds()) if record.watched_ranges else 30
            if sum(b-a for a,b in ranges) > min(120, elapsed * 2 + 5):
                raise serializers.ValidationError('Playback activity exceeds elapsed time.')
            merged = []
            for a, b in sorted(record.watched_ranges + ranges):
                if merged and a <= merged[-1][1]:
                    merged[-1][1] = max(b, merged[-1][1])
                else:
                    merged.append([a, b])
            if len(merged) > 10000:
                raise serializers.ValidationError('Too many playback intervals.')
            record.position = position
            record.watched_ranges = merged
            record.percentage = min(100, sum(b-a for a,b in merged) * 100 / tutorial.duration) if tutorial.duration else 0
            record.completed = bool(tutorial.duration and record.percentage >= 90)
            record.save()
        return Response(ProgressSerializer(record).data)
