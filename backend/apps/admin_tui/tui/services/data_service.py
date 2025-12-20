"""
Data service layer for PopMap Admin TUI.
Provides async-safe Django ORM operations for Textual.
"""
from datetime import timedelta
from typing import Optional, List, Dict, Any
from asgiref.sync import sync_to_async
from django.utils import timezone
from django.db.models import Count, Q
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings


class DataService:
    """Service class for all database operations."""

    # ==================== DASHBOARD ====================

    @staticmethod
    @sync_to_async
    def get_dashboard_stats() -> Dict[str, Any]:
        """Get statistics for the dashboard."""
        from apps.events.models import Event, Business, EventRSVP
        from apps.billing.models import Subscription
        from apps.authentication.models import UserProfile

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        return {
            'events': {
                'total': Event.objects.count(),
                'pending': Event.objects.filter(status='pending').count(),
                'today': Event.objects.filter(
                    start_datetime__date=now.date(),
                    status='approved'
                ).count(),
                'upcoming': Event.objects.filter(
                    start_datetime__gte=now,
                    status='approved'
                ).count(),
            },
            'businesses': {
                'total': Business.objects.count(),
                'verified': Business.objects.filter(is_verified=True).count(),
            },
            'users': {
                'total': User.objects.count(),
                'business_owners': UserProfile.objects.filter(role='business_owner').count(),
                'attendees': UserProfile.objects.filter(role='attendee').count(),
            },
            'subscriptions': {
                'active': Subscription.objects.filter(
                    status__in=['active', 'trialing']
                ).count(),
                'trial': Subscription.objects.filter(status='trialing').count(),
            },
            'rsvps': {
                'total': EventRSVP.objects.count(),
                'going': EventRSVP.objects.filter(status='going').count(),
                'interested': EventRSVP.objects.filter(status='interested').count(),
            },
        }

    @staticmethod
    @sync_to_async
    def get_pending_events(limit: int = 10) -> List[Dict[str, Any]]:
        """Get pending events for quick approval."""
        from apps.events.models import Event

        events = Event.objects.filter(
            status='pending'
        ).select_related('host_business').order_by('-created_at')[:limit]

        return [
            {
                'id': e.id,
                'title': e.title,
                'host': e.host_business.name if e.host_business else 'No Host',
                'date': e.start_datetime.strftime('%Y-%m-%d %H:%M'),
                'created': e.created_at.strftime('%Y-%m-%d'),
            }
            for e in events
        ]

    # ==================== EVENTS ====================

    @staticmethod
    @sync_to_async
    def get_events(
        search: str = '',
        status: str = '',
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Get paginated events list."""
        from apps.events.models import Event

        queryset = Event.objects.select_related(
            'host_business', 'created_by'
        ).prefetch_related('businesses')

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(host_business__name__icontains=search)
            )

        if status:
            queryset = queryset.filter(status=status)

        queryset = queryset.order_by('-start_datetime')

        total = queryset.count()
        start = (page - 1) * per_page
        end = start + per_page

        events = queryset[start:end]

        return {
            'items': [
                {
                    'id': e.id,
                    'title': e.title,
                    'host': e.host_business.name if e.host_business else '-',
                    'date': e.start_datetime.strftime('%Y-%m-%d %H:%M'),
                    'end_date': e.end_datetime.strftime('%Y-%m-%d %H:%M') if e.end_datetime else '-',
                    'status': e.status,
                    'address': e.address or '-',
                    'rsvp_count': getattr(e, 'rsvp_count', 0),
                }
                for e in events
            ],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        }

    @staticmethod
    @sync_to_async
    def get_event_detail(event_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed event information."""
        from apps.events.models import Event, EventRSVP

        try:
            event = Event.objects.select_related(
                'host_business', 'created_by'
            ).prefetch_related('businesses').get(id=event_id)
        except Event.DoesNotExist:
            return None

        rsvp_stats = EventRSVP.objects.filter(event=event).aggregate(
            going=Count('id', filter=Q(status='going')),
            interested=Count('id', filter=Q(status='interested')),
        )

        return {
            'id': event.id,
            'title': event.title,
            'description': event.description,
            'host': event.host_business.name if event.host_business else '-',
            'host_id': event.host_business.id if event.host_business else None,
            'businesses': [b.name for b in event.businesses.all()],
            'address': event.address,
            'location_name': event.location_name,
            'latitude': event.latitude,
            'longitude': event.longitude,
            'start_datetime': event.start_datetime.strftime('%Y-%m-%d %H:%M'),
            'end_datetime': event.end_datetime.strftime('%Y-%m-%d %H:%M') if event.end_datetime else None,
            'status': event.status,
            'cta_text': event.cta_button_text,
            'cta_url': event.cta_button_url,
            'image': event.image.url if event.image else None,
            'created_by': event.created_by.username if event.created_by else '-',
            'created_at': event.created_at.strftime('%Y-%m-%d %H:%M'),
            'rsvp_going': rsvp_stats['going'],
            'rsvp_interested': rsvp_stats['interested'],
        }

    @staticmethod
    @sync_to_async
    def approve_event(event_id: int) -> bool:
        """Approve a pending event."""
        from apps.events.models import Event

        try:
            event = Event.objects.get(id=event_id)
            event.status = 'approved'
            event.save(update_fields=['status'])
            return True
        except Event.DoesNotExist:
            return False

    @staticmethod
    @sync_to_async
    def reject_event(event_id: int) -> bool:
        """Reject a pending event."""
        from apps.events.models import Event

        try:
            event = Event.objects.get(id=event_id)
            event.status = 'rejected'
            event.save(update_fields=['status'])
            return True
        except Event.DoesNotExist:
            return False

    @staticmethod
    @sync_to_async
    def delete_event(event_id: int) -> bool:
        """Delete an event."""
        from apps.events.models import Event

        try:
            Event.objects.get(id=event_id).delete()
            return True
        except Event.DoesNotExist:
            return False

    # ==================== BUSINESSES ====================

    @staticmethod
    @sync_to_async
    def get_businesses(
        search: str = '',
        verified: Optional[bool] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Get paginated businesses list."""
        from apps.events.models import Business

        queryset = Business.objects.select_related('owner').prefetch_related('categories')

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(contact_email__icontains=search) |
                Q(custom_subdomain__icontains=search)
            )

        if verified is not None:
            queryset = queryset.filter(is_verified=verified)

        queryset = queryset.order_by('-created_at')

        total = queryset.count()
        start = (page - 1) * per_page
        end = start + per_page

        businesses = queryset[start:end]

        return {
            'items': [
                {
                    'id': b.id,
                    'name': b.name,
                    'owner': b.owner.email if b.owner else '-',
                    'subdomain': b.custom_subdomain or '-',
                    'verified': b.is_verified,
                    'email': b.contact_email or '-',
                    'categories': ', '.join([c.name for c in b.categories.all()]),
                }
                for b in businesses
            ],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        }

    @staticmethod
    @sync_to_async
    def get_business_detail(business_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed business information."""
        from apps.events.models import Business
        from apps.billing.models import Subscription

        try:
            business = Business.objects.select_related('owner').prefetch_related('categories').get(id=business_id)
        except Business.DoesNotExist:
            return None

        subscription = None
        if business.owner:
            sub = Subscription.objects.filter(
                user=business.owner,
                status__in=['active', 'trialing']
            ).select_related('plan').first()
            if sub:
                subscription = {
                    'plan': sub.plan.name,
                    'status': sub.status,
                    'ends': sub.current_period_end.strftime('%Y-%m-%d') if sub.current_period_end else '-',
                }

        return {
            'id': business.id,
            'name': business.name,
            'description': business.description,
            'owner': business.owner.email if business.owner else '-',
            'owner_id': business.owner.id if business.owner else None,
            'contact_email': business.contact_email,
            'contact_phone': business.contact_phone,
            'website': business.website,
            'instagram_url': business.instagram_url,
            'tiktok_url': business.tiktok_url,
            'custom_subdomain': business.custom_subdomain,
            'is_verified': business.is_verified,
            'available_for_hire': business.available_for_hire,
            'categories': [c.name for c in business.categories.all()],
            'subscription': subscription,
            'created_at': business.created_at.strftime('%Y-%m-%d'),
        }

    @staticmethod
    @sync_to_async
    def toggle_business_verified(business_id: int) -> Optional[bool]:
        """Toggle business verification status."""
        from apps.events.models import Business

        try:
            business = Business.objects.get(id=business_id)
            business.is_verified = not business.is_verified
            business.save(update_fields=['is_verified'])
            return business.is_verified
        except Business.DoesNotExist:
            return None

    @staticmethod
    @sync_to_async
    def delete_business(business_id: int) -> bool:
        """Delete a business."""
        from apps.events.models import Business

        try:
            Business.objects.get(id=business_id).delete()
            return True
        except Business.DoesNotExist:
            return False

    # ==================== USERS ====================

    @staticmethod
    @sync_to_async
    def get_users(
        search: str = '',
        role: str = '',
        has_subscription: Optional[bool] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Get paginated users list."""
        from apps.authentication.models import UserProfile
        from apps.billing.models import Subscription

        queryset = User.objects.select_related('profile').prefetch_related(
            'subscription_set'
        )

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )

        if role:
            queryset = queryset.filter(profile__role=role)

        queryset = queryset.order_by('-date_joined')

        # Get users with active subscriptions for filtering
        active_sub_users = set(
            Subscription.objects.filter(
                status__in=['active', 'trialing']
            ).values_list('user_id', flat=True)
        )

        total = queryset.count()
        start = (page - 1) * per_page
        end = start + per_page

        users = queryset[start:end]

        items = []
        for u in users:
            has_premium = u.id in active_sub_users
            if has_subscription is not None and has_premium != has_subscription:
                continue

            profile = getattr(u, 'profile', None)
            items.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'role': profile.role if profile else '-',
                'has_premium': has_premium,
                'joined': u.date_joined.strftime('%Y-%m-%d'),
            })

        return {
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        }

    @staticmethod
    @sync_to_async
    def get_user_detail(user_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed user information."""
        from apps.events.models import Business
        from apps.billing.models import Subscription

        try:
            user = User.objects.select_related('profile').get(id=user_id)
        except User.DoesNotExist:
            return None

        profile = getattr(user, 'profile', None)

        subscription = Subscription.objects.filter(
            user=user,
            status__in=['active', 'trialing']
        ).select_related('plan').first()

        businesses = Business.objects.filter(owner=user).values_list('name', flat=True)

        return {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': profile.role if profile else '-',
            'cognito_sub': profile.cognito_sub if profile else None,
            'is_staff': user.is_staff,
            'is_active': user.is_active,
            'date_joined': user.date_joined.strftime('%Y-%m-%d'),
            'last_login': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else '-',
            'businesses': list(businesses),
            'subscription': {
                'id': subscription.id,
                'plan': subscription.plan.name,
                'status': subscription.status,
                'period_end': subscription.current_period_end.strftime('%Y-%m-%d') if subscription.current_period_end else '-',
                'is_gifted': 'gift_' in (subscription.stripe_subscription_id or ''),
            } if subscription else None,
        }

    @staticmethod
    @sync_to_async
    def gift_subscription(
        user_id: int,
        days: int = 90,
        send_email: bool = True
    ) -> Dict[str, Any]:
        """Gift a premium subscription to a user."""
        from apps.billing.models import Subscription, SubscriptionPlan

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return {'success': False, 'error': 'User not found'}

        # Check existing subscription
        existing = Subscription.objects.filter(
            user=user,
            status__in=['active', 'trialing']
        ).first()

        if existing:
            return {
                'success': False,
                'error': f'User already has active subscription: {existing.plan.name}'
            }

        # Find premium plan
        premium_plan = SubscriptionPlan.objects.filter(
            plan_type='premium',
            is_active=True
        ).first()

        if not premium_plan:
            premium_plan = SubscriptionPlan.objects.filter(is_active=True).first()

        if not premium_plan:
            return {'success': False, 'error': 'No active subscription plans found'}

        # Create subscription
        subscription = Subscription.objects.create(
            user=user,
            plan=premium_plan,
            status='active',
            stripe_subscription_id=f'gift_{user.id}_{timezone.now().timestamp()}',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=days),
            cancel_at_period_end=False,
        )

        # Send email notification
        if send_email and user.email:
            try:
                send_mail(
                    subject='You\'ve been gifted a PopMap Premium Subscription!',
                    message=f'''
Hello {user.username or 'there'}!

Great news! You've been gifted a {premium_plan.name} subscription to PopMap, valid for the next {days} days.

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
            except Exception:
                pass  # Don't fail the gift action

        return {
            'success': True,
            'subscription_id': subscription.id,
            'plan': premium_plan.name,
            'expires': subscription.current_period_end.strftime('%Y-%m-%d'),
        }

    # ==================== SUBSCRIPTIONS ====================

    @staticmethod
    @sync_to_async
    def get_subscriptions(
        search: str = '',
        status: str = '',
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Get paginated subscriptions list."""
        from apps.billing.models import Subscription

        queryset = Subscription.objects.select_related('user', 'plan')

        if search:
            queryset = queryset.filter(
                Q(user__username__icontains=search) |
                Q(user__email__icontains=search) |
                Q(stripe_subscription_id__icontains=search)
            )

        if status:
            queryset = queryset.filter(status=status)

        queryset = queryset.order_by('-created_at')

        total = queryset.count()
        start = (page - 1) * per_page
        end = start + per_page

        subscriptions = queryset[start:end]

        return {
            'items': [
                {
                    'id': s.id,
                    'user': s.user.email,
                    'user_id': s.user.id,
                    'plan': s.plan.name,
                    'status': s.status,
                    'period_end': s.current_period_end.strftime('%Y-%m-%d') if s.current_period_end else '-',
                    'is_gifted': 'gift_' in (s.stripe_subscription_id or ''),
                    'cancel_at_period_end': s.cancel_at_period_end,
                }
                for s in subscriptions
            ],
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        }

    @staticmethod
    @sync_to_async
    def get_subscription_plans() -> List[Dict[str, Any]]:
        """Get all active subscription plans."""
        from apps.billing.models import SubscriptionPlan

        plans = SubscriptionPlan.objects.filter(is_active=True).order_by('price')

        return [
            {
                'id': p.id,
                'name': p.name,
                'plan_type': p.plan_type,
                'price': float(p.price),
                'max_events': p.max_events_per_month if p.max_events_per_month > 0 else 'Unlimited',
                'subdomain': p.custom_subdomain_enabled,
                'analytics': p.analytics_enabled,
                'featured': p.featured_listing,
            }
            for p in plans
        ]

    @staticmethod
    @sync_to_async
    def cancel_subscription(subscription_id: int) -> bool:
        """Cancel a subscription."""
        from apps.billing.models import Subscription

        try:
            subscription = Subscription.objects.get(id=subscription_id)
            subscription.status = 'canceled'
            subscription.canceled_at = timezone.now()
            subscription.save(update_fields=['status', 'canceled_at'])
            return True
        except Subscription.DoesNotExist:
            return False

    # ==================== ANALYTICS ====================

    @staticmethod
    @sync_to_async
    def get_analytics_summary(days: int = 30) -> Dict[str, Any]:
        """Get analytics summary for the dashboard."""
        from apps.analytics.models import PageView, Interaction, AnalyticsSummary

        start_date = timezone.now() - timedelta(days=days)

        # Get summary from pre-aggregated table if available
        summaries = AnalyticsSummary.objects.filter(
            date__gte=start_date.date()
        )

        if summaries.exists():
            total_views = sum(s.total_views for s in summaries)
            unique_views = sum(s.unique_views for s in summaries)
            mobile_views = sum(s.mobile_views for s in summaries)
        else:
            # Fall back to raw data
            views = PageView.objects.filter(created_at__gte=start_date)
            total_views = views.count()
            unique_views = views.values('session_id').distinct().count()
            mobile_views = views.filter(is_mobile=True).count()

        # Interaction breakdown
        interactions = Interaction.objects.filter(
            created_at__gte=start_date
        ).values('interaction_type').annotate(count=Count('id'))

        interaction_breakdown = {i['interaction_type']: i['count'] for i in interactions}

        # Top events and businesses
        top_events = PageView.objects.filter(
            created_at__gte=start_date,
            page_type='event'
        ).values('object_id').annotate(
            views=Count('id')
        ).order_by('-views')[:5]

        top_businesses = PageView.objects.filter(
            created_at__gte=start_date,
            page_type='business'
        ).values('object_id').annotate(
            views=Count('id')
        ).order_by('-views')[:5]

        return {
            'period_days': days,
            'total_views': total_views,
            'unique_views': unique_views,
            'mobile_views': mobile_views,
            'mobile_percent': round((mobile_views / total_views * 100) if total_views > 0 else 0, 1),
            'interactions': interaction_breakdown,
            'top_events': list(top_events),
            'top_businesses': list(top_businesses),
        }
