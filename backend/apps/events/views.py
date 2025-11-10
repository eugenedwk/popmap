from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import Business, Event
from .serializers import (
    BusinessSerializer,
    EventSerializer,
    EventListSerializer
)


class BusinessViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing businesses.
    Phase 1: Read-only for frontend display
    Phase 2: Will add create/update for business self-service
    """
    queryset = Business.objects.filter(is_verified=True)
    serializer_class = BusinessSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class EventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing events.
    Phase 1: Read-only, events created via Django admin
    Phase 2: Will add create/update for business event submission
    """
    queryset = Event.objects.prefetch_related('businesses').filter(
        status='approved'
    )
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['businesses', 'status']
    ordering_fields = ['start_datetime', 'created_at']
    ordering = ['-start_datetime']

    def get_serializer_class(self):
        """Use lightweight serializer for list view (map markers)"""
        if self.action == 'list':
            return EventListSerializer
        return EventSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active/upcoming events"""
        now = timezone.now()
        active_events = self.get_queryset().filter(
            end_datetime__gte=now
        ).order_by('start_datetime')

        serializer = self.get_serializer(active_events, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def map_data(self, request):
        """Optimized endpoint for map markers"""
        events = self.get_queryset().filter(
            end_datetime__gte=timezone.now()
        )
        serializer = EventListSerializer(events, many=True)
        return Response(serializer.data)
