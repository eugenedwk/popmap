from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import Business, Event, Category, EventRSVP
from .serializers import (
    BusinessSerializer,
    EventSerializer,
    EventListSerializer,
    CategorySerializer,
    EventRSVPSerializer
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def join(self, request, pk=None):
        """Allow a business owner to join their business to an existing event"""
        event = self.get_object()
        business_id = request.data.get('business_id')

        if not business_id:
            return Response(
                {'error': 'business_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            business = Business.objects.get(id=business_id, is_verified=True)
        except Business.DoesNotExist:
            return Response(
                {'error': 'Business not found or not verified'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if the authenticated user owns this business
        if business.owner != request.user:
            return Response(
                {'error': 'You do not have permission to manage this business'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if business is already part of the event
        if event.businesses.filter(id=business_id).exists():
            return Response(
                {'message': 'Business is already part of this event'},
                status=status.HTTP_200_OK
            )

        # Add business to event
        event.businesses.add(business)

        return Response(
            {
                'message': f'{business.name} has successfully joined the event',
                'event_id': event.id,
                'business_id': business.id
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def leave(self, request, pk=None):
        """Allow a business owner to remove their business from an event"""
        event = self.get_object()
        business_id = request.data.get('business_id')

        if not business_id:
            return Response(
                {'error': 'business_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            business = Business.objects.get(id=business_id)
        except Business.DoesNotExist:
            return Response(
                {'error': 'Business not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if the authenticated user owns this business
        if business.owner != request.user:
            return Response(
                {'error': 'You do not have permission to manage this business'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if business is part of the event
        if not event.businesses.filter(id=business_id).exists():
            return Response(
                {'message': 'Business is not part of this event'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Remove business from event
        event.businesses.remove(business)

        return Response(
            {
                'message': f'{business.name} has left the event',
                'event_id': event.id,
                'business_id': business.id
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def rsvp(self, request, pk=None):
        """
        Create or update an RSVP for an event.
        Body: { "status": "interested" | "going" }
        """
        event = self.get_object()
        rsvp_status = request.data.get('status')

        if not rsvp_status or rsvp_status not in ['interested', 'going']:
            return Response(
                {'error': 'status is required and must be either "interested" or "going"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or update RSVP
        rsvp, created = EventRSVP.objects.update_or_create(
            event=event,
            user=request.user,
            defaults={'status': rsvp_status}
        )

        serializer = EventRSVPSerializer(rsvp)
        message = 'RSVP created successfully' if created else 'RSVP updated successfully'

        return Response(
            {
                'message': message,
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def cancel_rsvp(self, request, pk=None):
        """Cancel/delete an RSVP for an event"""
        event = self.get_object()

        try:
            rsvp = EventRSVP.objects.get(event=event, user=request.user)
            rsvp.delete()
            return Response(
                {'message': 'RSVP cancelled successfully'},
                status=status.HTTP_200_OK
            )
        except EventRSVP.DoesNotExist:
            return Response(
                {'error': 'No RSVP found for this event'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_rsvps(self, request):
        """Get all RSVPs for the authenticated user"""
        rsvps = EventRSVP.objects.filter(user=request.user).select_related('event').order_by('-created_at')
        serializer = EventRSVPSerializer(rsvps, many=True)
        return Response(serializer.data)
