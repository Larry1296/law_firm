"""Run through manage.py shell with config.settings_test and a /tmp SQLite database only."""
from datetime import date
from pathlib import Path

from django.conf import settings

from apps.clients.tests.test_walk_in_enquiries import user
from apps.firm.models import LawFirm, LawFirmMember
from apps.staff.models import Secretary, SecretaryPermission, SecretaryPermissionGrant

connection = settings.DATABASES['default']
if connection['ENGINE'] != 'django.db.backends.sqlite3' or not Path(connection['NAME']).resolve().is_relative_to('/tmp'):
    raise RuntimeError('Browser fixtures require an isolated SQLite database under /tmp.')
if LawFirm.objects.exists():
    raise RuntimeError('Use an empty browser test database; existing firm records will not be modified.')
owner = user(8001)
firm = LawFirm.objects.create(owner=owner, name='Step 1 Browser Test Firm', registration_number='STEP1-BROWSER',
    email='privacy@example.com', phone_number='+254700000000', physical_address='Test office, Nairobi')
secretary_user = user(8002, 'STAFF')
secretary_user.must_change_password = False
secretary_user.save(update_fields=['must_change_password'])
secretary = Secretary.objects.create(user=secretary_user, law_firm=firm,
    staff_number='STEP1-SEC', date_hired=date(2026, 1, 1))
SecretaryPermissionGrant.objects.create(secretary=secretary, code=SecretaryPermission.MANAGE_CLIENTS)
LawFirmMember.objects.create(firm=firm, user=secretary_user, role='SECRETARY', created_by=owner)
print('Fictional Step 1 browser accounts created; privacy configuration intentionally incomplete.')
print('Admin: enquiry-8001@example.com; secretary: enquiry-8002@example.com; password: test-pass')
