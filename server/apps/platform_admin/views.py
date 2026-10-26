import json
import secrets

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.firm.models import LawFirm
from apps.firm.serializers.logo_serializer import LogoSerializer
from apps.notifications.services import NotificationService
from apps.platform_admin.models import FirmOnboardingRequest, PlatformActivity
from apps.platform_admin.permissions import IsPlatformAdmin
from apps.platform_admin.reference_data import KENYAN_COUNTIES, PRACTICE_AREA_SUGGESTIONS
from apps.platform_admin.serializers import (
    FirmProfileUpdateSerializer,
    FirmStatusSerializer,
    OnboardingRequestCreateSerializer,
    OnboardingRequestSerializer,
    PlanSerializer,
    RegisterFirmSerializer,
    SubscriptionUpdateSerializer,
    UserStatusSerializer,
)
from apps.platform_admin.services.firm_onboarding_service import FirmOnboardingService, OnboardingStart
from apps.platform_admin.services.platform_monitoring_service import PlatformMonitoringService
from apps.platform_admin.services.trial_firm_deletion_service import TrialFirmDeletionService
from apps.subscriptions.catalog import Feature, Limit
from apps.subscriptions.models import FirmSubscription, Plan, SubscriptionInvoice
from apps.subscriptions.serializers import SubscriptionInvoiceSerializer
from apps.subscriptions.services import SubscriptionService
from apps.users.models import User

Action = PlatformActivity.Action


def paginate(request, items, serialize, default_size=25):
    try:
        page = max(int(request.query_params.get("page", 1)), 1)
        size = min(max(int(request.query_params.get("page_size", default_size)), 1), 100)
    except ValueError:
        page, size = 1, default_size
    total = len(items) if isinstance(items, list) else items.count()
    start = (page - 1) * size
    return {
        "count": total,
        "page": page,
        "page_size": size,
        "results": [serialize(item) for item in items[start:start + size]],
    }


def dotted_errors(errors, prefix=""):
    """{"firm": {"kra_pin": [...]}} -> {"firm.kra_pin": [...]}, so a form can mark the exact field."""
    flat = {}
    for key, value in errors.items():
        name = f"{prefix}{key}"
        if isinstance(value, dict):
            flat.update(dotted_errors(value, f"{name}."))
        else:
            flat[name] = value
    return flat


class PlatformView(APIView):
    permission_classes = [IsPlatformAdmin]


# ---------------------------------------------------------------------------
# Overview and reference data
# ---------------------------------------------------------------------------

class OverviewView(PlatformView):
    def get(self, request):
        return Response(PlatformMonitoringService.overview())


class MetaView(PlatformView):
    def get(self, request):
        return Response({
            "plans": [
                SubscriptionService.plan_payload(plan) for plan in Plan.objects.filter(is_active=True)
            ],
            "features": [{"code": code, "label": label} for code, label in Feature.LABELS.items()],
            "limits": [{"code": code, "label": label, "field": Limit.FIELDS[code]} for code, label in Limit.LABELS.items()],
            "business_structures": [{"value": value, "label": label} for value, label in LawFirm.BusinessStructure.choices],
            "counties": KENYAN_COUNTIES,
            "practice_areas": PRACTICE_AREA_SUGGESTIONS,
            "billing_cycles": [{"value": value, "label": label} for value, label in FirmSubscription.BillingCycle.choices],
            "subscription_statuses": [{"value": value, "label": label} for value, label in FirmSubscription.Status.choices],
            "onboarding_starts": [{"value": value, "label": label} for value, label in OnboardingStart.CHOICES],
            "default_trial_days": settings.SUBSCRIPTION_TRIAL_DAYS,
            "vat_rate": str(settings.SUBSCRIPTION_VAT_RATE),
        })


# ---------------------------------------------------------------------------
# Firms
# ---------------------------------------------------------------------------

