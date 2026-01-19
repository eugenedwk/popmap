from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from django.utils import timezone
from unittest.mock import patch

from apps.events.models import Business, Category
from apps.billing.models import SubscriptionPlan, Subscription


class InstagramImportViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('testuser', 'test@test.com', 'password')
        self.category = Category.objects.create(name="Food", slug="food")
        self.business = Business.objects.create(
            name="Test Business",
            instagram_handle="testbiz",
            owner=self.user
        )
        self.business.categories.add(self.category)

        self.plan = SubscriptionPlan.objects.create(
            name="Premium", slug="premium", price=29.99, stripe_price_id="price_test"
        )
        self.subscription = Subscription.objects.create(
            user=self.user, plan=self.plan, stripe_subscription_id="sub_test",
            status='active', current_period_start=timezone.now(), current_period_end=timezone.now()
        )

    def test_import_requires_authentication(self):
        """Import endpoint requires authentication"""
        response = self.client.post('/api/instagram/import/')
        # DRF returns 403 when authentication fails with certain backends
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    @patch('apps.instagram.views.InstagramImportService')
    def test_import_returns_result(self, mock_service_class):
        """Import endpoint returns import results"""
        from apps.instagram.services.import_service import ImportResult

        mock_service = mock_service_class.return_value
        mock_service.import_posts.return_value = ImportResult(
            imported=2, skipped_duplicate=1, skipped_not_event=1, draft_ids=[1, 2]
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/instagram/import/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['imported'], 2)
        self.assertEqual(response.data['skipped_duplicate'], 1)
        self.assertEqual(len(response.data['draft_ids']), 2)

    def test_import_fails_without_subscription(self):
        """Import fails for free users"""
        self.subscription.delete()
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/instagram/import/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
