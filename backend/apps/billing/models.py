from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


class SubscriptionPlan(models.Model):
    """
    Represents a subscription plan/tier for businesses.
    Plans are created in both Django and Stripe.
    """
    PLAN_TYPE_CHOICES = [
        ('free', 'Free'),
        ('premium', 'Premium'),
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, default='free')
    description = models.TextField(blank=True)

    # Pricing
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Monthly price in USD"
    )

    # Stripe Integration
    stripe_price_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="Stripe Price ID for this plan"
    )
    stripe_product_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="Stripe Product ID for this plan"
    )

    # Features
    max_events_per_month = models.IntegerField(
        default=0,
        help_text="Maximum events allowed per month (0 = unlimited)"
    )
    custom_subdomain_enabled = models.BooleanField(
        default=False,
        help_text="Allow custom subdomain (e.g., business.popmap.co)"
    )
    featured_listing = models.BooleanField(
        default=False,
        help_text="Featured in search results and map"
    )
    analytics_enabled = models.BooleanField(
        default=False,
        help_text="Access to analytics dashboard"
    )
    priority_support = models.BooleanField(
        default=False,
        help_text="Priority customer support"
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Is this plan available for new subscriptions?"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price']
        verbose_name = "Subscription Plan"
        verbose_name_plural = "Subscription Plans"

    def __str__(self):
        return f"{self.name} - ${self.price}/month"


class StripeCustomer(models.Model):
    """
    Links a Django User to their Stripe Customer ID.
    One-to-one relationship with User.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='stripe_customer'
    )
    stripe_customer_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="Stripe Customer ID (cus_...)"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Stripe Customer"
        verbose_name_plural = "Stripe Customers"

    def __str__(self):
        return f"{self.user.username} - {self.stripe_customer_id}"


class Subscription(models.Model):
    """
    Tracks user subscriptions to plans.
    Synced with Stripe Subscription objects.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('canceled', 'Canceled'),
        ('unpaid', 'Unpaid'),
        ('trialing', 'Trialing'),
        ('incomplete', 'Incomplete'),
        ('incomplete_expired', 'Incomplete Expired'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subscriptions'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions'
    )

    # Stripe Integration
    stripe_subscription_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="Stripe Subscription ID (sub_...)"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='incomplete'
    )

    # Billing
    current_period_start = models.DateTimeField(
        help_text="Start of current billing period"
    )
    current_period_end = models.DateTimeField(
        help_text="End of current billing period"
    )
    cancel_at_period_end = models.BooleanField(
        default=False,
        help_text="Whether subscription will cancel at period end"
    )
    canceled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the subscription was canceled"
    )

    # Trial
    trial_start = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Start of trial period"
    )
    trial_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text="End of trial period"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['stripe_subscription_id']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.plan.name} ({self.status})"

    @property
    def is_active(self):
        """Check if subscription is currently active"""
        return self.status in ['active', 'trialing']


class PaymentMethod(models.Model):
    """
    Stores customer payment methods from Stripe.
    """
    PAYMENT_METHOD_TYPES = [
        ('card', 'Credit/Debit Card'),
        ('us_bank_account', 'US Bank Account'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    stripe_payment_method_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="Stripe Payment Method ID (pm_...)"
    )
    payment_method_type = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_TYPES,
        default='card'
    )

    # Card details (if type is card)
    card_brand = models.CharField(max_length=50, blank=True)  # visa, mastercard, etc.
    card_last4 = models.CharField(max_length=4, blank=True)
    card_exp_month = models.IntegerField(null=True, blank=True)
    card_exp_year = models.IntegerField(null=True, blank=True)

    # Status
    is_default = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-created_at']
        verbose_name = "Payment Method"
        verbose_name_plural = "Payment Methods"

    def __str__(self):
        if self.payment_method_type == 'card':
            return f"{self.user.username} - {self.card_brand} ****{self.card_last4}"
        return f"{self.user.username} - {self.payment_method_type}"
