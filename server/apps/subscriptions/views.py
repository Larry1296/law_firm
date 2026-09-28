from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.choices import UserRole
from apps.subscriptions.catalog import INCLUDED_IN_EVERY_PLAN
from apps.subscriptions.models import Plan, SubscriptionInvoice
from apps.subscriptions.serializers import (
    InvoiceRequestSerializer,
    PaymentSubmissionSerializer,
    SubscriptionInvoiceSerializer,
)
from apps.subscriptions.services import SubscriptionService, firm_for_user


def _member_firm(user):
    firm = firm_for_user(user)
    is_member = firm is not None and (
        firm.owner_id == user.id
        or user.firm_memberships.filter(firm=firm, is_active=True).exists()
    )
    if not is_member:
        raise PermissionDenied("Only members of a law firm can view its subscription.")
    return firm


def _admin_firm(user):
    firm = _member_firm(user)
    if user.role != UserRole.ADMIN:
        raise PermissionDenied("Only firm administrators can manage the subscription.")
    return firm


class PlanListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        plans = Plan.objects.filter(is_active=True, is_public=True)
        return Response({
            "plans": [SubscriptionService.plan_payload(plan) for plan in plans],
            "included_in_every_plan": INCLUDED_IN_EVERY_PLAN,
            "firm_signup_enabled": settings.ALLOW_PUBLIC_FIRM_SIGNUP,
        })


class SubscriptionSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(SubscriptionService.summary(_member_firm(request.user)))


class SubscriptionInvoiceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = _admin_firm(request.user)
        invoices = SubscriptionInvoice.objects.filter(firm=firm).select_related("plan")
        return Response({"invoices": SubscriptionInvoiceSerializer(invoices, many=True).data})

    def post(self, request):
        firm = _admin_firm(request.user)
        serializer = InvoiceRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = SubscriptionService.issue_invoice(
            firm=firm, user=request.user, **serializer.validated_data,
        )
        return Response(SubscriptionInvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class SubscriptionPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id):
        firm = _admin_firm(request.user)
        invoice = get_object_or_404(SubscriptionInvoice, id=invoice_id, firm=firm)
        serializer = PaymentSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = SubscriptionService.submit_payment(
            invoice=invoice, user=request.user, **serializer.validated_data,
        )
        return Response(SubscriptionInvoiceSerializer(invoice).data)
