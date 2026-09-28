import getpass
import uuid

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from apps.common.choices import UserRole
from apps.users.models import User


class Command(BaseCommand):
    help = (
        "Create a platform administrator: the operator who registers law firms, manages plans "
        "and monitors the platform. Platform administrators belong to no firm."
    )

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--first-name", default="Platform")
        parser.add_argument("--last-name", default="Administrator")
        parser.add_argument("--phone", help="Unique phone number. A placeholder is used if omitted.")
        parser.add_argument("--national-id", help="Unique national ID. A placeholder is used if omitted.")
        parser.add_argument(
            "--password",
            help="Avoid on shared machines: it stays in shell history. You are prompted if omitted.",
        )

    def handle(self, *args, **options):
        email = User.objects.normalize_email(options["email"])
        existing = User.objects.filter(email__iexact=email).first()
        if existing is not None:
            if existing.role == UserRole.PLATFORM_ADMIN:
                raise CommandError(f"{email} is already a platform administrator.")
            raise CommandError(
                f"{email} already belongs to a {existing.get_role_display().lower()} account. "
                "Use a separate email address for the platform administrator."
            )

        password = options["password"] or self._prompt_password()
        try:
            validate_password(password)
        except ValidationError as exc:
            raise CommandError(" ".join(exc.messages)) from exc

        placeholder = uuid.uuid4().hex[:12].upper()
        user = User.objects.create_platform_admin(
            email=email,
            password=password,
            first_name=options["first_name"],
            last_name=options["last_name"],
            phone_number=options["phone"] or f"PLATFORM-{placeholder}",
            national_id_number=options["national_id"] or f"PLATFORM-{placeholder}",
        )
        self.stdout.write(self.style.SUCCESS(
            f"Platform administrator {user.email} created. Sign in from the homepage to open the platform console."
        ))

    @staticmethod
    def _prompt_password():
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Password (again): "):
            raise CommandError("The passwords do not match.")
        return password
