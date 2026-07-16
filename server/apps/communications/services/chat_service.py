from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.cases.models import Case
from apps.common.choices import FirmRole, UserRole
from apps.communications.choices import ChatMessageType, ChatThreadType
from apps.communications.models import ChatMessage, ChatThread, ChatThreadParticipant
from apps.firm.models import LawFirmMember
from apps.notifications.services import NotificationService
from apps.users.models import User


class CommunicationAccessService:
    @staticmethod
    def get_user_firm(user):
        if user.role == UserRole.ADMIN and hasattr(user, "owned_firm"):
            return user.owned_firm

        membership = (
            user.firm_memberships.filter(is_active=True)
            .select_related("firm")
            .first()
            if hasattr(user, "firm_memberships")
            else None
        )
        if membership:
            return membership.firm

        for profile_name in [
            "lawyer_profile",
            "secretary_profile",
            "it_profile",
            "accountant_profile",
            "hr_profile",
        ]:
            profile = getattr(user, profile_name, None)
            if profile is not None:
                return profile.law_firm

        if hasattr(user, "client_profile"):
            return user.client_profile.firm

        raise PermissionDenied("User is not attached to a law firm.")

    @staticmethod
    def is_admin(user):
        return user.role == UserRole.ADMIN

    @staticmethod
    def is_secretary(user):
        secretary = getattr(user, "secretary_profile", None)
        return secretary is not None and secretary.is_active

    @staticmethod
    def is_lawyer(user):
        lawyer = getattr(user, "lawyer_profile", None)
        return lawyer is not None and lawyer.is_active

    @staticmethod
    def is_case_client(user, case):
        client = getattr(user, "client_profile", None)
        return client is not None and case.client_id == client.id

    @staticmethod
    def is_assigned_lawyer(user, case):
        lawyer = getattr(user, "lawyer_profile", None)
        return lawyer is not None and case.assigned_lawyer_id == lawyer.id

    @staticmethod
    def is_case_secretary(user, case):
        secretary = getattr(user, "secretary_profile", None)
        if secretary is None or not secretary.is_active:
            return False
        return (
            case.assigned_secretary_id == secretary.id
            or secretary.assigned_lawyers.filter(id=case.assigned_lawyer_id).exists()
        )

    @staticmethod
    def is_same_firm(user, firm):
        return CommunicationAccessService.get_user_firm(user).id == firm.id

    @staticmethod
    def is_staff_user_in_firm(user, firm):
        return LawFirmMember.objects.filter(
            firm=firm,
            user=user,
            role__in=FirmRole.staff_roles(),
            is_active=True,
            user__is_active=True,
        ).exists()

    @staticmethod
    def can_view_thread(user, thread):
        if not CommunicationAccessService.is_same_firm(user, thread.firm):
            return False

        if CommunicationAccessService.is_admin(user):
            return True

        if thread.thread_type == ChatThreadType.CASE_CLIENT:
            if thread.case is None:
                return False
            if CommunicationAccessService.is_case_secretary(user, thread.case):
                return True
            if CommunicationAccessService.is_assigned_lawyer(user, thread.case):
                return True
            if CommunicationAccessService.is_case_client(user, thread.case):
                return True
            return False

        return thread.participants.filter(user=user).exists()

    @staticmethod
    def can_send_message(user, thread):
        if not CommunicationAccessService.can_view_thread(user, thread):
            return False

        if CommunicationAccessService.is_admin(user):
            return True

        if thread.thread_type == ChatThreadType.CASE_CLIENT:
            if thread.case is None:
                return False
            if CommunicationAccessService.is_case_secretary(user, thread.case):
                return True
            if CommunicationAccessService.is_case_client(user, thread.case):
                return True
            # Lawyers can read assigned case communication but cannot reply.
            return False

        participant = thread.participants.filter(user=user).first()
        return bool(participant and participant.can_reply)


