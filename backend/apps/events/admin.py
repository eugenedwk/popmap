from django.contrib import admin
from .models import Business, Event, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at']


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_email', 'is_verified', 'get_categories', 'created_at']
    list_filter = ['is_verified', 'categories', 'created_at']
    search_fields = ['name', 'contact_email', 'description']
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['categories']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'logo', 'categories')
        }),
        ('Contact & Social', {
            'fields': ('contact_email', 'contact_phone', 'website', 'instagram_url')
        }),
        ('Account & Verification', {
            'fields': ('owner', 'is_verified')
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
