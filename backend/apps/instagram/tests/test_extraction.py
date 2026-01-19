from django.test import TestCase
from unittest.mock import patch, MagicMock
from apps.events.models import Business, Category
from apps.instagram.extraction.event_extractor import EventExtractor, ExtractedEvent


class EventExtractorTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Food & Bev", slug="food-bev")
        self.business = Business.objects.create(
            name="Test Bakery",
            contact_email="test@bakery.com"
        )
        self.business.categories.add(self.category)
        self.extractor = EventExtractor()

    @patch('apps.instagram.extraction.event_extractor.anthropic.Anthropic')
    def test_extracts_event_from_caption(self, mock_anthropic):
        """Should extract event details from Instagram caption"""
        # Set api_key to enable extraction (bypasses config check)
        self.extractor.api_key = 'test-api-key'

        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text='{"is_event": true, "confidence": 0.9, "title": "Pop-Up Market", "description": "Fresh baked goods", "start_date": "2026-01-25", "start_time": "10:00", "end_date": null, "end_time": "14:00", "location": "123 Main St", "suggested_category": "food-bev"}')
        ]

        caption = "Join us this Saturday Jan 25 at 10am for our Pop-Up Market! Fresh baked goods. 123 Main St #popmap"
        result = self.extractor.extract(caption, self.business)

        self.assertIsInstance(result, ExtractedEvent)
        self.assertTrue(result.is_event)
        self.assertGreater(result.confidence, 0.6)
        self.assertEqual(result.title, "Pop-Up Market")

    @patch('apps.instagram.extraction.event_extractor.anthropic.Anthropic')
    def test_returns_low_confidence_for_non_event(self, mock_anthropic):
        """Should return low confidence for non-event posts"""
        # Set api_key to enable extraction (bypasses config check)
        self.extractor.api_key = 'test-api-key'

        mock_client = MagicMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = [
            MagicMock(text='{"is_event": false, "confidence": 0.2, "title": null, "description": null, "start_date": null, "start_time": null, "end_date": null, "end_time": null, "location": null, "suggested_category": null}')
        ]

        caption = "Thanks for visiting us today! #popmap #grateful"
        result = self.extractor.extract(caption, self.business)

        self.assertFalse(result.is_event)
        self.assertLess(result.confidence, 0.6)

    def test_confidence_threshold(self):
        """Should have configurable confidence threshold"""
        self.assertEqual(self.extractor.confidence_threshold, 0.6)
