"""Run every Django app test package without unittest's duplicate `tests` collision."""

from pathlib import Path
import os
import sys

from django.core.management import execute_from_command_line


BASE_DIR = Path(__file__).resolve().parent
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_test")

labels = sorted(
    f"apps.{path.parent.parent.name}.tests"
    for path in (BASE_DIR / "apps").glob("*/tests/__init__.py")
)
execute_from_command_line([sys.argv[0], "test", *labels, *sys.argv[1:]])
