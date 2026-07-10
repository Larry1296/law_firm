import re
import secrets
import string
from datetime import datetime


def generate_temp_password(name: str, length: int = 5) -> str:
    """
    Generates a secure temporary password for:
    - Clients (individual & company)
    - Staff users
    - Portal users
    - Firm users

    Format:
        PREFIX + RANDOM + YEAR

    Example:
        MICROa8K22026
        JOHNxP92Z2026
    """

    if not name:
        raise ValueError("Name is required to generate password")

    # Clean input
    cleaned = re.sub(r"[^A-Za-z0-9]", "", name)

    # Stable prefix for identification
    prefix = cleaned[:5].upper().ljust(5, "X")

    # Secure randomness
    random_part = ''.join(
        secrets.choice(string.ascii_letters + string.digits)
        for _ in range(length)
    )

    year = datetime.now().year

    return f"{prefix}{random_part}{year}"