def firm_detail_payload(firm):
    """
    The firm's account as the platform sees it: its registration details, its
    owner and its subscription. Nothing about the people working in the firm
    (staff, clients, matters or head-counts) is ever sent to the platform.
    """
    subscription = SubscriptionService.get(firm)
    owner = firm.owner
    lawyer = getattr(owner, "lawyer_profile", None)
    setting = getattr(firm, "settings", None)
    head_office = firm.branches.filter(is_head_office=True).first()
    invoices = SubscriptionInvoice.objects.filter(firm=firm).select_related("plan")[:12]
    summary = SubscriptionService.summary(firm)
    summary.pop("usage", None)

    return {
        "id": firm.id,
        **TrialFirmDeletionService.eligibility(firm, subscription),
        "name": firm.name,
        "business_structure": firm.business_structure,
        "business_structure_label": firm.get_business_structure_display(),
        "registration_number": firm.registration_number,
        "kra_pin": firm.kra_pin,
        "email": firm.email,
        "phone_number": firm.phone_number,
        "website": firm.website,
        "physical_address": firm.physical_address,
        "postal_address": firm.postal_address,
        "county": firm.county,
        "town": firm.town,
        "description": firm.description,
        "logo_url": f"/firm-logo/{firm.id}/?v={int(firm.updated_at.timestamp())}" if firm.logo else None,
        "is_active": firm.is_active,
        "created_at": firm.created_at,
        "owner": {
            "id": owner.id,
            "full_name": owner.full_name,
            "email": owner.email,
            "phone_number": owner.phone_number,
            "national_id_number": owner.national_id_number,
            "admission_number": lawyer.admission_number if lawyer else None,
            "job_title": lawyer.job_title if lawyer else None,
            "is_active": owner.is_active,
            "has_signed_in": owner.last_login is not None,
            "last_login": owner.last_login,
        },
        "head_office": {
            "name": head_office.name,
            "email": head_office.email,
            "phone_number": head_office.phone_number,
            "physical_address": head_office.physical_address,
        } if head_office else None,
        "practice_areas": list(firm.practice_areas.filter(is_active=True).values_list("name", flat=True)),
        "settings": {
            "opening_time": setting.opening_time,
            "closing_time": setting.closing_time,
            "work_on_saturday": setting.work_on_saturday,
            "allow_client_registration": setting.allow_client_registration,
        } if setting else None,
        "subscription": {
            **summary,
            "status": subscription.status,
            "grace_period_days": subscription.grace_period_days,
            "notes": subscription.notes,
            "pricing_reason": subscription.pricing_reason,
        },
        "invoices": SubscriptionInvoiceSerializer(invoices, many=True).data,
        "activity": [
            {
                "id": item.id,
                "action_label": item.get_action_display(),
                "summary": item.summary,
                "actor": item.actor.full_name if item.actor else None,
                "created_at": item.created_at,
            }
            for item in firm.platform_activities.select_related("actor")[:15]
        ],
    }


class FirmListCreateView(PlatformView):
    def get(self, request):
        params = request.query_params
        firms = PlatformMonitoringService.firms_queryset(
            search=params.get("search", "").strip(),
            plan=params.get("plan", ""),
            status=params.get("status", ""),
            active=params.get("active", ""),
        )
        return Response(paginate(request, firms, PlatformMonitoringService.firm_row))

    def post(self, request):
        serializer = RegisterFirmSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationError(dotted_errors(serializer.errors))
        firm, invitation_url = FirmOnboardingService.register_firm(
            data=serializer.validated_data, actor=request.user,
        )
        return Response(
            {"firm": firm_detail_payload(firm), "owner_invitation_url": invitation_url},
            status=status.HTTP_201_CREATED,
        )


