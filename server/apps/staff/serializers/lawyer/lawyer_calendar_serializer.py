from rest_framework import serializers


class LawyerCalendarEventSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    start = serializers.CharField(read_only=True)
    end = serializers.CharField(read_only=True)
