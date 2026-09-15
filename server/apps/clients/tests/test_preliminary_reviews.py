from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier
from unittest.mock import patch

from django.core.exceptions import ValidationError as ModelValidationError
from django.db import close_old_connections
from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from django.urls import reverse
from django.http import Http404
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIClient

from apps.audit_logs.models import AuditEvent
from apps.cases.models import Case
from apps.clients.models import (Client, ClientMatterConflictCheck, PreliminaryReview, PreliminaryReviewHistory,
    EngagementRecord, ClientDueDiligence, WalkInEnquiry, PreliminaryPhysicalFile)
from apps.clients.services.preliminary_review_service import PreliminaryReviewService as Service
from apps.clients.services.walk_in_enquiry_service import WalkInEnquiryService
from apps.clients.tests import test_walk_in_enquiries as reception_tests
from apps.clients.tests.test_walk_in_enquiries import user, payload, receipt
from apps.staff.models import Lawyer
from apps.tasks.models import Task
from apps.users.models import User
from apps.clients.serializers.preliminary_review_serializer import REVIEW_FIELDS


def setup(self):
    reception_tests.WalkInEnquiryTests.setUp(self)
    self.lawyer_user = user(70, 'STAFF')
    self.lawyer = Lawyer.objects.create(user=self.lawyer_user, law_firm=self.firm, staff_number='L70',
        admission_number='ADM70', date_hired=date(2026, 1, 1))
    self.other_lawyer_user = user(71, 'STAFF')
    self.other_lawyer = Lawyer.objects.create(user=self.other_lawyer_user, law_firm=self.other_firm, staff_number='L71',
        admission_number='ADM71', date_hired=date(2026, 1, 1))
    self.enquiry = WalkInEnquiryService.create(user=self.admin, data=payload(notice_receipt=receipt(self.admin)))


def assign(self, **data):
    return Service.assign(user=self.admin, workspace='admin', enquiry_id=self.enquiry.pk, data={'lawyer_id': str(self.lawyer.pk), **data})


def decision(self, outcome='PROCEED_TO_CONFLICT_SCREENING', **data):
    r = PreliminaryReview.objects.get(enquiry=self.enquiry)
    values = {field: getattr(r, field) for field in REVIEW_FIELDS}
    values.update(working_title='Employment proposal', preliminary_note='PRIVATE-NOTE', adverse_parties=[{'name': 'Example Employer', 'party_type': 'ORGANISATION'}])
    return {'revision': r.revision, 'review': values, 'outcome': outcome, 'reason': 'PRIVATE-REASON',
        **({'execution': 'CREATE_NOW_BY_LAWYER'} if outcome == 'PROCEED_TO_CONFLICT_SCREENING' else {}), **data}


def decide(self, outcome='PROCEED_TO_CONFLICT_SCREENING', **data):
    return Service.decide(user=self.lawyer_user, workspace='lawyer', enquiry_id=self.enquiry.pk, data=decision(self, outcome, **data))


def convert(self, actor=None, workspace='lawyer', **data):
    return Service.convert(user=actor or self.lawyer_user, workspace=workspace, enquiry_id=self.enquiry.pk, data=data)


