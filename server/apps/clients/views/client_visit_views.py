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
from apps.clients.models import Client, ClientVisit
from apps.common.choices import UserRole
from apps.firm.models import FirmSetting, LawFirm
from apps.notifications.models import Notification
from apps.staff.models import Lawyer, Secretary

ACTIVE_STATUSES = ['WAITING', 'CALLED', 'IN_CONSULTATION']
INTAKE_FIELDS = {'contact_details', 'acting_capacity', 'other_parties', 'broad_issue', 'deadline'}
ARRIVAL_FIELDS = {'visitor_name', 'client', 'advocate', 'urgency_flag', 'urgency_note'}


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
    if role == 'ADVOCATE':
        return lawyers.filter(pk=profile.pk)
    if role == 'SECRETARY' and reception_mode(firm) == 'ASSIGNED':
        return lawyers.filter(assigned_secretaries=profile)
    return lawyers


def has_receptionist(firm):
    return active_staff(Secretary).filter(law_firm=firm, is_receptionist=True, can_manage_client_intake=True).exists()


def office_label(lawyer):
    room = (lawyer.office_location or '').strip()
    if room and lawyer.branch_id:
        return f'{lawyer.branch.name} · {room}'
    return room


class VisitSerializer(serializers.ModelSerializer):
    advocate_name = serializers.CharField(source='advocate.user.full_name', read_only=True)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True)
    office_location = serializers.SerializerMethodField()

    def get_office_location(self, obj):
        return office_label(obj.advocate)

    class Meta:
        model = ClientVisit
        fields = '__all__'
        read_only_fields = ['id', 'firm', 'received_by', 'intake_handler', 'arrival_at', 'status',
            'intake_completed_at', 'intake_completed_by', 'consultation_started_at', 'closed_at',
            'called_at', 'called_by', 'ushered_by', 'created_at', 'updated_at']

    def validate(self, attrs):
        firm = self.context['firm']
        advocate = attrs.get('advocate')
        if advocate and not active_staff(Lawyer).filter(pk=advocate.pk, law_firm=firm).exists():
            raise serializers.ValidationError({'advocate': 'Select an active advocate in this firm.'})
        client = attrs.get('client')
        if client and (client.firm_id != firm.id or not client.is_active or client.lifecycle_status == 'ARCHIVED'):
            raise serializers.ValidationError({'client': 'Select an active client in this firm.'})
        return attrs


def record(visit, user, action):
    AuditService.record(firm=visit.firm, user=user, action=action, obj=visit,
        new={'status': visit.status, 'intake_handler': visit.intake_handler,
             'advocate_id': str(visit.advocate_id), 'office_location': office_label(visit.advocate)})


