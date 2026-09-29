from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class KnowledgeBaseAnonThrottle(AnonRateThrottle):
    scope = "knowledge_base_ask"


class DashboardAssistantThrottle(UserRateThrottle):
    scope = "dashboard_assistant"
