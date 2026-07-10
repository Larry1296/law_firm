from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.db import IntegrityError
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def _stringify_error(value):
    if isinstance(value, list):
        return " ".join(str(item) for item in value)

    if isinstance(value, dict):
        return " ".join(_stringify_error(item) for item in value.values())

    return str(value)


def _flatten_errors(data):
    if not isinstance(data, dict):
        return {}

    return {
        field: _stringify_error(messages)
        for field, messages in data.items()
        if field not in {"detail", "message"}
    }


def _first_message(data, fallback):
    if isinstance(data, dict):
        for key in ("message", "detail", "non_field_errors"):
            if key in data:
                return _stringify_error(data[key])

        for field, messages in data.items():
            if field in {"message", "detail"}:
                continue

            return f"{field.replace('_', ' ').title()}: {_stringify_error(messages)}"

    if isinstance(data, list):
        return _stringify_error(data)

    if data:
        return str(data)

    return fallback


def _duplicate_message(exc):
    raw = str(exc).lower()

    if "unique" in raw or "duplicate" in raw:
        return "A record with these details already exists."

    return "This request conflicts with an existing record."


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        if isinstance(exc, IntegrityError):
            return Response(
                {
                    "success": False,
                    "message": _duplicate_message(exc),
                    "detail": _duplicate_message(exc),
                    "errors": {},
                },
                status=status.HTTP_409_CONFLICT,
            )

        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "message": "The requested resource was not found.",
                    "detail": "The requested resource was not found.",
                    "errors": {},
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if isinstance(exc, DjangoPermissionDenied):
            return Response(
                {
                    "success": False,
                    "message": "You do not have permission to perform this action.",
                    "detail": "You do not have permission to perform this action.",
                    "errors": {},
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "success": False,
                "message": "The server encountered an unexpected error.",
                "detail": "The server encountered an unexpected error.",
                "errors": {},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    fallback_messages = {
        status.HTTP_400_BAD_REQUEST: "Please correct the highlighted errors.",
        status.HTTP_401_UNAUTHORIZED: "Authentication failed.",
        status.HTTP_403_FORBIDDEN: "You do not have permission to perform this action.",
        status.HTTP_404_NOT_FOUND: "The requested resource was not found.",
        status.HTTP_405_METHOD_NOT_ALLOWED: "This action is not allowed.",
        status.HTTP_409_CONFLICT: "This request conflicts with an existing record.",
        status.HTTP_500_INTERNAL_SERVER_ERROR: "The server encountered an unexpected error.",
    }

    message = _first_message(
        response.data,
        fallback_messages.get(response.status_code, "Request failed."),
    )
    errors = _flatten_errors(response.data)

    response.data = {
        "success": False,
        "message": message,
        "detail": message,
        "errors": errors,
    }

    return response
