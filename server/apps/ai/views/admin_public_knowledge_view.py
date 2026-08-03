from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response

from apps.ai.models import KnowledgeBaseArticle
from apps.ai.serializers.public_knowledge_serializer import PublicKnowledgeItemSerializer
from apps.ai.services.public_knowledge_service import PublicKnowledgeWorkflow
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminPublicKnowledgeListView(AdminFirmBaseView):
    def get(self, request):
        queryset = KnowledgeBaseArticle.objects.filter(firm=self.get_firm()).select_related("approved_by", "withdrawn_by")
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(summary__icontains=search) | Q(body__icontains=search))
        if request.query_params.get("category"):
            queryset = queryset.filter(public_category=request.query_params["category"])
        if request.query_params.get("status"):
            queryset = queryset.filter(approval_status=request.query_params["status"])
        return Response({"results": PublicKnowledgeItemSerializer(queryset.order_by("-updated_at"), many=True).data, "categories": [{"value": value, "label": label} for value, label in KnowledgeBaseArticle.PublicCategory.choices], "statuses": [{"value": value, "label": label} for value, label in KnowledgeBaseArticle.ApprovalStatus.choices]})

    def post(self, request):
        serializer = PublicKnowledgeItemSerializer(data=request.data, context={"request": request, "firm": self.get_firm()})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminPublicKnowledgeDetailView(AdminFirmBaseView):
    def get_object(self, item_id):
        return get_object_or_404(KnowledgeBaseArticle, id=item_id, firm=self.get_firm())

    def get(self, request, item_id):
        return Response(PublicKnowledgeItemSerializer(self.get_object(item_id), context={"include_history": True}).data)

    def patch(self, request, item_id):
        serializer = PublicKnowledgeItemSerializer(self.get_object(item_id), data=request.data, partial=True, context={"request": request, "firm": self.get_firm(), "include_history": True})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminPublicKnowledgeActionView(AdminPublicKnowledgeDetailView):
    def post(self, request, item_id, action):
        article = self.get_object(item_id)
        if action == "revise":
            article = PublicKnowledgeWorkflow.revise(article=article, actor=request.user)
            return Response(PublicKnowledgeItemSerializer(article, context={"include_history": True}).data, status=status.HTTP_201_CREATED)
        article = PublicKnowledgeWorkflow.transition(article=article, actor=request.user, action=action, publish_at=request.data.get("published_at"), confirmed=request.data.get("confirmed", False))
        return Response(PublicKnowledgeItemSerializer(article, context={"include_history": True}).data)
