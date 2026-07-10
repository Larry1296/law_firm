from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from apps.common.choices import FirmRole, UserRole
from apps.firm.models import LawFirmMember
from apps.firm.serializers.admin_delegation_serializer import AdminDelegationSerializer
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView
from apps.users.models import User


class AdminDelegationView(AdminFirmBaseView):
    def get(self, request):
        firm = self.get_firm()

        if firm.owner_id != request.user.id:
            return Response(
                {"detail": "Only the firm owner can delegate administration."},
                status=status.HTTP_403_FORBIDDEN,
            )

        memberships = (
            LawFirmMember.objects.filter(firm=firm, is_active=True)
            .exclude(user=firm.owner)
            .select_related("user")
            .order_by("user__first_name", "user__last_name")
        )

        staff = []
        for membership in memberships:
            user = membership.user
            staff.append(
                {
                    "user_id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "system_role": user.role,
                    "firm_role": self.get_firm_role(user, membership),
                    "firm_role_label": self.get_firm_role_label(user, membership),
                    "department": self.get_department(user),
                    "label": self.get_label(user, membership),
                }
            )

        delegated_admins = [
            {
                "user_id": member.user.id,
                "full_name": member.user.full_name,
                "email": member.user.email,
                "firm_role": self.get_firm_role(member.user, member),
                "firm_role_label": self.get_firm_role_label(member.user, member),
                "department": self.get_department(member.user),
            }
            for member in memberships
            if member.user.role == UserRole.ADMIN
        ]

        return Response(
            {
                "eligible_staff": staff,
                "delegated_admins": delegated_admins,
                "owner": {
                    "user_id": firm.owner.id,
                    "full_name": firm.owner.full_name,
                    "email": firm.owner.email,
                },
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        firm = self.get_firm()

        if firm.owner_id != request.user.id:
            return Response(
                {"detail": "Only the firm owner can delegate administration."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdminDelegationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = serializer.validated_data["user_id"]
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Selected staff member was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target_user.id == firm.owner_id:
            return Response(
                {"detail": "The firm owner is already the owner-admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = (
            LawFirmMember.objects.filter(
                firm=firm,
                user=target_user,
                is_active=True,
            )
            .select_related("user")
            .first()
        )
        if membership is None:
            return Response(
                {"detail": "Selected user is not an active staff member of this firm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            target_user.role = UserRole.ADMIN
            target_user.is_staff = True
            target_user.save(update_fields=["role", "is_staff", "updated_at"])

        return Response(
            {
                "detail": "Administrative role delegated successfully.",
                "admin": {
                    "user_id": target_user.id,
                    "full_name": target_user.full_name,
                    "email": target_user.email,
                    "system_role": target_user.role,
                    "firm_role": self.get_firm_role(target_user, membership),
                    "firm_role_label": self.get_firm_role_label(
                        target_user,
                        membership,
                    ),
                    "department": self.get_department(target_user),
                },
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, user_id):
        firm = self.get_firm()

        if firm.owner_id != request.user.id:
            return Response(
                {"detail": "Only the firm owner can revoke delegated administration."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Selected admin was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target_user.id == firm.owner_id:
            return Response(
                {"detail": "Firm ownership cannot be revoked."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = LawFirmMember.objects.filter(
            firm=firm,
            user=target_user,
            is_active=True,
        ).first()
        if membership is None:
            return Response(
                {"detail": "Selected user is not an active staff member of this firm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            target_user.role = UserRole.STAFF
            target_user.is_staff = False
            target_user.save(update_fields=["role", "is_staff", "updated_at"])
            self.blacklist_user_tokens(target_user)

        return Response(
            {
                "detail": "Delegated administration revoked successfully.",
                "staff": {
                    "user_id": target_user.id,
                    "full_name": target_user.full_name,
                    "email": target_user.email,
                    "system_role": target_user.role,
                    "firm_role": self.get_firm_role(target_user, membership),
                    "firm_role_label": self.get_firm_role_label(
                        target_user,
                        membership,
                    ),
                    "department": self.get_department(target_user),
                },
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def get_staff_profile(user):
        for profile_name in [
            "lawyer_profile",
            "secretary_profile",
            "accountant_profile",
            "hr_profile",
            "it_profile",
        ]:
            profile = getattr(user, profile_name, None)
            if profile is not None:
                return profile
        return None

    @classmethod
    def get_department(cls, user):
        profile = cls.get_staff_profile(user)
        if profile is not None:
            return profile.department or ""
        return ""

    @classmethod
    def get_firm_role(cls, user, membership):
        profile = cls.get_staff_profile(user)
        if profile is not None:
            return profile.firm_role
        return membership.role

    @classmethod
    def get_firm_role_label(cls, user, membership):
        firm_role = cls.get_firm_role(user, membership)
        try:
            return FirmRole(firm_role).label
        except ValueError:
            return str(firm_role).replace("_", " ").title()

    @classmethod
    def get_label(cls, user, membership):
        firm_role_label = cls.get_firm_role_label(user, membership)
        department = cls.get_department(user)
        if department:
            return f"{user.full_name} ({firm_role_label} - {department})"
        return f"{user.full_name} ({firm_role_label})"

    @staticmethod
    def blacklist_user_tokens(user):
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
