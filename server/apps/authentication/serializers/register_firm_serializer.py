from rest_framework import serializers


class FirmSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    phone_number = serializers.CharField(required=False, allow_blank=True)
    kra_pin = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)


class AdminSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    phone_number = serializers.CharField(required=False, allow_blank=True)
    national_id_number = serializers.CharField(required=False, allow_blank=True)

    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    firm_role = serializers.CharField(default="LAWYER")

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError("Passwords do not match")
        return data


class RegisterFirmSerializer(serializers.Serializer):
    firm = FirmSerializer()
    admin = AdminSerializer()