"""Isolated local walkthrough. Run with --settings=config.settings_practice."""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F403

practice_name = os.environ.get('PRACTICE_DB_NAME', 'lawfirm_practice')
if not practice_name.endswith('_practice'):
    raise ImproperlyConfigured('The practice database name must end in _practice.')

DATABASES = {'default': {  # noqa: F405
    'ENGINE': 'django.db.backends.postgresql',
    'NAME': practice_name,
    'USER': os.environ.get('PRACTICE_DB_USER', 'sheria_test'),
    'PASSWORD': os.environ.get('PRACTICE_DB_PASSWORD', ''),
    'HOST': os.environ.get('PRACTICE_DB_HOST', '/tmp'),
    'PORT': os.environ.get('PRACTICE_DB_PORT', '55439'),
}}
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']
MEDIA_ROOT = Path(os.environ.get('PRACTICE_MEDIA_ROOT', '/tmp/sheria-practice-media'))
EMAIL_BACKEND = 'apps.common.mail_backends.ReadableConsoleEmailBackend'
FRONTEND_URL = os.environ.get('PRACTICE_FRONTEND_URL', 'http://localhost:5174')
CORS_ALLOWED_ORIGINS = [FRONTEND_URL]
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]
OPENAI_API_KEY = ''
AI_EXTERNAL_RESEARCH_ENABLED = False
AI_AUTOMATIC_REASSESSMENT_ENABLED = False
AI_PREPARATION_LLM_ENABLED = False
