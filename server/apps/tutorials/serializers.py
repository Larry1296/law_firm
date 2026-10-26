import re
from urllib.parse import urlparse, parse_qs
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import Tutorial, TutorialCategory, TutorialChapter, TutorialAudience, TutorialProgress


def normalize_video(provider, value):
    if provider == 'youtube':
        if re.fullmatch(r'[A-Za-z0-9_-]{11}', value):
            return value
        url = urlparse(value)
        if url.scheme != 'https' or url.username or url.password or url.port:
            raise serializers.ValidationError('Use an HTTPS YouTube URL or video ID.')
        host = url.hostname
        candidate = ''
        if host == 'youtu.be':
            candidate = url.path.strip('/')
        elif host in ('youtube.com', 'www.youtube.com', 'm.youtube.com'):
            if url.path == '/watch':
                candidate = parse_qs(url.query).get('v', [''])[0]
            elif url.path.startswith(('/embed/', '/shorts/')):
                candidate = url.path.split('/')[-1]
        if re.fullmatch(r'[A-Za-z0-9_-]{11}', candidate):
            return candidate
        raise serializers.ValidationError('Unsupported YouTube video reference.')
    url = urlparse(value)
    if url.scheme != 'https' or url.username or url.password or url.port or url.hostname not in getattr(settings, 'TUTORIAL_VIDEO_HOSTS', []):
        raise serializers.ValidationError('Video host is not approved.')
    return value

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialCategory
        fields = '__all__'

class ChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialChapter
        exclude = ['tutorial', 'created_at', 'updated_at']

class AudienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialAudience
        fields = ['role', 'firm_role']
        validators = []
    def validate(self, attrs):
        if not attrs.get('role') and not attrs.get('firm_role'):
            raise serializers.ValidationError('Choose a user role or firm role.')
        return attrs

class ProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialProgress
        fields = ['tutorial', 'position', 'percentage', 'completed', 'updated_at']

class TutorialSerializer(serializers.ModelSerializer):
    chapters = ChapterSerializer(many=True, required=False)
    audiences = AudienceSerializer(many=True, required=False)
    category_name = serializers.CharField(source='category.name', read_only=True)
    progress = serializers.SerializerMethodField()
    def get_progress(self, obj):
        records = getattr(obj, 'own_progress', [])
        return ProgressSerializer(records[0]).data if records else None
    class Meta:
        model = Tutorial
        fields = '__all__'
        read_only_fields = ['published_at', 'created_at', 'updated_at']
    def validate(self, attrs):
        provider = attrs.get('provider', getattr(self.instance, 'provider', 'youtube'))
        reference = attrs.get('video_reference', getattr(self.instance, 'video_reference', ''))
        try:
            attrs['video_reference'] = normalize_video(provider, reference)
        except ValueError:
            raise serializers.ValidationError({'video_reference': 'Invalid video URL.'})
        if attrs.get('thumbnail') and not attrs['thumbnail'].startswith('https://'):
            raise serializers.ValidationError({'thumbnail': 'Use an HTTPS thumbnail URL.'})
        duration = attrs.get('duration', getattr(self.instance, 'duration', 0))
        chapters = attrs.get('chapters')
        if chapters is None:
            chapters = list(self.instance.chapters.values()) if self.instance else []
        audiences = attrs.get('audiences', [])
        audience_keys = [(a.get('role', ''), a.get('firm_role', '')) for a in audiences]
        if len(set(audience_keys)) != len(audience_keys):
            raise serializers.ValidationError({'audiences': 'Remove duplicate audience rules.'})
        previous = -1
        previous_end = None
        for chapter in sorted(chapters, key=lambda c: c.get('display_order', 0)):
            start, end = chapter['start'], chapter.get('end')
            if start <= previous or (previous_end is not None and start < previous_end) or (end is not None and end <= start) or (duration and (start >= duration or (end is not None and end > duration))):
                raise serializers.ValidationError({'chapters': 'Chapters must increase in display order, with valid ends within the video duration.'})
            previous = start
            previous_end = end
        return attrs
    @transaction.atomic
    def create(self, validated_data):
        return self._save(None, validated_data)
    @transaction.atomic
    def update(self, instance, validated_data):
        return self._save(instance, validated_data)
    def _save(self, instance, data):
        chapters = data.pop('chapters', None)
        audiences = data.pop('audiences', None)
        if data.get('status') == 'published' and (not instance or instance.status != 'published'):
            data['published_at'] = timezone.now()
        if instance:
            changed_video = any(data.get(k, getattr(instance, k)) != getattr(instance, k) for k in ('provider', 'video_reference'))
            for key, value in data.items():
                setattr(instance, key, value)
            instance.save()
            if changed_video:
                instance.progress_records.all().delete()
                instance.own_progress = []
        else:
            instance = Tutorial.objects.create(**data)
        for name, values, model in [('chapters', chapters, TutorialChapter), ('audiences', audiences, TutorialAudience)]:
            if values is not None:
                getattr(instance, name).all().delete()
                model.objects.bulk_create([model(tutorial=instance, **value) for value in values])
        return instance