class PreliminaryTests(TestCase):
    setUp = setup
    assign = assign
    decide = decide
    convert = convert

    def test_same_firm_assignment_and_queue(self):
        r = self.assign()
        self.assertEqual(r.assigned_by, self.admin)
        self.assertTrue(r.assigned_at)
        self.assertEqual(Service.enquiries(user=self.lawyer_user, workspace='lawyer').get(), self.enquiry)
        self.assertFalse(Service.enquiries(user=self.other_lawyer_user, workspace='lawyer').exists())
        self.assertFalse(Service.enquiries(user=self.secretary_user, workspace='secretary').exists())

    def test_cross_firm_inactive_and_terminated_assignment_rejected(self):
        with self.assertRaises(ValidationError): self.assign(lawyer_id=str(self.other_lawyer.pk))
        for attr, value in [('is_active', False), ('employment_status', 'TERMINATED')]:
            Lawyer.objects.filter(pk=self.lawyer.pk).update(**{attr: value})
            with self.assertRaises(ValidationError): self.assign()
            Lawyer.objects.filter(pk=self.lawyer.pk).update(is_active=True, employment_status='ACTIVE')
        User.objects.filter(pk=self.lawyer_user.pk).update(is_active=False)
        with self.assertRaises(ValidationError): self.assign()

    def test_reassignment_requires_reason_preserves_history_revokes_authority(self):
        self.assign(); self.decide(execution='ASSIGN_CREATION_TO_SECRETARY', secretary_id=str(self.secretary.pk))
        r = PreliminaryReview.objects.get(enquiry=self.enquiry)
        with self.assertRaises(ValidationError): self.assign(revision=r.revision)
        r = self.assign(revision=r.revision, reason='Availability changed')
        self.assertEqual(r.state, 'REVIEW'); self.assertEqual(r.history.count(), 3)
        self.assertEqual(Task.objects.get().status, 'CANCELLED')
        with self.assertRaises(PermissionDenied): self.convert()

    def test_only_assigned_lawyer_decides(self):
        self.assign()
        for actor, workspace in [(self.admin, 'admin'), (self.secretary_user, 'secretary'), (self.other_lawyer_user, 'lawyer')]:
            with self.assertRaises((PermissionDenied, Http404)):
                Service.decide(user=actor, workspace=workspace, enquiry_id=self.enquiry.pk, data=decision(self))
        self.assertEqual(PreliminaryReview.objects.get().state, 'REVIEW')
        User.objects.filter(pk=self.lawyer_user.pk).update(is_active=False)
        with self.assertRaises(PermissionDenied): self.decide()

    def test_every_disposition_requires_reason(self):
        self.assign()
        for outcome in PreliminaryReview.Outcome.values:
            with self.assertRaises(ValidationError): self.decide(outcome, reason='   ')
        self.assertEqual(PreliminaryReviewHistory.objects.count(), 1)

    def test_minimum_information_round_trip(self):
        self.assign()
        r = self.decide('REQUEST_MINIMUM_INFORMATION', missing_fields=['prospective_name'], secretary_id=str(self.secretary.pk))
        before = r.decided_at
        self.assertEqual(Task.objects.get().kind, 'MINIMUM_INFORMATION')
        self.assertEqual(Service.enquiries(user=self.secretary_user, workspace='secretary').count(), 1)
        with self.assertRaises(ValidationError):
            Service.follow_up(user=self.secretary_user, workspace='secretary', enquiry_id=self.enquiry.pk,
                data={'revision': r.revision, 'changes': {'preliminary_note': 'Not allowed'}})
        r = Service.follow_up(user=self.secretary_user, workspace='secretary', enquiry_id=self.enquiry.pk,
            data={'revision': r.revision, 'changes': {'prospective_name': 'Correct identity'}})
        self.assertEqual(r.state, 'REVIEW'); self.assertEqual(r.outcome, 'REQUEST_MINIMUM_INFORMATION')
        self.assertEqual(r.decided_at, before); self.assertEqual(Task.objects.get().status, 'DONE')
        self.assertFalse(Service.enquiries(user=self.secretary_user, workspace='secretary').exists())
        self.decide(); self.convert()
        self.assertEqual(Client.objects.get().full_name, 'Correct identity')

    def test_lawyer_can_follow_up_without_secretary(self):
        self.assign(); r = self.decide('REQUEST_MINIMUM_INFORMATION', missing_fields=['adverse_parties'])
        Service.follow_up(user=self.lawyer_user, workspace='lawyer', enquiry_id=self.enquiry.pk,
            data={'revision': r.revision, 'changes': {'adverse_parties': []}})
        self.assertEqual(PreliminaryReview.objects.get().state, 'REVIEW')
        self.assertFalse(Task.objects.exists())

    def test_decline_and_refer_close_without_other_lifecycle_records(self):
        for outcome in ['REFER_ELSEWHERE', 'DECLINE_AT_PRELIMINARY_STAGE']:
            self.enquiry = WalkInEnquiryService.create(user=self.admin, data=payload(notice_receipt=receipt(self.admin)))
            self.assign(); r = self.decide(outcome)
            self.assertEqual(r.state, 'CLOSED')
            with self.assertRaises(PermissionDenied): self.convert()
        self.assertFalse(Client.objects.exists()); self.assertFalse(ClientMatterConflictCheck.objects.exists())
        self.assertFalse(Case.objects.exists()); self.assertFalse(EngagementRecord.objects.exists())

    def test_urgent_does_not_authorise_conversion_and_can_be_reviewed(self):
        self.assign(); r = self.decide('URGENT_REVIEW_REQUIRED')
        self.assertEqual(r.state, 'URGENT')
        with self.assertRaises(PermissionDenied): self.convert()
        self.decide(); self.assertEqual(PreliminaryReview.objects.get().state, 'AUTHORISED')

    def test_proceed_requires_execution_title_and_secretary_when_chosen(self):
        self.assign()
        for changes in [{'execution': ''}, {'execution': 'ASSIGN_CREATION_TO_SECRETARY'}]:
            with self.assertRaises(ValidationError): self.decide(**changes)
        data = decision(self); data['review']['working_title'] = ''
        with self.assertRaises(ValidationError): Service.decide(user=self.lawyer_user, workspace='lawyer', enquiry_id=self.enquiry.pk, data=data)
        self.assertFalse(Client.objects.exists())

    def test_lawyer_conversion_links_and_no_later_lifecycle_side_effects(self):
        self.assign(); self.decide(); before = User.objects.count(); r = self.convert()
        c, p = r.client, r.proposed_matter
        self.assertEqual(c.lifecycle_status, 'PROSPECTIVE'); self.assertIsNone(c.user_id)
        self.assertEqual(User.objects.count(), before); self.assertEqual(c.access_type, 'ASSISTED')
        self.assertEqual(p.status, 'NOT_STARTED'); self.assertFalse(p.decision_confirmation)
        self.assertEqual(p.acceptance_decision, 'PENDING'); self.assertEqual(p.responsible_lawyer, self.lawyer)
        self.assertEqual(p.created_by, self.lawyer_user); self.assertEqual(p.preliminary_review.enquiry, self.enquiry)
        self.assertEqual(p.jurisdiction_facts['practice_area'], 'Employment')
        self.assertEqual(p.parties.count(), 4)
        self.assertFalse(Case.objects.exists()); self.assertFalse(EngagementRecord.objects.exists()); self.assertFalse(ClientDueDiligence.objects.exists())
        self.assertFalse(p.document_requirements.exists()); self.assertFalse(PreliminaryPhysicalFile.objects.exists())
        self.assertEqual(r.history.last().action, 'CONVERTED')
        self.assertTrue(r.converted_at)
        self.assertEqual(self.convert().proposed_matter_id, p.pk)
        self.assertEqual(Client.objects.count(), 1); self.assertEqual(ClientMatterConflictCheck.objects.count(), 1)

    def test_secretary_conversion_requires_explicit_assignment(self):
        self.assign(); self.decide()
        with self.assertRaises(PermissionDenied): self.convert(actor=self.secretary_user, workspace='secretary')
        r = PreliminaryReview.objects.get(); self.assign(revision=r.revision, reason='Delegate creation')
        self.decide(execution='ASSIGN_CREATION_TO_SECRETARY', secretary_id=str(self.secretary.pk))
        with self.assertRaises(PermissionDenied): self.convert()
        r = self.convert(actor=self.secretary_user, workspace='secretary')
        self.assertEqual(r.converted_by, self.secretary_user); self.assertEqual(r.proposed_matter.created_by, self.secretary_user)
        self.assertEqual(Task.objects.get().status, 'DONE')
        self.assertEqual(self.convert(actor=self.secretary_user, workspace='secretary').pk, r.pk)

    def test_no_automatic_name_merge_and_verified_reuse(self):
        old = Client.objects.create(firm=self.firm, full_name='Jane Visitor', client_type='INDIVIDUAL')
        self.assign(); self.decide(); r = self.convert()
        self.assertNotEqual(r.client_id, old.pk)
        self.enquiry = WalkInEnquiryService.create(user=self.admin, data=payload(notice_receipt=receipt(self.admin)))
        self.assign(); self.decide()
        with self.assertRaises(ValidationError): self.convert(existing_client_id=str(old.pk))
        r = self.convert(existing_client_id=str(old.pk), identity_verified=True, verification_reason='Staff verified same entity using prior reference')
        self.assertEqual(r.client_id, old.pk); self.assertEqual(Client.objects.count(), 2)

    def test_cross_firm_reuse_rejected(self):
        from django.http import Http404
        c = Client.objects.create(firm=self.other_firm, full_name='Jane Visitor', client_type='INDIVIDUAL')
        self.assign(); self.decide()
        with self.assertRaises(Http404): self.convert(existing_client_id=str(c.pk), identity_verified=True, verification_reason='Known reference')
        self.assertFalse(ClientMatterConflictCheck.objects.exists())

    def test_organisation_remains_unclassified_prospect(self):
        self.assign(); data = decision(self); data['review']['entity_kind'] = 'ORGANISATION'
        Service.decide(user=self.lawyer_user, workspace='lawyer', enquiry_id=self.enquiry.pk, data=data)
        c = self.convert().client
        self.assertEqual(c.client_type, 'OTHER_REQUIRES_REVIEW'); self.assertEqual(c.classification_review_status, 'REQUIRES_REVIEW')

    def test_creation_and_audit_failures_roll_back_whole_conversion(self):
        self.assign(); self.decide()
        for target in ['ClientAdminCreateService.create_preliminary_prospect', 'ClientMatterConflictService.create_from_preliminary_review', 'AuditService.record']:
            with patch('apps.clients.services.preliminary_review_service.' + target, side_effect=RuntimeError('PRIVATE')):
                with self.assertRaises(RuntimeError): self.convert()
            self.assertFalse(Client.objects.exists()); self.assertFalse(ClientMatterConflictCheck.objects.exists())
            self.assertEqual(PreliminaryReview.objects.get().state, 'AUTHORISED')
        # Fail after both creations, on final conversion audit.
        original = Service.record
        def fail_final(*args, **kwargs):
            original(*args, **kwargs)
            raise RuntimeError('after audit')
        with patch.object(Service, 'record', side_effect=fail_final):
            with self.assertRaises(RuntimeError): self.convert()
        self.assertFalse(Client.objects.exists()); self.assertFalse(ClientMatterConflictCheck.objects.exists())
        self.assertEqual(PreliminaryReviewHistory.objects.count(), 2)

    def test_history_immutable_and_metadata_private(self):
        self.assign(); self.decide(execution='ASSIGN_CREATION_TO_SECRETARY', secretary_id=str(self.secretary.pk))
        enquiry = WalkInEnquiry.objects.get(pk=self.enquiry.pk)
        for workspace in ['admin', 'secretary']:
            view = Service.present(enquiry, workspace, detail=True)
            self.assertNotIn('PRIVATE', str(view))
        self.assertIn('PRIVATE', str(Service.present(enquiry, 'lawyer', detail=True)))
        for event in AuditEvent.objects.all():
            self.assertNotIn('PRIVATE', str(event.new_values)); self.assertNotIn('PRIVATE', event.reason)
        self.assertNotIn('PRIVATE', Task.objects.get().title)
        history = PreliminaryReviewHistory.objects.last()
        history.reason = 'altered'
        with self.assertRaises(ModelValidationError): history.save()
        with self.assertRaises(ModelValidationError): history.delete()
        with self.assertRaises(ModelValidationError): PreliminaryReviewHistory.objects.update(reason='altered')
        with self.assertRaises(ModelValidationError): PreliminaryReviewHistory.objects.all().delete()

    def test_physical_file_optional_and_movements_preserved(self):
        r = self.assign()
        data = {'revision': r.revision, 'reference': 'P-001', 'opened_date': '2026-01-01', 'location': 'Shelf A', 'custody_holder_id': str(self.secretary_user.pk), 'reason': 'Opened register cover'}
        r = Service.physical_file(user=self.admin, workspace='admin', enquiry_id=self.enquiry.pk, data=data)
        Service.physical_file(user=self.admin, workspace='admin', enquiry_id=self.enquiry.pk, data={**data, 'revision': r.revision, 'location': 'Shelf B', 'reason': 'Moved'})
        f = PreliminaryPhysicalFile.objects.get(); self.assertEqual(f.opened_by, self.admin)
        self.assertEqual(f.location, 'Shelf B')
        moves = list(PreliminaryReviewHistory.objects.filter(action='PHYSICAL_FILE_MOVED'))
        self.assertEqual(moves[0].snapshot['physical_file']['location'], 'Shelf A')
        self.assertEqual(moves[1].snapshot['physical_file']['location'], 'Shelf B')

    def test_api_isolation_unknown_fields_and_secretary_decision(self):
        self.assign(); api = APIClient(); api.force_authenticate(self.secretary_user)
        response = api.post(reverse('secretary-preliminary-decide', args=[self.enquiry.pk]), decision(self), format='json')
        self.assertEqual(response.status_code, 403)
        api.force_authenticate(self.lawyer_user)
        data = decision(self); data['review']['evidence'] = 'PRIVATE'
        self.assertEqual(api.post(reverse('lawyer-preliminary-decide', args=[self.enquiry.pk]), data, format='json').status_code, 400)
        api.force_authenticate(self.other_admin)
        self.assertEqual(api.get(reverse('admin-preliminary-detail', args=[self.enquiry.pk])).status_code, 404)
        api.force_authenticate(self.admin)
        self.assertEqual(api.delete(reverse('admin-preliminary-detail', args=[self.enquiry.pk])).status_code, 405)

    def test_api_conversion_response_and_conflict_queue(self):
        self.assign(); self.decide(); api = APIClient(); api.force_authenticate(self.lawyer_user)
        response = api.post(reverse('lawyer-preliminary-convert', args=[self.enquiry.pk]), {}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        r = PreliminaryReview.objects.get()
        from apps.clients.services.conflict import ClientMatterConflictService
        self.assertEqual(ClientMatterConflictService.list_for_client(user=self.lawyer_user, client_id=r.client_id).get(), r.proposed_matter)
        from apps.clients.serializers.admin.client_matter_conflict_check_serializer import ClientMatterConflictCheckListSerializer
        self.assertEqual(str(ClientMatterConflictCheckListSerializer(r.proposed_matter).data['originating_enquiry']), str(self.enquiry.pk))


class PreliminaryConcurrencyTests(TransactionTestCase):
    setUp = setup

    @skipUnlessDBFeature('has_select_for_update')
    def test_concurrent_conversion_creates_exactly_one_pair(self):
        assign(self); decide(self)
        barrier = Barrier(2)
        def run(_):
            close_old_connections()
            try:
                actor = User.objects.get(pk=self.lawyer_user.pk)
                barrier.wait(timeout=10)
                r = convert(self, actor=actor)
                return r.client_id, r.proposed_matter_id
            finally: close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(run, range(2)))
        self.assertEqual(results[0], results[1]); self.assertEqual(Client.objects.count(), 1)
        self.assertEqual(ClientMatterConflictCheck.objects.count(), 1)
        self.assertEqual(AuditEvent.objects.filter(action='PRELIMINARY_CONVERTED').count(), 1)

