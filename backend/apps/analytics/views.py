from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
import re

from .models import PageView, Interaction, AnalyticsSummary
from .serializers import (
    PageViewCreateSerializer,
    InteractionCreateSerializer,
    AnalyticsSummarySerializer,
    DashboardOverviewSerializer,
)


def categorize_referrer(referrer_url):
    """Categorize a referrer URL into a type."""
    if not referrer_url:
        return 'direct'

    referrer_lower = referrer_url.lower()

    if 'instagram.com' in referrer_lower:
        return 'social_instagram'
    elif 'facebook.com' in referrer_lower or 'fb.com' in referrer_lower:
        return 'social_facebook'
    elif 'twitter.com' in referrer_lower or 'x.com' in referrer_lower or 't.co' in referrer_lower:
        return 'social_twitter'
    elif 'tiktok.com' in referrer_lower:
        return 'social_tiktok'
    elif any(engine in referrer_lower for engine in ['google.', 'bing.', 'duckduckgo.', 'yahoo.']):
        return 'search'
    elif 'popmap.co' in referrer_lower:
        # Check if it's a subdomain
        match = re.search(r'https?://([^.]+)\.popmap\.co', referrer_lower)
        if match and match.group(1) not in ['www', 'api', 'admin']:
            return 'subdomain'
        return 'internal'
    else:
        return 'other'


