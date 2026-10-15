from django.conf import settings
from django.core.mail import send_mail
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.audit_logs.services import AuditService
from apps.authentication.services.auth_service import AuthService
from apps.firm.models import LawFirmMember
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminStaffSignInLinkView(AdminFirmBaseView):
    """Give a staff member a fresh one-time link to set their password.

    The link is emailed and also returned, so the administrator can pass it on
    when email does not reach the person.
    """

    def post(self, request):
        firm = self.get_firm()
        email = str(request.data.get("email") or "").strip()
        membership = (
            LawFirmMember.objects.select_related("user")
            .filter(firm=firm, is_active=True, user__email__iexact=email, user__is_active=True)
            .exclude(user_id=firm.owner_id)
            .first()
        )
        if not email or membership is None:
            raise ValidationError({"email": "Choose an active staff member of this firm."})

        staff = membership.user
        _, _, link = AuthService.password_setup_link(staff)
        send_mail(
            subject=f"Set your Sheria Master password for {firm.name}",
            message=(
                f"Hello {staff.first_name},\n\n"
                f"{request.user.full_name} has sent you a link to set your password for {firm.name}:\n\n{link}\n\n"
                f"Then sign in with {staff.email}. The link works once."
            ),
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[staff.email],
            fail_silently=True,
        )
        AuditService.record(firm=firm, user=request.user, action="STAFF_SIGN_IN_LINK_SENT", obj=staff,
                            new={"email": staff.email})
        return Response({
            "email": staff.email,
            "link": link,
            "detail": f"A one-time link was sent to {staff.email}.",
        })
