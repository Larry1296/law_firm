from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("clients", "0017_clientdocument_custody_notes_and_more")]

    operations = [
        migrations.AddField(
            model_name="clientdocument",
            name="received_via",
            field=models.CharField(
                choices=[
                    ("CLIENT_PORTAL", "Client portal"),
                    ("IN_PERSON", "Delivered in person"),
                    ("EMAIL", "Email"),
                    ("WHATSAPP", "WhatsApp"),
                    ("COURIER", "Courier"),
                    ("OTHER", "Other"),
                ],
                default="CLIENT_PORTAL",
                max_length=30,
            ),
        ),
    ]
