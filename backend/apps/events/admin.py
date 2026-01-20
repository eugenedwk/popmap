from django.contrib import admin
from django.contrib import messages
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import path, reverse
from django.http import HttpResponseRedirect
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Business, Event, Category, EventRSVP, GuestEmailPreference, EventReminderLog, Venue


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at']


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ['name', 'business', 'address', 'created_at']
    list_filter = ['business', 'created_at']
    search_fields = ['name', 'address', 'business__name']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['business']

    fieldsets = (
        ('Venue Information', {
            'fields': ('business', 'name', 'address')
        }),
        ('Coordinates', {
            'fields': ('latitude', 'longitude'),
            'description': 'GPS coordinates for the venue location'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ['name', 'get_instagram_handle', 'has_logo', 'is_verified', 'get_categories', 'created_at', 'custom_subdomain']
    list_filter = ['is_verified', 'available_for_hire', 'categories', 'created_at']
    search_fields = ['name', 'instagram_url', 'description', 'custom_subdomain', 'owner__email', 'owner__username']
    readonly_fields = ['created_at', 'updated_at', 'get_owner_email']
    filter_horizontal = ['categories']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'logo', 'categories')
        }),
        ('Contact & Social', {
            'fields': ('instagram_url', 'contact_email', 'contact_phone', 'website', 'tiktok_url')
        }),
        ('Custom Subdomain', {
            'fields': ('custom_subdomain',),
            'description': 'Custom subdomain for this business (requires active subscription with subdomain feature). Example: "mybusiness" creates mybusiness.popmap.co',
            'classes': ('collapse',)
        }),
        ('Page Customization (Premium)', {
            'fields': (
                'header_banner',
                ('background_image', 'background_image_url'),
                ('background_color', 'background_overlay_opacity'),
                ('custom_primary_color', 'secondary_color'),
                'default_view_mode',
                ('hide_contact_info', 'hide_social_links'),
                ('show_upcoming_events_first', 'hide_past_events'),
                'events_per_page',
            ),
            'description': 'Premium page customization options (requires active subscription)',
            'classes': ('collapse',)
        }),
        ('Account & Verification', {
            'fields': ('get_owner_email', 'owner', 'is_verified', 'available_for_hire')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_owner_email(self, obj):
        """Display owner's email for easy reading"""
        if obj.owner:
            return f"{obj.owner.email} ({obj.owner.username})"
        return "No owner assigned"
    get_owner_email.short_description = 'Owner Email'

    def get_categories(self, obj):
        """Display categories as comma-separated list"""
        return ", ".join([cat.name for cat in obj.categories.all()])
    get_categories.short_description = 'Categories'

    def get_instagram_handle(self, obj):
        """Display Instagram handle without the full URL"""
        if obj.instagram_url:
            import re
            # Strip common Instagram URL prefixes
            handle = re.sub(r'^https?://(www\.)?instagram\.com/', '', obj.instagram_url)
            return handle.rstrip('/')
        return '-'
    get_instagram_handle.short_description = 'Instagram'
    get_instagram_handle.admin_order_field = 'instagram_url'

    def has_logo(self, obj):
        """Boolean indicating if business has a profile photo"""
        return bool(obj.logo)
    has_logo.boolean = True
    has_logo.short_description = 'Logo'


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'get_host_business', 'get_businesses', 'start_datetime', 'end_datetime', 'status', 'created_at']
    list_filter = ['status', 'start_datetime', 'created_at', 'host_business', 'businesses']
    search_fields = ['title', 'description', 'businesses__name', 'host_business__name', 'address', 'created_by__email', 'created_by__username']
    readonly_fields = ['created_at', 'updated_at', 'get_created_by_email']
    date_hierarchy = 'start_datetime'
    filter_horizontal = ['businesses']
    actions = ['duplicate_events', 'create_multi_date_copies']

    fieldsets = (
        ('Event Information', {
            'fields': ('host_business', 'businesses', 'title', 'description', 'image')
        }),
        ('Call to Action', {
            'fields': ('cta_button_text', 'cta_button_url'),
            'description': 'Optional: Add a custom call-to-action button (e.g., "Buy Tickets", "Register Now")',
            'classes': ('collapse',)
        }),
        ('Location', {
            'fields': ('venue', 'location_name', 'address', 'latitude', 'longitude'),
            'description': 'Select a saved venue to auto-populate location, or enter address and click "Geocode Address" button to auto-fill coordinates'
        }),
        ('Schedule', {
            'fields': ('start_datetime', 'end_datetime')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('RSVP Settings', {
            'fields': ('require_login_for_rsvp',),
            'description': 'Control who can RSVP to this event'
        }),
        ('Metadata', {
            'fields': ('get_created_by_email', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    class Media:
        js = ('admin/js/geocode.js',)
        css = {
            'all': ('admin/css/geocode.css',)
        }

    def get_urls(self):
        """Add custom URLs for multi-date copy view"""
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:event_id>/multi-date-copy/',
                self.admin_site.admin_view(self.multi_date_copy_view),
                name='events_event_multi_date_copy',
            ),
        ]
        return custom_urls + urls

    def get_created_by_email(self, obj):
        """Display creator's email for easy reading"""
        if obj.created_by:
            return f"{obj.created_by.email} ({obj.created_by.username})"
        return "Created by admin"
    get_created_by_email.short_description = 'Created By'

    def get_host_business(self, obj):
        """Display host business name"""
        return obj.host_business.name if obj.host_business else "-"
    get_host_business.short_description = 'Host'

    def get_businesses(self, obj):
        """Display businesses as comma-separated list"""
        businesses = obj.businesses.all()
        if businesses:
            return ", ".join([biz.name for biz in businesses])
        return "-"
    get_businesses.short_description = 'Participating Businesses'

    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by during the first save
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    # ==================== Admin Actions ====================

    @admin.action(description="Duplicate selected events (same date)")
    def duplicate_events(self, request, queryset):
        """Create exact duplicates of selected events"""
        duplicated_count = 0
        for event in queryset:
            # Get the M2M relationships before duplicating
            businesses = list(event.businesses.all())

            # Create duplicate by setting pk to None
            event.pk = None
            event.id = None
            event.title = f"{event.title} (Copy)"
            event.status = 'pending'
            event.created_by = request.user
            event.save()

            # Restore M2M relationships
            event.businesses.set(businesses)

            duplicated_count += 1

        self.message_user(
            request,
            f"Successfully duplicated {duplicated_count} event(s). New events are set to 'Pending' status.",
            messages.SUCCESS
        )

    @admin.action(description="Create copies for multiple dates...")
    def create_multi_date_copies(self, request, queryset):
        """Redirect to multi-date copy view for selected event"""
        if queryset.count() != 1:
            self.message_user(
                request,
                "Please select exactly one event to create multi-date copies.",
                messages.WARNING
            )
            return

        event = queryset.first()
        return HttpResponseRedirect(
            reverse('admin:events_event_multi_date_copy', args=[event.id])
        )

    def multi_date_copy_view(self, request, event_id):
        """View for creating copies of an event for multiple dates"""
        event = get_object_or_404(Event, pk=event_id)

        # Calculate event duration
        duration = event.end_datetime - event.start_datetime
        duration_hours = duration.seconds // 3600
        duration_minutes = (duration.seconds % 3600) // 60

        if request.method == 'POST':
            dates_text = request.POST.get('dates', '').strip()
            copy_status = request.POST.get('copy_status', 'approved')
            title_suffix = request.POST.get('title_suffix', '')

            if not dates_text:
                messages.error(request, "Please enter at least one date.")
                return redirect('admin:events_event_multi_date_copy', event_id=event_id)

            # Parse dates
            dates = []
            errors = []
            for line in dates_text.split('\n'):
                line = line.strip()
                if not line:
                    continue
                try:
                    parsed_date = datetime.strptime(line, '%Y-%m-%d').date()
                    dates.append(parsed_date)
                except ValueError:
                    errors.append(f"Invalid date format: {line}")

            if errors:
                for error in errors:
                    messages.error(request, error)
                return redirect('admin:events_event_multi_date_copy', event_id=event_id)

            # Get the M2M relationships
            businesses = list(event.businesses.all())

            # Get the original event's time components
            original_start_time = event.start_datetime.time()
            original_start_tz = event.start_datetime.tzinfo

            # Create copies for each date
            created_count = 0
            for new_date in dates:
                # Create new datetime with the new date but same time
                new_start = datetime.combine(new_date, original_start_time)
                if original_start_tz:
                    new_start = timezone.make_aware(new_start, original_start_tz)

                new_end = new_start + duration

                # Create the copy
                new_event = Event(
                    host_business=event.host_business,
                    title=f"{event.title}{title_suffix}",
                    description=event.description,
                    venue=event.venue,
                    location_name=event.location_name,
                    address=event.address,
                    latitude=event.latitude,
                    longitude=event.longitude,
                    start_datetime=new_start,
                    end_datetime=new_end,
                    image=event.image,
                    cta_button_text=event.cta_button_text,
                    cta_button_url=event.cta_button_url,
                    form_template=event.form_template,
                    require_login_for_rsvp=event.require_login_for_rsvp,
                    status=copy_status,
                    created_by=request.user,
                )
                new_event.save()

                # Set M2M relationships
                new_event.businesses.set(businesses)

                created_count += 1

            messages.success(
                request,
                f"Successfully created {created_count} event copies for different dates."
            )
            return redirect('admin:events_event_changelist')

        context = {
            'event': event,
            'duration_hours': duration_hours,
            'duration_minutes': duration_minutes,
            'opts': self.model._meta,
            'title': f'Create copies for multiple dates',
        }
        return render(request, 'admin/events/multi_date_copy.html', context)


@admin.register(EventRSVP)
class EventRSVPAdmin(admin.ModelAdmin):
    list_display = ['get_rsvp_identifier', 'event', 'status', 'is_guest_rsvp', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at', 'event', ('user', admin.EmptyFieldListFilter)]
    search_fields = ['user__username', 'user__email', 'guest_email', 'guest_name', 'event__title']
    readonly_fields = ['created_at', 'updated_at', 'gdpr_consent_timestamp', 'is_guest_rsvp']
    raw_id_fields = ['user', 'event']

    fieldsets = (
        ('RSVP Information', {
            'fields': ('event', 'status')
        }),
        ('Registered User', {
            'fields': ('user',),
            'description': 'For registered user RSVPs'
        }),
        ('Guest Information', {
            'fields': ('guest_email', 'guest_name'),
            'description': 'For guest RSVPs (when user is not registered)'
        }),
        ('GDPR Consent', {
            'fields': ('gdpr_consent', 'gdpr_consent_timestamp'),
            'description': 'Required for guest RSVPs',
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_rsvp_identifier(self, obj):
        """Display user or guest email as identifier"""
        if obj.user:
            return f"{obj.user.username} ({obj.user.email})"
        return f"{obj.guest_email} (guest)"
    get_rsvp_identifier.short_description = 'RSVP By'

    def is_guest_rsvp(self, obj):
        """Display whether this is a guest RSVP"""
        return obj.user is None
    is_guest_rsvp.boolean = True
    is_guest_rsvp.short_description = 'Guest?'


@admin.register(GuestEmailPreference)
class GuestEmailPreferenceAdmin(admin.ModelAdmin):
    list_display = ['email', 'event_reminders_enabled', 'created_at', 'updated_at']
    list_filter = ['event_reminders_enabled', 'created_at']
    search_fields = ['email']
    readonly_fields = ['unsubscribe_token', 'created_at', 'updated_at']

    fieldsets = (
        ('Email', {
            'fields': ('email',)
        }),
        ('Preferences', {
            'fields': ('event_reminders_enabled',)
        }),
        ('Token', {
            'fields': ('unsubscribe_token',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EventReminderLog)
class EventReminderLogAdmin(admin.ModelAdmin):
    list_display = ['rsvp', 'reminder_type', 'email_sent_to', 'success', 'sent_at']
    list_filter = ['reminder_type', 'success', 'sent_at']
    search_fields = ['email_sent_to', 'rsvp__event__title', 'rsvp__user__email', 'rsvp__guest_email']
    readonly_fields = ['rsvp', 'reminder_type', 'sent_at', 'email_sent_to', 'success', 'error_message']
    date_hierarchy = 'sent_at'

    def has_add_permission(self, request):
        """Reminder logs should only be created by the system"""
        return False

    def has_change_permission(self, request, obj=None):
        """Reminder logs should not be edited"""
        return False
