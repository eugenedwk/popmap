from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BusinessViewSet, EventViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'businesses', BusinessViewSet, basename='business')
router.register(r'events', EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
]
