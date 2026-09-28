from django.db.models import Q
from django.utils import timezone

from apps.cases.models import Case, CaseTask, MatterDeadline


class MyWorkService:
    """
    One staff member's open work: matter tasks assigned to them and matter
    deadlines they are responsible for. A secretary also sees the deadlines on
    matters where they are the matter secretary or the advocate's secretary.
    """

    OPEN_TASK_STATUSES = [
        CaseTask.TaskStatus.PENDING, CaseTask.TaskStatus.IN_PROGRESS,
        CaseTask.TaskStatus.BLOCKED, CaseTask.TaskStatus.OVERDUE,
    ]

    @staticmethod
    def _secretary_matters(user):
        secretary = getattr(user, "secretary_profile", None)
        if secretary is None:
            return Q(pk__in=[])
        return Q(matter__assigned_secretary=secretary) | Q(
            matter__assigned_lawyer__in=secretary.assigned_lawyers.all()
        )

    PROFILE_ATTRS = ("lawyer_profile", "secretary_profile", "accountant_profile", "hr_profile", "it_profile")

    @classmethod
    def firm_for(cls, user):
        for attr in cls.PROFILE_ATTRS:
            profile = getattr(user, attr, None)
            if profile is not None:
                return profile.law_firm
        owned = getattr(user, "owned_firm", None)
        if owned is not None:
            return owned
        membership = user.firm_memberships.filter(is_active=True).select_related("firm").first()
        return membership.firm if membership else None

    @classmethod
    def items(cls, user, *, limit=200):
        firm = cls.firm_for(user)
        if firm is None:
            return []
        now = timezone.now()

        tasks = (
            CaseTask.objects.filter(case__firm=firm, assigned_to=user, status__in=cls.OPEN_TASK_STATUSES)
            .select_related("case", "case__client")
            .order_by("due_at")[:limit]
        )
        deadlines = (
            MatterDeadline.objects.filter(firm=firm, status=MatterDeadline.Status.OPEN)
            .filter(Q(responsible_staff=user) | cls._secretary_matters(user))
            .exclude(matter__matter_status__in=[Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED])
            .select_related("matter", "matter__client")
            .distinct()
            .order_by("due_at")[:limit]
        )

        items = [
            {
                "id": str(task.id),
                "kind": "TASK",
                "title": task.title,
                "description": task.description,
                "category": task.get_task_type_display(),
                "status": task.get_status_display(),
                "priority": task.priority,
                "due_at": task.due_at,
                "overdue": bool(task.due_at and task.due_at < now),
                "case_id": str(task.case_id),
                "case_number": task.case.case_number,
                "case_title": task.case.title,
                "client_name": getattr(task.case.client, "full_name", ""),
            }
            for task in tasks
        ] + [
            {
                "id": str(deadline.id),
                "kind": "DEADLINE",
                "title": deadline.get_deadline_type_display(),
                "description": deadline.description,
                "category": deadline.get_deadline_type_display(),
                "status": deadline.get_status_display(),
                "priority": deadline.priority,
                "due_at": deadline.due_at,
                "overdue": deadline.due_at < now,
                "case_id": str(deadline.matter_id),
                "case_number": deadline.matter.case_number,
                "case_title": deadline.matter.title,
                "client_name": getattr(deadline.matter.client, "full_name", ""),
            }
            for deadline in deadlines
        ]
        far_future = now.replace(year=now.year + 100)
        return sorted(items, key=lambda item: item["due_at"] or far_future)