class ChatService:
    @staticmethod
    def _thread_queryset():
        return (
            ChatThread.objects.select_related(
                "firm",
                "case",
                "case__client",
                "case__assigned_lawyer",
                "case__assigned_lawyer__user",
                "case__assigned_secretary",
                "case__assigned_secretary__user",
                "created_by",
            )
            .prefetch_related("participants", "participants__user")
            .filter(is_active=True)
        )

    @staticmethod
    def list_threads(user, *, thread_type=None):
        firm = CommunicationAccessService.get_user_firm(user)
        queryset = ChatService._thread_queryset().filter(firm=firm)

        if CommunicationAccessService.is_admin(user):
            pass
        elif CommunicationAccessService.is_secretary(user):
            queryset = queryset.filter(participants__user=user)
        elif CommunicationAccessService.is_lawyer(user):
            queryset = queryset.filter(
                Q(thread_type=ChatThreadType.CASE_CLIENT, case__assigned_lawyer=user.lawyer_profile)
                | Q(participants__user=user)
            )
        elif hasattr(user, "client_profile"):
            queryset = queryset.filter(
                Q(thread_type=ChatThreadType.CASE_CLIENT, case__client=user.client_profile)
                | Q(participants__user=user)
            )
        else:
            queryset = queryset.filter(participants__user=user)

        if thread_type:
            queryset = queryset.filter(thread_type=thread_type)

        return queryset.distinct()

    @staticmethod
    def get_thread(user, thread_id):
        thread = ChatService.list_threads(user).get(id=thread_id)
        if not CommunicationAccessService.can_view_thread(user, thread):
            raise PermissionDenied("You do not have access to this chat thread.")
        return thread

    @staticmethod
    def list_messages(user, thread):
        if not CommunicationAccessService.can_view_thread(user, thread):
            raise PermissionDenied("You do not have access to this chat thread.")
        return thread.messages.select_related("sender").all()

    @staticmethod
    def _create_participant(thread, user, *, can_reply=True):
        if user is None:
            return None
        participant, _ = ChatThreadParticipant.objects.get_or_create(
            thread=thread,
            user=user,
            defaults={"can_reply": can_reply},
        )
        if participant.can_reply != can_reply:
            participant.can_reply = can_reply
            participant.save(update_fields=["can_reply", "updated_at"])
        return participant

    @staticmethod
    def _staff_user_queryset(firm):
        return User.objects.filter(
            firm_memberships__firm=firm,
            firm_memberships__is_active=True,
            firm_memberships__role__in=FirmRole.staff_roles(),
            is_active=True,
        ).distinct()

    @staticmethod
    @transaction.atomic
    def start_direct_staff_thread(*, admin_user, staff_user_id, subject="", message=""):
        if not CommunicationAccessService.is_admin(admin_user):
            raise PermissionDenied("Only admins can start direct staff chats.")

        firm = CommunicationAccessService.get_user_firm(admin_user)
        staff_user = ChatService._staff_user_queryset(firm).get(id=staff_user_id)

        thread_key = f"direct_staff:{firm.id}:{admin_user.id}:{staff_user.id}"
        thread, created = ChatThread.objects.get_or_create(
            firm=firm,
            thread_type=ChatThreadType.DIRECT_STAFF,
            thread_key=thread_key,
            defaults={
                "subject": subject or f"Admin chat with {staff_user.full_name or staff_user.email}",
                "created_by": admin_user,
            },
        )

        ChatService._create_participant(thread, admin_user, can_reply=True)
        ChatService._create_participant(thread, staff_user, can_reply=True)

        if message:
            ChatService.send_message(admin_user, thread, body=message)

        return thread, created

    @staticmethod
    def _case_queryset_for_user(user):
        firm = CommunicationAccessService.get_user_firm(user)
        queryset = Case.objects.select_related(
            "firm",
            "client",
            "client__user",
            "assigned_lawyer",
            "assigned_lawyer__user",
            "assigned_secretary",
            "assigned_secretary__user",
        ).filter(firm=firm, is_active=True)

        if CommunicationAccessService.is_admin(user):
            return queryset
        if CommunicationAccessService.is_secretary(user):
            secretary = user.secretary_profile
            return queryset.filter(
                Q(assigned_secretary=secretary)
                | Q(assigned_lawyer__in=secretary.assigned_lawyers.all())
            )
        if CommunicationAccessService.is_lawyer(user):
            return queryset.filter(assigned_lawyer=user.lawyer_profile)
        if hasattr(user, "client_profile"):
            return queryset.filter(client=user.client_profile)
        return queryset.none()

    @staticmethod
    @transaction.atomic
    def get_or_create_case_thread(*, user, case_id):
        case = ChatService._case_queryset_for_user(user).get(id=case_id)
        thread_key = f"case_client:{case.id}"
        subject = f"{case.case_number} - {case.title}"

        thread, _ = ChatThread.objects.get_or_create(
            firm=case.firm,
            thread_type=ChatThreadType.CASE_CLIENT,
            thread_key=thread_key,
            defaults={
                "case": case,
                "subject": subject,
                "created_by": user,
            },
        )

        update_fields = []
        if thread.case_id != case.id:
            thread.case = case
            update_fields.append("case")
        if not thread.subject:
            thread.subject = subject
            update_fields.append("subject")
        if update_fields:
            update_fields.append("updated_at")
            thread.save(update_fields=update_fields)

        ChatService._create_participant(
            thread,
            getattr(case.client, "user", None),
            can_reply=True,
        )
        if case.assigned_lawyer_id and case.assigned_lawyer.user_id:
            ChatService._create_participant(thread, case.assigned_lawyer.user, can_reply=False)
        if case.assigned_secretary_id and case.assigned_secretary.user_id:
            ChatService._create_participant(thread, case.assigned_secretary.user, can_reply=True)

        return thread

    @staticmethod
    @transaction.atomic
    def get_or_create_case_lawyer_thread(*, user, case_id):
        firm = CommunicationAccessService.get_user_firm(user)
        case_queryset = Case.objects.select_related(
            "firm",
            "client",
            "assigned_lawyer",
            "assigned_lawyer__user",
            "assigned_secretary",
            "assigned_secretary__user",
        ).filter(
            firm=firm,
            is_active=True,
        )

        secretary = getattr(user, "secretary_profile", None)
        lawyer = getattr(user, "lawyer_profile", None)
        if secretary is not None and secretary.is_active:
            case_queryset = case_queryset.filter(
                Q(assigned_secretary=secretary)
                | Q(assigned_lawyer__in=secretary.assigned_lawyers.all())
            )
        elif lawyer is not None and lawyer.is_active:
            case_queryset = case_queryset.filter(assigned_lawyer=lawyer)
        else:
            raise PermissionDenied("Only the assigned secretary or lawyer can open this case chat.")

        case = case_queryset.get(id=case_id)

        if case.assigned_lawyer is None or case.assigned_lawyer.user is None:
            raise PermissionDenied("This case has no assigned lawyer chat target.")
        if case.assigned_secretary is None or case.assigned_secretary.user is None:
            raise PermissionDenied("This case has no assigned secretary chat target.")

        thread_key = f"case_lawyer:{case.id}:{case.assigned_secretary.user_id}:{case.assigned_lawyer.user_id}"
        subject = f"{case.case_number} - Assigned lawyer coordination"

        thread, _ = ChatThread.objects.get_or_create(
            firm=case.firm,
            thread_type=ChatThreadType.DIRECT_STAFF,
            thread_key=thread_key,
            defaults={
                "case": case,
                "subject": subject,
                "created_by": user,
            },
        )

        update_fields = []
        if thread.case_id != case.id:
            thread.case = case
            update_fields.append("case")
        if not thread.subject:
            thread.subject = subject
            update_fields.append("subject")
        if update_fields:
            update_fields.append("updated_at")
            thread.save(update_fields=update_fields)

        ChatService._create_participant(thread, case.assigned_secretary.user, can_reply=True)
        ChatService._create_participant(thread, case.assigned_lawyer.user, can_reply=True)

        return thread

    @staticmethod
    @transaction.atomic
    def send_message(
        user,
        thread,
        *,
        body,
        message_type=ChatMessageType.TEXT,
        is_system_message=False,
        is_forwarded=False,
        forwarded_from=None,
        forward_direction="",
    ):
        body = (body or "").strip()
        if not body:
            raise ValueError("Message body is required.")

        if not CommunicationAccessService.can_send_message(user, thread):
            raise PermissionDenied("You do not have permission to send messages in this chat thread.")

        message = ChatMessage.objects.create(
            thread=thread,
            sender=user,
            body=body,
            message_type=message_type,
            is_system_message=is_system_message,
            is_forwarded=is_forwarded,
            forwarded_from=forwarded_from,
            forward_direction=forward_direction,
        )

        thread.last_message_at = message.created_at
        thread.save(update_fields=["last_message_at", "updated_at"])

        ChatService._create_participant(thread, user, can_reply=True)
        ChatService.mark_thread_read(user, thread)
        NotificationService.notify_chat_message(message=message)

        return message

    @staticmethod
    def _get_forwardable_message(user, message_id):
        message = ChatMessage.objects.select_for_update().select_related(
            "thread",
            "thread__case",
            "thread__case__assigned_lawyer",
            "thread__case__assigned_lawyer__user",
            "thread__case__assigned_secretary",
            "thread__case__assigned_secretary__user",
            "sender",
        ).get(id=message_id)
        if not CommunicationAccessService.can_view_thread(user, message.thread):
            raise PermissionDenied("You do not have access to this message.")
        if message.is_forwarded:
            raise PermissionDenied("Forwarded messages cannot be forwarded again.")
        if message.forwarded_messages.exists():
            raise PermissionDenied("This message has already been forwarded.")
        return message

    @staticmethod
    @transaction.atomic
    def forward_message_to_lawyer(*, user, message_id):
        message = ChatService._get_forwardable_message(user, message_id)
        if message.thread.thread_type != ChatThreadType.CASE_CLIENT:
            raise PermissionDenied("Only client case messages can be forwarded to the lawyer.")
        if message.thread.case is None:
            raise PermissionDenied("This message is not attached to a case.")
        if not CommunicationAccessService.is_case_secretary(user, message.thread.case):
            raise PermissionDenied("Only the case secretary can forward messages to the lawyer.")

        lawyer_thread = ChatService.get_or_create_case_lawyer_thread(
            user=user,
            case_id=message.thread.case_id,
        )
        return ChatService.send_message(
            user,
            lawyer_thread,
            body=message.body,
            is_forwarded=True,
            forwarded_from=message,
            forward_direction="TO_LAWYER",
        )

    @staticmethod
    @transaction.atomic
    def forward_message_to_client(*, user, message_id):
        message = ChatService._get_forwardable_message(user, message_id)
        if message.thread.thread_type != ChatThreadType.DIRECT_STAFF:
            raise PermissionDenied("Only assigned lawyer messages can be forwarded to the client.")
        if message.thread.case is None:
            raise PermissionDenied("This message is not attached to a case.")
        if not CommunicationAccessService.is_case_secretary(user, message.thread.case):
            raise PermissionDenied("Only the case secretary can forward messages to the client.")
        if message.sender_id == user.id:
            raise PermissionDenied("Only lawyer messages can be forwarded to the client.")

        case_thread = ChatService.get_or_create_case_thread(
            user=user,
            case_id=message.thread.case_id,
        )
        return ChatService.send_message(
            user,
            case_thread,
            body=message.body,
            is_forwarded=False,
            forwarded_from=message,
            forward_direction="",
        )

    @staticmethod
    @transaction.atomic
    def mark_thread_read(user, thread):
        if not CommunicationAccessService.can_view_thread(user, thread):
            raise PermissionDenied("You do not have access to this chat thread.")

        participant, _ = ChatThreadParticipant.objects.get_or_create(
            thread=thread,
            user=user,
            defaults={
                "can_reply": CommunicationAccessService.can_send_message(user, thread),
            },
        )
        participant.last_read_at = timezone.now()
        participant.save(update_fields=["last_read_at", "updated_at"])
        NotificationService.mark_chat_thread_notifications_read(user=user, thread=thread)
        return participant
