from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0013_companyclient_beneficial_ownership_verified_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="client",
            name="previous_user_is_active",
            field=models.BooleanField(blank=True, null=True),
        ),
    ]
