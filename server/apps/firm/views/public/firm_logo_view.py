import mimetypes

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.firm.models import LawFirm


class FirmLogoView(APIView):
    """A firm's logo, for its branded dashboard. Logos are not confidential."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, firm_id):
        firm = get_object_or_404(LawFirm, id=firm_id)
        if not firm.logo:
            raise Http404
        content_type = mimetypes.guess_type(firm.logo.name)[0] or "application/octet-stream"
        response = FileResponse(firm.logo.open("rb"), content_type=content_type)
        response["Cache-Control"] = "public, max-age=86400"
        return response
