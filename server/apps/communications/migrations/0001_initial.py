# Generated manually for communications app implementation.

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("firm", "0003_branch_branch_leader_department_head"),
        ("cases", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Announcement",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("body", models.TextField()),
                (
                    "audience_type",
                    models.CharField(
                        choices=[("ALL_STAFF", "All Staff"), ("TARGETED", "Targeted Staff")],
                        default="ALL_STAFF",
                        max_length=30,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_announcements",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "firm",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="announcements",
                        to="firm.lawfirm",
                    ),
                ),
            ],
            options={
                "db_table": "communication_announcements",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ChatThread",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "thread_type",
                    models.CharField(
                        choices=[
                            ("DIRECT_STAFF", "Admin Staff Direct Chat"),
                            ("CASE_CLIENT", "Case Client Communication"),
                        ],
                        max_length=30,
                    ),
                ),
                (
                    "thread_key",
                    models.CharField(
                        help_text="Stable unique key, for example direct_staff:<firm>:<admin>:<staff> or case_client:<case>.",
                        max_length=255,
                        unique=True,
                    ),
                ),
                ("subject", models.CharField(blank=True, default="", max_length=255)),
                ("last_message_at", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "case",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="communication_threads",
                        to="cases.case",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_chat_threads",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "firm",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chat_threads",
                        to="firm.lawfirm",
                    ),
                ),
            ],
            options={
                "db_table": "communication_chat_threads",
                "ordering": ["-last_message_at", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("body", models.TextField()),
                (
                    "message_type",
                    models.CharField(
                        choices=[("TEXT", "Text"), ("SYSTEM", "System")],
                        default="TEXT",
                        max_length=20,
                    ),
                ),
                ("is_system_message", models.BooleanField(default=False)),
                (
                    "sender",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sent_chat_messages",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "thread",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="communications.chatthread",
                    ),
                ),
            ],
            options={
                "db_table": "communication_chat_messages",
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="AnnouncementRecipient",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                (
                    "announcement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="recipients",
                        to="communications.announcement",
                    ),
                ),
                (
                    "recipient_user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="announcement_recipients",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "communication_announcement_recipients",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ChatThreadParticipant",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("can_reply", models.BooleanField(default=True)),
                ("last_read_at", models.DateTimeField(blank=True, null=True)),
                (
                    "thread",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="participants",
                        to="communications.chatthread",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chat_thread_participants",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "communication_chat_thread_participants",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="announcement",
            index=models.Index(fields=["firm", "audience_type"], name="communicati_firm_id_a8425d_idx"),
        ),
        migrations.AddIndex(
            model_name="announcement",
            index=models.Index(fields=["firm", "is_active"], name="communicati_firm_id_254e7b_idx"),
        ),
        migrations.AddIndex(
            model_name="chatthread",
            index=models.Index(fields=["firm", "thread_type"], name="communicati_firm_id_ae246c_idx"),
        ),
        migrations.AddIndex(
            model_name="chatthread",
            index=models.Index(fields=["firm", "is_active"], name="communicati_firm_id_c90cb9_idx"),
        ),
        migrations.AddIndex(
            model_name="chatthread",
            index=models.Index(fields=["case"], name="communicati_case_id_dca1e1_idx"),
        ),
        migrations.AddIndex(
            model_name="chatthread",
            index=models.Index(fields=["last_message_at"], name="communicati_last_me_c90030_idx"),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["thread", "created_at"], name="communicati_thread__8334d0_idx"),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["sender"], name="communicati_sender__19633f_idx"),
        ),
        migrations.AddConstraint(
            model_name="announcementrecipient",
            constraint=models.UniqueConstraint(
                fields=("announcement", "recipient_user"),
                name="unique_announcement_recipient",
            ),
        ),
        migrations.AddIndex(
            model_name="announcementrecipient",
            index=models.Index(fields=["recipient_user", "read_at"], name="communicati_recipie_69ef33_idx"),
        ),
        migrations.AddConstraint(
            model_name="chatthreadparticipant",
            constraint=models.UniqueConstraint(
                fields=("thread", "user"),
                name="unique_thread_participant",
            ),
        ),
        migrations.AddIndex(
            model_name="chatthreadparticipant",
            index=models.Index(fields=["user", "can_reply"], name="communicati_user_id_eeae9c_idx"),
        ),
    ]