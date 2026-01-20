from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from unittest.mock import patch, MagicMock
from datetime import datetime

from apps.events.models import Business, Event, Category
from apps.billing.models import SubscriptionPlan, Subscription
from apps.instagram.models import InstagramPostLog
from apps.instagram.services.base import InstagramPost
from apps.instagram.services.import_service import InstagramImportService, ImportResult


class InstagramImportServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('testuser', 'test@test.com', 'password')
        self.category = Category.objects.create(name="Food & Bev", slug="food-bev")
        self.business = Business.objects.create(
            name="Test Bakery",
            instagram_handle="testbakery",
            owner=self.user
        )
        self.business.categories.add(self.category)

        # Create premium subscription
        self.plan = SubscriptionPlan.objects.create(
            name="Premium",
            slug="premium",
            price=29.99,
            stripe_price_id="price_test"
        )
        now = timezone.now()
        self.subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            stripe_subscription_id="sub_test",
            status='active',
            current_period_start=now,
            current_period_end=now
        )

    @patch('apps.instagram.services.import_service.ScraperInstagramService')
    @patch('apps.instagram.services.import_service.EventExtractor')
    def test_imports_event_post_as_draft(self, mock_extractor_class, mock_service_class):
        """Should create draft event from Instagram post"""
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.fetch_user_posts_by_hashtag.return_value = [
            InstagramPost(
                post_id='123',
                caption='Pop-up market Saturday! #popmap',
                image_url='https://example.com/img.jpg',
                posted_at=datetime.now(),
                permalink='https://instagram.com/p/ABC/',
                username='testbakery'
            )
        ]

        mock_extractor = MagicMock()
        mock_extractor_class.return_value = mock_extractor
        mock_extractor.extract.return_value = MagicMock(
            is_event=True,
            confidence=0.9,
            title='Pop-up Market',
            description='Join us!',
            start_date=datetime.now().date(),
            start_time=datetime.now().time(),
            end_date=None,
            end_time=None,
            location='123 Main St',
            suggested_category='food-bev'
        )
        mock_extractor.confidence_threshold = 0.6

        service = InstagramImportService()
        result = service.import_posts(self.business)

        self.assertIsInstance(result, ImportResult)
        self.assertEqual(result.imported, 1)
        self.assertEqual(result.skipped_not_event, 0)
        self.assertEqual(len(result.draft_ids), 1)

        event = Event.objects.get(id=result.draft_ids[0])
        self.assertEqual(event.status, 'pending')
        self.assertEqual(event.title, 'Pop-up Market')

    @patch('apps.instagram.services.import_service.ScraperInstagramService')
    @patch('apps.instagram.services.import_service.EventExtractor')
    def test_skips_duplicate_posts(self, mock_extractor_class, mock_service_class):
        """Should skip posts that have already been imported"""
        InstagramPostLog.objects.create(
            business=self.business,
            instagram_post_id='123'
        )

        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.fetch_user_posts_by_hashtag.return_value = [
            InstagramPost(
                post_id='123',
                caption='Event #popmap',
                image_url='https://example.com/img.jpg',
                posted_at=datetime.now(),
                permalink='https://instagram.com/p/ABC/',
                username='testbakery'
            )
        ]

        service = InstagramImportService()
        result = service.import_posts(self.business)

        self.assertEqual(result.imported, 0)
        self.assertEqual(result.skipped_duplicate, 1)

    def test_requires_premium_subscription(self):
        """Should fail if business doesn't have premium subscription"""
        self.subscription.delete()

        service = InstagramImportService()
        result = service.import_posts(self.business)

        self.assertEqual(result.imported, 0)
        self.assertIn('subscription', result.error.lower())

    @patch('apps.instagram.services.import_service.ScraperInstagramService')
    @patch('apps.instagram.services.import_service.EventExtractor')
    def test_skips_non_event_posts(self, mock_extractor_class, mock_service_class):
        """Should skip posts that are not events"""
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.fetch_user_posts_by_hashtag.return_value = [
            InstagramPost(
                post_id='456',
                caption='Just a regular post #popmap',
                image_url='https://example.com/img.jpg',
                posted_at=datetime.now(),
                permalink='https://instagram.com/p/XYZ/',
                username='testbakery'
            )
        ]

        mock_extractor = MagicMock()
        mock_extractor_class.return_value = mock_extractor
        mock_extractor.extract.return_value = MagicMock(
            is_event=False,
            confidence=0.2,
            title=None,
            description=None,
            start_date=None,
            start_time=None,
            end_date=None,
            end_time=None,
            location=None,
            suggested_category=None
        )
        mock_extractor.confidence_threshold = 0.6

        service = InstagramImportService()
        result = service.import_posts(self.business)

        self.assertEqual(result.imported, 0)
        self.assertEqual(result.skipped_not_event, 1)
        self.assertEqual(len(result.draft_ids), 0)

    def test_requires_instagram_handle(self):
        """Should fail if business has no instagram handle"""
        self.business.instagram_handle = ''
        self.business.save()

        service = InstagramImportService()
        result = service.import_posts(self.business)

        self.assertEqual(result.imported, 0)
        self.assertIn('instagram', result.error.lower())
