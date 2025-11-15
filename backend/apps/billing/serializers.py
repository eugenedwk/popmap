from rest_framework import serializers
from .models import SubscriptionPlan, StripeCustomer, Subscription, PaymentMethod


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans"""
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'slug', 'plan_type', 'description', 'price',
            'max_events_per_month', 'custom_subdomain_enabled',
            'featured_listing', 'analytics_enabled', 'priority_support',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StripeCustomerSerializer(serializers.ModelSerializer):
    """Serializer for Stripe customer records"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = StripeCustomer
        fields = ['id', 'user', 'user_email', 'username', 'stripe_customer_id', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscriptions"""
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'user', 'user_email', 'plan', 'plan_name', 'plan_price',
            'stripe_subscription_id', 'status', 'is_active',
            'current_period_start', 'current_period_end',
            'cancel_at_period_end', 'canceled_at',
            'trial_start', 'trial_end', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for payment methods"""
    display_info = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'user', 'stripe_payment_method_id', 'payment_method_type',
            'card_brand', 'card_last4', 'card_exp_month', 'card_exp_year',
            'is_default', 'display_info', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']

    def get_display_info(self, obj):
        """Return displayable payment method info"""
        if obj.payment_method_type == 'card':
            return f"{obj.card_brand} ****{obj.card_last4}"
        return obj.payment_method_type


class CreateCheckoutSessionSerializer(serializers.Serializer):
    """Serializer for creating a Stripe checkout session"""
    plan_id = serializers.IntegerField(required=True)
    success_url = serializers.URLField(required=True)
    cancel_url = serializers.URLField(required=True)


class CancelSubscriptionSerializer(serializers.Serializer):
    """Serializer for canceling a subscription"""
    cancel_at_period_end = serializers.BooleanField(
        default=True,
        help_text="If True, subscription continues until end of billing period"
    )
