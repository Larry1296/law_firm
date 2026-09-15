from django.db import transaction
from django.forms.models import model_to_dict
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit_logs.services.audit_service import AuditService, _json_value
from apps.clients.models import Client, WalkInEnquiry, PreliminaryReview, PreliminaryReviewHistory, PreliminaryPhysicalFile
from apps.clients.serializers.preliminary_review_serializer import (
    AssignmentInput, DecisionInput, ReviewInput, FollowUpInput, ConversionInput, PhysicalFileInput, REVIEW_FIELDS,
)
from apps.clients.services.admin.client_admin_create_service import ClientAdminCreateService
from apps.clients.services.conflict import ClientMatterConflictService
from apps.clients.services.walk_in_enquiry_service import WalkInEnquiryService
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, Secretary, SecretaryPermission
from apps.tasks.models import Task
from apps.users.models import User


def validated(serializer, data):
    instance = serializer(data=data)
    instance.is_valid(raise_exception=True)
    return instance.validated_data


class PreliminaryReviewService:
    @staticmethod
    def authority(user, workspace):
        user = User.objects.get(pk=user.pk)
        if workspace == 'lawyer' and user.is_active and user.role in ('STAFF', 'ADMIN'):
            lawyer = Lawyer.objects.filter(user=user, is_active=True, employment_status='ACTIVE', law_firm__is_active=True).select_related('law_firm').first()
            if lawyer:
                return lawyer.law_firm, lawyer
        if workspace == 'admin' and user.is_active and user.role == 'ADMIN':
            firm = LawFirm.objects.filter(owner=user, is_active=True).first()
            if not firm:
                memberships = user.firm_memberships.filter(is_active=True, firm__is_active=True).select_related('firm')
                if memberships.count() == 1:
                    firm = memberships.get().firm
            if firm:
                return firm, None
        if workspace == 'secretary':
            firm = WalkInEnquiryService.firm_for(user, workspace)
            if workspace == 'secretary':
                secretary = Secretary.objects.get(user=user)
                if secretary.employment_status != 'ACTIVE':
                    raise PermissionDenied('Active employment is required.')
                return firm, secretary
            return firm, None
        raise PermissionDenied('The matching active preliminary enquiry role is required.')

    @staticmethod
    def active_lawyers(firm):
        return Lawyer.objects.filter(law_firm=firm, is_active=True, employment_status='ACTIVE', user__is_active=True, user__role__in=['STAFF', 'ADMIN'])

    @staticmethod
    def active_secretaries(firm):
        return Secretary.objects.filter(law_firm=firm, is_active=True, employment_status='ACTIVE', user__is_active=True,
            user__role='STAFF', can_manage_client_intake=True, permissions__code=SecretaryPermission.MANAGE_CLIENTS,
            permissions__is_active=True).distinct()

    @classmethod
    def options(cls, *, user, workspace):
        firm, _ = cls.authority(user, workspace)
        values = lambda qs: [{'id': str(p.pk), 'name': p.user.full_name, 'user_id': str(p.user_id)} for p in qs.select_related('user')]
        holders = values(cls.active_lawyers(firm)) + values(cls.active_secretaries(firm))
        holders = [{'id': p['user_id'], 'name': p['name']} for p in holders] + [{'id': str(firm.owner_id), 'name': firm.owner.full_name}]
        return {'can_review_as_lawyer': cls.active_lawyers(firm).filter(user=user).exists(), 'custody_holders': holders, 'lawyers': values(cls.active_lawyers(firm)) if workspace == 'admin' else [],
                'secretaries': values(cls.active_secretaries(firm)) if workspace != 'secretary' else []}

    @classmethod
    def enquiries(cls, *, user, workspace):
        firm, profile = cls.authority(user, workspace)
        rows = WalkInEnquiry.objects.filter(firm=firm)
        if workspace == 'lawyer':
            rows = rows.filter(preliminary_review__lawyer=profile)
        elif workspace == 'secretary':
            rows = rows.filter(preliminary_review__secretary=profile, administrative_tasks__assigned_to=user,
                               administrative_tasks__status='PENDING').distinct()
        return rows.select_related('preliminary_review', 'preliminary_review__lawyer__user')

    @classmethod
    def locked(cls, user, workspace, enquiry_id):
        firm, profile = cls.authority(user, workspace)
        enquiry = get_object_or_404(WalkInEnquiry.objects.select_for_update(), pk=enquiry_id, firm=firm)
        review = get_object_or_404(PreliminaryReview.objects.select_for_update(), enquiry=enquiry)
        if workspace == 'lawyer' and review.lawyer_id != profile.pk:
            raise PermissionDenied('Only the assigned advocate may review this enquiry.')
        if workspace == 'secretary' and review.secretary_id != profile.pk:
            raise PermissionDenied('Only the explicitly assigned secretary may perform this task.')
        return enquiry, review, profile

    @staticmethod
    def revision(review, expected):
        if expected != review.revision:
            raise ValidationError({'revision': 'This enquiry changed. Reload and review the latest information.'})

    @staticmethod
    def record(review, user, action, reason='', extra=None):
        review.revision += 1
        review.save()
        snapshot = model_to_dict(review)
        snapshot.update(extra or {})
        event = PreliminaryReviewHistory.objects.create(review=review, actor=user, revision=review.revision,
            action=action, reason=reason, snapshot=_json_value(snapshot))
        AuditService.record(firm=review.enquiry.firm, user=user, action=f'PRELIMINARY_{action}', obj=review,
            new={'revision': review.revision, 'history_id': str(event.pk), 'enquiry_id': str(review.enquiry_id), 'state': review.state})

    @staticmethod
    def cancel_tasks(enquiry):
        Task.objects.filter(enquiry=enquiry, status='PENDING').update(status='CANCELLED', completed_at=timezone.now())

    @classmethod
    @transaction.atomic
    def assign(cls, *, user, workspace, enquiry_id, data):
        firm, _ = cls.authority(user, workspace)
        if workspace != 'admin':
            raise PermissionDenied('Only the firm administrator may assign preliminary enquiries.')
        values = validated(AssignmentInput, data)
        enquiry = get_object_or_404(WalkInEnquiry.objects.select_for_update(), pk=enquiry_id, firm=firm)
        lawyer = cls.active_lawyers(firm).filter(pk=values['lawyer_id']).first()
        if not lawyer:
            raise ValidationError({'lawyer_id': 'Choose an active advocate in this firm.'})
        review = PreliminaryReview.objects.select_for_update().filter(enquiry=enquiry).first()
        if review:
            if review.state in ('CLOSED', 'CONVERTED'):
                raise ValidationError('This enquiry has completed preliminary review.')
            cls.revision(review, values.get('revision'))
            if not values['reason']:
                raise ValidationError({'reason': 'A reassignment reason is required.'})
            cls.cancel_tasks(enquiry)
            review.lawyer = lawyer
            review.state = 'REVIEW'
            review.secretary = None
            review.execution = ''
            review.assigned_by = user
            review.assigned_at = timezone.now()
        else:
            review = PreliminaryReview.objects.create(enquiry=enquiry, lawyer=lawyer, assigned_by=user,
                prospective_name=enquiry.organisation_name if enquiry.enquiry_for == 'ORGANISATION' else enquiry.prospective_person_name or enquiry.visitor_name,
                entity_kind='ORGANISATION' if enquiry.enquiry_for == 'ORGANISATION' else 'PERSON',
                visitor_capacity=enquiry.visitor_capacity, service_category=enquiry.service_category,
                related_parties=[{'name': name, 'party_type': 'PERSON'} for name in enquiry.related_party_names],
                urgency=enquiry.urgency_type, critical_date=enquiry.critical_date)
        cls.record(review, user, 'ASSIGNED', values['reason'])
        return review

    @classmethod
    @transaction.atomic
    def decide(cls, *, user, workspace, enquiry_id, data):
        if workspace != 'lawyer':
            raise PermissionDenied('Only the assigned advocate may make a preliminary disposition.')
        enquiry, review, lawyer = cls.locked(user, workspace, enquiry_id)
        values = validated(DecisionInput, data)
        cls.revision(review, values['revision'])
        if review.state not in ('REVIEW', 'URGENT'):
            raise ValidationError('This enquiry is not awaiting a preliminary decision.')
        for field, value in values['review'].items():
            setattr(review, field, value)
        review.outcome = values['outcome']
        review.decision_reason = values['reason']
        review.decided_by = lawyer
        review.decided_at = timezone.now()
        review.execution = values.get('execution', '')
        review.missing_fields = values['missing_fields']
        review.secretary = None
        if values.get('secretary_id'):
            review.secretary = cls.active_secretaries(enquiry.firm).filter(pk=values['secretary_id']).first()
            if not review.secretary:
                raise ValidationError({'secretary_id': 'Choose an authorised active secretary in this firm.'})
        review.state = {'PROCEED_TO_CONFLICT_SCREENING': 'AUTHORISED', 'REQUEST_MINIMUM_INFORMATION': 'INFORMATION',
            'REFER_ELSEWHERE': 'CLOSED', 'DECLINE_AT_PRELIMINARY_STAGE': 'CLOSED', 'URGENT_REVIEW_REQUIRED': 'URGENT'}[review.outcome]
        cls.cancel_tasks(enquiry)
        if review.secretary:
            Task.objects.create(enquiry=enquiry, assigned_to=review.secretary.user, created_by=user,
                kind='MINIMUM_INFORMATION' if review.state == 'INFORMATION' else 'AUTHORISED_CREATION')
        cls.record(review, user, 'DECIDED', values['reason'])
        return review

    @classmethod
    @transaction.atomic
    def follow_up(cls, *, user, workspace, enquiry_id, data):
        enquiry, review, _ = cls.locked(user, workspace, enquiry_id)
        values = validated(FollowUpInput, data)
        cls.revision(review, values['revision'])
        if review.state != 'INFORMATION':
            raise ValidationError('Minimum information has not been requested.')
        if workspace == 'admin' or (workspace == 'lawyer' and review.secretary_id):
            raise PermissionDenied('The assigned follow-up holder must return the information.')
        if set(values['changes']) != set(review.missing_fields):
            raise ValidationError('Supply only all of the identification/party fields requested by the advocate.')
        candidate = {field: getattr(review, field) for field in REVIEW_FIELDS}
        candidate.update(values['changes'])
        clean = validated(ReviewInput, candidate)
        for field in review.missing_fields:
            setattr(review, field, clean[field])
        Task.objects.filter(enquiry=enquiry, status='PENDING').update(status='DONE', completed_at=timezone.now())
        review.state = 'REVIEW'
        # The disposition and deciding actor/time remain untouched until the advocate decides again.
        cls.record(review, user, 'INFORMATION_RETURNED')
        return review

    @classmethod
    @transaction.atomic
    def convert(cls, *, user, workspace, enquiry_id, data):
        enquiry, review, _ = cls.locked(user, workspace, enquiry_id)
        if workspace not in ('lawyer', 'secretary'):
            raise PermissionDenied('Creation requires the assigned advocate or explicitly authorised secretary.')
        if (workspace == 'lawyer' and review.execution != 'CREATE_NOW_BY_LAWYER') or (workspace == 'secretary' and review.execution != 'ASSIGN_CREATION_TO_SECRETARY'):
            raise PermissionDenied('This execution choice does not authorise you to create the prospect/proposal.')
        if review.outcome != 'PROCEED_TO_CONFLICT_SCREENING' or review.decided_by_id != review.lawyer_id or not review.decided_at:
            raise PermissionDenied('A recorded advocate authorisation is required.')
        values = validated(ConversionInput, data)
        if review.proposed_matter_id:
            return review  # Same authorised command returns the original records, including after a lost response.
        if review.state != 'AUTHORISED':
            raise ValidationError('Creation is not currently authorised.')
        if not cls.active_lawyers(enquiry.firm).filter(pk=review.lawyer_id).exists():
            raise PermissionDenied('The authorising advocate is no longer active. Reassign for review.')
        if workspace == 'secretary' and not Task.objects.filter(enquiry=enquiry, assigned_to=user, kind='AUTHORISED_CREATION', status='PENDING').exists():
            raise PermissionDenied('An explicit pending creation task is required.')
        # Firm lock also serialises first reference allocation across different enquiries.
        LawFirm.objects.select_for_update().get(pk=enquiry.firm_id)
        if values.get('existing_client_id'):
            client = get_object_or_404(Client.objects.select_for_update(), pk=values['existing_client_id'],
                firm=enquiry.firm, lifecycle_status=Client.LifecycleStatus.PROSPECTIVE, is_active=True, soft_deleted_at__isnull=True)
            if (client.client_type == 'INDIVIDUAL') != (review.entity_kind == 'PERSON'):
                raise ValidationError('The selected prospect has a different person/entity classification.')
        else:
            client = ClientAdminCreateService.create_preliminary_prospect(firm=enquiry.firm, created_by=user,
                full_name=review.prospective_name, entity_kind=review.entity_kind)
        check = ClientMatterConflictService.create_from_preliminary_review(review=review, client=client, actor=user)
        review.client = client
        review.proposed_matter = check
        review.converted_by = user
        review.converted_at = timezone.now()
        review.state = 'CONVERTED'
        Task.objects.filter(enquiry=enquiry, status='PENDING').update(status='DONE', completed_at=timezone.now())
        cls.record(review, user, 'CONVERTED', values['verification_reason'], {'existing_prospect_verified': bool(values.get('existing_client_id'))})
        return review

    @classmethod
    @transaction.atomic
    def physical_file(cls, *, user, workspace, enquiry_id, data):
        enquiry, review, _ = cls.locked(user, workspace, enquiry_id)
        values = validated(PhysicalFileInput, data)
        cls.revision(review, values.pop('revision'))
        if review.state in ('CLOSED', 'CONVERTED'):
            raise ValidationError('This preliminary stage is complete.')
        if workspace == 'secretary' and not Task.objects.filter(enquiry=enquiry, assigned_to=user, status='PENDING').exists():
            raise PermissionDenied('An assigned administrative task is required.')
        holder_ids = list(cls.active_lawyers(enquiry.firm).values_list('user_id', flat=True)) + list(cls.active_secretaries(enquiry.firm).values_list('user_id', flat=True)) + [enquiry.firm.owner_id]
        if values['custody_holder_id'] not in holder_ids:
            raise ValidationError('Select an active custody holder in this firm.')
        if values['opened_date'] > timezone.localdate():
            raise ValidationError('The physical file cannot have a future opened date.')
        reason = values.pop('reason')
        record = PreliminaryPhysicalFile.objects.filter(review=review).first()
        if record and (record.reference != values['reference'] or record.opened_date != values['opened_date']):
            raise ValidationError('File reference and opening details are immutable; record a custody movement only.')
        record, _ = PreliminaryPhysicalFile.objects.update_or_create(review=review,
            defaults={**values, 'opened_by': record.opened_by if record else user})
        cls.record(review, user, 'PHYSICAL_FILE_MOVED', reason, {'physical_file': model_to_dict(record)})
        return review

    @classmethod
    def present(cls, enquiry, workspace, detail=False):
        review = getattr(enquiry, 'preliminary_review', None)
        result = {'id': str(enquiry.pk), 'reference': enquiry.reference, 'visitor_name': enquiry.visitor_name,
            'safe_contact': enquiry.safe_contact, 'service_category': enquiry.service_category,
            'status_label': review.get_state_display() if review else 'Enquiry received — awaiting assignment',
            'lawyer_name': review.lawyer.user.full_name if review else '', 'review': None}
        if not review:
            return result
        fields = REVIEW_FIELDS if workspace == 'lawyer' else [f for f in REVIEW_FIELDS if f != 'preliminary_note']
        result['review'] = _json_value({field: getattr(review, field) for field in fields})
        result['review'].update(_json_value({field: getattr(review, field) for field in [
            'id', 'revision', 'state', 'outcome', 'execution', 'missing_fields', 'assigned_at', 'decided_at', 'converted_at',
            'client_id', 'proposed_matter_id', 'secretary_id']}))
        result['review']['deciding_lawyer_name'] = review.decided_by.user.full_name if review.decided_by_id else ''
        result['review']['administrative_reason'] = review.get_outcome_display() if review.outcome else ''
        result['review']['proposal_reference'] = review.proposed_matter.reference_number if review.proposed_matter_id else ''
        if workspace == 'lawyer':
            result['review']['decision_reason'] = review.decision_reason
            result['reception_description'] = enquiry.description
        if detail:
            result['history'] = [{
                'id': str(h.pk), 'action': h.action, 'revision': h.revision, 'actor': h.actor.full_name,
                'recorded_at': h.recorded_at,
                **({'reason': h.reason, 'snapshot': h.snapshot} if workspace == 'lawyer' else ({'reason': h.reason} if h.action == 'ASSIGNED' else {})),
                **({'physical_movement': h.snapshot['physical_file']} if h.action == 'PHYSICAL_FILE_MOVED' else {}),
            } for h in review.history.select_related('actor')]
            physical = getattr(review, 'physical_file', None)
            result['physical_file'] = _json_value(model_to_dict(physical)) if physical else None
            if physical:
                result['physical_file']['label'] = physical.LABEL
            result['tasks'] = [{'id': str(t.pk), 'title': t.title, 'status': t.status, 'assigned_to': t.assigned_to.full_name}
                for t in enquiry.administrative_tasks.select_related('assigned_to') if workspace != 'secretary' or t.assigned_to_id == review.secretary.user_id]
        return result
