import os

os.environ.setdefault("SECRET_KEY", "test-only-secret-key-at-least-32-bytes")
os.environ.setdefault("DB_NAME", "unused-by-sqlite-tests")
os.environ.setdefault("DB_USER", "unused-by-sqlite-tests")
os.environ.setdefault("DB_PASSWORD", "unused-by-sqlite-tests")

from .settings import *  # noqa: F403


if os.environ.get("TEST_DATABASE_BACKEND", "sqlite").lower() == "postgresql":
    DATABASES = {  # noqa: F405
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("TEST_DB_NAME", "lawfirm_test"),
            "USER": os.environ.get("TEST_DB_USER", "postgres"),
            "PASSWORD": os.environ.get("TEST_DB_PASSWORD", "postgres"),
            "HOST": os.environ.get("TEST_DB_HOST", "localhost"),
            "PORT": os.environ.get("TEST_DB_PORT", "5432"),
        }
    }
else:
    DATABASES = {  # noqa: F405
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "test.sqlite3",  # noqa: F405
            "TEST": {
                # A file-backed database avoids SQLite shared-memory instability
                # in transaction/concurrency tests and can be reused with --keepdb.
                "NAME": BASE_DIR / "test_runner.sqlite3",  # noqa: F405
            },
        }
    }

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]