class FirmDetailView(PlatformView):
    def delete(self, request, firm_id):
        try:
            result = TrialFirmDeletionService.delete(
                actor=request.user, firm_id=firm_id, confirmation=request.data.get('confirmation', ''),
            )
        except IntegrityError:
            return Response({'detail': 'The firm changed during deletion. Refresh and retry; no records were removed.'}, status=status.HTTP_409_CONFLICT)
        return Response(result)

    def get(self, request, firm_id):
        return Response(firm_detail_payload(get_object_or_404(LawFirm, id=firm_id)))

    def patch(self, request, firm_id):
        firm = get_object_or_404(LawFirm, id=firm_id)
        serializer = FirmProfileUpdateSerializer(firm, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        changed = ", ".join(sorted(serializer.validated_data)) or "no fields"
        PlatformActivity.record(request.user, Action.FIRM_UPDATED, f"Updated {firm.name}: {changed}.", firm=firm)
        return Response(firm_detail_payload(firm))


class FirmStatusView(PlatformView):
    def post(self, request, firm_id):
        firm = get_object_or_404(LawFirm, id=firm_id)
        serializer = FirmStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        firm.is_active = serializer.validated_data["is_active"]
        firm.save(update_fields=["is_active", "updated_at"])
        reason = serializer.validated_data.get("reason", "").strip()
        if firm.is_active:
            summary, action = f"Reactivated {firm.name}.", Action.FIRM_REACTIVATED
        else:
            summary, action = f"Suspended {firm.name}.", Action.FIRM_SUSPENDED
        if reason:
            summary = f"{summary} Reason: {reason}"
        PlatformActivity.record(request.user, action, summary, firm=firm)
        return Response(firm_detail_payload(firm))


class FirmSubscriptionView(PlatformView):
    @transaction.atomic
    def post(self, request, firm_id):
        firm = get_object_or_404(LawFirm.objects.select_for_update(), id=firm_id)
        serializer = SubscriptionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        subscription = SubscriptionService.get(firm, lock=True)

        special_fields = ("is_complimentary", "custom_monthly_price", "custom_annual_price")
        terms_changed = any(field in data and data[field] != getattr(subscription, field) for field in special_fields)
        if terms_changed and not data.get("pricing_reason", "").strip():
            raise ValidationError({"pricing_reason": "Record a reason for changing this firm's billing terms."})
        if terms_changed and SubscriptionInvoice.objects.filter(firm=firm, status=SubscriptionInvoice.Status.PAYMENT_SUBMITTED).exists():
            raise ValidationError({"subscription": "Confirm or void the submitted payment before changing billing terms."})
        if (subscription.is_complimentary and data.get("is_complimentary") is False
                and data.get("status", subscription.status) == FirmSubscription.Status.ACTIVE
                and data.get("current_period_end", subscription.current_period_end) is None):
            raise ValidationError({"current_period_end": "Set an access end date when returning a complimentary firm to paid billing."})
        changes = []
        if "plan_code" in data and data["plan_code"] != subscription.plan.code:
            plan = Plan.objects.get(code=data["plan_code"])
            # The firm's usage figures stay private; its owner sees them on their own dashboard.
            if SubscriptionService.overages(firm, plan):
                raise ValidationError({"plan_code": [
                    f"The firm uses more than {plan.name} allows. Its owner must reduce usage before the plan can change.",
                ]})
            changes.append(f"plan {subscription.plan.name} → {plan.name}")
            subscription.plan = plan
        for field in ("billing_cycle", "status", "trial_ends_at", "current_period_end", "grace_period_days", "notes", "is_complimentary", "custom_monthly_price", "custom_annual_price", "pricing_reason"):
            if field in data and data[field] != getattr(subscription, field):
                setattr(subscription, field, data[field])
                changes.append(f"{field.replace('_', ' ')} = {data[field]}" if field in (*special_fields, "pricing_reason") else field.replace("_", " "))
        if subscription.status == FirmSubscription.Status.ACTIVE and "status" in data and not subscription.current_period_start:
            subscription.current_period_start = timezone.now()
        if terms_changed:
            SubscriptionInvoice.objects.filter(firm=firm, status=SubscriptionInvoice.Status.ISSUED).update(status=SubscriptionInvoice.Status.VOID)
        if subscription.is_complimentary and terms_changed:
            subscription.status = FirmSubscription.Status.ACTIVE
            subscription.trial_ends_at = None
            if not subscription.current_period_start:
                subscription.current_period_start = timezone.now()
            # A dated exemption uses current_period_end; omission grants ongoing access.
            if "current_period_end" not in data:
                subscription.current_period_end = None
        subscription.save()

        if changes:
            PlatformActivity.record(
                request.user, Action.SUBSCRIPTION_UPDATED,
                f"Updated the subscription of {firm.name}: {', '.join(changes)}.", firm=firm,
            )
        return Response(firm_detail_payload(firm))


class FirmOwnerInvitationView(PlatformView):
    def post(self, request, firm_id):
        firm = get_object_or_404(LawFirm, id=firm_id)
        link = FirmOnboardingService.send_owner_invitation(firm)
        PlatformActivity.record(
            request.user, Action.OWNER_INVITED,
            f"Sent {firm.owner.full_name} a new password link for {firm.name}.", firm=firm,
        )
        return Response({"owner_invitation_url": link, "email": firm.owner.email})


class FirmTemporaryPasswordView(PlatformView):
    @transaction.atomic
    def post(self, request, firm_id):
        firm = get_object_or_404(LawFirm, id=firm_id)
        owner = User.objects.select_for_update().get(pk=firm.owner_id)
        if not owner.is_active:
            raise ValidationError("Reactivate the firm owner account before generating a password.")
        password = secrets.token_urlsafe(18)
        owner.set_password(password)
        owner.must_change_password = True
        owner.save(update_fields=["password", "must_change_password", "updated_at"])
        PlatformActivity.record(
            request.user, Action.FIRM_UPDATED,
            f"Issued a temporary password for {owner.email} at {firm.name}.", firm=firm,
        )
        response = Response({"email": owner.email, "temp_password": password})
        response["Cache-Control"] = "no-store"
        return response


class FirmLogoUploadView(PlatformView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, firm_id):
        firm = get_object_or_404(LawFirm, id=firm_id)
        serializer = LogoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        firm.logo = serializer.validated_data["logo"]
        firm.save(update_fields=["logo", "updated_at"])
        PlatformActivity.record(request.user, Action.FIRM_UPDATED, f"Updated the logo of {firm.name}.", firm=firm)
        return Response(firm_detail_payload(firm))


# ---------------------------------------------------------------------------
# Plans
# ---------------------------------------------------------------------------

def plans_with_counts():
    return Plan.objects.annotate(subscriber_count=Count("subscriptions")).order_by("sort_order", "monthly_price")


class PlanListCreateView(PlatformView):
    def get(self, request):
        return Response({
            "plans": PlanSerializer(plans_with_counts(), many=True).data,
            "features": [{"code": code, "label": label} for code, label in Feature.LABELS.items()],
        })

    def post(self, request):
        serializer = PlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.save()
        PlatformActivity.record(request.user, Action.PLAN_CREATED, f"Created the {plan.name} plan ({plan.code}).")
        return Response(PlanSerializer(plans_with_counts().get(pk=plan.pk)).data, status=status.HTTP_201_CREATED)


class PlanDetailView(PlatformView):
    def patch(self, request, plan_id):
        plan = get_object_or_404(Plan, id=plan_id)
        serializer = PlanSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        PlatformActivity.record(request.user, Action.PLAN_UPDATED, f"Updated the {plan.name} plan.")
        return Response(PlanSerializer(plans_with_counts().get(pk=plan.pk)).data)

    def delete(self, request, plan_id):
        plan = get_object_or_404(Plan, id=plan_id)
        if plan.subscriptions.exists() or plan.invoices.exists():
            raise ValidationError({
                "detail": "Firms or invoices use this plan. Deactivate it instead so it is no longer offered.",
            })
        name = plan.name
        plan.delete()
        PlatformActivity.record(request.user, Action.PLAN_DELETED, f"Deleted the {name} plan.")
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class UserListView(PlatformView):
    def get(self, request):
        params = request.query_params
        users = PlatformMonitoringService.users_queryset(
            search=params.get("search", "").strip(),
            role=params.get("role", ""),
            firm=params.get("firm", ""),
            active=params.get("active", ""),
        )
        return Response(paginate(request, users, PlatformMonitoringService.user_row))


class UserStatusView(PlatformView):
    def patch(self, request, user_id):
        user = get_object_or_404(PlatformMonitoringService.visible_users(), id=user_id)
        if user.pk == request.user.pk:
            raise ValidationError({"detail": "You cannot deactivate your own account."})
        serializer = UserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.is_active = serializer.validated_data["is_active"]
        user.save(update_fields=["is_active", "updated_at"])
        firm = getattr(user, "owned_firm", None)
        action = Action.USER_ACTIVATED if user.is_active else Action.USER_DEACTIVATED
        verb = "Activated" if user.is_active else "Deactivated"
        PlatformActivity.record(request.user, action, f"{verb} {user.full_name} ({user.email}).", firm=firm)
        return Response(PlatformMonitoringService.user_row(user))


# ---------------------------------------------------------------------------
# Subscription payments
# ---------------------------------------------------------------------------

class InvoiceListView(PlatformView):
    def get(self, request):
        invoices = SubscriptionInvoice.objects.select_related("plan", "firm").order_by("-created_at")
        invoice_status = request.query_params.get("status", "")
        if invoice_status:
            invoices = invoices.filter(status=invoice_status)

        def row(invoice):
            return {**SubscriptionInvoiceSerializer(invoice).data, "firm": {"id": invoice.firm_id, "name": invoice.firm.name}}

        return Response(paginate(request, invoices, row))


class InvoiceConfirmView(PlatformView):
    def post(self, request, invoice_id):
        invoice = get_object_or_404(SubscriptionInvoice, id=invoice_id)
        invoice = SubscriptionService.confirm_payment(invoice=invoice, confirmed_by=request.user)
        PlatformActivity.record(
            request.user, Action.PAYMENT_CONFIRMED,
            f"Confirmed payment of {invoice.number} (KES {invoice.total}) for {invoice.firm.name}.",
            firm=invoice.firm,
        )
        NotificationService.notify_firm_owner(
            firm=invoice.firm, actor=request.user,
            title=f"Payment confirmed: {invoice.number}",
            message=f"Your M-Pesa payment of KES {invoice.total} was confirmed. Your {invoice.plan.name} plan is active.",
            action_url="/admin/subscription",
            event_key=f"SUBSCRIPTION_PAID:{invoice.id}",
        )
        return Response(SubscriptionInvoiceSerializer(invoice).data)


class InvoiceVoidView(PlatformView):
    def post(self, request, invoice_id):
        invoice = get_object_or_404(SubscriptionInvoice, id=invoice_id)
        if invoice.status not in {SubscriptionInvoice.Status.ISSUED, SubscriptionInvoice.Status.PAYMENT_SUBMITTED}:
            raise ValidationError({"detail": "Only an unpaid invoice can be voided."})
        invoice.status = SubscriptionInvoice.Status.VOID
        invoice.save(update_fields=["status", "updated_at"])
        PlatformActivity.record(
            request.user, Action.INVOICE_VOIDED, f"Voided {invoice.number} for {invoice.firm.name}.", firm=invoice.firm,
        )
        NotificationService.notify_firm_owner(
            firm=invoice.firm, actor=request.user,
            title=f"Invoice voided: {invoice.number}",
            message=f"The platform team voided invoice {invoice.number}. Contact them if you have already paid it.",
            action_url="/admin/subscription",
            event_key=f"SUBSCRIPTION_VOIDED:{invoice.id}",
        )
        return Response(SubscriptionInvoiceSerializer(invoice).data)


# ---------------------------------------------------------------------------
# Onboarding requests
# ---------------------------------------------------------------------------

class PublicOnboardingRequestView(APIView):
    """The homepage 'Register your firm' form while self-service sign-up is closed.

    The firm sends its full registration, so the platform only has to check and confirm it.
    A logo comes as multipart, with the rest of the request as JSON in `payload`.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "firm_onboarding_request"

    def get_throttles(self):
        # Loading the form's choices is not a submission.
        return [] if self.request.method == "GET" else super().get_throttles()

    def get(self, request):
        return Response({
            "business_structures": [{"value": value, "label": label} for value, label in LawFirm.BusinessStructure.choices],
            "counties": KENYAN_COUNTIES,
            "practice_areas": PRACTICE_AREA_SUGGESTIONS,
        })

    def post(self, request):
        data = request.data
        if "payload" in data:
            try:
                data = {**json.loads(data["payload"]), "logo": request.FILES.get("logo")}
            except (TypeError, ValueError):
                raise ValidationError({"payload": "Send the request details as JSON."})
        serializer = OnboardingRequestCreateSerializer(data=data)
        if not serializer.is_valid():
            raise ValidationError(dotted_errors(serializer.errors))
        item = serializer.save()
        NotificationService.notify_platform_admins(
            title=f"New registration request: {item.firm_name}",
            message=f"{item.contact_name} ({item.phone_number}, {item.email}) sent the full details to register {item.firm_name}.",
            action_url=f"/platform/requests?request={item.id}",
            event_key=f"FIRM_ONBOARDING_REQUEST:{item.id}",
        )
        return Response(
            {"detail": "Thank you. The platform team will check your details and register your firm."},
            status=status.HTTP_201_CREATED,
        )


class OnboardingRequestListView(PlatformView):
    def get(self, request):
        requests_ = FirmOnboardingRequest.objects.select_related("registered_firm")
        request_status = request.query_params.get("status", "")
        if request_status:
            requests_ = requests_.filter(status=request_status)
        return Response(paginate(request, requests_, lambda item: OnboardingRequestSerializer(item).data))


class OnboardingRequestLogoView(PlatformView):
    def get(self, request, request_id):
        item = get_object_or_404(FirmOnboardingRequest, id=request_id)
        if not item.logo:
            raise Http404("This request has no logo.")
        return FileResponse(item.logo.open("rb"))


class OnboardingRequestDetailView(PlatformView):
    def get(self, request, request_id):
        return Response(OnboardingRequestSerializer(get_object_or_404(FirmOnboardingRequest, id=request_id)).data)

    def patch(self, request, request_id):
        item = get_object_or_404(FirmOnboardingRequest, id=request_id)
        serializer = OnboardingRequestSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        PlatformActivity.record(
            request.user, Action.REQUEST_UPDATED,
            f"Marked the request from {item.firm_name} as {item.get_status_display().lower()}.",
        )
        return Response(OnboardingRequestSerializer(item).data)
