import re

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import update_last_login
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes

from rest_framework_simplejwt.tokens import RefreshToken

from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.firm.models import LawFirmMember
from apps.users.models import User

UNLOCK_PIN_LENGTH = 6
UNLOCK_PIN_MAX_ATTEMPTS = 3

FIRM_SUSPENDED_MESSAGE = (
    "Your firm's account has been suspended. Please contact the platform administrator."
)


class AuthService:

    @staticmethod
    def get_active_membership(user):
        membership = (
            LawFirmMember.objects
            .select_related("firm")
            .filter(
                user=user,
                is_active=True,
            )
            .first()
        )
        return membership

    @staticmethod
    def build_session_payload(user):
        from apps.authentication.portal_access import portal_access_allowed
        must_change_password = user.must_change_password
        membership = AuthService.get_active_membership(user)

        owned_firm = getattr(user, "owned_firm", None)
        client_profile = getattr(user, "client_profile", None)
        firm = owned_firm or (membership.firm if membership else None)
        if firm is None and client_profile is not None:
            firm = client_profile.firm
        firm_role = membership.role if membership else None
        is_firm_owner = bool(owned_firm and firm and owned_firm.id == firm.id)

        client_payload = None
        if client_profile is not None:
            client_payload = {
                "id": str(client_profile.id),
                "full_name": client_profile.full_name,
                "client_type": client_profile.client_type,
                "access_type": client_profile.access_type,
                "lifecycle_status": client_profile.lifecycle_status,
                "portal_access_exists": bool(client_profile.user_id),
                "portal_access_allowed": portal_access_allowed(user),
            }

        firm_payload = AuthService.firm_payload(firm)
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}",
                "role": user.role,
                "firm_role": firm_role,
                "is_firm_owner": is_firm_owner,
                "is_platform_admin": user.role == UserRole.PLATFORM_ADMIN,
                "must_change_password": must_change_password,
                "has_unlock_pin": bool(user.unlock_pin),
                "client": client_payload,
                "firm": firm_payload,
            },
            "firm": firm_payload,
            "firm_role": firm_role,
            "is_firm_owner": is_firm_owner,
        }

    @staticmethod
    def firm_payload(firm):
        """What every signed-in member needs to brand their dashboard, and its footer, with their firm."""
        if firm is None:
            return {"id": None, "name": None, "logo_url": None, "contact": None}
        logo_url = None
        if firm.logo:
            logo_url = f"/firm-logo/{firm.id}/?v={int(firm.updated_at.timestamp())}"
        location = ", ".join(part for part in (firm.physical_address, firm.town, firm.county) if part)
        contact = {"location": location, "phone_number": firm.phone_number or "", "email": firm.email or "", "website": firm.website or ""}
        return {"id": firm.id, "name": firm.name, "logo_url": logo_url, "contact": contact}

    @staticmethod
    def user_firm(user):
        from apps.subscriptions.services import firm_for_user

        return firm_for_user(user)

    @staticmethod
    def login_user(email: str, password: str):
        user = authenticate(
            username=email,
            password=password,
        )

        if not user:
            return None, "Invalid credentials"

        firm = AuthService.user_firm(user)
        if firm is not None and not firm.is_active:
            return None, FIRM_SUSPENDED_MESSAGE

        update_last_login(None, user)
        refresh = RefreshToken.for_user(user)
        session_payload = AuthService.build_session_payload(user)

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            **session_payload,
        }, None

    @staticmethod
    def _split_name(full_name):
        parts = (full_name or "").strip().split()
        first_name = parts[0] if parts else "Client"
        last_name = " ".join(parts[1:]) if len(parts) > 1 else "-"
        return first_name, last_name

    @staticmethod
    @transaction.atomic
    def register_client(validated_data, *, firm):
        """Self-registration for the firm resolved from the public site, never a guessed firm."""
        if firm is None or not firm.is_active:
            return None, "Registration is not available on this site."
        settings_ = getattr(firm, "settings", None)
        if settings_ is None or not settings_.allow_client_registration:
            return None, "This firm does not accept online client registration."

        first_name, last_name = AuthService._split_name(validated_data["full_name"])
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first_name,
            last_name=last_name,
            phone_number=validated_data["phone_number"],
            national_id_number=validated_data.get("national_id") or f"CLIENT-{validated_data['phone_number'][-12:]}",
            role=UserRole.PROSPECT,
            must_change_password=False,
        )

        client = Client.objects.create(
            firm=firm,
            user=user,
            full_name=validated_data["full_name"],
            email=validated_data["email"],
            phone_number=validated_data["phone_number"],
            client_type=validated_data["client_type"],
            access_type=Client.AccessType.PROSPECT,
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
            national_id=validated_data.get("national_id") or None,
            is_verified=False,
        )

        refresh = RefreshToken.for_user(user)
        session_payload = AuthService.build_session_payload(user)

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "client": client,
            **session_payload,
        }, None
    
    @staticmethod
    @transaction.atomic
    def register_firm(validated_data):
        """Self-service SaaS onboarding: firm, managing partner and a trial subscription."""
        from apps.notifications.services import NotificationService
        from apps.platform_admin.services.firm_onboarding_service import FirmOnboardingService
        from apps.subscriptions.services import SubscriptionService

        admin_data = validated_data["admin"]
        firm = FirmOnboardingService.create_firm(
            firm=validated_data["firm"],
            owner=admin_data,
            password=admin_data["password"],
        )
        if validated_data.get("plan_code"):
            SubscriptionService.start_trial(firm, validated_data["plan_code"])

        owner = firm.owner
        NotificationService.notify_platform_admins(
            title=f"New firm signed up: {firm.name}",
            message=f"{owner.full_name} registered {firm.name} and started a free trial.",
            action_url=f"/platform/firms/{firm.id}",
            event_key=f"FIRM_SIGNUP:{firm.id}",
        )
        refresh = RefreshToken.for_user(owner)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            **AuthService.build_session_payload(owner),
        }

    @staticmethod
    def change_password(
        *,
        user,
        current_password,
        new_password,
    ):
        """
        Change a user's password and complete first-time onboarding.
        """

        if not user.check_password(current_password):
            return False, "Current password is incorrect."

        user.set_password(new_password)
        user.must_change_password = False

        user.save(
            update_fields=[
                "password",
                "must_change_password",
            ]
        )

        return True, None

    @staticmethod
    def logout_user(refresh_token: str):
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return True, None
        except Exception:
            return False, "Invalid refresh token"

    @staticmethod
    def set_unlock_pin(*, user, current_password, pin):
        """Set or replace the 6-digit PIN that unlocks a locked workspace."""
        if not user.check_password(current_password):
            return False, "Current password is incorrect."
        if not re.fullmatch(r"\d{%d}" % UNLOCK_PIN_LENGTH, pin or ""):
            return False, f"The PIN must be exactly {UNLOCK_PIN_LENGTH} digits."
        if len(set(pin)) == 1 or pin in "0123456789" or pin in "9876543210":
            return False, "Choose a PIN that is harder to guess than repeated or consecutive digits."

        user.unlock_pin = make_password(pin)
        user.unlock_pin_failed_attempts = 0
        user.save(update_fields=["unlock_pin", "unlock_pin_failed_attempts"])
        return True, None

    @staticmethod
    def remove_unlock_pin(user):
        user.unlock_pin = ""
        user.unlock_pin_failed_attempts = 0
        user.save(update_fields=["unlock_pin", "unlock_pin_failed_attempts"])

    @staticmethod
    def unlock_with_pin(*, refresh_token, pin):
        """
        Unlock a locked workspace with the PIN. The PIN only works alongside the
        device's own sign-in (its refresh token), so it cannot sign anyone in
        from elsewhere. Too many wrong PINs remove the PIN and end that sign-in.

        Returns (session, error, signed_out).
        """
        try:
            token = RefreshToken(refresh_token)
        except Exception:
            return None, "Your sign-in has ended. Sign in again with your password.", True

        user = User.objects.filter(id=token.get("user_id"), is_active=True).first()
        if user is None:
            return None, "Your sign-in has ended. Sign in again with your password.", True
        if not user.unlock_pin:
            return None, "Set an unlock PIN on your profile first, or unlock with your password.", False

        if not check_password(pin or "", user.unlock_pin):
            user.unlock_pin_failed_attempts += 1
            if user.unlock_pin_failed_attempts >= UNLOCK_PIN_MAX_ATTEMPTS:
                AuthService.remove_unlock_pin(user)
                token.blacklist()
                return None, "Too many wrong PINs. Sign in again with your password; your PIN has been removed.", True
            user.save(update_fields=["unlock_pin_failed_attempts"])
            remaining = UNLOCK_PIN_MAX_ATTEMPTS - user.unlock_pin_failed_attempts
            return None, f"Wrong PIN. {remaining} {'try' if remaining == 1 else 'tries'} left.", False

        firm = AuthService.user_firm(user)
        if firm is not None and not firm.is_active:
            return None, FIRM_SUSPENDED_MESSAGE, True

        user.unlock_pin_failed_attempts = 0
        user.save(update_fields=["unlock_pin_failed_attempts"])
        token.blacklist()
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            **AuthService.build_session_payload(user),
        }, None, False

    @staticmethod
    def password_setup_link(user):
        """A one-time link to set a password; it stops working once the password changes."""
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, "FRONTEND_URL", "").rstrip("/")
        reset_path = f"/reset-password?uid={uid}&token={token}"
        return uid, token, f"{frontend_url}{reset_path}" if frontend_url else reset_path

    @staticmethod
    def request_password_reset(email: str, *, fail_silently=True, invitation_firm=None):
        user = User.objects.filter(email__iexact=email, is_active=True).first()

        if user is None:
            return None

        uid, token, reset_url = AuthService.password_setup_link(user)

        if invitation_firm is not None:
            subject = f"{invitation_firm.name} has invited you to your client portal"
            message = (
                f"{invitation_firm.name} has opened a secure client portal for you. Use it to follow your matter, "
                "receive court dates, join virtual court sessions and upload documents the firm asks for.\n\n"
                f"Set your password using this link:\n\n{reset_url}\n\n"
                "The link expires. If it has expired, ask the firm to send a new invitation."
            )
        else:
            subject = "Reset your Sheria Master password"
            message = (
                "Use this link to reset your password:\n\n"
                f"{reset_url}\n\n"
                "If you did not request this, you can ignore this message."
            )
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[user.email],
            fail_silently=fail_silently,
        )

        return {
            "uid": uid,
            "token": token,
            "reset_url": reset_url,
        }

    @staticmethod
    def phone_variants(phone_number):
        """0712 345 678, 712345678 and +254712345678 are the same Kenyan number."""
        digits = "".join(character for character in phone_number if character.isdigit())
        if not digits:
            return set()
        local = digits[3:] if digits.startswith("254") else digits.lstrip("0")
        return {phone_number.strip(), digits, f"0{local}", f"254{local}", f"+254{local}"}

    @staticmethod
    def request_account_recovery(*, national_id="", phone_number=""):
        """Email a reset link to the account matching every identifier given."""
        users = User.objects.filter(is_active=True)
        if national_id:
            users = users.filter(national_id_number__iexact=national_id)
        if phone_number:
            users = users.filter(phone_number__in=AuthService.phone_variants(phone_number))
        user = users.first() if users.count() == 1 else None
        if user is None:
            return None
        return AuthService.request_password_reset(user.email)

    @staticmethod
    def reset_password(*, uid: str, token: str, new_password: str):
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return False, "Invalid or expired password reset link."

        if not default_token_generator.check_token(user, token):
            return False, "Invalid or expired password reset link."

        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password", "updated_at"])

        return True, None
