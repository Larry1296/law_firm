from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clients", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="client",
            name="client_type",
            field=models.CharField(
                choices=[
                    ("INDIVIDUAL", "Individual"),
                    ("COMPANY", "Company"),
                    ("PARTNERSHIP", "Partnership"),
                    ("NGO", "NGO"),
                    ("TRUST", "Trust"),
                    ("GOVERNMENT", "Government"),
                    ("BUSINESS_ENTITY", "Business Entity"),
                    ("GOVERNMENT_BODY", "Government Body"),
                    ("FINANCIAL_INSTITUTION", "Financial Institution"),
                    ("NGO_ASSOCIATION", "NGO / Association"),
                    ("RELIGIOUS_ORGANIZATION", "Religious Organization"),
                    ("EDUCATIONAL_INSTITUTION", "Educational Institution"),
                    ("ESTATE", "Estate"),
                    ("REPRESENTATIVE", "Representative"),
                    ("COOPERATIVE", "Cooperative"),
                    ("SACCO", "SACCO"),
                    ("INTERNATIONAL_ENTITY", "International Entity"),
                ],
                max_length=50,
            ),
        ),
    ]
