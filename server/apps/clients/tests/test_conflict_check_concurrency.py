from datetime import date
from threading import Barrier, Lock, Thread
from unittest import skipUnless

from django.db import close_old_connections, connection, transaction
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.cases.models import Case
from apps.clients.models import Client, ClientMatterConflictCheck
from apps.clients.services.conflict.client_matter_conflict_service import ClientMatterConflictService
from apps.common.choices import ConflictCheckStatus, UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer
from apps.users.models import User


@skipUnless(connection.vendor == "postgresql", "Row-locking race test requires PostgreSQL.")
class ConflictCheckConsumptionConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = User.objects.create_user(
            email="conflict-race@example.com",
            password="pass",
            first_name="Race",
            last_name="Advocate",
            phone_number="+254700009001",
            national_id_number="RACE-ADV-001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Race Test Firm",
            registration_number="RACE-FIRM-001",
            owner=self.user,
        )
        self.lawyer = Lawyer.objects.create(
            user=self.user,
            law_firm=self.firm,
            staff_number="RACE-LAW-001",
            admission_number="RACE-ADV-001",
            date_hired=date(2026, 1, 1),
        )
        self.client_record = Client.objects.create(
            firm=self.firm,
            full_name="Race Test Client",
            email="race-client@example.com",
            phone_number="+254700009002",
            client_type=Client.ClientType.INDIVIDUAL,
            is_active=True,
        )
        now = timezone.now()
        self.check = ClientMatterConflictCheck.objects.create(
            firm=self.firm,
            client=self.client_record,
            reference_number="PMA/CONF/2026/RACE-0001",
            proposed_matter_title="Concurrent opening test",
            proposed_instructions="Open exactly one matter.",
            status=ConflictCheckStatus.CLEARED,
            responsible_lawyer=self.lawyer,
            decision_confirmation=True,
            decided_by=self.lawyer,
            decided_at=now,
            completed_at=now,
            acceptance_decision=ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED,
            accepted_by=self.lawyer,
            accepted_at=now,
            acceptance_decided_by=self.lawyer,
            acceptance_decided_at=now,
            created_by=self.user,
        )

    def test_clearance_can_be_consumed_only_once_under_concurrent_requests(self):
        barrier = Barrier(2)
        result_lock = Lock()
        results = []

        def attempt(index):
            close_old_connections()
            barrier.wait()
            try:
                with transaction.atomic():
                    user = User.objects.get(pk=self.user.pk)
                    firm = LawFirm.objects.get(pk=self.firm.pk)
                    client = Client.objects.get(pk=self.client_record.pk)
                    check = ClientMatterConflictService.validate_for_case_creation(
                        user=user,
                        firm=firm,
                        client=client,
                        conflict_check_id=self.check.pk,
                    )
                    case = Case.objects.create(
                        firm=firm,
                        client=client,
                        created_by=user,
                        case_number=f"RACE-{index}",
                        title=f"Race matter {index}",
                        description="Concurrent conflict-check consumption.",
                        matter_status=Case.MatterStatus.MATTER_OPEN,
                    )
                    ClientMatterConflictService.consume_for_case(
                        check=check,
                        case=case,
                        actor=user,
                    )
                outcome = "created"
            except ValidationError:
                outcome = "rejected"
            finally:
                close_old_connections()
            with result_lock:
                results.append(outcome)

        threads = [Thread(target=attempt, args=(index,)) for index in (1, 2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=10)

        self.assertEqual(sorted(results), ["created", "rejected"])
        self.assertEqual(Case.objects.count(), 1)
        self.check.refresh_from_db()
        self.assertIsNotNone(self.check.created_case_id)
        self.assertEqual(
            self.check.history.filter(action="CONSUMED_FOR_CASE").count(),
            1,
        )
