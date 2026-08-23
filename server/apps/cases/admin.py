from django.contrib import admin

from apps.cases.models import Court


@admin.register(Court)
class CourtAdmin(admin.ModelAdmin):
    list_display = ("name", "court_type", "level", "county", "station", "status")
    list_filter = ("court_type", "level", "county", "status")
    search_fields = ("name", "station", "county", "jurisdiction")
    ordering = ("level", "county", "station", "name")
