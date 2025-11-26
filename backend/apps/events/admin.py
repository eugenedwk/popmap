from django.contrib import admin
from .models import Business, Event, Category, EventRSVP


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at']


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ['name', 'custom_subdomain', 'contact_email', 'is_verified', 'available_for_hire', 'get_categories', 'created_at']
    list_filter = ['is_verified', 'available_for_hire', 'categories', 'created_at']
    search_fields = ['name', 'contact_email', 'description', 'custom_subdomain', 'owner__email', 'owner__username']
    readonly_fields = ['created_at', 'updated_at', 'get_owner_email']
    filter_horizontal = ['categories']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'logo', 'categories')
        }),
        ('Contact & Social', {
            'fields': ('contact_email', 'contact_phone', 'website', 'instagram_url', 'tiktok_url')
        }),
        ('Custom Subdomain', {
            'fields': ('custom_subdomain',),
            'description': 'Custom subdomain for this business (requires active subscription with subdomain feature). Example: "mybusiness" creates mybusiness.popmap.co',
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


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'get_host_business', 'get_businesses', 'start_datetime', 'end_datetime', 'status', 'created_at']
    list_filter = ['status', 'start_datetime', 'created_at', 'host_business', 'businesses']
    search_fields = ['title', 'description', 'businesses__name', 'host_business__name', 'address', 'created_by__email', 'created_by__username']
    readonly_fields = ['created_at', 'updated_at', 'get_created_by_email']
    date_hierarchy = 'start_datetime'
    filter_horizontal = ['businesses']

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
            'fields': ('location_name', 'address', 'latitude', 'longitude'),
            'description': 'Enter the address and click "Geocode Address" button below to auto-fill coordinates'
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
