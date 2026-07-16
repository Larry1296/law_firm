from django.contrib.auth.base_user import BaseUserManager

from apps.common.choices import UserRole


class UserManager(BaseUserManager):
    """
    User manager.

    Responsible ONLY for creating User objects.

    Firm membership, employment, and permissions are handled by
    the relevant services (LawFirmService, StaffService, etc.).
    """

    def create_user(
        self,
        email,
        password=None,
        **extra_fields,
    ):
        if not email:
            raise ValueError("Email is required.")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields,
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(
        self,
        email,
        password=None,
        **extra_fields,
    ):
        """
        Django superuser.

        Used only to bootstrap the system.
        The superuser becomes a firm owner later through
        LawFirmService.create_firm().
        """

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("role", UserRole.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(
            email=email,
            password=password,
            **extra_fields,
        )

    def create_admin(
        self,
        email,
        password=None,
        **extra_fields,
    ):
        """
        Creates a system administrator.

        Firm assignment is handled separately by LawFirmService.
        """

        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("is_staff", True)

        return self.create_user(
            email=email,
            password=password,
            **extra_fields,
        )

    def create_staff(
        self,
        email,
        password=None,
        **extra_fields,
    ):
        """
        Creates a staff user.

        Employment details are created later through StaffService.
        """

        extra_fields.setdefault("role", UserRole.STAFF)

        return self.create_user(
            email=email,
            password=password,
            **extra_fields,
        )

    def create_prospect(
        self,
        email,
        password=None,
        **extra_fields,
    ):
        """
        Creates a self-registered prospect.
        """

        extra_fields.setdefault("role", UserRole.PROSPECT)

        return self.create_user(
            email=email,
            password=password,
            **extra_fields,
        )


    def create_official_client(
        self,
        email,
        password=None,
        **extra_fields,
    ):
        """
        Creates an official client.

        Client-specific records are handled by ClientService.
        """

        extra_fields.setdefault("role", UserRole.OFFICIAL_CLIENT)

        return self.create_user(
            email=email,
            password=password,
            **extra_fields,
        )
