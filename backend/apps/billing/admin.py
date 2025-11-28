from django.contrib import admin
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
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


# Custom User Admin to add gift subscription action
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin

def gift_premium_subscription(modeladmin, request, queryset):
    """
    Admin action to gift premium subscriptions to selected users.
    Creates a subscription without Stripe payment.
    """
    # Find the premium plan (you can customize which plan to gift)
    try:
        premium_plan = SubscriptionPlan.objects.filter(
            plan_type='premium',
            is_active=True
        ).first()

        if not premium_plan:
            premium_plan = SubscriptionPlan.objects.filter(is_active=True).first()

        if not premium_plan:
            modeladmin.message_user(request, "No active subscription plans found. Please create one first.", level='ERROR')
            return
    except SubscriptionPlan.DoesNotExist:
        modeladmin.message_user(request, "No subscription plans found. Please create one first.", level='ERROR')
        return

    gifted_count = 0
    already_has_count = 0

    for user in queryset:
        # Check if user already has an active subscription
        existing_sub = Subscription.objects.filter(
            user=user,
            status__in=['active', 'trialing']
        ).first()

        if existing_sub:
            already_has_count += 1
            continue

        # Create a gifted subscription (90 days by default, can be customized)
        subscription = Subscription.objects.create(
            user=user,
            plan=premium_plan,
            status='active',
            stripe_subscription_id=f'gift_{user.id}_{timezone.now().timestamp()}',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=90),
            cancel_at_period_end=False,
            metadata={'gifted': True, 'gifted_by': request.user.username, 'gifted_at': timezone.now().isoformat()}
        )

        # Send notification email to the user
        try:
            send_mail(
                subject='🎁 You\'ve been gifted a PopMap Premium Subscription!',
                message=f'''
Hello {user.username or 'there'}!

Great news! You've been gifted a {premium_plan.name} subscription to PopMap, valid for the next 90 days.

Your premium subscription includes:
- Custom subdomain for your business
- Premium page customization options
- Form builder access
- Priority support
- And more!

Log in to your account to start using your premium features: https://popmap.co/login

This subscription will be active until {subscription.current_period_end.strftime('%B %d, %Y')}.

Enjoy your premium experience!

Best regards,
The PopMap Team
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception as e:
            # Log but don't fail the gift action
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send gift subscription email to {user.email}: {str(e)}")

        gifted_count += 1

    # Show summary message
    if gifted_count > 0:
        modeladmin.message_user(
            request,
            f"Successfully gifted {premium_plan.name} subscription to {gifted_count} user(s) for 90 days."
        )
    if already_has_count > 0:
        modeladmin.message_user(
            request,
            f"{already_has_count} user(s) already have active subscriptions and were skipped.",
            level='WARNING'
        )

gift_premium_subscription.short_description = "Gift 90-day premium subscription to selected users"


# Extend the default User admin
admin.site.unregister(User)

@admin.register(User)
class CustomUserAdmin(DefaultUserAdmin):
    actions = list(DefaultUserAdmin.actions) + [gift_premium_subscription]

    # Add subscription info to user list display
    list_display = DefaultUserAdmin.list_display + ('has_active_subscription',)

    def has_active_subscription(self, obj):
        """Check if user has an active subscription"""
        return Subscription.objects.filter(
            user=obj,
            status__in=['active', 'trialing']
        ).exists()
    has_active_subscription.boolean = True
    has_active_subscription.short_description = 'Premium'