def serialize_visit(visit, role, profile, receptionist=None):
    data = VisitSerializer(visit).data
    assigned = role in ['ADVOCATE', 'ADMIN'] and profile is not None and visit.advocate_id == profile.pk
    receptionist = has_receptionist(visit.firm) if receptionist is None else receptionist
    can_intake = ((role == 'RECEPTIONIST' and visit.intake_handler == 'RECEPTIONIST') or
        (assigned and visit.status == 'IN_CONSULTATION' and (visit.intake_handler == 'ADVOCATE' or not receptionist)))
    if not (can_intake or assigned):
        for field in INTAKE_FIELDS:
            data.pop(field, None)
    data['can_record_intake'] = bool(can_intake and not visit.intake_completed_at and visit.status in ACTIVE_STATUSES)
    data['can_consult'] = bool(assigned or role == 'ADMIN')
    data['can_call'] = bool(assigned or role == 'ADMIN')
    data['can_usher'] = role in ['ADMIN', 'SECRETARY', 'RECEPTIONIST'] and visit.status == 'CALLED'
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
            .filter(Q(status__in=ACTIVE_STATUSES) | Q(closed_at__date=timezone.localdate())))
        receptionist = has_receptionist(firm)
        rows = [serialize_visit(v, role, profile, receptionist) for v in visits]
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
        clients = Client.objects.filter(firm=firm, is_active=True).exclude(lifecycle_status='ARCHIVED') if role != 'ADVOCATE' else Client.objects.none()
        return Response({
            'has_receptionist': receptionist, 'role': role, 'reception_mode': reception_mode(firm),
            'can_receive': role in ['ADMIN', 'SECRETARY', 'RECEPTIONIST'],
            'advocates': [{'value': str(x.pk), 'label': f'{x.user.full_name} — {office_label(x) or "Office not assigned"}'} for x in lawyers],
            'clients': [{'value': str(x.pk), 'label': x.full_name} for x in clients.order_by('full_name')],
            'visits': rows, 'queues': queues, 'waiting_count': sum(q['waiting_count'] for q in queues),
            'server_time': timezone.now(),
        })

    @transaction.atomic
    def post(self, request):
        firm, role, profile = visit_access(request.user)
        if role not in ['ADMIN', 'SECRETARY', 'RECEPTIONIST']:
            raise PermissionDenied('Reception or the secretary records arrivals.')
        LawFirm.objects.select_for_update().get(pk=firm.pk)
        receptionist = has_receptionist(firm)
        allowed = ARRIVAL_FIELDS | (INTAKE_FIELDS if role == 'RECEPTIONIST' and receptionist else set())
        if set(request.data) - allowed:
            raise ValidationError('Only the designated intake handler may record preliminary intake fields.')
        serializer = VisitSerializer(data=request.data, context={'firm': firm})
        serializer.is_valid(raise_exception=True)
        advocate = serializer.validated_data['advocate']
        if not visible_lawyers(firm, role, profile).filter(pk=advocate.pk).exists():
            raise PermissionDenied('This advocate is not assigned to you. Ask the admin to update secretary coverage.')
        visit = serializer.save(firm=firm, received_by=request.user, intake_handler='RECEPTIONIST' if receptionist else 'ADVOCATE')
        record(visit, request.user, 'CLIENT_VISIT_ARRIVED')
        Notification.objects.create(firm=firm, recipient=visit.advocate.user, actor=request.user,
            title='Urgent client arrival' if visit.urgency_flag else 'Client waiting for consultation', message='A visitor has joined your waiting queue.',
            action_url='/admin/arrivals' if visit.advocate.user.role == UserRole.ADMIN else '/lawyer/arrivals', event_key=f'visit-arrived:{visit.pk}')
        return Response(serialize_visit(visit, role, profile), status=201)


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
        if action == 'INTAKE':
            if not permissions['can_record_intake']:
                raise PermissionDenied('Only the designated intake handler can complete preliminary intake.')
            if set(request.data) - INTAKE_FIELDS - {'action'}:
                raise ValidationError('Unsupported intake fields.')
            serializer = VisitSerializer(visit, data={k: v for k, v in request.data.items() if k != 'action'}, partial=True, context={'firm': firm})
            serializer.is_valid(raise_exception=True)
            if not (serializer.validated_data.get('broad_issue', visit.broad_issue) or '').strip():
                raise ValidationError({'broad_issue': 'Record the broad nature of the enquiry.'})
            serializer.save(intake_completed_at=timezone.now(), intake_completed_by=request.user,
                intake_handler='RECEPTIONIST' if role == 'RECEPTIONIST' else 'ADVOCATE')
        elif action in ['CALL', 'START', 'USHER']:
            if action == 'USHER':
                if not permissions['can_usher']:
                    raise PermissionDenied('Only reception or the secretary can usher a called client in.')
            elif not permissions['can_consult']:
                raise PermissionDenied('The assigned advocate or admin calls the client.')
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
            if visit.intake_handler == 'RECEPTIONIST' and not visit.intake_completed_at:
                if has_receptionist(firm):
                    raise ValidationError('Reception must complete preliminary intake first.')
                visit.intake_handler = 'ADVOCATE'
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
                raise PermissionDenied('The assigned advocate completes the consultation.')
            if visit.status != 'IN_CONSULTATION' or not visit.intake_completed_at:
                raise ValidationError('Start the consultation and complete preliminary intake first.')
            visit.status = 'COMPLETED'
            visit.closed_at = timezone.now()
            visit.save()
        elif action == 'LEFT':
            if visit.status not in ['WAITING', 'CALLED']:
                raise ValidationError('Only a waiting or called visitor can be marked as left.')
            visit.status = 'LEFT'
            visit.closed_at = timezone.now()
            visit.save()
        else:
            raise ValidationError({'action': 'Select INTAKE, CALL, USHER, START, COMPLETE or LEFT.'})
        record(visit, request.user, f'CLIENT_VISIT_{action}')
        return Response(serialize_visit(visit, role, profile))
