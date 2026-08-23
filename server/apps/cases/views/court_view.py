from django.db.models import Q
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.cases.models import Court
from apps.cases.serializers.court_serializer import CourtSerializer


class CourtListView(generics.ListAPIView):
    """Search and filter the canonical Kenyan court directory."""

    permission_classes = [IsAuthenticated]
    serializer_class = CourtSerializer

    def get_queryset(self):
        queryset = Court.objects.all()
        params = self.request.query_params
        if params.get("court_type"):
            queryset = queryset.filter(court_type=params["court_type"])
        if params.get("county"):
            queryset = queryset.filter(county__iexact=params["county"])
        if params.get("status"):
            queryset = queryset.filter(status=params["status"])
        if params.get("search"):
            term = params["search"].strip()
            queryset = queryset.filter(
                Q(name__icontains=term)
                | Q(station__icontains=term)
                | Q(county__icontains=term)
                | Q(jurisdiction__icontains=term)
            )
        return queryset


class CourtDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CourtSerializer
    queryset = Court.objects.all()
