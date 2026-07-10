from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.client_serializer import ClientSerializer
from apps.clients.serializers.company_client_create_serializer import (
    CompanyClientCreateSerializer,
)
from apps.clients.services.company_client_service import CompanyClientService


class CompanyClientCreateView(APIView):

    def post(self, request, *args, **kwargs):
        serializer = CompanyClientCreateSerializer(data=request.data)

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
            result = CompanyClientService.create_client(
                validated_data=serializer.validated_data,
                user=request.user,
            )

            return Response(
                {
                    "success": True,
                    "message": "Company client created successfully.",
                    "client": ClientSerializer(result["client"]).data,
                    "temp_password": result["temp_password"],
                },
                status=status.HTTP_201_CREATED,
            )

        except IntegrityError as e:
            return Response(
                {
                    "success": False,
                    "message": str(e),
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