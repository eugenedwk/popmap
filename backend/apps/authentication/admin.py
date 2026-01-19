from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile


# Unregister the default User admin
admin.site.unregister(User)


# Custom User admin to display email
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined']
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'user_email', 'role', 'identity_provider', 'is_profile_complete', 'created_at']
    list_filter = ['role', 'identity_provider', 'is_profile_complete', 'email_notifications_enabled']
    search_fields = ['user__username', 'user__email', 'cognito_sub']
    readonly_fields = ['cognito_sub', 'created_at', 'updated_at']

    @admin.display(description='Email', ordering='user__email')
    def user_email(self, obj):
        return obj.user.email

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
