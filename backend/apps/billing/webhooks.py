import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .services import StripeService
from .models import Subscription
import logging

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Handle Stripe webhook events.
    POST /api/billing/webhook/
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        logger.error('Invalid payload')
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        logger.error('Invalid signature')
        return HttpResponse(status=400)

    # Handle the event
    event_type = event['type']

    try:
        if event_type == 'checkout.session.completed':
            handle_checkout_completed(event['data']['object'])

        elif event_type == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])

        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])

        elif event_type == 'invoice.payment_succeeded':
            handle_payment_succeeded(event['data']['object'])

        elif event_type == 'invoice.payment_failed':
            handle_payment_failed(event['data']['object'])

        else:
            logger.info(f'Unhandled event type: {event_type}')

    except Exception as e:
        logger.error(f'Error processing webhook: {str(e)}')
        return HttpResponse(status=500)

    return HttpResponse(status=200)


def handle_checkout_completed(session):
    """Handle successful checkout session"""
    logger.info(f'Checkout completed: {session.id}')

    # Retrieve the subscription from Stripe
    subscription_id = session.subscription
    if subscription_id:
        stripe_subscription = stripe.Subscription.retrieve(subscription_id)

        # Create subscription in database
        StripeService.create_subscription_from_stripe(stripe_subscription)


def handle_subscription_updated(stripe_subscription):
    """Handle subscription updates"""
    logger.info(f'Subscription updated: {stripe_subscription.id}')

    try:
        subscription = Subscription.objects.get(
            stripe_subscription_id=stripe_subscription.id
        )
        subscription.status = stripe_subscription.status
        subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end
        subscription.save()
    except Subscription.DoesNotExist:
        # Create if doesn't exist
        StripeService.create_subscription_from_stripe(stripe_subscription)


def handle_subscription_deleted(stripe_subscription):
    """Handle subscription cancellation"""
    logger.info(f'Subscription deleted: {stripe_subscription.id}')

    StripeService.update_subscription_status(
        stripe_subscription.id,
        'canceled'
    )


def handle_payment_succeeded(invoice):
    """Handle successful payment"""
    logger.info(f'Payment succeeded: {invoice.id}')

    # Update subscription status if needed
    if invoice.subscription:
        StripeService.update_subscription_status(
            invoice.subscription,
            'active'
        )


def handle_payment_failed(invoice):
    """Handle failed payment"""
    logger.error(f'Payment failed: {invoice.id}')

    # Update subscription status to past_due
    if invoice.subscription:
        StripeService.update_subscription_status(
            invoice.subscription,
            'past_due'
        )
