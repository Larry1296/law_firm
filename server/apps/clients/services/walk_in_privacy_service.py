import hashlib
import json

from rest_framework import serializers

from apps.clients.models import WalkInPrivacyConfig


class WalkInPrivacyConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalkInPrivacyConfig
        fields = ['policy_version', 'lawful_basis', 'lawful_basis_explanation',
                  'mandatory_legal_requirement', 'recipients', 'retention',
                  'privacy_contact', 'transfers', 'safeguards']
        extra_kwargs = {field: {'allow_blank': False, 'max_length': 4000} for field in fields
                        if field not in {'policy_version', 'lawful_basis'}}


def privacy_notice(firm):
    missing = [field for field in ['name', 'email', 'phone_number', 'physical_address']
               if not getattr(firm, field, '').strip()]
    config = WalkInPrivacyConfig.objects.filter(firm=firm).first()
    values = WalkInPrivacyConfigSerializer(config).data if config else {}
    check = WalkInPrivacyConfigSerializer(data=values)
    if not check.is_valid():
        missing.extend(check.errors.keys())
    if missing:
        return {'ready': False, 'missing_fields': sorted(set(missing)), 'notice': None}
    sections = [
        ['Data controller and contact', f'{firm.name}; {firm.physical_address}; {firm.email}; {firm.phone_number}.'],
        ['Collection and purpose', 'We collect the limited personal information you provide to record your walk-in enquiry, identify who is seeking services, make safe follow-up contact and maintain an accurate intake register. Recording this enquiry does not accept instructions or establish an engagement. Do not provide identification numbers, documents or a detailed account of your case.'],
        ['Lawful basis', f'{config.get_lawful_basis_display()}. {config.lawful_basis_explanation}'],
        ['Required and optional information', 'For this register we require the visitor name, safe contact method, who the enquiry is for, broad service category and a short description. For another person or organisation we also require their name, your relationship or capacity and preliminary authority status. An urgency note is required only if you report urgency. Known related-party names, critical date and referral source are optional. Providing information is voluntary; these are register requirements, not a general legal duty to seek legal services. ' + config.mandatory_legal_requirement],
        ['Consequences of not providing information', 'Without required information we cannot save this enquiry or safely follow it up. Optional information can be left blank without preventing registration. Ask the privacy contact about an alternative or a concern about collection.'],
        ['Recipients and sharing', config.recipients],
        ['Security and safeguards', config.safeguards],
        ['Retention', config.retention],
        ['Transfers outside Kenya', config.transfers],
        ['Your rights', 'You may ask to be informed about use of your data, access it, object to processing, correct false or misleading data and request deletion of false or misleading data. You may also request restriction, erasure or portability where the Act applies. Rights are subject to applicable legal conditions. Contact the firm using the privacy contact below.'],
        ['Privacy contact', config.privacy_contact],
        ['Complaints', 'You may complain to the Office of the Data Protection Commissioner (ODPC), including through www.odpc.go.ke or info@odpc.go.ke. You do not have to resolve your complaint with this firm first.'],
        ['Acknowledgement is not consent', 'Acknowledgement records that this notice was provided and acknowledged. It is not consent to processing, marketing, representation or engagement, and does not determine the lawful basis. This intake flow does not collect consent. If consent is needed for proposed processing, do not use acknowledgement as a substitute.'],
        ['Enquiries for someone else', 'Give only minimum preliminary names and your capacity. Authority is recorded as stated and is not verified by this form. Do not assume your acknowledgement is consent from another person. Ask the privacy contact if unsure whether you may provide their information.'],
    ]
    snapshot = {'controller_id': str(firm.pk), 'policy_version': config.policy_version,
                'template_version': 'KE-INTAKE-1', 'lawful_basis': config.lawful_basis,
                'sections': [{'title': title, 'text': text} for title, text in sections]}
    digest = hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest()[:20]
    snapshot['version'] = f'KE-INTAKE-1:{config.policy_version}:{digest}'
    return {'ready': True, 'missing_fields': [], 'notice': snapshot}
