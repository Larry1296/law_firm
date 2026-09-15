from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from apps.clients.views.walk_in_enquiry_view import WalkInBaseView
from apps.clients.services.preliminary_review_service import PreliminaryReviewService as Service


class PreliminaryBaseView(WalkInBaseView):
    def initial(self, request, *args, **kwargs):
        # Preserve the JSON-only parser and privacy-safe exception handler of intake.
        super(WalkInBaseView, self).initial(request, *args, **kwargs)
        Service.authority(request.user, self.workspace)


class PreliminaryQueueView(PreliminaryBaseView):
    def get(self, request):
        return Response({'enquiries': [Service.present(e, self.workspace) for e in Service.enquiries(user=request.user, workspace=self.workspace)],
                         **Service.options(user=request.user, workspace=self.workspace)})


class PreliminaryDetailView(PreliminaryBaseView):
    def get(self, request, enquiry_id):
        enquiry = get_object_or_404(Service.enquiries(user=request.user, workspace=self.workspace), pk=enquiry_id)
        return Response(Service.present(enquiry, self.workspace, detail=True))


class PreliminaryActionView(PreliminaryBaseView):
    action = None

    def post(self, request, enquiry_id):
        command = getattr(Service, self.action)
        review = command(user=request.user, workspace=self.workspace, enquiry_id=enquiry_id, data=request.data)
        # Refresh the relation cache after a mutation.
        enquiry = review.enquiry
        enquiry.preliminary_review = review
        return Response(Service.present(enquiry, self.workspace, detail=True))
