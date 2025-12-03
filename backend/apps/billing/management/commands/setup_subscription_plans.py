"""
Management command to set up subscription plans.
Run: python manage.py setup_subscription_plans
"""
from django.core.management.base import BaseCommand
from apps.billing.models import SubscriptionPlan


class Command(BaseCommand):
    help = 'Create or update subscription plans'

    def handle(self, *args, **options):
        plans = [
            {
                'name': 'Free',
                'slug': 'free',
                'plan_type': 'free',
                'description': 'Get started with PopMap - perfect for trying out the platform',
                'price': 0.00,
                'stripe_product_id': '',
                'stripe_price_id': '',
                'max_events_per_month': 3,
                'custom_subdomain_enabled': False,
                'featured_listing': False,
                'analytics_enabled': False,
                'priority_support': False,
                'is_active': True,
            },
            {
                'name': 'PopMap Premium',
                'slug': 'premium',
                'plan_type': 'premium',
                'description': 'Unlimited events, custom subdomain, form builder, and priority support',
                'price': 29.99,  # Update this to your actual price
                'stripe_product_id': 'prod_TVucSMYP4ad2bg',
                'stripe_price_id': 'price_1SYsnSB43qorEmjGYoDXWlvf',
                'max_events_per_month': 0,  # 0 = unlimited
                'custom_subdomain_enabled': True,
                'featured_listing': True,
                'analytics_enabled': True,
                'priority_support': True,
                'is_active': True,
            },
        ]

        for plan_data in plans:
            plan, created = SubscriptionPlan.objects.update_or_create(
                slug=plan_data['slug'],
                defaults=plan_data
            )

            status = 'Created' if created else 'Updated'
            self.stdout.write(
                self.style.SUCCESS(f'{status}: {plan.name} (${plan.price}/month)')
            )

        self.stdout.write(self.style.SUCCESS('\nSubscription plans setup complete!'))
        self.stdout.write('\nPlan summary:')
        for plan in SubscriptionPlan.objects.filter(is_active=True).order_by('price'):
            features = []
            if plan.max_events_per_month == 0:
                features.append('Unlimited events')
            else:
                features.append(f'{plan.max_events_per_month} events/month')
            if plan.custom_subdomain_enabled:
                features.append('Custom subdomain')
            if plan.featured_listing:
                features.append('Featured listing')
            if plan.analytics_enabled:
                features.append('Analytics')
            if plan.priority_support:
                features.append('Priority support')

            self.stdout.write(f'  - {plan.name}: ${plan.price}/month')
            self.stdout.write(f'    Features: {", ".join(features)}')
            if plan.stripe_price_id:
                self.stdout.write(f'    Stripe: {plan.stripe_price_id}')
