from django.db import migrations, models


def correct_unclassified_documents(apps, schema_editor):
    ClientDocument = apps.get_model("clients", "ClientDocument")
    kyc_subtypes = {
        "NATIONAL_ID", "PASSPORT", "ALIEN_ID", "KRA_PIN", "PROOF_OF_ADDRESS",
        "INCORPORATION", "CR12", "BUSINESS_REGISTRATION", "TRUST_DEED",
        "AUTHORITY_TO_INSTRUCT",
    }
    matter_subtypes = {
        "SALE_AGREEMENT", "CONTRACT", "INVOICE", "RECEIPT", "DELIVERY_NOTE",
        "CORRESPONDENCE", "MEDICAL_RECORD", "POLICE_ABSTRACT", "TITLE_DEED",
        "OFFICIAL_SEARCH",
    }
    ClientDocument.objects.filter(subtype__in=kyc_subtypes).update(classification="CLIENT_KYC")
    ClientDocument.objects.filter(subtype__in=matter_subtypes).update(classification="MATTER_SPECIFIC")
    ClientDocument.objects.exclude(
        subtype__in=kyc_subtypes | matter_subtypes,
    ).exclude(
        classification__in=["CLIENT_GENERAL", "VALUABLE_ORIGINAL"],
    ).update(classification="UNCLASSIFIED_PENDING_REVIEW")


class Migration(migrations.Migration):
    dependencies = [("clients", "0028_physical_matter_file_workflow")]

    operations = [
        migrations.AlterField(
            model_name="clientdocument",
            name="classification",
            field=models.CharField(
                choices=[
                    ("CLIENT_KYC", "Client KYC"),
                    ("MATTER_SPECIFIC", "Matter Specific"),
                    ("CLIENT_GENERAL", "Client General"),
                    ("VALUABLE_ORIGINAL", "Valuable Original"),
                    ("UNCLASSIFIED_PENDING_REVIEW", "Unclassified Pending Review"),
                ],
                default="UNCLASSIFIED_PENDING_REVIEW",
                max_length=40,
            ),
        ),
        migrations.RunPython(correct_unclassified_documents, migrations.RunPython.noop),
    ]