class PreliminaryAdditionalSafeguards(TestCase):
    setUp = setup
    assign = assign
    decide = decide
    convert = convert

    def test_same_firm_unassigned_lawyer_cannot_decide(self):
        self.assign()
        Lawyer.objects.filter(pk=self.other_lawyer.pk).update(law_firm=self.firm)
        with self.assertRaises(PermissionDenied):
            Service.decide(user=self.other_lawyer_user, workspace='lawyer', enquiry_id=self.enquiry.pk, data=decision(self))

    def test_secretary_cannot_assign(self):
        with self.assertRaises(PermissionDenied):
            Service.assign(user=self.secretary_user, workspace='secretary', enquiry_id=self.enquiry.pk, data={'lawyer_id': str(self.lawyer.pk)})

    def test_stale_decision_rejected(self):
        r = self.assign(); old = decision(self)
        self.assign(revision=r.revision, reason='Reconfirmed allocation')
        with self.assertRaises(ValidationError):
            Service.decide(user=self.lawyer_user, workspace='lawyer', enquiry_id=self.enquiry.pk, data=old)

    def test_creation_revocation_inactive_secretary_and_lawyer(self):
        self.assign(); self.decide(execution='ASSIGN_CREATION_TO_SECRETARY', secretary_id=str(self.secretary.pk))
        self.grant.is_active = False; self.grant.save()
        with self.assertRaises(PermissionDenied): self.convert(actor=self.secretary_user, workspace='secretary')
        self.grant.is_active = True; self.grant.save()
        Lawyer.objects.filter(pk=self.lawyer.pk).update(is_active=False)
        with self.assertRaises(PermissionDenied): self.convert(actor=self.secretary_user, workspace='secretary')
        self.assertFalse(Client.objects.exists())

    def test_decision_audit_failure_rolls_back_task_and_history(self):
        self.assign()
        with patch('apps.clients.services.preliminary_review_service.AuditService.record', side_effect=RuntimeError('private')):
            with self.assertRaises(RuntimeError): self.decide(execution='ASSIGN_CREATION_TO_SECRETARY', secretary_id=str(self.secretary.pk))
        self.assertFalse(Task.objects.exists()); self.assertEqual(PreliminaryReviewHistory.objects.count(), 1)
        self.assertEqual(PreliminaryReview.objects.get().state, 'REVIEW')

    def test_api_failure_avoids_confidential_error_logging(self):
        self.assign(); self.decide(); api = APIClient(); api.force_authenticate(self.lawyer_user)
        with patch('apps.clients.services.preliminary_review_service.AuditService.record', side_effect=RuntimeError('SECRET-BODY')):
            with self.assertLogs('apps.clients.views.walk_in_enquiry_view', level='ERROR') as logs:
                response = api.post(reverse('lawyer-preliminary-convert', args=[self.enquiry.pk]), {}, format='json')
        self.assertEqual(response.status_code, 500)
        self.assertNotIn('SECRET-BODY', str(logs.output)); self.assertNotIn('SECRET-BODY', str(response.data))
        self.assertFalse(Client.objects.exists())

    def test_authorised_delegated_admin_assignment(self):
        from apps.firm.models import LawFirmMember
        delegated = user(75, 'ADMIN')
        LawFirmMember.objects.create(firm=self.firm, user=delegated, role='SECRETARY', created_by=self.admin)
        r = Service.assign(user=delegated, workspace='admin', enquiry_id=self.enquiry.pk, data={'lawyer_id': str(self.lawyer.pk)})
        self.assertEqual(r.assigned_by, delegated)
        with self.assertRaises(PermissionDenied):
            Service.decide(user=delegated, workspace='admin', enquiry_id=self.enquiry.pk, data=decision(self))

    def test_wrong_firm_and_inactive_secretary_assignment(self):
        self.assign()
        self.secretary.is_active = False; self.secretary.save()
        with self.assertRaises(ValidationError): self.decide(execution='ASSIGN_CREATION_TO_SECRETARY', secretary_id=str(self.secretary.pk))
        self.secretary.is_active = True; self.secretary.law_firm = self.other_firm; self.secretary.save()
        with self.assertRaises(ValidationError): self.decide(execution='ASSIGN_CREATION_TO_SECRETARY', secretary_id=str(self.secretary.pk))

    def test_physical_cross_firm_custody_rejected(self):
        r = self.assign()
        with self.assertRaises(ValidationError):
            Service.physical_file(user=self.admin, workspace='admin', enquiry_id=self.enquiry.pk, data={'revision': r.revision,
                'reference': 'P-1', 'opened_date': '2026-01-01', 'location': 'Shelf A', 'custody_holder_id': str(self.other_admin.pk), 'reason': 'Opening'})
        self.assertFalse(PreliminaryPhysicalFile.objects.exists())
