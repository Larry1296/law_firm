from rest_framework.routers import DefaultRouter
from .views import TutorialViewSet, CategoryViewSet
router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='tutorial-category')
router.register('', TutorialViewSet, basename='tutorial')
urlpatterns = router.urls
