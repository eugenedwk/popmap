from django.contrib import admin
from .models import Business, Event


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_email', 'is_verified', 'created_at']
    list_filter = ['is_verified', 'created_at']
    search_fields = ['name', 'contact_email', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'logo')
        }),
        ('Contact Details', {
            'fields': ('contact_email', 'contact_phone', 'website')
        }),
        ('Account & Verification', {
            'fields': ('owner', 'is_verified')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'business', 'start_datetime', 'end_datetime', 'status', 'created_at']
    list_filter = ['status', 'start_datetime', 'created_at']
    search_fields = ['title', 'description', 'business__name', 'address']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    date_hierarchy = 'start_datetime'

    fieldsets = (
        ('Event Information', {
            'fields': ('business', 'title', 'description', 'image')
        }),
        ('Location', {
            'fields': ('address', 'latitude', 'longitude')
        }),
        ('Schedule', {
            'fields': ('start_datetime', 'end_datetime')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by during the first save
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
