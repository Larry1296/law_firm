import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def correct_unsafe_legacy_mappings(apps, schema_editor):
    Client = apps.get_model("clients", "Client")
    CooperativeClient = apps.get_model("clients", "CooperativeClient")
    unsafe = {
        "EDUCATIONAL_INSTITUTION", "RELIGIOUS_ORGANIZATION", "FINANCIAL_INSTITUTION",
        "NGO_ASSOCIATION", "REPRESENTATIVE", "BUSINESS_ENTITY",
    }
    for legacy in unsafe:
        Client.objects.filter(legacy_client_type=legacy).update(
            client_type="OTHER_REQUIRES_REVIEW", classification_review_status="REQUIRES_REVIEW",
            classification_review_reason="Legacy sector/capacity classification cannot be safely converted without legal-form review.",
        )
    confirmed_sacco_ids = CooperativeClient.objects.filter(client__legacy_client_type="SACCO").values_list("client_id", flat=True)
    CooperativeClient.objects.filter(client_id__in=confirmed_sacco_ids).update(subtype="SACCO")
    Client.objects.filter(id__in=confirmed_sacco_ids).update(client_type="COOPERATIVE", classification_review_status="NOT_REQUIRED")
    Client.objects.filter(legacy_client_type="SACCO").exclude(id__in=confirmed_sacco_ids).update(client_type="OTHER_REQUIRES_REVIEW", classification_review_status="REQUIRES_REVIEW")
    # Earlier migrations guessed these legal forms. Keep the history but require review.
    for legacy in ("GOVERNMENT", "GOVERNMENT_BODY", "INTERNATIONAL_ENTITY", "NGO"):
        Client.objects.filter(legacy_client_type=legacy).update(
            client_type="OTHER_REQUIRES_REVIEW", classification_review_status="REQUIRES_REVIEW",
            classification_review_reason="Legacy classification lacks sufficient evidence for deterministic conversion.",
        )


