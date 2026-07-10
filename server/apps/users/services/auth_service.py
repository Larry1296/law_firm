from datetime import datetime
import secrets
import string

from apps.users.models import User


class AuthService:

    # =========================================================
    # TEMP PASSWORD GENERATION (HUMAN + SAFE)
    # =========================================================

    @staticmethod
    def generate_temp_password(first_name: str | None = None):
        """
        Example:
            john2026A7xP
        """

        year = datetime.now().year

        base = (
            first_name.strip().lower()
            if first_name
            else "user"
        )

        suffix = "".join(
            secrets.choice(
                string.ascii_letters + string.digits
            )
            for _ in range(4)
        )

        return f"{base}{year}{suffix}"

    # =========================================================
    # USER CREATION
    # =========================================================

    @staticmethod
    def create_user_with_temp_password(
        *,
        email,
        first_name,
        last_name,
        phone_number,
        national_id_number,
        role,
    ):
        """
        Creates a user with a temporary password.

        This method ONLY creates the User.

        StaffService creates:
            - Staff
            - LawFirmMember

        ClientService creates:
            - Client

        Admin bootstrap creates:
            - Staff
            - LawFirmMember
        """

        temp_password = AuthService.generate_temp_password(first_name)

        user = User.objects.create_user(
            email=email,
            password=temp_password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            national_id_number=national_id_number,
            role=role,
        )

        user.must_change_password = True
        user.save(update_fields=["must_change_password"])

        return user, temp_password
    
    