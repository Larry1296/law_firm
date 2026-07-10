from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.client_serializer import ClientSerializer
from apps.clients.serializers.individual_client_create_serializer import (
    IndividualClientCreateSerializer,
)
from apps.clients.services.individual_client_service import (
    IndividualClientService,
)


class IndividualClientCreateView(APIView):

    def post(self, request, *args, **kwargs):
        serializer = IndividualClientCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "message": "Validation failed.",
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = IndividualClientService.create_client(
                validated_data=serializer.validated_data,
                user=request.user,
            )

            response = {
                "success": True,
                "message": "Individual client created successfully.",
                "client": ClientSerializer(result["client"]).data,
            }

            if result.get("temp_password"):
                response["temp_password"] = result["temp_password"]

            return Response(
                response,
                status=status.HTTP_201_CREATED,
            )

        except IntegrityError as e:
            return Response(
                {
                    "success": False,
                    "message": "Database constraint violated.",
                    "errors": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )