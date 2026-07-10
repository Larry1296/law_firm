from datetime import date

from rest_framework import serializers

from apps.staff.models.lawyer import Lawyer, LawyerPermission


class AdminLawyerDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    national_id_number = serializers.CharField(
        source="user.national_id_number",
        read_only=True,
    )

    law_firm_name = serializers.CharField(source="law_firm.name", read_only=True)
    reports_to_name = serializers.CharField(
        source="reports_to.user.full_name",
        read_only=True,
    )
    practice_areas = serializers.StringRelatedField(many=True, read_only=True)
    permissions = serializers.SerializerMethodField()
    available_permissions = serializers.SerializerMethodField()
    analytics = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        permissions = getattr(obj, "permissions", None)
        if permissions is None:
            return []
        return list(permissions.filter(is_active=True).values_list("code", flat=True))

    def get_available_permissions(self, obj):
        return [{"code": code, "label": label} for code, label in LawyerPermission.choices]

    def get_analytics(self, obj):
        today = date.today()
        tenure_days = None
        if obj.date_hired:
            tenure_days = (today - obj.date_hired).days

        engagement_health = "no_data"
        if obj.is_active:
            engagement_health = "active"
        elif obj.employment_status == "TERMINATED":
            engagement_health = "at_risk"
        else:
            engagement_health = "inactive"

        practice_areas = obj.practice_areas
        if practice_areas is None:
            practice_area_count = 0
        elif hasattr(practice_areas, "count"):
            try:
                practice_area_count = practice_areas.count()
            except TypeError:
                practice_area_count = len(practice_areas)
        else:
            practice_area_count = len(practice_areas)

        professional_readiness = {
            "practice_area_count": practice_area_count,
            "has_admission_number": bool(obj.admission_number),
            "has_practicing_certificate": bool(obj.practicing_certificate_number),
            "is_notary": obj.is_notary,
            "can_commission_oaths": obj.can_commission_oaths,
            "is_court_approved": obj.is_court_approved,
        }

        administrative_status = {
            "employment_status": obj.employment_status,
            "employment_type": obj.employment_type,
            "is_active": obj.is_active,
            "department": obj.department,
            "job_title": obj.job_title,
        }

        return {
            "tenure_days": tenure_days,
            "engagement_health": engagement_health,
            "professional_readiness": professional_readiness,
            "administrative_status": administrative_status,
            "profile_completeness": {
                "has_work_email": bool(obj.work_email),
                "has_work_phone": bool(obj.work_phone),
                "has_office_location": bool(obj.office_location),
                "has_professional_summary": bool(obj.professional_summary),
            },
        }

    class Meta:
        model = Lawyer
        fields = [
            "id",
            "staff_number",
            "employee_number",
            "full_name",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "national_id_number",
            "law_firm",
            "law_firm_name",
            "firm_role",
            "department",
            "job_title",
            "work_email",
            "work_phone",
            "office_location",
            "reports_to",
            "reports_to_name",
            "admission_number",
            "practicing_certificate_number",
            "bar_admission_date",
            "practice_areas",
            "is_notary",
            "can_commission_oaths",
            "is_court_approved",
            "employment_type",
            "employment_status",
            "date_hired",
            "probation_end_date",
            "date_terminated",
            "termination_reason",
            "professional_summary",
            "is_active",
            "permissions",
            "available_permissions",
            "created_at",
            "updated_at",
            "analytics",
        ]
        read_only_fields = fields
