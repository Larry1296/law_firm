from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit_logs.services import AuditService
from apps.cases.models import CaseEvent
from apps.clients.models import Client, ClientVisit
from apps.common.choices import UserRole
from apps.firm.models import FirmSetting, LawFirm
from apps.notifications.models import Notification
from apps.staff.models import Lawyer, Secretary
from apps.users.validators.phone_number import normalize_phone_number

ACTIVE_STATUSES = ['WAITING', 'CALLED', 'IN_CONSULTATION']
INTAKE_FIELDS = {'contact_details', 'acting_capacity', 'other_parties', 'broad_issue', 'deadline'}
ARRIVAL_FIELDS = {'visitor_name', 'visitor_phone', 'client', 'appointment', 'advocate', 'urgency_flag', 'urgency_note'}
# A client meeting that is still going ahead today.
CANCELLED_MEETING = ['CANCELLED', 'VACATED', 'ADJOURNED', 'TAKEN_OUT']


def active_staff(model):
    return model.objects.filter(is_active=True, user__is_active=True,
        user__role__in=([UserRole.STAFF, UserRole.ADMIN] if model is Lawyer else [UserRole.STAFF]),
        employment_status__in=['ACTIVE', 'PROBATION'])


def visit_access(user):
    if not user.is_active:
        raise PermissionDenied('An active account is required.')
    if user.role == UserRole.ADMIN:
        firm = getattr(user, 'owned_firm', None)
        if firm is None:
            member = user.firm_memberships.filter(is_active=True).select_related('firm').first()
            firm = member.firm if member else None
        if firm:
            return firm, 'ADMIN', active_staff(Lawyer).filter(user=user, law_firm=firm).first()
    if user.role == UserRole.STAFF:
        secretary = active_staff(Secretary).filter(user=user, can_manage_client_intake=True).first()
        if secretary:
            return secretary.law_firm, 'RECEPTIONIST' if secretary.is_receptionist else 'SECRETARY', secretary
        lawyer = active_staff(Lawyer).filter(user=user).first()
        if lawyer:
            return lawyer.law_firm, 'ADVOCATE', lawyer
    raise PermissionDenied('Client arrivals require an active intake staff or advocate account.')


def reception_mode(firm):
    return FirmSetting.objects.filter(firm=firm).values_list('queue_reception_mode', flat=True).first() or 'SHARED'


def visible_lawyers(firm, role, profile):
    lawyers = active_staff(Lawyer).filter(law_firm=firm).select_related('user', 'branch')
    # An advocate, including a practising owner whose firm has reception staff, sees only their own consultations.
    if role == 'ADVOCATE' or (role == 'ADMIN' and profile and not receives_visitors(firm, role, profile)):
        return lawyers.filter(pk=profile.pk)
    if role == 'SECRETARY' and reception_mode(firm) == 'ASSIGNED':
        return lawyers.filter(assigned_secretaries=profile)
    return lawyers


def has_receptionist(firm):
    return active_staff(Secretary).filter(law_firm=firm, is_receptionist=True, can_manage_client_intake=True).exists()


def reception_covers(firm, lawyer):
    """Whether a secretary or receptionist receives this advocate's walk-ins."""
    staff = active_staff(Secretary).filter(law_firm=firm, can_manage_client_intake=True)
    if reception_mode(firm) == 'ASSIGNED':
        staff = staff.filter(Q(is_receptionist=True) | Q(assigned_lawyers=lawyer))
    return staff.exists()


def receives_visitors(firm, role, profile):
    # Reception belongs to the firm's intake staff. Where no secretary covers an
    # advocate (a sole practitioner, or a secretary on leave), the advocate
    # receives their own walk-ins rather than leave clients unrecorded; an owner
    # who does not practise always keeps the register.
    if role in ['SECRETARY', 'RECEPTIONIST']:
        return True
    if role == 'ADMIN':
        return not (profile and reception_covers(firm, profile))
    return role == 'ADVOCATE' and profile is not None and not reception_covers(firm, profile)


