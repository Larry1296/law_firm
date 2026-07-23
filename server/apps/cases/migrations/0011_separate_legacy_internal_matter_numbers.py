from django.db import migrations, models


def forwards(apps, schema_editor):
    Case = apps.get_model('cases', 'Case')
    for firm_id in Case.objects.values_list('firm_id', flat=True).distinct():
        firm_cases = Case.objects.filter(firm_id=firm_id)
        existing_numbers = set(firm_cases.values_list('case_number', flat=True))
        legacy_cases = list(
            firm_cases.exclude(official_court_case_number='')
            .filter(case_number__iexact=models.F('official_court_case_number'))
            .order_by('created_at', 'id')
        )
        counters = {}
        for case in legacy_cases:
            year = case.created_at.year if case.created_at else 2026
            counters.setdefault(year, 1)
            while True:
                candidate = f'MAT-{year}-{counters[year]:05d}'
                counters[year] += 1
                if candidate not in existing_numbers:
                    break
            existing_numbers.add(candidate)
            case.case_number = candidate
            case.save(update_fields=['case_number'])


def backwards(apps, schema_editor):
    # Reversing would collapse distinct internal and official identifiers, so preserve data.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('cases', '0010_case_accepted_instruction_snapshot_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
