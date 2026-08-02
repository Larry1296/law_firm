from rest_framework.throttling import AnonRateThrottle


class KnowledgeBaseAnonThrottle(AnonRateThrottle):
    scope = "knowledge_base_ask"
