from rest_framework import serializers
from .models import PageView, Interaction, AnalyticsSummary


class PageViewCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating page view records (used by tracking endpoint)."""

    class Meta:
        model = PageView
        fields = ['page_type', 'object_id', 'session_id', 'referrer', 'user_agent', 'is_mobile']
        extra_kwargs = {
            'session_id': {'required': True},
        }


class InteractionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating interaction records (used by tracking endpoint)."""

    class Meta:
        model = Interaction
        fields = ['interaction_type', 'page_type', 'object_id', 'session_id', 'metadata']
        extra_kwargs = {
            'session_id': {'required': True},
        }


class AnalyticsSummarySerializer(serializers.ModelSerializer):
    """Serializer for analytics summary data (read-only for dashboard)."""

    class Meta:
        model = AnalyticsSummary
        fields = [
            'date',
            'total_views', 'unique_views', 'mobile_views', 'desktop_views',
            'referrer_direct', 'referrer_social', 'referrer_search',
            'referrer_subdomain', 'referrer_internal', 'referrer_other',
            'cta_clicks', 'share_clicks', 'rsvp_interested', 'rsvp_going',
            'form_opens', 'form_submits', 'directions_clicks', 'external_link_clicks',
        ]


class DashboardOverviewSerializer(serializers.Serializer):
    """Aggregated analytics for the dashboard overview."""
    # Time period
    period_start = serializers.DateField()
    period_end = serializers.DateField()

    # View metrics
    total_views = serializers.IntegerField()
    unique_visitors = serializers.IntegerField()
    views_change_percent = serializers.FloatField(allow_null=True)

    # Device breakdown
    mobile_percent = serializers.FloatField()
    desktop_percent = serializers.FloatField()

    # Top referrers
    top_referrers = serializers.ListField(child=serializers.DictField())

    # Engagement metrics
    total_interactions = serializers.IntegerField()
    cta_clicks = serializers.IntegerField()
    cta_click_rate = serializers.FloatField()
    share_clicks = serializers.IntegerField()
    rsvp_count = serializers.IntegerField()

    # Daily breakdown for charts
    daily_views = serializers.ListField(child=serializers.DictField())


class EventAnalyticsSerializer(serializers.Serializer):
    """Analytics for a specific event."""
    event_id = serializers.IntegerField()
    event_title = serializers.CharField()

    # View metrics
    total_views = serializers.IntegerField()
    unique_visitors = serializers.IntegerField()

    # Engagement
    rsvp_interested = serializers.IntegerField()
    rsvp_going = serializers.IntegerField()
    cta_clicks = serializers.IntegerField()
    share_clicks = serializers.IntegerField()

    # Conversion rate (RSVPs / unique visitors)
    rsvp_conversion_rate = serializers.FloatField()


class TopEventsSerializer(serializers.Serializer):
    """List of top performing events."""
    events = serializers.ListField(child=EventAnalyticsSerializer())
