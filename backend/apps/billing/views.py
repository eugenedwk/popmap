from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from .models import SubscriptionPlan, Subscription
from .serializers import (
    SubscriptionPlanSerializer,
    SubscriptionSerializer,
    CreateCheckoutSessionSerializer,
    CancelSubscriptionSerializer
)
from .services import StripeService


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing subscription plans.
    GET /api/billing/plans/ - List all active plans
    GET /api/billing/plans/{id}/ - Get plan details
    """
    queryset = SubscriptionPlan.objects.filter(is_active=True).exclude(plan_type='beta-tester')
    serializer_class = SubscriptionPlanSerializer
    permission_classes = []  # Public endpoint
    pagination_class = None  # No pagination needed for plans


class SubscriptionViewSet(viewsets.ViewSet):
    """
    ViewSet for managing user subscriptions.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        GET /api/billing/subscription/current/
        Get the current user's active subscription.
        """
        try:
            subscription = Subscription.objects.filter(
                user=request.user,
                status__in=['active', 'trialing']
            ).select_related('plan').first()

            if subscription:
                serializer = SubscriptionSerializer(subscription)
                return Response(serializer.data)

            return Response({
                'subscription': None,
                'message': 'No active subscription'
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def create_checkout_session(self, request):
        """
        POST /api/billing/subscription/create_checkout_session/
        Create a Stripe Checkout session for purchasing a subscription.

        Request body:
        {
            "plan_id": 1,
            "success_url": "https://popmap.co/billing/success",
            "cancel_url": "https://popmap.co/billing/cancel"
        }
        """
        serializer = CreateCheckoutSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            plan = SubscriptionPlan.objects.get(
                id=serializer.validated_data['plan_id'],
                is_active=True
            )

            # Check if user already has active subscription
            active_subscription = Subscription.objects.filter(
                user=request.user,
                status__in=['active', 'trialing']
            ).first()

            if active_subscription:
                return Response(
                    {'error': 'You already have an active subscription'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create checkout session
            session = StripeService.create_checkout_session(
                user=request.user,
                plan=plan,
                success_url=serializer.validated_data['success_url'],
                cancel_url=serializer.validated_data['cancel_url']
            )

            return Response({
                'session_id': session.id,
                'session_url': session.url,
                'publishable_key': settings.STRIPE_PUBLISHABLE_KEY
            })

        except SubscriptionPlan.DoesNotExist:
            return Response(
                {'error': 'Invalid plan'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def cancel(self, request):
        """
        POST /api/billing/subscription/cancel/
        Cancel the current user's subscription.

        Request body:
        {
            "cancel_at_period_end": true
        }
        """
        serializer = CancelSubscriptionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            subscription = Subscription.objects.filter(
                user=request.user,
                status__in=['active', 'trialing']
            ).first()

            if not subscription:
                return Response(
                    {'error': 'No active subscription to cancel'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Cancel subscription via Stripe
            StripeService.cancel_subscription(
                subscription=subscription,
                cancel_at_period_end=serializer.validated_data['cancel_at_period_end']
            )

            return Response({
                'message': 'Subscription canceled successfully',
                'cancel_at_period_end': serializer.validated_data['cancel_at_period_end']
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