class TrackingViewSet(viewsets.ViewSet):
    """
    Public endpoints for tracking page views and interactions.
    No authentication required - uses session_id for anonymity.
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='pageview')
    def track_pageview(self, request):
        """Record a page view."""
        data = request.data.copy()

        # Auto-detect referrer type
        referrer = data.get('referrer', '')
        data['referrer_type'] = categorize_referrer(referrer)

        serializer = PageViewCreateSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'recorded'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='interaction')
    def track_interaction(self, request):
        """Record an interaction (click, share, etc.)."""
        serializer = InteractionCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'recorded'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AnalyticsDashboardViewSet(viewsets.ViewSet):
    """
    Premium analytics dashboard endpoints.
    Requires authentication and active subscription with analytics_enabled.
    """
    permission_classes = [IsAuthenticated]

    def _check_analytics_access(self, user, business_id):
        """Check if user has analytics access for the given business."""
        from apps.events.models import Business
        from apps.billing.models import Subscription

        try:
            business = Business.objects.get(id=business_id, owner=user)
        except Business.DoesNotExist:
            return None, Response(
                {'error': 'Business not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check for analytics-enabled subscription
        has_analytics = Subscription.objects.filter(
            user=user,
            status__in=['active', 'trialing'],
            plan__analytics_enabled=True
        ).exists()

        if not has_analytics:
            return None, Response(
                {'error': 'Analytics requires a premium subscription'},
                status=status.HTTP_403_FORBIDDEN
            )

        return business, None

    @action(detail=False, methods=['get'], url_path='business/(?P<business_id>[^/.]+)/overview')
    def business_overview(self, request, business_id=None):
        """
        Get analytics overview for a business.
        Shows all events owned by the business aggregated together.
        """
        business, error = self._check_analytics_access(request.user, business_id)
        if error:
            return error

        # Get date range from query params (default: last 30 days)
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        prev_start_date = start_date - timedelta(days=days)

        # Get business's event IDs
        event_ids = list(business.hosted_events.values_list('id', flat=True))
        event_ids.extend(list(business.events.values_list('id', flat=True)))
        event_ids = list(set(event_ids))

        # Query page views for business page and its events
        business_views = PageView.objects.filter(
            Q(page_type='business', object_id=business.id) |
            Q(page_type='event', object_id__in=event_ids),
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )

        # Previous period for comparison
        prev_views = PageView.objects.filter(
            Q(page_type='business', object_id=business.id) |
            Q(page_type='event', object_id__in=event_ids),
            created_at__date__gte=prev_start_date,
            created_at__date__lt=start_date
        )

        # Calculate metrics
        total_views = business_views.count()
        unique_visitors = business_views.values('session_id').distinct().count()
        prev_total_views = prev_views.count()

        views_change = None
        if prev_total_views > 0:
            views_change = ((total_views - prev_total_views) / prev_total_views) * 100

        # Device breakdown
        mobile_views = business_views.filter(is_mobile=True).count()
        mobile_percent = (mobile_views / total_views * 100) if total_views > 0 else 0
        desktop_percent = 100 - mobile_percent

        # Referrer breakdown
        referrer_counts = business_views.values('referrer_type').annotate(
            count=Count('id')
        ).order_by('-count')[:5]

        top_referrers = [
            {'source': r['referrer_type'] or 'direct', 'count': r['count']}
            for r in referrer_counts
        ]

        # Interactions
        interactions = Interaction.objects.filter(
            Q(page_type='business', object_id=business.id) |
            Q(page_type='event', object_id__in=event_ids),
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )

        total_interactions = interactions.count()
        cta_clicks = interactions.filter(interaction_type='cta_click').count()
        cta_rate = (cta_clicks / unique_visitors * 100) if unique_visitors > 0 else 0

        share_clicks = interactions.filter(
            interaction_type__startswith='share_'
        ).count()

        rsvp_count = interactions.filter(
            interaction_type__in=['rsvp_interested', 'rsvp_going']
        ).count()

        # Daily breakdown for chart
        daily_data = business_views.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            views=Count('id'),
            unique=Count('session_id', distinct=True)
        ).order_by('date')

        daily_views = [
            {'date': str(d['date']), 'views': d['views'], 'unique': d['unique']}
            for d in daily_data
        ]

        return Response({
            'period_start': str(start_date),
            'period_end': str(end_date),
            'total_views': total_views,
            'unique_visitors': unique_visitors,
            'views_change_percent': views_change,
            'mobile_percent': round(mobile_percent, 1),
            'desktop_percent': round(desktop_percent, 1),
            'top_referrers': top_referrers,
            'total_interactions': total_interactions,
            'cta_clicks': cta_clicks,
            'cta_click_rate': round(cta_rate, 2),
            'share_clicks': share_clicks,
            'rsvp_count': rsvp_count,
            'daily_views': daily_views,
        })

    @action(detail=False, methods=['get'], url_path='business/(?P<business_id>[^/.]+)/events')
    def business_events(self, request, business_id=None):
        """Get analytics breakdown by event for a business."""
        business, error = self._check_analytics_access(request.user, business_id)
        if error:
            return error

        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        # Get business's events
        from apps.events.models import Event
        events = Event.objects.filter(
            Q(host_business=business) | Q(businesses=business)
        ).distinct()

        event_analytics = []
        for event in events:
            views = PageView.objects.filter(
                page_type='event',
                object_id=event.id,
                created_at__date__gte=start_date
            )

            interactions = Interaction.objects.filter(
                page_type='event',
                object_id=event.id,
                created_at__date__gte=start_date
            )

            total_views = views.count()
            unique_visitors = views.values('session_id').distinct().count()

            rsvp_interested = interactions.filter(interaction_type='rsvp_interested').count()
            rsvp_going = interactions.filter(interaction_type='rsvp_going').count()
            cta_clicks = interactions.filter(interaction_type='cta_click').count()
            share_clicks = interactions.filter(interaction_type__startswith='share_').count()

            rsvp_rate = ((rsvp_interested + rsvp_going) / unique_visitors * 100) if unique_visitors > 0 else 0

            event_analytics.append({
                'event_id': event.id,
                'event_title': event.title,
                'total_views': total_views,
                'unique_visitors': unique_visitors,
                'rsvp_interested': rsvp_interested,
                'rsvp_going': rsvp_going,
                'cta_clicks': cta_clicks,
                'share_clicks': share_clicks,
                'rsvp_conversion_rate': round(rsvp_rate, 2),
            })

        # Sort by total views descending
        event_analytics.sort(key=lambda x: x['total_views'], reverse=True)

        return Response({'events': event_analytics})

    @action(detail=False, methods=['get'], url_path='event/(?P<event_id>[^/.]+)')
    def event_detail(self, request, event_id=None):
        """Get detailed analytics for a specific event."""
        from apps.events.models import Event

        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response(
                {'error': 'Event not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user owns this event or its business
        # Security: Explicitly handle NULL host_business case
        user_businesses = request.user.businesses.all()
        user_business_ids = list(user_businesses.values_list('id', flat=True))

        is_owner = (
            event.created_by == request.user or
            request.user.is_staff or
            (event.host_business is not None and event.host_business.id in user_business_ids) or
            event.businesses.filter(id__in=user_business_ids).exists()
        )

        if not is_owner:
            return Response(
                {'error': 'Access denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check analytics subscription
        from apps.billing.models import Subscription
        has_analytics = Subscription.objects.filter(
            user=request.user,
            status__in=['active', 'trialing'],
            plan__analytics_enabled=True
        ).exists()

        if not has_analytics:
            return Response(
                {'error': 'Analytics requires a premium subscription'},
                status=status.HTTP_403_FORBIDDEN
            )

        days = int(request.query_params.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        views = PageView.objects.filter(
            page_type='event',
            object_id=event.id,
            created_at__date__gte=start_date
        )

        interactions = Interaction.objects.filter(
            page_type='event',
            object_id=event.id,
            created_at__date__gte=start_date
        )

        # Referrer breakdown
        referrer_counts = views.values('referrer_type').annotate(
            count=Count('id')
        ).order_by('-count')

        referrers = {r['referrer_type'] or 'direct': r['count'] for r in referrer_counts}

        # Interaction breakdown
        interaction_counts = interactions.values('interaction_type').annotate(
            count=Count('id')
        )

        interaction_breakdown = {i['interaction_type']: i['count'] for i in interaction_counts}

        # Daily views
        daily_data = views.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            views=Count('id'),
            unique=Count('session_id', distinct=True)
        ).order_by('date')

        return Response({
            'event_id': event.id,
            'event_title': event.title,
            'period_start': str(start_date),
            'period_end': str(end_date),
            'total_views': views.count(),
            'unique_visitors': views.values('session_id').distinct().count(),
            'mobile_views': views.filter(is_mobile=True).count(),
            'desktop_views': views.filter(is_mobile=False).count(),
            'referrers': referrers,
            'interactions': interaction_breakdown,
            'daily_views': [
                {'date': str(d['date']), 'views': d['views'], 'unique': d['unique']}
                for d in daily_data
            ],
        })
