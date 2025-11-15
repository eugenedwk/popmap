from django.contrib import admin
from .models import SubscriptionPlan, StripeCustomer, Subscription, PaymentMethod


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'plan_type', 'price', 'max_events_per_month', 'custom_subdomain_enabled', 'is_active', 'created_at']
    list_filter = ['plan_type', 'is_active', 'custom_subdomain_enabled', 'featured_listing']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    prepopulated_fields = {'slug': ('name',)}

    fieldsets = (
        ('Plan Information', {
            'fields': ('name', 'slug', 'plan_type', 'description', 'price')
        }),
        ('Stripe Integration', {
            'fields': ('stripe_product_id', 'stripe_price_id'),
            'classes': ('collapse',)
        }),
        ('Features', {
            'fields': (
                'max_events_per_month',
                'custom_subdomain_enabled',
                'featured_listing',
                'analytics_enabled',
                'priority_support'
            )
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(StripeCustomer)
class StripeCustomerAdmin(admin.ModelAdmin):
    list_display = ['user', 'stripe_customer_id', 'created_at']
    search_fields = ['user__username', 'user__email', 'stripe_customer_id']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user']

    fieldsets = (
        ('Customer Information', {
            'fields': ('user', 'stripe_customer_id')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'status', 'current_period_start', 'current_period_end', 'cancel_at_period_end', 'created_at']
    list_filter = ['status', 'cancel_at_period_end', 'plan', 'created_at']
    search_fields = ['user__username', 'user__email', 'stripe_subscription_id']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user', 'plan']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Subscription Information', {
            'fields': ('user', 'plan', 'status', 'stripe_subscription_id')
        }),
        ('Billing Period', {
            'fields': ('current_period_start', 'current_period_end', 'cancel_at_period_end', 'canceled_at')
        }),
        ('Trial Period', {
            'fields': ('trial_start', 'trial_end'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['user', 'payment_method_type', 'get_display_info', 'is_default', 'created_at']
    list_filter = ['payment_method_type', 'is_default', 'card_brand']
    search_fields = ['user__username', 'user__email', 'stripe_payment_method_id', 'card_last4']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user']

    fieldsets = (
        ('Payment Method Information', {
            'fields': ('user', 'stripe_payment_method_id', 'payment_method_type', 'is_default')
        }),
        ('Card Details', {
            'fields': ('card_brand', 'card_last4', 'card_exp_month', 'card_exp_year'),
            'description': 'Only applicable for card payment methods'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_display_info(self, obj):
        """Display payment method info in a readable format"""
        if obj.payment_method_type == 'card':
            return f"{obj.card_brand} ****{obj.card_last4}"
        return obj.payment_method_type
    get_display_info.short_description = 'Payment Method'
