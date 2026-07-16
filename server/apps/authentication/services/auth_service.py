from django.contrib.auth import authenticate
from django.db import transaction

from rest_framework_simplejwt.tokens import RefreshToken

from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.firm.models import LawFirmMember
from apps.users.models import User


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
        must_change_password = (
            False if user.role == UserRole.ADMIN else user.must_change_password
        )
        membership = AuthService.get_active_membership(user)

        owned_firm = getattr(user, "owned_firm", None)
        client_profile = getattr(user, "client_profile", None)
        firm = owned_firm or (membership.firm if membership else None)
        if firm is None and client_profile is not None:
            firm = client_profile.firm
        firm_role = membership.role if membership else None
        is_firm_owner = bool(owned_firm and firm and owned_firm.id == firm.id)

        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}",
                "role": user.role,
                "firm_role": firm_role,
                "is_firm_owner": is_firm_owner,
                "must_change_password": must_change_password,
            },
            "firm": {
                "id": firm.id if firm else None,
                "name": firm.name if firm else None,
            },
            "firm_role": firm_role,
            "is_firm_owner": is_firm_owner,
        }

    @staticmethod
    def login_user(email: str, password: str):
        user = authenticate(
            username=email,
            password=password,
        )

        if not user:
            return None, "Invalid credentials"

        if user.role == UserRole.ADMIN and user.must_change_password:
            user.must_change_password = False
            user.save(update_fields=["must_change_password", "updated_at"])

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
    def register_client(validated_data):
        firm = LawFirm.objects.filter(is_active=True).order_by("created_at").first()
        if firm is None:
            return None, "No active law firm is available for registration."

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