def is_own_reception(role, profile, receives, lawyers):
    """An advocate who receives only their own clients: no calling or ushering, the visitor is in front of them."""
    return bool(receives and role in ['ADVOCATE', 'ADMIN'] and profile is not None
        and [lawyer.pk for lawyer in lawyers] == [profile.pk])


def expected_meetings(firm, lawyers=None):
    """Today's client meetings in the firm's matter diaries, earliest first."""
    meetings = (CaseEvent.objects.filter(case__firm=firm, event_type=CaseEvent.EventType.CLIENT_MEETING,
            starts_at__date=timezone.localdate(), case__client__isnull=False)
        .exclude(status__in=CANCELLED_MEETING).select_related('case__client', 'case__assigned_lawyer__user'))
    if lawyers is not None:
        meetings = meetings.filter(case__assigned_lawyer__in=lawyers)
    return meetings.order_by('starts_at')


def serialize_expected(meeting, arrived):
    client, lawyer = meeting.case.client, meeting.case.assigned_lawyer
    return {
        'appointment': str(meeting.pk), 'starts_at': meeting.starts_at, 'title': meeting.title,
        'matter': meeting.case.case_number, 'client': str(client.pk), 'client_name': client.full_name,
        'client_phone': client.phone_number, 'advocate': str(lawyer.pk) if lawyer else '',
        'advocate_name': lawyer.user.full_name if lawyer else '', 'arrived': arrived,
    }


def office_label(lawyer):
    room = (lawyer.office_location or '').strip()
    if room and lawyer.branch_id:
        return f'{lawyer.branch.name} · {room}'
    return room


class VisitSerializer(serializers.ModelSerializer):
    advocate_name = serializers.CharField(source='advocate.user.full_name', read_only=True)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True)
    office_location = serializers.SerializerMethodField()
    visitor_phone = serializers.CharField(max_length=20)

    def validate_visitor_phone(self, value):
        try:
            return normalize_phone_number(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages)

    def get_office_location(self, obj):
        return office_label(obj.advocate)

    class Meta:
        model = ClientVisit
        fields = '__all__'
        read_only_fields = ['id', 'firm', 'received_by', 'intake_handler', 'arrival_at', 'status',
            'intake_completed_at', 'intake_completed_by', 'consultation_started_at', 'closed_at',
            'called_at', 'called_by', 'ushered_by', 'created_at', 'updated_at']

    def validate_acting_capacity(self, value):
        value = (value or '').strip()
        if value and value != 'Personally' and not (value.startswith('On behalf of: ') and value[len('On behalf of: '):].strip()):
            raise serializers.ValidationError('Select personally, or specify who the visitor is acting for.')
        return value

    def validate(self, attrs):
        firm = self.context['firm']
        advocate = attrs.get('advocate')
        if advocate and not active_staff(Lawyer).filter(pk=advocate.pk, law_firm=firm).exists():
            raise serializers.ValidationError({'advocate': 'Select an active advocate in this firm.'})
        appointment = attrs.get('appointment')
        if appointment:
            if not expected_meetings(firm).filter(pk=appointment.pk).exists():
                raise serializers.ValidationError({'appointment': 'Select a client meeting in this firm’s diary for today.'})
            if ClientVisit.objects.filter(appointment=appointment).exists():
                raise serializers.ValidationError({'appointment': 'This client has already been recorded as arrived for that meeting.'})
            # The appointment names the client; reception does not choose another.
            attrs['client'] = appointment.case.client
        client = attrs.get('client')
        if client and (client.firm_id != firm.id or not client.is_active or client.lifecycle_status == 'ARCHIVED'):
            raise serializers.ValidationError({'client': 'Select an active client in this firm.'})
        return attrs


def record(visit, user, action):
    AuditService.record(firm=visit.firm, user=user, action=action, obj=visit,
        new={'status': visit.status, 'intake_handler': visit.intake_handler,
             'advocate_id': str(visit.advocate_id), 'client_id': str(visit.client_id) if visit.client_id else None,
             'office_location': office_label(visit.advocate)})


