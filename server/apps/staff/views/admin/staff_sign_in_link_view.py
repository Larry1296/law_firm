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
        try:
            sent = send_mail(
                subject=f"Reset your Sheria Master password for {firm.name}",
                message=(
                    f"Hello {staff.first_name},\n\n"
                    f"{request.user.full_name} has sent you a link to reset your password for {firm.name}:\n\n{link}\n\n"
                    f"Then sign in with {staff.email}. This temporary link expires and works once. "
                    "Your current password continues to work until you choose a new one."
                ),
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                recipient_list=[staff.email],
                fail_silently=False,
            )
        except Exception:
            sent = 0
        AuditService.record(firm=firm, user=request.user, action="STAFF_SIGN_IN_LINK_SENT", obj=staff,
                            new={"email": staff.email, "email_sent": sent == 1})
        response = Response({
            "email": staff.email,
            "link": link,
            "email_sent": sent == 1,
            "detail": (f"A temporary password reset link was emailed to {staff.email}." if sent == 1
                       else "Email could not be sent. Copy the password reset link and share it with the account holder."),
        })
        response["Cache-Control"] = "no-store"
        return response
