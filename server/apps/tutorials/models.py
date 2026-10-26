import uuid
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError
from apps.common.models.timestamped_model import TimestampedModel
from apps.common.choices import UserRole, FirmRole

class Base(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class Meta:
        abstract = True

class TutorialCategory(Base):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    class Meta:
        ordering = ['display_order', 'name']

class Tutorial(Base):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(TutorialCategory, on_delete=models.PROTECT, related_name='tutorials')
    provider = models.CharField(max_length=20, choices=[('youtube', 'YouTube'), ('html5', 'HTML5')], default='youtube')
    video_reference = models.CharField(max_length=1000)
    thumbnail = models.URLField(blank=True)
    duration = models.PositiveIntegerField(default=0)
    tutorial_type = models.CharField(max_length=20, choices=[('complete', 'Complete guide'), ('feature', 'Feature guide')], default='feature')
    status = models.CharField(max_length=20, choices=[('draft', 'Draft'), ('published', 'Published'), ('archived', 'Archived')], default='draft', db_index=True)
    featured = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)
    feature = models.SlugField(blank=True, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        ordering = ['display_order', 'title']

class TutorialChapter(Base):
    tutorial = models.ForeignKey(Tutorial, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start = models.PositiveIntegerField()
    end = models.PositiveIntegerField(null=True, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    feature = models.SlugField(blank=True)
    def clean(self):
        super().clean()
        if self.start is None or self.start < 0 or (self.end is not None and self.end <= self.start):
            raise ValidationError('Invalid chapter timestamp interval.')
        if self.tutorial_id and self.tutorial.duration and (self.start >= self.tutorial.duration or (self.end is not None and self.end > self.tutorial.duration)):
            raise ValidationError('Chapter exceeds the known video duration.')

    class Meta:
        ordering = ['display_order', 'start']
        constraints = [models.UniqueConstraint(fields=['tutorial', 'start'], name='tutorial_unique_chapter_start')]

class TutorialAudience(Base):
    tutorial = models.ForeignKey(Tutorial, on_delete=models.CASCADE, related_name='audiences')
    role = models.CharField(max_length=30, choices=UserRole.choices, blank=True)
    firm_role = models.CharField(max_length=30, choices=FirmRole.choices, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['tutorial', 'role', 'firm_role'], name='tutorial_unique_audience')]

class TutorialProgress(Base):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tutorial = models.ForeignKey(Tutorial, on_delete=models.CASCADE, related_name='progress_records')
    position = models.PositiveIntegerField(default=0)
    watched_ranges = models.JSONField(default=list)
    percentage = models.FloatField(default=0)
    completed = models.BooleanField(default=False)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['user', 'tutorial'], name='tutorial_unique_user_progress')]
        indexes = [models.Index(fields=['user', '-updated_at'])]
