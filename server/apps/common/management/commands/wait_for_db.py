"""Management command to wait for the database to become available.

Handles the race condition where Django starts before PostgreSQL has
finished initialising (``FATAL: the database system is starting up``).
"""

import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Wait until the database is reachable before returning."

    def add_arguments(self, parser):
        parser.add_argument(
            "--max-retries",
            type=int,
            default=30,
            help="Maximum number of connection attempts (default: 30).",
        )
        parser.add_argument(
            "--retry-delay",
            type=float,
            default=2.0,
            help="Seconds to wait between retries (default: 2.0).",
        )
        parser.add_argument(
            "--database",
            default="default",
            help="Database alias to check (default: 'default').",
        )

    def handle(self, *args, **options):
        max_retries = options["max_retries"]
        retry_delay = options["retry_delay"]
        db_alias = options["database"]
        verbosity = options["verbosity"]

        connection = connections[db_alias]

        for attempt in range(1, max_retries + 1):
            try:
                connection.ensure_connection()
                if verbosity >= 1:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Database '{db_alias}' is ready (attempt {attempt})."
                        )
                    )
                return
            except OperationalError as exc:
                if verbosity >= 1:
                    self.stdout.write(
                        f"Database '{db_alias}' not ready (attempt {attempt}/{max_retries}): "
                        f"{exc}"
                    )
                # Close the failed connection so the next retry starts fresh.
                connection.close()
                if attempt < max_retries:
                    time.sleep(retry_delay)

        self.stderr.write(
            self.style.ERROR(
                f"Could not connect to database '{db_alias}' after "
                f"{max_retries} attempts. Giving up."
            )
        )
        raise SystemExit(1)
