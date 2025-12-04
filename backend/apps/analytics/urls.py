from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TrackingViewSet, AnalyticsDashboardViewSet

router = DefaultRouter()
router.register(r'track', TrackingViewSet, basename='tracking')
router.register(r'dashboard', AnalyticsDashboardViewSet, basename='analytics-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
