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
    search_fields = ['name', 'contact_email', 'description', 'custom_subdomain']
    readonly_fields = ['created_at', 'updated_at']
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
            'fields': ('owner', 'is_verified', 'available_for_hire')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_categories(self, obj):
        """Display categories as comma-separated list"""
        return ", ".join([cat.name for cat in obj.categories.all()])
    get_categories.short_description = 'Categories'


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'get_host_business', 'get_businesses', 'start_datetime', 'end_datetime', 'status', 'created_at']
    list_filter = ['status', 'start_datetime', 'created_at', 'host_business', 'businesses']
    search_fields = ['title', 'description', 'businesses__name', 'host_business__name', 'address']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
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
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    class Media:
        js = ('admin/js/geocode.js',)
        css = {
            'all': ('admin/css/geocode.css',)
        }

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
    list_display = ['user', 'event', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at', 'event']
    search_fields = ['user__username', 'user__email', 'event__title']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user', 'event']

    fieldsets = (
        ('RSVP Information', {
            'fields': ('user', 'event', 'status')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
