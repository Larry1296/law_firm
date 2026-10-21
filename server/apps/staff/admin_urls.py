from django.urls import include, path

from apps.staff.views.admin.staff_sign_in_link_view import AdminStaffSignInLinkView
from apps.staff.views.admin.temporary_password_view import AdminTemporaryPasswordView

urlpatterns = [
    path("temporary-password/", AdminTemporaryPasswordView.as_view(), name="admin-temporary-password"),
    path("lawyers/", include("apps.staff.lawyer_admin_urls")),
    path("secretaries/", include("apps.staff.secretary_admin_urls")),
    path("accountants/", include("apps.staff.accountant_admin_urls")),
    path("hr/", include("apps.staff.hr_admin_urls")),
    path("it/", include("apps.staff.it_admin_urls")),
    path("sign-in-link/", AdminStaffSignInLinkView.as_view(), name="admin-staff-sign-in-link"),
]
