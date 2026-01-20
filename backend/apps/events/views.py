from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.utils import timezone
from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
from datetime import timedelta

from .models import Business, Event, Category, EventRSVP, GuestEmailPreference, Venue
from .serializers import (
    BusinessSerializer,
    EventSerializer,
    EventListSerializer,
    CategorySerializer,
    EventRSVPSerializer,
    GuestRSVPSerializer,
    VenueSerializer
)
from .permissions import (
    IsBusinessOwnerOrReadOnly,
    IsEventCreatorOrReadOnly,
    CanCreateEvent
)
from rest_framework.permissions import AllowAny


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
    - PUT/PATCH: Update your own business
    - DELETE: Delete your own business (admin only)
    """
    serializer_class = BusinessSerializer
    permission_classes = [IsBusinessOwnerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        """Only show verified businesses for list view"""
        if self.action in ['list', 'retrieve']:
            return Business.objects.filter(is_verified=True)
        return Business.objects.all()

    def perform_create(self, serializer):
        """Set the owner to the current user when creating a business"""
        serializer.save(owner=self.request.user)

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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_businesses(self, request):
        """Get all businesses owned by the authenticated user"""
        businesses = Business.objects.filter(owner=request.user)
        serializer = self.get_serializer(businesses, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by-subdomain/(?P<subdomain>[^/.]+)')
    def by_subdomain(self, request, subdomain=None):
        """Get business by custom subdomain"""
        try:
            business = Business.objects.get(
                custom_subdomain=subdomain,
                is_verified=True
            )
            serializer = self.get_serializer(business)
            return Response(serializer.data)
        except Business.DoesNotExist:
            return Response(
                {'error': f'No business found with subdomain: {subdomain}'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard(self, request, pk=None):
        """
        Get business data for the owner dashboard.
        Only accessible by the business owner or staff.
        """
        try:
            business = Business.objects.get(pk=pk)
        except Business.DoesNotExist:
            return Response(
                {'error': 'Business not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is owner or staff
        if not request.user.is_staff and business.owner != request.user:
            return Response(
                {'error': 'You do not have permission to access this dashboard'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(business)
        return Response(serializer.data)


class VenueViewSet(viewsets.ModelViewSet):
    """
    API endpoint for venues.
    - GET: View venues (filtered by business for owners)
    - POST: Create a venue for your business
    - PUT/PATCH: Update your venue
    - DELETE: Delete your venue
    """
    serializer_class = VenueSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'address']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        """Return venues for businesses owned by the current user"""
        user = self.request.user
        if user.is_staff:
            return Venue.objects.all()
        return Venue.objects.filter(business__owner=user)

    def perform_create(self, serializer):
        """Validate that user owns the business before creating a venue"""
        business = serializer.validated_data.get('business')
        if business and business.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not own this business")
        serializer.save()

    def perform_update(self, serializer):
        """Validate that user owns the business before updating a venue"""
        # Check if business is being changed
        business = serializer.validated_data.get('business')
        if business and business.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not own this business")
        serializer.save()

    @action(detail=False, methods=['get'])
    def for_business(self, request):
        """Get venues for a specific business"""
        business_id = request.query_params.get('business_id')
        if not business_id:
            return Response(
                {'error': 'business_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user has access to this business
        try:
            business = Business.objects.get(id=business_id)
            if not request.user.is_staff and business.owner != request.user:
                return Response(
                    {'error': 'You do not have access to this business'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Business.DoesNotExist:
            return Response(
                {'error': 'Business not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        venues = Venue.objects.filter(business_id=business_id)
        serializer = self.get_serializer(venues, many=True)
        return Response(serializer.data)


class EventViewSet(viewsets.ModelViewSet):
    """
    API endpoint for events.
    - GET: View approved events
    - POST: Submit event (pending approval) - requires authentication
    - PUT/PATCH: Update your own event
    - DELETE: Delete your own event
    """
    permission_classes = [IsEventCreatorOrReadOnly]
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
        elif self.action == 'my_events':
            # For my_events, show all events created by user or associated with their businesses
            return Event.objects.prefetch_related(
                'businesses',
                'businesses__categories'
            ).filter(
                models.Q(created_by=self.request.user) |
                models.Q(businesses__owner=self.request.user)
            ).distinct()
        return Event.objects.prefetch_related(
            'businesses',
            'businesses__categories'
        ).all()

    def get_serializer_class(self):
        """Use lightweight serializer for list view (map markers)"""
        if self.action == 'list':
            return EventListSerializer
        return EventSerializer

    def perform_create(self, serializer):
        """Set created_by to current user and status to pending for user-created events"""
        serializer.save(
            created_by=self.request.user,
            status='pending'  # All user-submitted events require approval
        )

    def create(self, request, *args, **kwargs):
        """Create a new event (pending approval by default). Handles recurring events."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract recurring event info before creation
        is_recurring = request.data.get('is_recurring', False)
        recurrence_count = int(request.data.get('recurrence_count', 1))

        # Create the first event
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        first_event = serializer.instance
        created_events = [serializer.data]

        # If recurring, create additional events
        if is_recurring and recurrence_count > 1:
            # Get the businesses to associate with recurring events
            business_ids = request.data.get('business_ids', [])

            for week_offset in range(1, recurrence_count):
                # Create new event data with offset dates
                new_start = first_event.start_datetime + timedelta(weeks=week_offset)
                new_end = first_event.end_datetime + timedelta(weeks=week_offset)

                recurring_event = Event.objects.create(
                    title=first_event.title,
                    description=first_event.description,
                    address=first_event.address,
                    latitude=first_event.latitude,
                    longitude=first_event.longitude,
                    start_datetime=new_start,
                    end_datetime=new_end,
                    image=first_event.image,
                    cta_button_text=first_event.cta_button_text,
                    cta_button_url=first_event.cta_button_url,
                    require_login_for_rsvp=first_event.require_login_for_rsvp,
                    form_template=first_event.form_template,
                    status='pending',
                    created_by=request.user,
                )
                # Add businesses to the recurring event
                if business_ids:
                    recurring_event.businesses.set(business_ids)
                created_events.append(EventSerializer(recurring_event, context={'request': request}).data)

            return Response(
                {
                    'message': f'{recurrence_count} recurring events submitted successfully! They will be reviewed by our team.',
                    'data': created_events,
                    'events_created': recurrence_count
                },
                status=status.HTTP_201_CREATED,
                headers=headers
            )

        return Response(
            {
                'message': 'Event submitted successfully! Your event will be reviewed by our team.',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_events(self, request):
        """Get all events created by the authenticated user or associated with their businesses"""
        events = self.get_queryset()
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)

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
            # Security: Only allow verified businesses to leave events
            # (consistent with join endpoint which requires is_verified=True)
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
        Create or update an RSVP for an event (authenticated users).
        Body: { "status": "interested" | "going" }
        """
        event = self.get_object()
        rsvp_status = request.data.get('status')

        if not rsvp_status or rsvp_status not in ['interested', 'going']:
            return Response(
                {'error': 'status is required and must be either "interested" or "going"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or update RSVP for authenticated user
        rsvp, created = EventRSVP.objects.update_or_create(
            event=event,
            user=request.user,
            guest_email__isnull=True,  # Ensure we're matching user RSVPs, not guest
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

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def guest_rsvp(self, request, pk=None):
        """
        Create or update an RSVP for an event (guest users without account).
        Requires: { "status": "interested" | "going", "guest_email": "...", "gdpr_consent": true }
        Optional: { "guest_name": "..." }
        """
        event = self.get_object()

        # Check if event allows guest RSVPs
        if event.require_login_for_rsvp:
            return Response(
                {'error': 'This event requires you to be logged in to RSVP.'},
                status=status.HTTP_403_FORBIDDEN
            )

        rsvp_status = request.data.get('status')
        guest_email = request.data.get('guest_email')
        guest_name = request.data.get('guest_name', '')
        gdpr_consent = request.data.get('gdpr_consent', False)

        # Validate required fields
        if not rsvp_status or rsvp_status not in ['interested', 'going']:
            return Response(
                {'error': 'status is required and must be either "interested" or "going"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not guest_email:
            return Response(
                {'error': 'guest_email is required for guest RSVPs'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not gdpr_consent:
            return Response(
                {'error': 'You must consent to data processing to RSVP. Please check the consent box.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if a user with this email exists
        # If so, prompt them to log in instead
        from django.contrib.auth.models import User
        if User.objects.filter(email=guest_email).exists():
            return Response(
                {
                    'error': 'An account with this email already exists. Please log in to RSVP.',
                    'user_exists': True
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or update guest RSVP
        try:
            rsvp, created = EventRSVP.objects.update_or_create(
                event=event,
                guest_email=guest_email,
                user__isnull=True,  # Ensure we're matching guest RSVPs, not user
                defaults={
                    'status': rsvp_status,
                    'guest_name': guest_name,
                    'gdpr_consent': gdpr_consent,
                    'gdpr_consent_timestamp': timezone.now() if gdpr_consent else None
                }
            )

            serializer = EventRSVPSerializer(rsvp)
            message = 'RSVP created successfully' if created else 'RSVP updated successfully'

            # Include cancellation_token so guest can cancel their RSVP
            response_data = {
                'message': message,
                'data': serializer.data,
                'cancellation_token': str(rsvp.cancellation_token)
            }

            return Response(
                response_data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def cancel_rsvp(self, request, pk=None):
        """Cancel/delete an RSVP for an event (authenticated users)"""
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

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def cancel_guest_rsvp(self, request, pk=None):
        """
        Cancel/delete a guest RSVP for an event.
        Body: { "cancellation_token": "uuid-token" }

        Security: Requires the cancellation token that was provided when the RSVP was created.
        This prevents unauthorized cancellation of other users' RSVPs.
        """
        event = self.get_object()
        cancellation_token = request.data.get('cancellation_token')

        if not cancellation_token:
            return Response(
                {'error': 'cancellation_token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            rsvp = EventRSVP.objects.get(
                event=event,
                cancellation_token=cancellation_token,
                user__isnull=True
            )
            rsvp.delete()
            return Response(
                {'message': 'RSVP cancelled successfully'},
                status=status.HTTP_200_OK
            )
        except EventRSVP.DoesNotExist:
            return Response(
                {'error': 'Invalid cancellation token or RSVP not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_rsvps(self, request):
        """Get all RSVPs for the authenticated user"""
        rsvps = EventRSVP.objects.filter(user=request.user).select_related('event').order_by('-created_at')
        serializer = EventRSVPSerializer(rsvps, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def check_guest_rsvp(self, request, pk=None):
        """
        Check if a guest email has already RSVP'd to this event.
        Query param: ?email=guest@example.com

        Security note: Only returns whether an RSVP exists, not the status,
        to limit information disclosure for email enumeration prevention.
        """
        event = self.get_object()
        guest_email = request.query_params.get('email')

        if not guest_email:
            return Response(
                {'error': 'email query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only return whether RSVP exists, not the status (prevents enumeration)
        has_rsvp = EventRSVP.objects.filter(
            event=event,
            guest_email=guest_email,
            user__isnull=True
        ).exists()

        return Response({'has_rsvp': has_rsvp})


from rest_framework.views import APIView


class GuestUnsubscribeView(APIView):
    """
    Handle guest email unsubscribe requests.
    GET /api/events/unsubscribe/guest/?token=<uuid>
    POST /api/events/unsubscribe/guest/ with {"token": "<uuid>"}
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """Handle unsubscribe via GET (for email link clicks)"""
        token = request.query_params.get('token')
        return self._process_unsubscribe(token)

    def post(self, request):
        """Handle unsubscribe via POST"""
        token = request.data.get('token')
        return self._process_unsubscribe(token)

    def _process_unsubscribe(self, token):
        if not token:
            return Response(
                {'error': 'Unsubscribe token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pref = GuestEmailPreference.objects.get(unsubscribe_token=token)
            pref.event_reminders_enabled = False
            pref.save()

            # Security: Don't expose email in response to prevent enumeration
            return Response({
                'message': 'You have been unsubscribed from event reminders.',
                'success': True
            })
        except GuestEmailPreference.DoesNotExist:
            return Response(
                {'error': 'Invalid unsubscribe token'},
                status=status.HTTP_404_NOT_FOUND
            )


class GuestResubscribeView(APIView):
    """
    Handle guest email resubscribe requests.
    POST /api/events/resubscribe/guest/ with {"token": "<uuid>"}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """Handle resubscribe via POST"""
        token = request.data.get('token')

        if not token:
            return Response(
                {'error': 'Resubscribe token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pref = GuestEmailPreference.objects.get(unsubscribe_token=token)
            pref.event_reminders_enabled = True
            pref.save()

            # Security: Don't expose email in response to prevent enumeration
            return Response({
                'message': 'You have been resubscribed to event reminders.',
                'success': True
            })
        except GuestEmailPreference.DoesNotExist:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_404_NOT_FOUND
            )


class UserNotificationPreferencesView(APIView):
    """
    Get/update notification preferences for authenticated users.
    GET /api/events/notification-preferences/
    PATCH /api/events/notification-preferences/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current notification preferences"""
        try:
            profile = request.user.profile
            return Response({
                'email_notifications_enabled': profile.email_notifications_enabled,
                'event_reminder_enabled': profile.event_reminder_enabled,
            })
        except Exception:
            return Response(
                {'error': 'User profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def patch(self, request):
        """Update notification preferences"""
        try:
            profile = request.user.profile

            if 'email_notifications_enabled' in request.data:
                profile.email_notifications_enabled = request.data['email_notifications_enabled']

            if 'event_reminder_enabled' in request.data:
                profile.event_reminder_enabled = request.data['event_reminder_enabled']

            profile.save()

            return Response({
                'message': 'Notification preferences updated',
                'email_notifications_enabled': profile.email_notifications_enabled,
                'event_reminder_enabled': profile.event_reminder_enabled,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
