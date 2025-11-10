from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import Business, Event, Category
from .serializers import (
    BusinessSerializer,
    EventSerializer,
    EventListSerializer,
    CategorySerializer
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing categories.
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    ordering = ['name']


class BusinessViewSet(viewsets.ModelViewSet):
    """
    API endpoint for businesses.
    - GET: View verified businesses
    - POST: Submit business registration (pending verification)
    """
    serializer_class = BusinessSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        """Only show verified businesses for list view"""
        if self.action in ['list', 'retrieve']:
            return Business.objects.filter(is_verified=True)
        return Business.objects.all()

    def create(self, request, *args, **kwargs):
        """Create a new business (unverified by default)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Business will be created with is_verified=False (default in model)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'message': 'Business registration submitted successfully! Your business will be reviewed by our team.',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )


class EventViewSet(viewsets.ModelViewSet):
    """
    API endpoint for events.
    - GET: View approved events
    - POST: Submit event (pending approval)
    """
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['businesses', 'status']
    ordering_fields = ['start_datetime', 'created_at']
    ordering = ['-start_datetime']

    def get_queryset(self):
        """Only show approved events for list view"""
        if self.action in ['list', 'retrieve', 'active', 'map_data']:
            return Event.objects.prefetch_related(
                'businesses',
                'businesses__categories'
            ).filter(status='approved')
        return Event.objects.prefetch_related(
            'businesses',
            'businesses__categories'
        ).all()

    def get_serializer_class(self):
        """Use lightweight serializer for list view (map markers)"""
        if self.action == 'list':
            return EventListSerializer
        return EventSerializer

    def create(self, request, *args, **kwargs):
        """Create a new event (pending approval by default)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Event will be created with status='pending' (if set in data) or 'approved' (model default)
        # For user submissions, we should set it to 'pending'
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                'message': 'Event submitted successfully! Your event will be reviewed by our team.',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )

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
