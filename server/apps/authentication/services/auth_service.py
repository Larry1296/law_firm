from django.contrib.auth import authenticate

from rest_framework_simplejwt.tokens import RefreshToken

from apps.firm.models import LawFirmMember


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
        membership = AuthService.get_active_membership(user)

        firm = membership.firm if membership else None
        firm_role = membership.role if membership else None

        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}",
                "role": user.role,
                "firm_role": firm_role,
                "must_change_password": user.must_change_password,
            },
            "firm": {
                "id": firm.id if firm else None,
                "name": firm.name if firm else None,
            },
            "firm_role": firm_role,
        }

    @staticmethod
    def login_user(email: str, password: str):
        user = authenticate(
            username=email,
            password=password,
        )

        if not user:
            return None, "Invalid credentials"

        refresh = RefreshToken.for_user(user)
        session_payload = AuthService.build_session_payload(user)

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
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
