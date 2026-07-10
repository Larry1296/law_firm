from rest_framework import serializers


class LawyerProfileSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    first_name = serializers.CharField(required=False, allow_blank=False, max_length=100)
    last_name = serializers.CharField(required=False, allow_blank=False, max_length=100)
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False, max_length=20)
    national_id_number = serializers.CharField(read_only=True)
    staff_number = serializers.CharField(read_only=True)
    work_email = serializers.EmailField(required=False, allow_null=True)
    work_phone = serializers.CharField(required=False, allow_null=True, max_length=20)
    office_location = serializers.CharField(required=False, allow_null=True, max_length=255)
    department = serializers.CharField(required=False, allow_null=True, max_length=100)
    job_title = serializers.CharField(required=False, allow_null=True, max_length=100)
    professional_summary = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    is_notary = serializers.BooleanField(required=False)
    can_commission_oaths = serializers.BooleanField(required=False)
    is_court_approved = serializers.BooleanField(required=False)
    employment_status = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    law_firm_name = serializers.CharField(read_only=True)

    def to_representation(self, instance):
        if isinstance(instance, dict):
            return instance

        user = instance.user
        return {
            "id": str(instance.id),
            "full_name": user.full_name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "national_id_number": user.national_id_number,
            "staff_number": instance.staff_number,
            "work_email": instance.work_email,
            "work_phone": instance.work_phone,
            "office_location": instance.office_location,
            "department": instance.department,
            "job_title": instance.job_title,
            "professional_summary": instance.professional_summary,
            "is_notary": instance.is_notary,
            "can_commission_oaths": instance.can_commission_oaths,
            "is_court_approved": instance.is_court_approved,
            "employment_status": instance.employment_status,
            "is_active": instance.is_active,
            "law_firm_name": instance.law_firm.name,
        }
