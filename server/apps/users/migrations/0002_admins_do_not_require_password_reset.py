from django.db import migrations, models


def clear_admin_password_reset_flag(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(role="ADMIN", must_change_password=True).update(
        must_change_password=False
    )


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="must_change_password",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(
            clear_admin_password_reset_flag,
            migrations.RunPython.noop,
        ),
    ]