def serialize_visit(visit, role, profile, receives=None):
    if receives is None:
        receives = receives_visitors(visit.firm, role, profile)
    data = VisitSerializer(visit).data
    assigned = role in ['ADVOCATE', 'ADMIN'] and profile is not None and visit.advocate_id == profile.pk
    # Legal intake belongs to the assigned advocate, including legacy reception visits.
    can_intake = assigned and visit.status == 'IN_CONSULTATION'
    if not assigned:
        for field in INTAKE_FIELDS:
            data.pop(field, None)
    if not visit.intake_completed_at:
        data['intake_handler'] = 'ADVOCATE'
    data['file_due'] = visit.outcome == 'INSTRUCTING' and not visit.client_id
    data['file_overdue'] = bool(data['file_due'] and visit.closed_at and timezone.localdate(visit.closed_at) < timezone.localdate())
    data['previous_visit_count'] = ClientVisit.objects.filter(firm=visit.firm, visitor_phone=visit.visitor_phone,
        arrival_at__lt=visit.arrival_at).count() if visit.visitor_phone else 0
    data['can_record_intake'] = bool(can_intake and not visit.intake_completed_at and visit.status in ACTIVE_STATUSES)
    data['can_consult'] = bool(assigned)
    data['can_call'] = bool(assigned or role == 'ADMIN')
    data['can_usher'] = receives and visit.status == 'CALLED'
    return data


def notify_reception(visit, user):
    staff = active_staff(Secretary).filter(law_firm=visit.firm, can_manage_client_intake=True)
    if reception_mode(visit.firm) == 'ASSIGNED':
        staff = staff.filter(Q(is_receptionist=True) | Q(assigned_lawyers=visit.advocate)).distinct()
    for secretary in staff:
        Notification.objects.update_or_create(recipient=secretary.user, event_key=f'visit-called:{visit.pk}', defaults={
            'firm': visit.firm, 'actor': user, 'title': 'Ready to usher client in',
            'message': f'{visit.visitor_name} → {visit.advocate.user.full_name} · {office_label(visit.advocate)}',
            'action_url': '/secretary/arrivals',
        })


class ClientVisitListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm, role, profile = visit_access(request.user)
        lawyers = list(visible_lawyers(firm, role, profile))
        visits = list(ClientVisit.objects.filter(firm=firm, advocate_id__in=[x.pk for x in lawyers])
            .select_related('advocate__user', 'advocate__branch', 'received_by')
            .filter(Q(status__in=ACTIVE_STATUSES) | Q(closed_at__date=timezone.localdate())
                | Q(outcome='INSTRUCTING', client__isnull=True)))
        receptionist = has_receptionist(firm)
        receives = receives_visitors(firm, role, profile)
        rows = [serialize_visit(v, role, profile, receives) for v in visits]
        queues = []
        for lawyer in lawyers:
            own = [row for row in rows if row['advocate'] == lawyer.pk or str(row['advocate']) == str(lawyer.pk)]
            waiting = [row for row in own if row['status'] == 'WAITING']
            called = next((row for row in own if row['status'] == 'CALLED'), None)
            current = next((row for row in own if row['status'] == 'IN_CONSULTATION'), None)
            queues.append({
                'advocate': str(lawyer.pk), 'advocate_name': lawyer.user.full_name,
                'office_location': office_label(lawyer), 'waiting_count': len(waiting) + bool(called),
                'current': current, 'called': called, 'next': waiting[0] if waiting else None,
                'can_call': role == 'ADMIN' or (role == 'ADVOCATE' and lawyer.pk == profile.pk),
            })
        meetings = list(expected_meetings(firm, lawyers)) if receives else []
        arrived = set(ClientVisit.objects.filter(appointment__in=meetings).values_list('appointment_id', flat=True))
        return Response({
            'has_receptionist': receptionist, 'role': role, 'reception_mode': reception_mode(firm),
            'can_receive': receives,
            # A practising advocate with no secretary covering them is their own reception.
            'self_reception': is_own_reception(role, profile, receives, lawyers),
            'advocates': [{'value': str(x.pk), 'label': f'{x.user.full_name} — {office_label(x) or "Office not assigned"}'} for x in lawyers],
            # Clients expected today come first at reception; anyone else is searched for.
            'expected_today': [serialize_expected(meeting, meeting.pk in arrived) for meeting in meetings],
            'visits': rows, 'queues': queues, 'waiting_count': sum(q['waiting_count'] for q in queues),
            'server_time': timezone.now(),
        })

    @transaction.atomic
    def post(self, request):
        firm, role, profile = visit_access(request.user)
        if not receives_visitors(firm, role, profile):
            raise PermissionDenied('Reception or the secretary records arrivals.')
        LawFirm.objects.select_for_update().get(pk=firm.pk)
        allowed = ARRIVAL_FIELDS
        if set(request.data) - allowed:
            raise ValidationError('Record arrival details only. The assigned advocate records legal intake during consultation.')
        serializer = VisitSerializer(data=request.data, context={'firm': firm})
        serializer.is_valid(raise_exception=True)
        advocate = serializer.validated_data['advocate']
        if not visible_lawyers(firm, role, profile).filter(pk=advocate.pk).exists():
            raise PermissionDenied('Record arrivals for your own consultations only.' if role == 'ADVOCATE'
                else 'This advocate is not assigned to you. Ask the admin to update secretary coverage.')
        visit = serializer.save(firm=firm, received_by=request.user, intake_handler='ADVOCATE')
        record(visit, request.user, 'CLIENT_VISIT_ARRIVED')
        if advocate.user_id == request.user.id:
            # The advocate received the visitor personally: the consultation starts now unless
            # they are with another client, in which case the visitor waits for them.
            busy = ClientVisit.objects.filter(advocate=advocate, status__in=['CALLED', 'IN_CONSULTATION']).exclude(pk=visit.pk).exists()
            if not busy:
                visit.status = 'IN_CONSULTATION'
                visit.consultation_started_at = timezone.now()
                visit.save(update_fields=['status', 'consultation_started_at', 'updated_at'])
                record(visit, request.user, 'CLIENT_VISIT_START')
            return Response(serialize_visit(visit, role, profile), status=201)
        Notification.objects.create(firm=firm, recipient=visit.advocate.user, actor=request.user,
            title='Urgent client arrival' if visit.urgency_flag else 'Client waiting for consultation', message='A visitor has joined your waiting queue.',
            action_url='/admin/arrivals' if visit.advocate.user.role == UserRole.ADMIN else '/lawyer/arrivals', event_key=f'visit-arrived:{visit.pk}')
        return Response(serialize_visit(visit, role, profile), status=201)


def phone_fragment(query):
    """The digits to look for in a stored number, whether it was saved as 07…, 2547… or +2547…."""
    digits = ''.join(ch for ch in query if ch.isdigit())
    if digits.startswith('254'):
        digits = digits[3:]
    return digits[1:] if digits.startswith('0') else digits


def receivable_clients(firm):
    return Client.objects.filter(firm=firm, is_active=True).exclude(lifecycle_status='ARCHIVED')


def mask(value):
    value = (value or '').strip()
    return f'••••{value[-4:]}' if len(value) > 4 else value