class Migration(migrations.Migration):
    dependencies = [("clients", "0034_clientmatterconflictcheck_pre_clearance_restricted_and_more"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.AlterField(model_name="client", name="client_type", field=models.CharField(max_length=50, choices=[
            ("INDIVIDUAL", "Individual"), ("SOLE_PROPRIETORSHIP", "Sole Proprietorship"), ("COMPANY", "Company"),
            ("PARTNERSHIP", "Partnership"), ("LIMITED_LIABILITY_PARTNERSHIP", "Limited Liability Partnership"),
            ("COOPERATIVE", "Cooperative"), ("SOCIETY_OR_ASSOCIATION", "Society or Association"),
            ("NON_PROFIT_ORGANIZATION", "Non-Profit Organization"), ("TRUST", "Trust"), ("ESTATE", "Estate"),
            ("PUBLIC_ENTITY", "Public Entity"), ("INTERNATIONAL_ORGANIZATION", "International Organization"),
            ("OTHER_REQUIRES_REVIEW", "Other legally recognized person or body — classification review required"),
            ("NGO", "NGO"), ("GOVERNMENT", "Government"), ("BUSINESS_ENTITY", "Business Entity"),
            ("GOVERNMENT_BODY", "Government Body"), ("FINANCIAL_INSTITUTION", "Financial Institution"),
            ("NGO_ASSOCIATION", "NGO / Association"), ("RELIGIOUS_ORGANIZATION", "Religious Organization"),
            ("EDUCATIONAL_INSTITUTION", "Educational Institution"), ("REPRESENTATIVE", "Representative"),
            ("SACCO", "SACCO"), ("INTERNATIONAL_ENTITY", "International Entity"),
        ])),
        migrations.AddField(model_name="client", name="provisional_legal_description", field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="client", name="classification_evidence_reference", field=models.CharField(blank=True, default="", max_length=255)),
        migrations.AddField(model_name="client", name="classification_review_reason", field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="client", name="classification_reviewed_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="client", name="classification_reviewed_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="classification_reviewed_clients", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="clientrepresentative", name="nationality", field=models.CharField(blank=True, default="", max_length=100)),
        migrations.AddField(model_name="clientrepresentative", name="is_authorized_to_give_instructions", field=models.BooleanField(default=False)),
        migrations.AlterField(model_name="clientrepresentative", name="representative_category", field=models.CharField(max_length=80, default="AUTHORIZED_AGENT", choices=[
            ("PROPRIETOR", "Proprietor"), ("PARTNER", "Partner"), ("DESIGNATED_PARTNER", "Designated Partner"),
            ("DIRECTOR", "Director"), ("COMPANY_SECRETARY", "Company Secretary"), ("TRUSTEE", "Trustee"),
            ("EXECUTOR", "Executor"), ("ADMINISTRATOR", "Administrator"), ("SOCIETY_OFFICIAL", "Society Official"),
            ("PBO_OFFICIAL", "PBO Official"), ("COOPERATIVE_OFFICER", "Co-operative Officer"),
            ("ACCOUNTING_OFFICER", "Accounting Officer"), ("ATTORNEY_GENERAL_REPRESENTATIVE", "Attorney-General Representative"),
            ("COUNTY_ATTORNEY", "County Attorney"), ("AUTHORIZED_PUBLIC_OFFICER", "Authorized Public Officer"),
            ("AUTHORIZED_AGENT", "Authorized Agent"), ("SCHOOL_INSTITUTION_AUTHORIZED_OFFICER", "School / Institution Authorized Officer"),
            ("UNIVERSITY_AUTHORIZED_OFFICER", "University Authorized Officer"), ("OTHER", "Other"),
        ])),
        migrations.AddField(model_name="clientcontact", name="is_billing_contact", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="clientcontact", name="is_legal_contact", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="clientcontact", name="is_portal_contact", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="clientaddress", name="building_or_plot", field=models.CharField(blank=True, null=True, max_length=255)),
        migrations.AddField(model_name="clientaddress", name="postal_address", field=models.CharField(blank=True, null=True, max_length=255)),
        migrations.AddField(model_name="clientaddress", name="is_registered_office", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="clientaddress", name="is_principal_place_of_business", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="clientaddress", name="is_service_address", field=models.BooleanField(default=False)),
        migrations.AlterField(model_name="clientaddress", name="address_type", field=models.CharField(max_length=20, default="OTHER", choices=[("HOME", "Home"), ("WORK", "Work"), ("OFFICE", "Office"), ("POSTAL", "Postal"), ("REGISTERED", "Registered Office"), ("BILLING", "Billing"), ("PRINCIPAL_BUSINESS", "Principal Place of Business"), ("SERVICE", "Service Address"), ("OTHER", "Other")])),
        migrations.AddField(model_name="clientduediligence", name="identity_verification_status", field=models.CharField(max_length=30, default="NOT_STARTED", choices=[("NOT_STARTED", "Not started"), ("PENDING", "Pending"), ("VERIFIED", "Verified"), ("FAILED", "Failed"), ("REQUIRES_REVIEW", "Requires review")])),
        migrations.AddField(model_name="clientduediligence", name="identity_verification_method", field=models.CharField(blank=True, default="", max_length=100)),
        migrations.AddField(model_name="clientduediligence", name="identity_verification_source", field=models.CharField(blank=True, default="", max_length=255)),
        migrations.AddField(model_name="clientduediligence", name="identity_verification_date", field=models.DateField(blank=True, null=True)),
        migrations.AddField(model_name="clientduediligence", name="identity_evidence_reference", field=models.CharField(blank=True, default="", max_length=255)),
        migrations.AddField(model_name="clientduediligence", name="identity_verified_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="identity_verified_cdd_records", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="clientduediligence", name="authority_verification_method", field=models.CharField(blank=True, default="", max_length=100)),
        migrations.AddField(model_name="clientduediligence", name="purpose_of_legal_services", field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="clientduediligence", name="intended_nature_of_relationship", field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="clientduediligence", name="expected_instructions_or_transactions", field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="clientduediligence", name="beneficial_ownership_applicable", field=models.BooleanField(blank=True, null=True)),
        migrations.AddField(model_name="clientduediligence", name="beneficial_ownership_outcome", field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="clientduediligence", name="screening_reviewed_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviewed_client_screenings", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="clientduediligence", name="enhanced_due_diligence_additional_verification", field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="clientduediligence", name="enhanced_due_diligence_approval_required", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="clientduediligence", name="enhanced_due_diligence_approval_date", field=models.DateField(blank=True, null=True)),
        migrations.AddField(model_name="clientduediligence", name="enhanced_due_diligence_approved_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="approved_client_edd_records", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="clientduediligence", name="ongoing_monitoring_notes", field=models.TextField(blank=True, default="")),
        migrations.CreateModel(name="ClientSectorProfile", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("sector", models.CharField(max_length=50, choices=[("EDUCATION", "Education"), ("FINANCIAL_SERVICES", "Financial Services"), ("HEALTHCARE", "Healthcare"), ("RELIGION_FAITH", "Religion / Faith"), ("INSURANCE", "Insurance"), ("PROFESSIONAL_REGULATED_BODY", "Professional Regulated Body"), ("REAL_ESTATE", "Real Estate"), ("OTHER_REGULATED_SECTOR", "Other Regulated Sector")])),
            ("description", models.CharField(blank=True, default="", max_length=255)), ("regulator", models.CharField(blank=True, default="", max_length=255)),
            ("registration_or_licence_reference", models.CharField(blank=True, default="", max_length=150)), ("verification_status", models.CharField(default="NOT_VERIFIED", max_length=30)),
            ("verification_source", models.CharField(blank=True, default="", max_length=255)), ("verification_date", models.DateField(blank=True, null=True)),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("client", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sector_profiles", to="clients.client")),
            ("verified_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="verified_client_sectors", to=settings.AUTH_USER_MODEL)),
        ], options={"db_table": "client_sector_profiles", "constraints": [models.UniqueConstraint(fields=("client", "sector"), name="unique_client_sector")]}),
        migrations.CreateModel(name="ClientPrivacyRecord", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("lawful_basis", models.CharField(max_length=50, choices=[("CONSENT", "Consent"), ("CONTRACTUAL_NECESSITY", "Contractual necessity"), ("LEGAL_OBLIGATION", "Legal obligation"), ("PUBLIC_INTEREST", "Public interest"), ("LEGITIMATE_INTERESTS", "Legitimate interests"), ("VITAL_INTERESTS", "Vital interests"), ("MULTIPLE_APPLICABLE_BASES", "Multiple applicable lawful bases")])),
            ("privacy_notice_version", models.CharField(max_length=50)), ("privacy_notice_delivered", models.BooleanField(default=False)), ("delivery_method", models.CharField(blank=True, default="", max_length=30)),
            ("delivered_at", models.DateTimeField(blank=True, null=True)), ("acknowledged", models.BooleanField(default=False)), ("acknowledgement_reference", models.CharField(blank=True, default="", max_length=255)),
            ("data_source", models.CharField(blank=True, default="", max_length=100)), ("data_sharing_notice", models.TextField(blank=True, default="")), ("retention_category", models.CharField(blank=True, default="", max_length=100)),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("client", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="privacy", to="clients.client")),
            ("delivered_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="delivered_client_privacy_notices", to=settings.AUTH_USER_MODEL)),
        ], options={"db_table": "client_privacy_records"}),
        migrations.CreateModel(name="ClientBeneficialOwner", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")), ("full_legal_name", models.CharField(max_length=255)),
            ("nationality", models.CharField(blank=True, default="", max_length=100)), ("date_of_birth", models.DateField(blank=True, null=True)), ("identifier_type", models.CharField(blank=True, default="", max_length=40)),
            ("identifier", models.CharField(blank=True, default="", max_length=100)), ("kra_pin", models.CharField(blank=True, default="", max_length=50)), ("residential_address", models.TextField(blank=True, default="")),
            ("business_address", models.TextField(blank=True, default="")), ("phone", models.CharField(blank=True, default="", max_length=30)), ("email", models.EmailField(blank=True, default="", max_length=254)),
            ("occupation", models.CharField(blank=True, default="", max_length=150)), ("ownership_percentage", models.DecimalField(blank=True, null=True, max_digits=5, decimal_places=2)),
            ("voting_percentage", models.DecimalField(blank=True, null=True, max_digits=5, decimal_places=2)), ("capital_or_profit_percentage", models.DecimalField(blank=True, null=True, max_digits=5, decimal_places=2)),
            ("ownership_mode", models.CharField(max_length=40, choices=[("DIRECT", "Direct"), ("INDIRECT", "Indirect"), ("CONTROL", "Control without ownership percentage"), ("SENIOR_MANAGING_OFFICIAL", "Senior managing official identified for CDD")])),
            ("nature_of_ownership_or_control", models.TextField(blank=True, default="")), ("can_appoint_or_remove_management", models.BooleanField(default=False)), ("has_significant_influence_or_control", models.BooleanField(default=False)),
            ("effective_control_description", models.TextField(blank=True, default="")), ("date_became_owner", models.DateField(blank=True, null=True)), ("date_ceased", models.DateField(blank=True, null=True)),
            ("evidence_reference", models.CharField(blank=True, default="", max_length=255)), ("verification_status", models.CharField(default="NOT_VERIFIED", max_length=30)), ("verification_date", models.DateField(blank=True, null=True)),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("client", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="beneficial_owners", to="clients.client")),
            ("linked_client", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="beneficial_owner_roles", to="clients.client")),
            ("verified_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="verified_beneficial_owners", to=settings.AUTH_USER_MODEL)),
        ], options={"db_table": "client_beneficial_owners"}),
        migrations.CreateModel(name="EducationInstitutionProfile", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("education_regime", models.CharField(max_length=50, choices=[("BASIC_EDUCATION", "Basic Education Institution"), ("UNIVERSITY", "University / University-Level Institution"), ("TVET", "Technical & Vocational Education and Training (TVET)"), ("TEACHER_EDUCATION", "Teacher Education"), ("ADULT_CONTINUING_EDUCATION", "Adult & Continuing Education"), ("OTHER_RECOGNIZED_EDUCATION", "Other Recognized Education Institution")])),
            ("institution_official_name", models.CharField(max_length=255)), ("ownership", models.CharField(max_length=20, choices=[("PUBLIC", "Public"), ("PRIVATE", "Private"), ("FOREIGN", "Foreign"), ("OTHER", "Other / requires review")])),
            ("operator_legal_name", models.CharField(blank=True, default="", max_length=255)), ("registration_number", models.CharField(blank=True, default="", max_length=120)), ("registration_status", models.CharField(default="NOT_VERIFIED", max_length=50)),
            ("registration_date", models.DateField(blank=True, null=True)), ("regulator", models.CharField(blank=True, default="", max_length=255)), ("county", models.CharField(blank=True, default="", max_length=100)),
            ("physical_location", models.TextField(blank=True, default="")), ("postal_or_electronic_address", models.TextField(blank=True, default="")), ("education_levels", models.JSONField(blank=True, default=list)),
            ("institution_form", models.CharField(blank=True, default="", max_length=100)), ("proprietor_or_operator", models.CharField(blank=True, default="", max_length=255)), ("governance_body", models.CharField(blank=True, default="", max_length=255)),
            ("head_of_institution", models.CharField(blank=True, default="", max_length=255)), ("sponsor", models.CharField(blank=True, default="", max_length=255)), ("institution_code", models.CharField(blank=True, default="", max_length=100)),
            ("university_category", models.CharField(blank=True, default="", max_length=80, choices=[("PUBLIC_UNIVERSITY", "Public University"), ("PUBLIC_UNIVERSITY_CONSTITUENT_COLLEGE", "Public University Constituent College"), ("CHARTERED_PRIVATE_UNIVERSITY", "Chartered Private University"), ("PRIVATE_UNIVERSITY_CONSTITUENT_COLLEGE", "Private University Constituent College"), ("LETTER_OF_INTERIM_AUTHORITY", "Institution with Letter of Interim Authority"), ("FOREIGN_UNIVERSITY", "Foreign University"), ("FOREIGN_UNIVERSITY_CAMPUS", "Foreign University Campus"), ("OTHER_CUE_RECOGNIZED", "Other CUE-Recognized Institution")])),
            ("cue_reference", models.CharField(blank=True, default="", max_length=150)), ("charter_reference", models.CharField(blank=True, default="", max_length=150)), ("charter_date", models.DateField(blank=True, null=True)),
            ("interim_authority_reference", models.CharField(blank=True, default="", max_length=150)), ("interim_authority_date", models.DateField(blank=True, null=True)), ("interim_authority_expiry", models.DateField(blank=True, null=True)),
            ("establishing_instrument", models.CharField(blank=True, default="", max_length=255)), ("parent_university", models.CharField(blank=True, default="", max_length=255)), ("foreign_country", models.CharField(blank=True, default="", max_length=100)),
            ("tvet_category", models.CharField(blank=True, default="", max_length=80, choices=[("VOCATIONAL_TRAINING_CENTRE", "Vocational Training Centre"), ("TECHNICAL_VOCATIONAL_COLLEGE", "Technical and Vocational College"), ("TECHNICAL_TRAINER_COLLEGE", "Technical Trainer College"), ("NATIONAL_POLYTECHNIC", "National Polytechnic"), ("OTHER_STATUTORY_TVET", "Other Statutory TVET Institution")])),
            ("licence_expiry", models.DateField(blank=True, null=True)), ("accredited_programmes", models.TextField(blank=True, default="")), ("awarding_or_examining_body", models.CharField(blank=True, default="", max_length=255)),
            ("main_campus", models.CharField(blank=True, default="", max_length=255)), ("additional_campuses", models.JSONField(blank=True, default=list)), ("other_institution_type", models.CharField(blank=True, default="", max_length=255)),
            ("registration_document_reference", models.CharField(blank=True, default="", max_length=255)), ("verification_status", models.CharField(default="NOT_VERIFIED", max_length=30)), ("verification_source", models.CharField(blank=True, default="", max_length=255)), ("verification_date", models.DateField(blank=True, null=True)),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("client", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="education_profile", to="clients.client")),
            ("verified_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="verified_education_profiles", to=settings.AUTH_USER_MODEL)),
        ], options={"db_table": "education_institution_profiles"}),
        migrations.CreateModel(name="EducationCurriculum", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("framework", models.CharField(max_length=40, choices=[("KENYA_CBE_CBC", "Kenya Competency-Based Education (CBE/CBC)"), ("INTERNATIONAL_FOREIGN", "International / Foreign Curriculum"), ("MULTIPLE", "Multiple Curriculum Frameworks"), ("SPECIAL_NEEDS_ADAPTED", "Special Needs / Adapted Curriculum"), ("OTHER_APPROVED", "Other Approved Curriculum")])),
            ("curriculum_name", models.CharField(blank=True, default="", max_length=255)), ("awarding_or_development_body", models.CharField(blank=True, default="", max_length=255)), ("country_or_framework", models.CharField(blank=True, default="", max_length=150)),
            ("approval_or_recognition_reference", models.CharField(blank=True, default="", max_length=255)), ("education_levels", models.JSONField(blank=True, default=list)),
            ("education_profile", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="curricula", to="clients.educationinstitutionprofile")),
        ], options={"db_table": "education_curricula"}),
        migrations.AddIndex(model_name="clientbeneficialowner", index=models.Index(fields=["client", "full_legal_name"], name="client_bene_client__8756b7_idx")),
        migrations.AddIndex(model_name="clientbeneficialowner", index=models.Index(fields=["identifier"], name="client_bene_identif_7153cc_idx")),
        migrations.AddIndex(model_name="educationinstitutionprofile", index=models.Index(fields=["education_regime", "registration_number"], name="education_i_educati_ecfd72_idx")),
        migrations.RunPython(correct_unsafe_legacy_mappings, migrations.RunPython.noop),
    ]
