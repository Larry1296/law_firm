from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("clients", "0018_clientdocument_received_via")]

    operations = [
        migrations.AlterField(
            model_name="clientdocument",
            name="file",
            field=models.FileField(blank=True, upload_to="client_documents/"),
        ),
    ]
