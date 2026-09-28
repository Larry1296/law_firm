from django.urls import path

from apps.subscriptions.views import (
    PlanListView,
    SubscriptionInvoiceListCreateView,
    SubscriptionPaymentView,
    SubscriptionSummaryView,
)

urlpatterns = [
    path("", SubscriptionSummaryView.as_view(), name="subscription-summary"),
    path("plans/", PlanListView.as_view(), name="subscription-plans"),
    path("invoices/", SubscriptionInvoiceListCreateView.as_view(), name="subscription-invoices"),
    path("invoices/<uuid:invoice_id>/payment/", SubscriptionPaymentView.as_view(), name="subscription-payment"),
]
