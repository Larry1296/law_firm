import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class Court(TimestampedModel):
    """Canonical directory of Kenyan courts, tribunals and court stations."""

    class CourtType(models.TextChoices):
        SUPREME_COURT = "SUPREME_COURT", "Supreme Court"
        COURT_OF_APPEAL = "COURT_OF_APPEAL", "Court of Appeal"
        HIGH_COURT = "HIGH_COURT", "High Court"
        ELC = "ELC", "Environment and Land Court"
        ELRC = "ELRC", "Employment and Labour Relations Court"
        MAGISTRATES_COURT = "MAGISTRATES_COURT", "Magistrates' Court"
        KADHIS_COURT = "KADHIS_COURT", "Kadhis' Court"
        SMALL_CLAIMS_COURT = "SMALL_CLAIMS_COURT", "Small Claims Court"
        COURTS_MARTIAL = "COURTS_MARTIAL", "Courts Martial"
        TRIBUNAL = "TRIBUNAL", "Tribunal"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        TEMPORARILY_CLOSED = "TEMPORARILY_CLOSED", "Temporarily closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    court_type = models.CharField(max_length=32, choices=CourtType.choices, db_index=True)
    level = models.PositiveSmallIntegerField(
        help_text="Hierarchy level where 1 is the apex court; specialist/subordinate bodies use later levels."
    )
    county = models.CharField(max_length=100, db_index=True)
    station = models.CharField(max_length=160, db_index=True)
    address = models.TextField(blank=True, default="")
    jurisdiction = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=40, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    website = models.URLField(max_length=500, blank=True, default="")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.ACTIVE, db_index=True)

    class Meta:
        db_table = "kenyan_courts"
        ordering = ["level", "county", "station", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "county", "station"],
                name="unique_kenyan_court_station",
            ),
            models.CheckConstraint(condition=models.Q(level__gte=1), name="court_level_positive"),
        ]
        indexes = [
            models.Index(fields=["court_type", "status"]),
            models.Index(fields=["county", "status"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.station}"
