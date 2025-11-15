import stripe
from django.conf import settings
from django.contrib.auth.models import User
from .models import StripeCustomer, Subscription, SubscriptionPlan, PaymentMethod
from datetime import datetime

# Initialize Stripe with secret key
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Service class for Stripe operations"""

    @staticmethod
    def get_or_create_customer(user: User) -> StripeCustomer:
        """
        Get or create a Stripe customer for a Django user.
        Returns the StripeCustomer model instance.
        """
        try:
            # Try to get existing customer
            return StripeCustomer.objects.get(user=user)
        except StripeCustomer.DoesNotExist:
            # Create new Stripe customer
            stripe_customer = stripe.Customer.create(
                email=user.email,
                name=user.username,
                metadata={
                    'user_id': user.id,
                    'username': user.username
                }
            )

            # Save to database
            customer = StripeCustomer.objects.create(
                user=user,
                stripe_customer_id=stripe_customer.id
            )
            return customer

    @staticmethod
    def create_checkout_session(user: User, plan: SubscriptionPlan, success_url: str, cancel_url: str):
        """
        Create a Stripe Checkout Session for subscription purchase.
        Returns the Checkout Session object.
        """
        # Get or create Stripe customer
        customer = StripeService.get_or_create_customer(user)

        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            customer=customer.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': plan.stripe_price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_id': user.id,
                'plan_id': plan.id,
            }
        )

        return checkout_session

    @staticmethod
    def create_subscription_from_stripe(stripe_subscription) -> Subscription:
        """
        Create a Subscription in our database from a Stripe subscription object.
        Used when processing webhooks.
        """
        # Get user from customer ID
        customer = StripeCustomer.objects.get(
            stripe_customer_id=stripe_subscription.customer
        )

        # Get plan from price ID
        stripe_price_id = stripe_subscription['items']['data'][0]['price']['id']
        plan = SubscriptionPlan.objects.get(stripe_price_id=stripe_price_id)

        # Create or update subscription
        subscription, created = Subscription.objects.update_or_create(
            stripe_subscription_id=stripe_subscription.id,
            defaults={
                'user': customer.user,
                'plan': plan,
                'status': stripe_subscription.status,
                'current_period_start': datetime.fromtimestamp(stripe_subscription.current_period_start),
                'current_period_end': datetime.fromtimestamp(stripe_subscription.current_period_end),
                'cancel_at_period_end': stripe_subscription.cancel_at_period_end,
                'canceled_at': datetime.fromtimestamp(stripe_subscription.canceled_at) if stripe_subscription.canceled_at else None,
                'trial_start': datetime.fromtimestamp(stripe_subscription.trial_start) if stripe_subscription.trial_start else None,
                'trial_end': datetime.fromtimestamp(stripe_subscription.trial_end) if stripe_subscription.trial_end else None,
            }
        )

        return subscription

    @staticmethod
    def update_subscription_status(stripe_subscription_id: str, status: str):
        """Update subscription status in database"""
        try:
            subscription = Subscription.objects.get(stripe_subscription_id=stripe_subscription_id)
            subscription.status = status
            subscription.save()
            return subscription
        except Subscription.DoesNotExist:
            return None

    @staticmethod
    def cancel_subscription(subscription: Subscription, cancel_at_period_end: bool = True):
        """
        Cancel a subscription.
        If cancel_at_period_end=True, subscription will continue until end of billing period.
        If False, cancels immediately.
        """
        if cancel_at_period_end:
            # Cancel at end of period
            stripe_subscription = stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
        else:
            # Cancel immediately
            stripe_subscription = stripe.Subscription.delete(
                subscription.stripe_subscription_id
            )

        # Update database
        subscription.cancel_at_period_end = cancel_at_period_end
        if not cancel_at_period_end:
            subscription.status = 'canceled'
            subscription.canceled_at = datetime.now()
        subscription.save()

        return subscription

    @staticmethod
    def sync_payment_method(user: User, stripe_payment_method_id: str):
        """
        Sync a payment method from Stripe to database.
        """
        # Retrieve payment method from Stripe
        pm = stripe.PaymentMethod.retrieve(stripe_payment_method_id)

        # Create or update in database
        payment_method, created = PaymentMethod.objects.update_or_create(
            stripe_payment_method_id=pm.id,
            defaults={
                'user': user,
                'payment_method_type': pm.type,
                'card_brand': pm.card.brand if pm.type == 'card' else '',
                'card_last4': pm.card.last4 if pm.type == 'card' else '',
                'card_exp_month': pm.card.exp_month if pm.type == 'card' else None,
                'card_exp_year': pm.card.exp_year if pm.type == 'card' else None,
            }
        )

        return payment_method
