from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'identity_provider', 'is_profile_complete', 'created_at']
    list_filter = ['role', 'identity_provider', 'is_profile_complete', 'email_notifications_enabled']
    search_fields = ['user__username', 'user__email', 'cognito_sub']
    readonly_fields = ['cognito_sub', 'created_at', 'updated_at']

    fieldsets = (
        ('User Information', {
            'fields': ('user', 'cognito_sub', 'role', 'identity_provider')
        }),
        ('Profile Status', {
            'fields': ('is_profile_complete',)
        }),
        ('Notification Preferences', {
            'fields': ('email_notifications_enabled', 'event_reminder_enabled')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
