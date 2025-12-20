from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BusinessViewSet,
    EventViewSet,
    CategoryViewSet,
    GuestUnsubscribeView,
    GuestResubscribeView,
    UserNotificationPreferencesView,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'businesses', BusinessViewSet, basename='business')
router.register(r'events', EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
    # Email unsubscribe endpoints
    path('unsubscribe/guest/', GuestUnsubscribeView.as_view(), name='guest-unsubscribe'),
    path('resubscribe/guest/', GuestResubscribeView.as_view(), name='guest-resubscribe'),
    path('notification-preferences/', UserNotificationPreferencesView.as_view(), name='notification-preferences'),
]