class ArrivalClientSearchView(APIView):
    """Find an existing client at reception by name, phone, ID or passport number, KRA PIN or file reference."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm, role, profile = visit_access(request.user)
        if not receives_visitors(firm, role, profile):
            raise PermissionDenied('Reception or the secretary looks up client records at arrival.')
        query = (request.query_params.get('q') or '').strip()
        if len(query) < 3:
            return Response([])
        match = (Q(full_name__icontains=query) | Q(alternative_names__icontains=query) | Q(email__iexact=query)
            | Q(national_id__iexact=query) | Q(passport_number__iexact=query) | Q(kra_pin__iexact=query)
            | Q(kyc_drawer_reference__iexact=query))
        fragment = phone_fragment(query)
        if len(fragment) >= 3:
            match |= Q(phone_number__contains=fragment)
        clients = receivable_clients(firm).filter(match).order_by('full_name')[:8]
        # Reception confirms who is standing there; full identity numbers stay on the client file.
        return Response([{
            'value': str(client.pk), 'label': client.full_name, 'phone': client.phone_number,
            'identifier': mask(client.national_id or client.passport_number or client.kra_pin),
            'file_reference': client.kyc_drawer_reference or '',
        } for client in clients])


class ReturningVisitorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm, role, profile = visit_access(request.user)
        if not receives_visitors(firm, role, profile):
            raise PermissionDenied('Reception or the secretary looks up the visitor register.')
        query = (request.query_params.get('q') or '').strip()
        digits = ''.join(ch for ch in query if ch.isdigit())
        if digits.startswith('254'):
            digits = '0' + digits[3:]
        if len(digits) >= 4:
            match = Q(visitor_phone__contains=digits)
            client_match = Q(phone_number__contains=phone_fragment(query))
        elif len(query) >= 3:
            match = Q(visitor_name__icontains=query)
            client_match = Q(full_name__icontains=query) | Q(alternative_names__icontains=query)
        else:
            return Response([])
        visits = (ClientVisit.objects.filter(firm=firm).exclude(visitor_phone='').filter(match)
            .select_related('advocate__user', 'client').order_by('-arrival_at'))
        visitors = {}
        for visit in visits[:200]:
            entry = visitors.get(visit.visitor_phone)
            if entry is None:
                if len(visitors) == 8:
                    continue
                entry = visitors[visit.visitor_phone] = {
                    'visitor_name': visit.visitor_name, 'visitor_phone': visit.visitor_phone, 'visit_count': 0,
                    'last_arrival_at': visit.arrival_at, 'last_advocate_name': visit.advocate.user.full_name,
                    'client': None, 'client_name': '',
                }
            entry['visit_count'] += 1
            if visit.client_id and not entry['client'] and visit.client.is_active and visit.client.lifecycle_status != 'ARCHIVED':
                entry['client'], entry['client_name'] = str(visit.client_id), visit.client.full_name
        # A client whose file was opened without a walk-in is not in the register yet; offer the record
        # too, so an existing client is never received as a stranger.
        linked = {entry['client'] for entry in visitors.values() if entry['client']}
        for client in receivable_clients(firm).filter(client_match).order_by('full_name')[:8]:
            if str(client.pk) in linked or len(visitors) == 8:
                continue
            visitors[f'client:{client.pk}'] = {
                'visitor_name': client.full_name, 'visitor_phone': client.phone_number, 'visit_count': 0,
                'last_arrival_at': None, 'last_advocate_name': '', 'client': str(client.pk), 'client_name': client.full_name,
            }
        return Response(list(visitors.values()))


class ClientVisitActionView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, visit_id):
        firm, role, profile = visit_access(request.user)
        base = get_object_or_404(ClientVisit, pk=visit_id, firm=firm)
        # This lock prevents simultaneous calls/starts for different queue rows.
        Lawyer.objects.select_for_update().get(pk=base.advocate_id)
        visit = get_object_or_404(ClientVisit.objects.select_for_update(of=('self',)).select_related('advocate__user', 'advocate__branch'), pk=visit_id, firm=firm)
        if not visible_lawyers(firm, role, profile).filter(pk=visit.advocate_id).exists():
            raise PermissionDenied('This visit is assigned to another advocate.')
        action = request.data.get('action')
        permissions = serialize_visit(visit, role, profile)
        if action == 'LINK_CLIENT':
            if not permissions['can_consult']:
                raise PermissionDenied('The advocate who held the consultation links the client record.')
            if set(request.data) - {'action', 'client'}:
                raise ValidationError('Only the client reference may be linked.')
            if visit.status not in {'IN_CONSULTATION', 'COMPLETED'} or not visit.intake_completed_at:
                raise ValidationError('Complete preliminary intake and start consultation before linking the client.')
            if visit.outcome == 'ENQUIRY_ONLY':
                raise ValidationError('The advocate recorded this visit as an enquiry only; no client file is opened.')
            client_id = serializers.UUIDField().run_validation(request.data.get('client'))
            client = get_object_or_404(Client, pk=client_id, firm=firm, is_active=True)
            if client.lifecycle_status == 'ARCHIVED':
                raise ValidationError({'client': 'Select an active client.'})
            if visit.client_id and visit.client_id != client.pk:
                raise ValidationError({'client': 'This visit is already linked to another client.'})
            visit.client = client
            visit.save(update_fields=['client', 'updated_at'])
        elif action == 'INTAKE':
            if not permissions['can_record_intake']:
                raise PermissionDenied('Only the assigned advocate can record legal intake during consultation.')
            if set(request.data) - INTAKE_FIELDS - {'action'}:
                raise ValidationError('Unsupported intake fields.')
            serializer = VisitSerializer(visit, data={k: v for k, v in request.data.items() if k != 'action'}, partial=True, context={'firm': firm})
            serializer.is_valid(raise_exception=True)
            if not (serializer.validated_data.get('broad_issue', visit.broad_issue) or '').strip():
                raise ValidationError({'broad_issue': 'Record the broad nature of the enquiry.'})
            serializer.save(intake_completed_at=timezone.now(), intake_completed_by=request.user,
                intake_handler='ADVOCATE')
        elif action in ['CALL', 'START', 'USHER']:
            if action == 'USHER':
                if not permissions['can_usher']:
                    raise PermissionDenied('Only reception or the secretary can usher a called client in.')
            elif not permissions['can_call' if action == 'CALL' else 'can_consult']:
                raise PermissionDenied('Only the assigned advocate conducts the consultation; an admin may manage calls.')
            if visit.status not in (['CALLED'] if action == 'USHER' else ['WAITING'] if action == 'CALL' else ['WAITING', 'CALLED']):
                raise ValidationError('This visit is no longer waiting for that action. Refresh the queue.')
            if ClientVisit.objects.filter(advocate=visit.advocate, status__in=['CALLED', 'IN_CONSULTATION']).exclude(pk=visit.pk).exists():
                raise ValidationError('Complete the current consultation or usher the called client before calling another.')
            if visit.status == 'WAITING' and role != 'ADMIN':
                first = ClientVisit.objects.filter(advocate=visit.advocate, status='WAITING').first()
                if first.pk != visit.pk:
                    raise ValidationError('Call the next client in arrival order. Only the admin may call out of order.')
            if action == 'CALL' and not office_label(visit.advocate):
                raise ValidationError('Ask the admin to set this advocate’s office before calling a client.')
            if action == 'CALL':
                visit.status = 'CALLED'
                visit.called_at = timezone.now()
                visit.called_by = request.user
            else:
                visit.status = 'IN_CONSULTATION'
                visit.consultation_started_at = timezone.now()
                if action == 'USHER':
                    visit.ushered_by = request.user
            visit.save()
            if action == 'CALL':
                notify_reception(visit, request.user)
            elif action == 'USHER':
                Notification.objects.get_or_create(recipient=visit.advocate.user, event_key=f'visit-ushered:{visit.pk}', defaults={
                    'firm': firm, 'actor': request.user, 'title': 'Client ushered in',
                    'message': f'{visit.visitor_name} has been ushered to your office.',
                    'action_url': '/admin/arrivals' if visit.advocate.user.role == UserRole.ADMIN else '/lawyer/arrivals',
                })
        elif action == 'COMPLETE':
            if not permissions['can_consult']:
                raise PermissionDenied('Only the assigned advocate completes the consultation.')
            if visit.status != 'IN_CONSULTATION' or not visit.intake_completed_at:
                raise ValidationError('Start the consultation and complete preliminary intake first.')
            if set(request.data) - {'action', 'outcome'}:
                raise ValidationError('Record only the outcome of the consultation.')
            outcome = request.data.get('outcome')
            if outcome not in ClientVisit.Outcome.values:
                raise ValidationError({'outcome': 'State whether the visitor is instructing the firm or this was an enquiry only.'})
            visit.status = 'COMPLETED'
            visit.outcome = outcome
            visit.closed_at = timezone.now()
            visit.save()
        elif action == 'LEFT':
            if visit.status not in ['WAITING', 'CALLED']:
                raise ValidationError('Only a waiting or called visitor can be marked as left.')
            visit.status = 'LEFT'
            visit.closed_at = timezone.now()
            visit.save()
        else:
            raise ValidationError({'action': 'Select INTAKE, CALL, USHER, START, COMPLETE, LINK_CLIENT or LEFT.'})
        record(visit, request.user, f'CLIENT_VISIT_{action}')
        return Response(serialize_visit(visit, role, profile))
