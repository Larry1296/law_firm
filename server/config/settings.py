from pathlib import Path
from datetime import timedelta
from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent


# ==========================================================
# SECURITY
# ==========================================================

SECRET_KEY = config("SECRET_KEY")

DEBUG = config("DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1",
    cast=lambda value: [host.strip() for host in value.split(",")],
)

CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="",
    cast=lambda value: [origin.strip() for origin in value.split(",") if origin.strip()],
)

DEFAULT_COURT_HEARING_MODE = config("DEFAULT_COURT_HEARING_MODE", default="VIRTUAL")

# Public website tenant. Required when the request hostname (for example
# localhost in development) cannot be matched uniquely to a firm's website.
PUBLIC_FIRM_ID = config("PUBLIC_FIRM_ID", default="").strip()


# ==========================================================
# APPLICATIONS
# ==========================================================

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
]

LOCAL_APPS = [
    "apps.common",
    "apps.users",
    "apps.authentication",
    "apps.permissions",
    "apps.clients",
    "apps.firm",
    "apps.staff",
    "apps.cases",
    "apps.events",
    "apps.tasks",
    "apps.scheduling",
    "apps.communications",
    "apps.notifications",
    "apps.documents",
    "apps.courtroom",
    "apps.ai",
    "apps.billing",
    "apps.subscriptions",
    "apps.reports",
    "apps.audit_logs",
    "apps.portal",
    "apps.platform_admin",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS


# ==========================================================
# MIDDLEWARE
# ==========================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ==========================================================
# AUTHENTICATION BACKENDS
# ==========================================================

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

# ==========================================================
#  SIMPLE JWT SETTINGS
# ==========================================================
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),

    "AUTH_HEADER_TYPES": ("Bearer",),

    "AUTH_TOKEN_CLASSES": (
        "rest_framework_simplejwt.tokens.AccessToken",
    ),
}

# ==========================================================
# URLS
# ==========================================================

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# ==========================================================
# TEMPLATES
# ==========================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ==========================================================
# DATABASE
# ==========================================================

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
    }
}


# ==========================================================
# CUSTOM USER
# ==========================================================

AUTH_USER_MODEL = "users.User"


# ==========================================================
# PASSWORD VALIDATION
# ==========================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ==========================================================
# INTERNATIONALIZATION
# ==========================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Africa/Nairobi"

USE_I18N = True

USE_TZ = True


# ==========================================================
# STATIC FILES
# ==========================================================

STATIC_URL = "static/"

STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_DIRS = [
    BASE_DIR / "static",
]


# ==========================================================
# MEDIA FILES
# ==========================================================

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"


# ==========================================================
# DEFAULT PRIMARY KEY
# ==========================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ==========================================================
# DJANGO REST FRAMEWORK
# ==========================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.authentication.portal_access.AcceptanceGatedJWTAuthentication",
    ),

    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],

    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],

    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],

    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "knowledge_base_ask": config("KNOWLEDGE_BASE_RATE_LIMIT", default="10/hour"),
        "firm_signup": config("FIRM_SIGNUP_RATE_LIMIT", default="5/hour"),
        "account_recovery": config("ACCOUNT_RECOVERY_RATE_LIMIT", default="5/hour"),
        "firm_onboarding_request": config("FIRM_ONBOARDING_REQUEST_RATE_LIMIT", default="5/hour"),
        "dashboard_assistant": config("DASHBOARD_ASSISTANT_RATE_LIMIT", default="60/hour"),
    },
}

# ==========================================================
# SAAS SUBSCRIPTIONS
# ==========================================================

# Off by default: firms are onboarded by the platform until self-service sign-up is switched on.
ALLOW_PUBLIC_FIRM_SIGNUP = config("ALLOW_PUBLIC_FIRM_SIGNUP", default=False, cast=bool)
SUBSCRIPTION_TRIAL_PLAN = config("SUBSCRIPTION_TRIAL_PLAN", default="PRO")
SUBSCRIPTION_TRIAL_DAYS = config("SUBSCRIPTION_TRIAL_DAYS", default=14, cast=int)
SUBSCRIPTION_VAT_RATE = config("SUBSCRIPTION_VAT_RATE", default="16.00")
SUBSCRIPTION_MPESA_PAYBILL = config("SUBSCRIPTION_MPESA_PAYBILL", default="")

# The model behind every assistant: Claude first, OpenAI when Claude fails.
# AI_PROVIDER="openai" tries OpenAI first instead.
AI_PROVIDER = config("AI_PROVIDER", default="auto")
AI_FALLBACK_ENABLED = config("AI_FALLBACK_ENABLED", default=True, cast=bool)
# Seconds per provider; with a fallback a question can take up to twice this.
AI_REQUEST_TIMEOUT = config("AI_REQUEST_TIMEOUT", default=20, cast=int)
ANTHROPIC_API_KEY = config("ANTHROPIC_API_KEY", default="")
ANTHROPIC_MODEL = config("ANTHROPIC_MODEL", default="claude-sonnet-5-5")
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
OPENAI_MODEL = config("OPENAI_MODEL", default="gpt-5.4-mini")
KNOWLEDGE_BASE_MAX_CONTEXT_ITEMS = config("KNOWLEDGE_BASE_MAX_CONTEXT_ITEMS", default=4, cast=int)
KNOWLEDGE_BASE_MIN_RELEVANCE = config("KNOWLEDGE_BASE_MIN_RELEVANCE", default=0.15, cast=float)
KNOWLEDGE_BASE_REQUEST_TIMEOUT = config("KNOWLEDGE_BASE_REQUEST_TIMEOUT", default=20, cast=int)
AI_EXTERNAL_RESEARCH_ENABLED = config("AI_EXTERNAL_RESEARCH_ENABLED", default=False, cast=bool)
AI_CASE_ASSESSMENT_RETENTION_DAYS = config("AI_CASE_ASSESSMENT_RETENTION_DAYS", default=365, cast=int)
AI_AUTOMATIC_REASSESSMENT_ENABLED = config("AI_AUTOMATIC_REASSESSMENT_ENABLED", default=False, cast=bool)
AI_KNOWLEDGE_INDEX_MODE = config("AI_KNOWLEDGE_INDEX_MODE", default="database")
# Sends minimised, de-identified matter facts to the configured AI model to tailor court preparation briefs.
AI_PREPARATION_LLM_ENABLED = config("AI_PREPARATION_LLM_ENABLED", default=False, cast=bool)

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:5173,http://127.0.0.1:5173",
    cast=Csv(),
)

FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="noreply@sheriamaster.local")
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="apps.common.mail_backends.ReadableConsoleEmailBackend",
)
