from django.contrib import admin
from .models import PageView, Interaction, AnalyticsSummary


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ['page_type', 'object_id', 'referrer_type', 'is_mobile', 'created_at']
    list_filter = ['page_type', 'referrer_type', 'is_mobile', 'created_at']
    search_fields = ['session_id', 'referrer']
    readonly_fields = ['session_id', 'page_type', 'object_id', 'referrer', 'referrer_type', 'user_agent', 'is_mobile', 'created_at']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False  # Analytics are created via API only

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Interaction)
class InteractionAdmin(admin.ModelAdmin):
    list_display = ['interaction_type', 'page_type', 'object_id', 'created_at']
    list_filter = ['interaction_type', 'page_type', 'created_at']
    search_fields = ['session_id']
    readonly_fields = ['interaction_type', 'page_type', 'object_id', 'session_id', 'metadata', 'created_at']
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(AnalyticsSummary)
class AnalyticsSummaryAdmin(admin.ModelAdmin):
    list_display = ['page_type', 'object_id', 'date', 'total_views', 'unique_views', 'cta_clicks']
    list_filter = ['page_type', 'date']
    search_fields = ['object_id']
    date_hierarchy = 'date'
    readonly_fields = [
        'page_type', 'object_id', 'date',
        'total_views', 'unique_views', 'mobile_views', 'desktop_views',
        'referrer_direct', 'referrer_social', 'referrer_search',
        'referrer_subdomain', 'referrer_internal', 'referrer_other',
        'cta_clicks', 'share_clicks', 'rsvp_interested', 'rsvp_going',
        'form_opens', 'form_submits', 'directions_clicks', 'external_link_clicks',
        'created_at', 'updated_at'
    ]
