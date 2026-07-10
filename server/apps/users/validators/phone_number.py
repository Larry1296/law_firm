import re

from django.core.exceptions import ValidationError


def normalize_phone_number(phone_number: str) -> str:


    if not phone_number:
        raise ValidationError("Phone number is required.")

    # Remove spaces, dashes, brackets, etc.
    phone_number = re.sub(r"\D", "", phone_number.strip())

    # Convert 254XXXXXXXXX -> 0XXXXXXXXX
    if phone_number.startswith("254"):
        phone_number = "0" + phone_number[3:]

    # Convert 7XXXXXXXX or 1XXXXXXXX -> 07XXXXXXXX / 01XXXXXXXX
    elif len(phone_number) == 9 and (
        phone_number.startswith("7")
        or phone_number.startswith("1")
    ):
        phone_number = "0" + phone_number

    # Final validation
    if len(phone_number) != 10:
        raise ValidationError(
            "Phone number must contain exactly 10 digits."
        )

    if not (
        phone_number.startswith("07")
        or phone_number.startswith("01")
    ):
        raise ValidationError(
            "Enter a valid Kenyan mobile phone number."
        )

    return phone_number