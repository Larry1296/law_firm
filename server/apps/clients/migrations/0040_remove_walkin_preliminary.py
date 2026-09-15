from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("clients", "0039_preliminaryreview_preliminaryphysicalfile_and_more"),
        ("tasks", "0002_delete_task"),
    ]

    operations = [
        migrations.DeleteModel(name="PreliminaryPhysicalFile"),
        migrations.DeleteModel(name="PreliminaryReviewHistory"),
        migrations.DeleteModel(name="PreliminaryReview"),
        migrations.DeleteModel(name="WalkInNoticeDelivery"),
        migrations.DeleteModel(name="WalkInPrivacyConfig"),
        migrations.DeleteModel(name="WalkInEnquiryCorrection"),
        migrations.DeleteModel(name="WalkInEnquirySequence"),
        migrations.DeleteModel(name="WalkInEnquiry"),
    ]
