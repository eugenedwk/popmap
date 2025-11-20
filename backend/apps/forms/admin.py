from django.contrib import admin
from .models import (
    FormTemplate, FormField, FormFieldOption,
    FormSubmission, FormResponse
)


class FormFieldOptionInline(admin.TabularInline):
    model = FormFieldOption
    extra = 1
    fields = ['label', 'value', 'order']


class FormFieldInline(admin.StackedInline):
    model = FormField
    extra = 1
    fields = ['field_type', 'label', 'placeholder', 'help_text', 'is_required', 'order']
    show_change_link = True


@admin.register(FormTemplate)
class FormTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'business', 'title', 'is_active', 'get_submission_count', 'created_at']
    list_filter = ['is_active', 'created_at', 'business']
    search_fields = ['name', 'title', 'business__name']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    inlines = [FormFieldInline]

    fieldsets = (
        ('Form Information', {
            'fields': ('business', 'created_by', 'name', 'title', 'description', 'is_active')
        }),
        ('Email Notifications', {
            'fields': (
                'notification_email',
                'send_confirmation_to_submitter',
                'confirmation_message'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_submission_count(self, obj):
        return obj.submissions.count()
    get_submission_count.short_description = 'Submissions'

    def save_model(self, request, obj, form, change):
        if not change:  # If creating a new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    list_display = ['label', 'form_template', 'field_type', 'is_required', 'order']
    list_filter = ['field_type', 'is_required', 'form_template']
    search_fields = ['label', 'form_template__name']
    inlines = [FormFieldOptionInline]

    fieldsets = (
        ('Field Configuration', {
            'fields': ('form_template', 'field_type', 'label', 'placeholder', 'help_text')
        }),
        ('Validation & Display', {
            'fields': ('is_required', 'order')
        }),
    )


class FormResponseInline(admin.TabularInline):
    model = FormResponse
    extra = 0
    readonly_fields = ['field', 'value']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'form_template', 'user', 'submitter_email',
        'event', 'submitted_at', 'notification_sent'
    ]
    list_filter = ['notification_sent', 'confirmation_sent', 'submitted_at', 'form_template']
    search_fields = ['submitter_email', 'user__email', 'form_template__name']
    readonly_fields = ['submitted_at', 'notification_sent_at', 'ip_address', 'user']
    inlines = [FormResponseInline]
    date_hierarchy = 'submitted_at'

    fieldsets = (
        ('Submission Information', {
            'fields': ('form_template', 'event', 'user', 'submitter_email')
        }),
        ('Notification Status', {
            'fields': ('notification_sent', 'notification_sent_at', 'confirmation_sent')
        }),
        ('Metadata', {
            'fields': ('submitted_at', 'ip_address'),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        # Submissions should only be created through the API
        return False
