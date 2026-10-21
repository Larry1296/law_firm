import secrets

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.audit_logs.services import AuditService
from apps.clients.models import Client
from apps.firm.models import LawFirmMember
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView
from apps.users.models import User


class TemporaryPasswordRequest(serializers.Serializer):
    email = serializers.EmailField(required=False)
    client_id = serializers.UUIDField(required=False)

    def validate(self, data):
        if bool(data.get('email')) == bool(data.get('client_id')):
            raise serializers.ValidationError('Choose one staff account or client account.')
        return data


class AdminTemporaryPasswordView(AdminFirmBaseView):
    @transaction.atomic
    def post(self, request):
        firm = self.get_firm()
        serializer = TemporaryPasswordRequest(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        if 'client_id' in values:
            client = Client.objects.filter(firm=firm, pk=values['client_id']).first()
            target_id = client.user_id if client else None
        else:
            member = LawFirmMember.objects.filter(
                firm=firm, is_active=True, user__email__iexact=values['email'],
            ).first()
            target_id = member.user_id if member else None
        if not target_id:
            raise ValidationError('Choose an existing login account in this firm.')
        target = User.objects.select_for_update().filter(pk=target_id, is_active=True).first()
        if target is None:
            raise ValidationError('This login account is inactive.')
        password = secrets.token_urlsafe(18)
        target.set_password(password)
        target.must_change_password = True
        target.save(update_fields=['password', 'must_change_password'])
        # The admin can hand over the password even when email is unavailable.
        try:
            sent = send_mail(
                subject=f'Your temporary Sheria Master password — {firm.name}',
                message=(f'Hello {target.first_name},\n\n'
                         f'{request.user.full_name} has issued a new temporary password for {firm.name}.\n\n'
                         f'Email: {target.email}\nTemporary password: {password}\n\n'
                         'Sign in to Sheria Master and change this password when prompted. '
                         'Your previous password no longer works.'),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[target.email], fail_silently=False,
            )
        except Exception:
            sent = 0
        AuditService.record(firm=firm, user=request.user, action='TEMPORARY_PASSWORD_ISSUED',
                            obj=target, new={'email': target.email, 'email_sent': sent == 1})
        response = Response({
            'detail': (f'A new temporary password was emailed to {target.email}.' if sent == 1
                       else 'The password was reset, but email could not be sent. Copy it and share it with the account holder.'),
            'email': target.email,
            'temp_password': password,
            'email_sent': sent == 1,
        })
        response['Cache-Control'] = 'no-store'
        return response
