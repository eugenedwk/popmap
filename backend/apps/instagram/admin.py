from django.contrib import admin
from .models import InstagramPostLog


@admin.register(InstagramPostLog)
class InstagramPostLogAdmin(admin.ModelAdmin):
    list_display = ['business', 'instagram_post_id', 'event', 'imported_at']
    list_filter = ['imported_at', 'business']
    search_fields = ['instagram_post_id', 'business__name', 'original_caption']
    readonly_fields = ['imported_at']
    raw_id_fields = ['business', 'event']
