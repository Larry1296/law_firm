from datetime import date, timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.common.choices import FirmRole, UserRole
from apps.firm.models import Branch, FirmSetting, LawFirm, LawFirmMember, PracticeArea
from apps.users.models import User


class OnboardingStart:
    TRIAL = "TRIAL"
    PAID = "PAID"
    CHOICES = [(TRIAL, "Free trial"), (PAID, "Paid (M-Pesa payment received)")]


class FirmOnboardingService:
    """Creates a law firm tenant and its owner, ready for the owner to sign in.

    The owner becomes the firm administrator and its managing partner: an
    advocate holding every advocate permission. The firm gets its settings, a
    head office, its practice areas and a subscription on the chosen plan.
    """

    FIRM_FIELDS = (
        "name", "business_structure", "registration_number", "kra_pin", "email", "phone_number",
        "website", "physical_address", "postal_address", "county", "town", "description",
    )
    SETTING_FIELDS = ("opening_time", "closing_time", "work_on_saturday", "allow_client_registration")

    @classmethod
    @transaction.atomic
    def create_firm(cls, *, firm, owner, password=None, created_by=None, office=None,
                    practice_areas=(), firm_settings=None):
        from apps.staff.models import Lawyer, LawyerPermission
        from apps.staff.services.admin.lawyers.admin_lawyer_permission_service import (
            AdminLawyerPermissionService,
        )

        # With no password the owner's password is unusable until they set one
        # from their invitation link.
        owner_user = User.objects.create_user(
            email=owner["email"],
            password=password,
            first_name=owner["first_name"],
            last_name=owner["last_name"],
            phone_number=owner["phone_number"],
            national_id_number=owner["national_id_number"],
            role=UserRole.ADMIN,
            must_change_password=False,
        )
        law_firm = LawFirm.objects.create(
            owner=owner_user, **{key: firm[key] for key in cls.FIRM_FIELDS if key in firm},
        )

        setting, _ = FirmSetting.objects.get_or_create(firm=law_firm)
        changed = [key for key in cls.SETTING_FIELDS if (firm_settings or {}).get(key) is not None]
        for key in changed:
            setattr(setting, key, firm_settings[key])
        if changed:
            setting.save(update_fields=[*changed, "updated_at"])

        LawFirmMember.objects.create(
            firm=law_firm, user=owner_user, role=FirmRole.LAWYER,
            created_by=created_by or owner_user, is_active=True,
        )
        lawyer = Lawyer.objects.create(
            user=owner_user,
            law_firm=law_firm,
            staff_number="ADV-0001",
            firm_role=FirmRole.LAWYER,
            job_title=owner.get("job_title") or "Managing Partner",
            admission_number=owner["admission_number"],
            date_hired=date.today(),
        )
        AdminLawyerPermissionService.sync_permissions(
            lawyer=lawyer,
            permission_codes=[code for code, _ in LawyerPermission.choices],
            granted_by=owner_user,
        )

        office = office or {}
        Branch.objects.create(
            firm=law_firm,
            name=office.get("name") or "Head Office",
            code="HQ",
            email=office.get("email") or law_firm.email,
            phone_number=office.get("phone_number") or law_firm.phone_number,
            physical_address=office.get("physical_address") or law_firm.physical_address,
            postal_address=office.get("postal_address") or law_firm.postal_address,
            branch_leader=owner_user,
            is_head_office=True,
        )

        seen = set()
        for name in practice_areas:
            name = " ".join(str(name).split())
            if name and name.lower() not in seen:
                seen.add(name.lower())
                PracticeArea.objects.create(firm=law_firm, name=name[:255])

        return law_firm

    @classmethod
    @transaction.atomic
    def register_firm(cls, *, data, actor):
        """Platform administrator registers a firm on behalf of its owner."""
        from apps.platform_admin.models import FirmOnboardingRequest, PlatformActivity
        from apps.subscriptions.services import SubscriptionService

        firm = cls.create_firm(
            firm=data["firm"],
            owner=data["owner"],
            created_by=actor,
            office=data.get("office"),
            practice_areas=data.get("practice_areas", []),
            firm_settings=data.get("settings"),
        )

        subscription_data = data["subscription"]
        plan_code = subscription_data["plan_code"]
        billing_cycle = subscription_data["billing_cycle"]
        subscription = SubscriptionService.start_trial(firm, plan_code)
        subscription.billing_cycle = billing_cycle
        if subscription_data["start"] == OnboardingStart.PAID:
            invoice = SubscriptionService.issue_invoice(
                firm=firm, plan_code=plan_code, billing_cycle=billing_cycle, user=actor,
            )
            SubscriptionService.submit_payment(
                invoice=invoice, user=actor,
                mpesa_receipt=subscription_data["mpesa_receipt"],
                payer_phone=subscription_data.get("payer_phone", ""),
            )
            SubscriptionService.confirm_payment(invoice=invoice, confirmed_by=actor)
        else:
            trial_days = subscription_data.get("trial_days") or settings.SUBSCRIPTION_TRIAL_DAYS
            subscription.trial_ends_at = timezone.now() + timedelta(days=trial_days)
            subscription.save(update_fields=["billing_cycle", "trial_ends_at", "updated_at"])

        request_id = data.get("onboarding_request_id")
        if request_id:
            FirmOnboardingRequest.objects.filter(id=request_id).update(
                status=FirmOnboardingRequest.Status.REGISTERED, registered_firm=firm,
                updated_at=timezone.now(),
            )

        PlatformActivity.record(
            actor, PlatformActivity.Action.FIRM_REGISTERED,
            f"Registered {firm.name} on the {SubscriptionService.get(firm).plan.name} plan "
            f"for {firm.owner.full_name}.",
            firm=firm,
        )
        invitation_url = cls.send_owner_invitation(firm)
        return firm, invitation_url

    @staticmethod
    def send_owner_invitation(firm):
        """Email the owner a link to set their password, and return the link.

        The platform administrator also sees the link, so the owner can be given
        access even when email delivery is not configured.
        """
        from apps.authentication.services.auth_service import AuthService

        owner = firm.owner
        _, _, link = AuthService.password_setup_link(owner)
        send_mail(
            subject=f"{firm.name} is ready on Sheria Master",
            message=(
                f"Hello {owner.first_name},\n\n"
                f"{firm.name} has been registered on Sheria Master and you are its administrator.\n\n"
                f"Set your password using this link:\n\n{link}\n\n"
                f"Then sign in with {owner.email} to set up your firm, add your staff and "
                "register your clients.\n\n"
                "The link works once. If it has expired, ask the platform administrator for a new one."
            ),
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[owner.email],
            fail_silently=True,
        )
        return link
