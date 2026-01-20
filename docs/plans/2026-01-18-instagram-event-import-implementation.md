# Instagram Event Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow premium businesses to import Instagram posts tagged #popmap as draft events using LLM extraction.

**Architecture:** New `instagram` Django app with abstraction layer for Instagram API (scraper now, Graph API later). LLM extracts event details from captions. Frontend adds Instagram handle to business settings and import button to dashboard.

**Tech Stack:** Django REST Framework, Python dataclasses, RapidAPI Instagram scraper, Claude/OpenAI for extraction, React/TypeScript frontend

---

## Task 1: Add Instagram Handle to Business Model

**Files:**
- Modify: `backend/apps/events/models.py:24-227` (Business model)
- Create: `backend/apps/events/migrations/0017_add_business_instagram_handle.py`
- Modify: `backend/apps/events/serializers.py`
- Test: `backend/apps/events/tests/test_business_instagram.py`

**Step 1: Write the failing test**

Create `backend/apps/events/tests/test_business_instagram.py`:

```python
from django.test import TestCase
from apps.events.models import Business


class BusinessInstagramHandleTests(TestCase):
    def test_instagram_handle_field_exists(self):
        """Business model should have instagram_handle field"""
        business = Business.objects.create(name="Test Business")
        self.assertIsNone(business.instagram_handle)

    def test_instagram_handle_saves_correctly(self):
        """Instagram handle should save without @ symbol"""
        business = Business.objects.create(
            name="Test Business",
            instagram_handle="testbusiness"
        )
        self.assertEqual(business.instagram_handle, "testbusiness")

    def test_instagram_handle_max_length(self):
        """Instagram handle should accept up to 30 characters"""
        business = Business.objects.create(
            name="Test Business",
            instagram_handle="a" * 30
        )
        self.assertEqual(len(business.instagram_handle), 30)
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python manage.py test apps.events.tests.test_business_instagram -v 2`
Expected: FAIL with "Business has no field named 'instagram_handle'"

**Step 3: Add instagram_handle field to Business model**

In `backend/apps/events/models.py`, add after line 71 (custom_subdomain field):

```python
    # Instagram integration
    instagram_handle = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        help_text="Instagram username (without @) for importing events"
    )
```

**Step 4: Create and run migration**

Run: `cd backend && python manage.py makemigrations events --name add_business_instagram_handle && python manage.py migrate`

**Step 5: Run test to verify it passes**

Run: `cd backend && python manage.py test apps.events.tests.test_business_instagram -v 2`
Expected: PASS (3 tests)

**Step 6: Update serializer**

In `backend/apps/events/serializers.py`, add `instagram_handle` to BusinessSerializer fields.

**Step 7: Commit**

```bash
git add backend/apps/events/models.py backend/apps/events/migrations/ backend/apps/events/serializers.py backend/apps/events/tests/
git commit -m "feat(instagram): Add instagram_handle field to Business model"
```

---

## Task 2: Create Instagram App Structure

**Files:**
- Create: `backend/apps/instagram/__init__.py`
- Create: `backend/apps/instagram/apps.py`
- Create: `backend/apps/instagram/models.py`
- Create: `backend/apps/instagram/admin.py`
- Modify: `backend/config/settings.py`

**Step 1: Create app directory structure**

```bash
mkdir -p backend/apps/instagram/services
mkdir -p backend/apps/instagram/extraction
mkdir -p backend/apps/instagram/tests
touch backend/apps/instagram/__init__.py
touch backend/apps/instagram/services/__init__.py
touch backend/apps/instagram/extraction/__init__.py
touch backend/apps/instagram/tests/__init__.py
```

**Step 2: Create apps.py**

Create `backend/apps/instagram/apps.py`:

```python
from django.apps import AppConfig


class InstagramConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.instagram'
    verbose_name = 'Instagram Integration'
```

**Step 3: Create empty models.py**

Create `backend/apps/instagram/models.py`:

```python
from django.db import models
from django.contrib.auth.models import User
from apps.events.models import Business, Event


class InstagramPostLog(models.Model):
    """
    Tracks imported Instagram post IDs for deduplication.
    One record per successfully imported post.
    """
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='instagram_imports'
    )
    instagram_post_id = models.CharField(
        max_length=100,
        help_text="Instagram's unique post ID"
    )
    event = models.ForeignKey(
        Event,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instagram_source',
        help_text="The draft event created from this post"
    )
    original_permalink = models.URLField(
        blank=True,
        help_text="Link to original Instagram post"
    )
    original_caption = models.TextField(
        blank=True,
        help_text="Original caption from Instagram post"
    )
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Instagram Post Log"
        verbose_name_plural = "Instagram Post Logs"
        unique_together = ['business', 'instagram_post_id']
        indexes = [
            models.Index(fields=['business', 'instagram_post_id']),
            models.Index(fields=['imported_at']),
        ]

    def __str__(self):
        return f"{self.business.name} - {self.instagram_post_id}"
```

**Step 4: Create admin.py**

Create `backend/apps/instagram/admin.py`:

```python
from django.contrib import admin
from .models import InstagramPostLog


@admin.register(InstagramPostLog)
class InstagramPostLogAdmin(admin.ModelAdmin):
    list_display = ['business', 'instagram_post_id', 'event', 'imported_at']
    list_filter = ['imported_at', 'business']
    search_fields = ['instagram_post_id', 'business__name', 'original_caption']
    readonly_fields = ['imported_at']
    raw_id_fields = ['business', 'event']
```

**Step 5: Add to INSTALLED_APPS**

In `backend/config/settings.py`, add `'apps.instagram',` to INSTALLED_APPS after `'apps.analytics',`.

**Step 6: Create and run migration**

Run: `cd backend && python manage.py makemigrations instagram && python manage.py migrate`

**Step 7: Verify app loads**

Run: `cd backend && python manage.py check`
Expected: "System check identified no issues"

**Step 8: Commit**

```bash
git add backend/apps/instagram/ backend/config/settings.py
git commit -m "feat(instagram): Create instagram app with InstagramPostLog model"
```

---

## Task 3: Create Instagram Service Abstraction Layer

**Files:**
- Create: `backend/apps/instagram/services/base.py`
- Create: `backend/apps/instagram/services/scraper.py`
- Test: `backend/apps/instagram/tests/test_services.py`

**Step 1: Create base service interface**

Create `backend/apps/instagram/services/base.py`:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional


@dataclass
class InstagramPost:
    """Normalized Instagram post data"""
    post_id: str
    caption: str
    image_url: str
    posted_at: datetime
    permalink: str
    username: str


class InstagramServiceError(Exception):
    """Base exception for Instagram service errors"""
    pass


class RateLimitError(InstagramServiceError):
    """Raised when rate limited by Instagram/API"""
    pass


class UserNotFoundError(InstagramServiceError):
    """Raised when Instagram user is not found"""
    pass


class InstagramService(ABC):
    """Abstract base class for Instagram API implementations"""

    @abstractmethod
    def fetch_user_posts_by_hashtag(
        self,
        username: str,
        hashtag: str,
        limit: int = 20
    ) -> List[InstagramPost]:
        """
        Fetch posts from a user that contain the specified hashtag.

        Args:
            username: Instagram username (without @)
            hashtag: Hashtag to filter by (without #)
            limit: Maximum posts to return

        Returns:
            List of InstagramPost objects

        Raises:
            RateLimitError: If rate limited
            UserNotFoundError: If user doesn't exist
            InstagramServiceError: For other errors
        """
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Check if the service is operational"""
        pass
```

**Step 2: Write failing test for scraper service**

Create `backend/apps/instagram/tests/test_services.py`:

```python
from django.test import TestCase
from unittest.mock import patch, MagicMock
from apps.instagram.services.base import InstagramPost, InstagramServiceError
from apps.instagram.services.scraper import ScraperInstagramService


class ScraperInstagramServiceTests(TestCase):
    def setUp(self):
        self.service = ScraperInstagramService(api_key="test_key")

    def test_service_instantiates(self):
        """Service should instantiate with API key"""
        self.assertIsNotNone(self.service)

    @patch('apps.instagram.services.scraper.requests.get')
    def test_fetch_posts_returns_instagram_posts(self, mock_get):
        """Should return list of InstagramPost objects"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [{
                'id': '123456',
                'caption': 'Test event #popmap',
                'display_url': 'https://example.com/image.jpg',
                'taken_at_timestamp': 1705600000,
                'shortcode': 'ABC123'
            }]
        }
        mock_get.return_value = mock_response

        posts = self.service.fetch_user_posts_by_hashtag(
            username='testuser',
            hashtag='popmap',
            limit=10
        )

        self.assertEqual(len(posts), 1)
        self.assertIsInstance(posts[0], InstagramPost)
        self.assertEqual(posts[0].post_id, '123456')

    @patch('apps.instagram.services.scraper.requests.get')
    def test_filters_posts_by_hashtag(self, mock_get):
        """Should only return posts containing the hashtag"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': [
                {'id': '1', 'caption': 'Has #popmap tag', 'display_url': 'url1', 'taken_at_timestamp': 1705600000, 'shortcode': 'A'},
                {'id': '2', 'caption': 'No tag here', 'display_url': 'url2', 'taken_at_timestamp': 1705600000, 'shortcode': 'B'},
                {'id': '3', 'caption': 'Also #popmap', 'display_url': 'url3', 'taken_at_timestamp': 1705600000, 'shortcode': 'C'},
            ]
        }
        mock_get.return_value = mock_response

        posts = self.service.fetch_user_posts_by_hashtag('testuser', 'popmap')

        self.assertEqual(len(posts), 2)
        self.assertEqual(posts[0].post_id, '1')
        self.assertEqual(posts[1].post_id, '3')
```

**Step 3: Run test to verify it fails**

Run: `cd backend && python manage.py test apps.instagram.tests.test_services -v 2`
Expected: FAIL with "No module named 'apps.instagram.services.scraper'"

**Step 4: Implement scraper service**

Create `backend/apps/instagram/services/scraper.py`:

```python
import requests
from datetime import datetime
from typing import List
from decouple import config

from .base import (
    InstagramService,
    InstagramPost,
    InstagramServiceError,
    RateLimitError,
    UserNotFoundError,
)


class ScraperInstagramService(InstagramService):
    """
    Instagram service using RapidAPI scraper.
    Uses free tier initially, can be swapped for Graph API later.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or config('RAPIDAPI_KEY', default='')
        self.base_url = "https://instagram-scraper-api2.p.rapidapi.com"
        self.headers = {
            "X-RapidAPI-Key": self.api_key,
            "X-RapidAPI-Host": "instagram-scraper-api2.p.rapidapi.com"
        }

    def fetch_user_posts_by_hashtag(
        self,
        username: str,
        hashtag: str,
        limit: int = 20
    ) -> List[InstagramPost]:
        """
        Fetch user's posts filtered by hashtag.
        """
        if not self.api_key:
            raise InstagramServiceError("RAPIDAPI_KEY not configured")

        try:
            # Fetch user's recent posts
            response = requests.get(
                f"{self.base_url}/v1/posts",
                headers=self.headers,
                params={"username_or_id_or_url": username},
                timeout=30
            )

            if response.status_code == 429:
                raise RateLimitError("Rate limited by Instagram API")
            elif response.status_code == 404:
                raise UserNotFoundError(f"User @{username} not found")
            elif response.status_code != 200:
                raise InstagramServiceError(f"API error: {response.status_code}")

            data = response.json()
            posts_data = data.get('data', [])

            # Filter by hashtag and convert to InstagramPost objects
            hashtag_lower = hashtag.lower()
            posts = []

            for post in posts_data[:limit * 2]:  # Fetch extra to account for filtering
                caption = post.get('caption', '') or ''
                if f'#{hashtag_lower}' in caption.lower():
                    posts.append(InstagramPost(
                        post_id=str(post.get('id', '')),
                        caption=caption,
                        image_url=post.get('display_url', ''),
                        posted_at=datetime.fromtimestamp(post.get('taken_at_timestamp', 0)),
                        permalink=f"https://www.instagram.com/p/{post.get('shortcode', '')}/",
                        username=username
                    ))

                if len(posts) >= limit:
                    break

            return posts

        except requests.RequestException as e:
            raise InstagramServiceError(f"Network error: {str(e)}")

    def health_check(self) -> bool:
        """Check if API is accessible"""
        if not self.api_key:
            return False
        try:
            response = requests.get(
                f"{self.base_url}/v1/info",
                headers=self.headers,
                params={"username_or_id_or_url": "instagram"},
                timeout=10
            )
            return response.status_code == 200
        except Exception:
            return False
```

**Step 5: Run test to verify it passes**

Run: `cd backend && python manage.py test apps.instagram.tests.test_services -v 2`
Expected: PASS (3 tests)

**Step 6: Commit**

```bash
git add backend/apps/instagram/services/
git commit -m "feat(instagram): Add Instagram service abstraction layer with scraper implementation"
```

---

## Task 4: Create LLM Event Extractor

**Files:**
- Create: `backend/apps/instagram/extraction/event_extractor.py`
- Test: `backend/apps/instagram/tests/test_extraction.py`

**Step 1: Write failing test**

Create `backend/apps/instagram/tests/test_extraction.py`:

```python
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python manage.py test apps.instagram.tests.test_extraction -v 2`
Expected: FAIL with "No module named 'apps.instagram.extraction.event_extractor'"

**Step 3: Implement event extractor**

Create `backend/apps/instagram/extraction/event_extractor.py`:

```python
import json
import anthropic
from dataclasses import dataclass
from typing import Optional
from datetime import date, time
from decouple import config

from apps.events.models import Business


@dataclass
class ExtractedEvent:
    """Extracted event data from Instagram post"""
    is_event: bool
    confidence: float
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    start_time: Optional[time] = None
    end_date: Optional[date] = None
    end_time: Optional[time] = None
    location: Optional[str] = None
    suggested_category: Optional[str] = None


class EventExtractor:
    """Extracts event information from Instagram captions using LLM"""

    def __init__(self, confidence_threshold: float = 0.6):
        self.confidence_threshold = confidence_threshold
        self.api_key = config('ANTHROPIC_API_KEY', default='')

    def extract(self, caption: str, business: Business) -> ExtractedEvent:
        """
        Extract event details from Instagram caption.

        Args:
            caption: The Instagram post caption
            business: The business context for smart defaults

        Returns:
            ExtractedEvent with extracted data and confidence score
        """
        if not self.api_key:
            # Return low confidence if API key not configured
            return ExtractedEvent(is_event=False, confidence=0.0)

        # Build business context
        categories = list(business.categories.values_list('slug', flat=True))
        primary_category = categories[0] if categories else None

        prompt = self._build_prompt(caption, business.name, primary_category)

        try:
            client = anthropic.Anthropic(api_key=self.api_key)
            response = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = response.content[0].text
            return self._parse_response(response_text)

        except Exception as e:
            # Log error and return low confidence
            print(f"LLM extraction error: {e}")
            return ExtractedEvent(is_event=False, confidence=0.0)

    def _build_prompt(self, caption: str, business_name: str, category: Optional[str]) -> str:
        return f"""You are extracting event information from an Instagram post.

Business context:
- Name: {business_name}
- Default category: {category or 'unknown'}

Instagram caption:
"{caption}"

Extract event details if this is an event announcement. Return ONLY valid JSON (no markdown, no explanation):
{{
  "is_event": true/false,
  "confidence": 0.0-1.0,
  "title": "event title" or null,
  "description": "brief description" or null,
  "start_date": "YYYY-MM-DD" or null,
  "start_time": "HH:MM" or null,
  "end_date": "YYYY-MM-DD" or null,
  "end_time": "HH:MM" or null,
  "location": "address or venue name" or null,
  "suggested_category": "category-slug" or null
}}

Rules:
- Set is_event=true only if this announces a specific event with date/time
- confidence should reflect how certain you are this is an event AND how complete the information is
- Use business location as default if no specific location mentioned
- Extract dates relative to current date if given as "this Saturday", etc.
- If no clear event date/time, set is_event=false with low confidence"""

    def _parse_response(self, response_text: str) -> ExtractedEvent:
        """Parse LLM JSON response into ExtractedEvent"""
        try:
            # Clean potential markdown formatting
            text = response_text.strip()
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
                text = text.rsplit('```', 1)[0]

            data = json.loads(text)

            return ExtractedEvent(
                is_event=data.get('is_event', False),
                confidence=float(data.get('confidence', 0.0)),
                title=data.get('title'),
                description=data.get('description'),
                start_date=self._parse_date(data.get('start_date')),
                start_time=self._parse_time(data.get('start_time')),
                end_date=self._parse_date(data.get('end_date')),
                end_time=self._parse_time(data.get('end_time')),
                location=data.get('location'),
                suggested_category=data.get('suggested_category'),
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            print(f"Failed to parse LLM response: {e}")
            return ExtractedEvent(is_event=False, confidence=0.0)

    def _parse_date(self, date_str: Optional[str]) -> Optional[date]:
        if not date_str:
            return None
        try:
            return date.fromisoformat(date_str)
        except ValueError:
            return None

    def _parse_time(self, time_str: Optional[str]) -> Optional[time]:
        if not time_str:
            return None
        try:
            return time.fromisoformat(time_str)
        except ValueError:
            return None
```

**Step 4: Add anthropic to requirements**

Run: `echo "anthropic>=0.18.0" >> backend/requirements.txt`

**Step 5: Install dependency**

Run: `pip install anthropic>=0.18.0`

**Step 6: Run test to verify it passes**

Run: `cd backend && python manage.py test apps.instagram.tests.test_extraction -v 2`
Expected: PASS (3 tests)

**Step 7: Commit**

```bash
git add backend/apps/instagram/extraction/ backend/requirements.txt
git commit -m "feat(instagram): Add LLM-based event extractor using Claude"
```

---

## Task 5: Create Import Service (Core Business Logic)

**Files:**
- Create: `backend/apps/instagram/services/import_service.py`
- Test: `backend/apps/instagram/tests/test_import_service.py`

**Step 1: Write failing test**

Create `backend/apps/instagram/tests/test_import_service.py`:

```python
from django.test import TestCase
from django.contrib.auth.models import User
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
        self.subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            stripe_subscription_id="sub_test",
            status='active',
            current_period_start=datetime.now(),
            current_period_end=datetime.now()
        )

    @patch('apps.instagram.services.import_service.ScraperInstagramService')
    @patch('apps.instagram.services.import_service.EventExtractor')
    def test_imports_event_post_as_draft(self, mock_extractor_class, mock_service_class):
        """Should create draft event from Instagram post"""
        # Mock Instagram service
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

        # Mock extractor
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

        # Verify event was created as pending
        event = Event.objects.get(id=result.draft_ids[0])
        self.assertEqual(event.status, 'pending')
        self.assertEqual(event.title, 'Pop-up Market')

    @patch('apps.instagram.services.import_service.ScraperInstagramService')
    @patch('apps.instagram.services.import_service.EventExtractor')
    def test_skips_duplicate_posts(self, mock_extractor_class, mock_service_class):
        """Should skip posts that have already been imported"""
        # Create existing import log
        InstagramPostLog.objects.create(
            business=self.business,
            instagram_post_id='123'
        )

        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.fetch_user_posts_by_hashtag.return_value = [
            InstagramPost(
                post_id='123',  # Same as existing
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python manage.py test apps.instagram.tests.test_import_service -v 2`
Expected: FAIL with "No module named 'apps.instagram.services.import_service'"

**Step 3: Implement import service**

Create `backend/apps/instagram/services/import_service.py`:

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional
from django.utils import timezone
from django.core.files.base import ContentFile
import requests

from apps.events.models import Business, Event
from apps.instagram.models import InstagramPostLog
from apps.instagram.services.scraper import ScraperInstagramService
from apps.instagram.services.base import InstagramServiceError
from apps.instagram.extraction.event_extractor import EventExtractor


@dataclass
class ImportResult:
    """Result of an import operation"""
    imported: int = 0
    skipped_duplicate: int = 0
    skipped_not_event: int = 0
    skipped_error: int = 0
    draft_ids: List[int] = field(default_factory=list)
    error: Optional[str] = None


class InstagramImportService:
    """Orchestrates the Instagram import process"""

    def __init__(self):
        self.instagram_service = ScraperInstagramService()
        self.extractor = EventExtractor()

    def import_posts(self, business: Business, limit: int = 20) -> ImportResult:
        """
        Import Instagram posts as draft events for a business.

        Args:
            business: The business to import posts for
            limit: Maximum posts to fetch

        Returns:
            ImportResult with counts and created draft IDs
        """
        result = ImportResult()

        # Check subscription
        if not business.can_use_premium_customization():
            result.error = "Premium subscription required for Instagram import"
            return result

        # Check Instagram handle
        if not business.instagram_handle:
            result.error = "No Instagram handle configured"
            return result

        try:
            # Fetch posts from Instagram
            posts = self.instagram_service.fetch_user_posts_by_hashtag(
                username=business.instagram_handle,
                hashtag='popmap',
                limit=limit
            )
        except InstagramServiceError as e:
            result.error = str(e)
            return result

        # Get existing post IDs to check for duplicates
        existing_ids = set(
            InstagramPostLog.objects.filter(business=business)
            .values_list('instagram_post_id', flat=True)
        )

        for post in posts:
            # Check for duplicate
            if post.post_id in existing_ids:
                result.skipped_duplicate += 1
                continue

            # Extract event info
            extracted = self.extractor.extract(post.caption, business)

            # Skip if not an event (low confidence)
            if not extracted.is_event or extracted.confidence < self.extractor.confidence_threshold:
                result.skipped_not_event += 1
                continue

            # Create draft event
            try:
                event = self._create_draft_event(business, post, extracted)
                result.draft_ids.append(event.id)
                result.imported += 1

                # Log the import
                InstagramPostLog.objects.create(
                    business=business,
                    instagram_post_id=post.post_id,
                    event=event,
                    original_permalink=post.permalink,
                    original_caption=post.caption
                )

            except Exception as e:
                print(f"Error creating draft event: {e}")
                result.skipped_error += 1

        return result

    def _create_draft_event(self, business: Business, post, extracted) -> Event:
        """Create a draft event from extracted data"""
        # Build start datetime
        start_date = extracted.start_date or timezone.now().date()
        start_time = extracted.start_time or datetime.strptime("12:00", "%H:%M").time()
        start_datetime = timezone.make_aware(
            datetime.combine(start_date, start_time)
        )

        # Build end datetime (default to 2 hours after start)
        if extracted.end_time:
            end_time = extracted.end_time
            end_date = extracted.end_date or start_date
            end_datetime = timezone.make_aware(
                datetime.combine(end_date, end_time)
            )
        else:
            end_datetime = start_datetime + timedelta(hours=2)

        # Use business address as fallback location
        location = extracted.location
        if not location and hasattr(business, 'venues') and business.venues.exists():
            venue = business.venues.first()
            location = venue.address

        event = Event.objects.create(
            host_business=business,
            title=extracted.title or f"Event by {business.name}",
            description=extracted.description or post.caption[:500],
            address=location or "Location TBD",
            latitude=0,  # To be filled by business
            longitude=0,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            status='pending',  # Draft status
            created_by=business.owner
        )

        # Add host business to businesses
        event.businesses.add(business)

        # Download and attach image if available
        if post.image_url:
            try:
                self._attach_image(event, post.image_url)
            except Exception as e:
                print(f"Failed to attach image: {e}")

        return event

    def _attach_image(self, event: Event, image_url: str):
        """Download and attach image to event"""
        response = requests.get(image_url, timeout=30)
        if response.status_code == 200:
            # Generate filename from URL
            filename = f"instagram_{event.id}.jpg"
            event.image.save(filename, ContentFile(response.content), save=True)
```

**Step 4: Run test to verify it passes**

Run: `cd backend && python manage.py test apps.instagram.tests.test_import_service -v 2`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add backend/apps/instagram/services/import_service.py backend/apps/instagram/tests/
git commit -m "feat(instagram): Add import service with subscription check and deduplication"
```

---

## Task 6: Create API Views

**Files:**
- Create: `backend/apps/instagram/views.py`
- Create: `backend/apps/instagram/serializers.py`
- Create: `backend/apps/instagram/urls.py`
- Modify: `backend/config/urls.py`
- Test: `backend/apps/instagram/tests/test_views.py`

**Step 1: Write failing test**

Create `backend/apps/instagram/tests/test_views.py`:

```python
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth.models import User
from unittest.mock import patch
from datetime import datetime

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

        # Premium subscription
        self.plan = SubscriptionPlan.objects.create(
            name="Premium", slug="premium", price=29.99, stripe_price_id="price_test"
        )
        self.subscription = Subscription.objects.create(
            user=self.user, plan=self.plan, stripe_subscription_id="sub_test",
            status='active', current_period_start=datetime.now(), current_period_end=datetime.now()
        )

    def test_import_requires_authentication(self):
        """Import endpoint requires authentication"""
        response = self.client.post('/api/instagram/import/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python manage.py test apps.instagram.tests.test_views -v 2`
Expected: FAIL (URL not found)

**Step 3: Create serializers**

Create `backend/apps/instagram/serializers.py`:

```python
from rest_framework import serializers


class ImportResultSerializer(serializers.Serializer):
    imported = serializers.IntegerField()
    skipped_duplicate = serializers.IntegerField()
    skipped_not_event = serializers.IntegerField()
    skipped_error = serializers.IntegerField()
    draft_ids = serializers.ListField(child=serializers.IntegerField())
    error = serializers.CharField(allow_null=True, required=False)


class ImportHistorySerializer(serializers.Serializer):
    instagram_post_id = serializers.CharField()
    event_id = serializers.IntegerField(source='event.id', allow_null=True)
    event_title = serializers.CharField(source='event.title', allow_null=True)
    original_permalink = serializers.URLField()
    imported_at = serializers.DateTimeField()
```

**Step 4: Create views**

Create `backend/apps/instagram/views.py`:

```python
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.events.models import Business
from apps.instagram.models import InstagramPostLog
from apps.instagram.services.import_service import InstagramImportService
from apps.instagram.serializers import ImportResultSerializer, ImportHistorySerializer


class InstagramImportView(APIView):
    """Trigger Instagram import for the authenticated user's business"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Get user's business
        business = Business.objects.filter(owner=request.user).first()
        if not business:
            return Response(
                {'error': 'No business found for this user'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check subscription
        if not business.can_use_premium_customization():
            return Response(
                {'error': 'Premium subscription required for Instagram import'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check Instagram handle
        if not business.instagram_handle:
            return Response(
                {'error': 'No Instagram handle configured. Please add your Instagram handle in settings.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Run import
        service = InstagramImportService()
        result = service.import_posts(business)

        if result.error:
            return Response(
                {'error': result.error},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ImportResultSerializer(result)
        return Response(serializer.data)


class InstagramImportHistoryView(APIView):
    """View import history for the authenticated user's business"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        business = Business.objects.filter(owner=request.user).first()
        if not business:
            return Response(
                {'error': 'No business found for this user'},
                status=status.HTTP_404_NOT_FOUND
            )

        logs = InstagramPostLog.objects.filter(business=business).select_related('event')[:50]
        serializer = ImportHistorySerializer(logs, many=True)
        return Response(serializer.data)
```

**Step 5: Create URLs**

Create `backend/apps/instagram/urls.py`:

```python
from django.urls import path
from . import views

app_name = 'instagram'

urlpatterns = [
    path('import/', views.InstagramImportView.as_view(), name='import'),
    path('import/history/', views.InstagramImportHistoryView.as_view(), name='import-history'),
]
```

**Step 6: Add to main urls**

In `backend/config/urls.py`, add:

```python
path('api/instagram/', include('apps.instagram.urls')),
```

**Step 7: Run test to verify it passes**

Run: `cd backend && python manage.py test apps.instagram.tests.test_views -v 2`
Expected: PASS (3 tests)

**Step 8: Commit**

```bash
git add backend/apps/instagram/views.py backend/apps/instagram/serializers.py backend/apps/instagram/urls.py backend/config/urls.py
git commit -m "feat(instagram): Add API endpoints for Instagram import"
```

---

## Task 7: Update Frontend Types

**Files:**
- Modify: `frontend/src/types/index.ts`

**Step 1: Add Instagram types**

Add to `frontend/src/types/index.ts`:

```typescript
// Instagram Import types
export interface InstagramImportResult {
  imported: number
  skipped_duplicate: number
  skipped_not_event: number
  skipped_error: number
  draft_ids: number[]
  error?: string
}

export interface InstagramImportHistory {
  instagram_post_id: string
  event_id: number | null
  event_title: string | null
  original_permalink: string
  imported_at: string
}
```

**Step 2: Update Business interface**

Add `instagram_handle` to Business interface:

```typescript
export interface Business {
  // ... existing fields ...
  instagram_handle?: string | null
  // ... rest of fields ...
}
```

**Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(instagram): Add frontend TypeScript types for Instagram import"
```

---

## Task 8: Add Frontend API Methods

**Files:**
- Modify: `frontend/src/services/api.ts`

**Step 1: Add Instagram API methods**

Add to `frontend/src/services/api.ts`:

```typescript
import type { InstagramImportResult, InstagramImportHistory } from '../types'

// Instagram API
export const instagramApi = {
  import: async (): Promise<InstagramImportResult> => {
    const response = await apiClient.post<InstagramImportResult>('/instagram/import/')
    return response.data
  },

  getImportHistory: async (): Promise<InstagramImportHistory[]> => {
    const response = await apiClient.get<InstagramImportHistory[]>('/instagram/import/history/')
    return response.data
  },
}
```

**Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat(instagram): Add frontend API methods for Instagram import"
```

---

## Task 9: Create Instagram Settings Component

**Files:**
- Create: `frontend/src/components/InstagramSettings.tsx`

**Step 1: Create component**

Create `frontend/src/components/InstagramSettings.tsx`:

```tsx
import { useState } from 'react'
import { Instagram, Save, AlertCircle, CheckCircle } from 'lucide-react'
import type { Business } from '../types'

interface InstagramSettingsProps {
  business: Business
  onUpdate: (handle: string) => Promise<void>
  isPremium: boolean
}

export function InstagramSettings({ business, onUpdate, isPremium }: InstagramSettingsProps) {
  const [handle, setHandle] = useState(business.instagram_handle || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Remove @ if user included it
      const cleanHandle = handle.replace(/^@/, '')
      await onUpdate(cleanHandle)
      setMessage({ type: 'success', text: 'Instagram handle saved!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Instagram className="w-5 h-5 text-pink-500" />
        <h3 className="font-semibold">Instagram Integration</h3>
        {isPremium && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Premium</span>
        )}
      </div>

      {!isPremium ? (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-gray-600 mb-2">
            Import events directly from your Instagram posts with a Premium subscription.
          </p>
          <a href="/billing" className="text-blue-600 hover:underline text-sm">
            Upgrade to Premium →
          </a>
        </div>
      ) : (
        <>
          <p className="text-gray-600 text-sm mb-4">
            Add your Instagram handle to import events from posts tagged #popmap
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="yourbusiness"
                className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={30}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || handle === (business.instagram_handle || '')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {message && (
            <div
              className={`mt-3 flex items-center gap-2 text-sm ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message.text}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/InstagramSettings.tsx
git commit -m "feat(instagram): Add InstagramSettings component"
```

---

## Task 10: Create Instagram Import Button Component

**Files:**
- Create: `frontend/src/components/InstagramImportButton.tsx`

**Step 1: Create component**

Create `frontend/src/components/InstagramImportButton.tsx`:

```tsx
import { useState } from 'react'
import { Instagram, Download, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { instagramApi } from '../services/api'
import type { InstagramImportResult } from '../types'

interface InstagramImportButtonProps {
  hasHandle: boolean
  isPremium: boolean
  onImportComplete?: (result: InstagramImportResult) => void
}

export function InstagramImportButton({
  hasHandle,
  isPremium,
  onImportComplete,
}: InstagramImportButtonProps) {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<InstagramImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImport = async () => {
    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const importResult = await instagramApi.import()
      setResult(importResult)
      onImportComplete?.(importResult)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed. Please try again.'
      setError(errorMessage)
    } finally {
      setImporting(false)
    }
  }

  const isDisabled = !hasHandle || !isPremium || importing

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Instagram className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold">Import from Instagram</h3>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4">
        Import events from your Instagram posts tagged with #popmap. Posts will be created as drafts
        for your review.
      </p>

      <button
        onClick={handleImport}
        disabled={isDisabled}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
      >
        {importing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Import Posts
          </>
        )}
      </button>

      {!hasHandle && isPremium && (
        <p className="mt-2 text-sm text-amber-600">
          Please add your Instagram handle in settings first.
        </p>
      )}

      {!isPremium && (
        <p className="mt-2 text-sm text-gray-500">
          <a href="/billing" className="text-blue-600 hover:underline">
            Upgrade to Premium
          </a>{' '}
          to use Instagram import.
        </p>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="font-medium">Import Complete</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ {result.imported} event(s) imported as drafts</li>
            {result.skipped_duplicate > 0 && (
              <li>⊘ {result.skipped_duplicate} skipped (already imported)</li>
            )}
            {result.skipped_not_event > 0 && (
              <li>⊘ {result.skipped_not_event} skipped (not an event)</li>
            )}
          </ul>
          {result.draft_ids.length > 0 && (
            <a
              href="/dashboard/events?status=pending"
              className="inline-block mt-3 text-blue-600 hover:underline text-sm"
            >
              View Drafts →
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/InstagramImportButton.tsx
git commit -m "feat(instagram): Add InstagramImportButton component with result display"
```

---

## Task 11: Integrate Components into Business Dashboard

**Files:**
- Modify: `frontend/src/components/BusinessDashboard.tsx` (or BusinessOwnerHub.tsx)

**Step 1: Add imports and state**

Add to the dashboard component:

```tsx
import { InstagramSettings } from './InstagramSettings'
import { InstagramImportButton } from './InstagramImportButton'
```

**Step 2: Add components to dashboard**

Add the Instagram section to the dashboard layout:

```tsx
{/* Instagram Section */}
<div className="space-y-4">
  <InstagramSettings
    business={business}
    onUpdate={async (handle) => {
      await businessApi.update(business.id, { instagram_handle: handle })
      // Refresh business data
    }}
    isPremium={business.can_use_premium_customization}
  />

  <InstagramImportButton
    hasHandle={!!business.instagram_handle}
    isPremium={business.can_use_premium_customization}
    onImportComplete={(result) => {
      // Optionally refresh events list
      console.log('Import complete:', result)
    }}
  />
</div>
```

**Step 3: Commit**

```bash
git add frontend/src/components/BusinessDashboard.tsx
git commit -m "feat(instagram): Integrate Instagram components into business dashboard"
```

---

## Task 12: Run Full Test Suite and Fix Issues

**Step 1: Run all backend tests**

Run: `cd backend && python manage.py test -v 2`

**Step 2: Fix any failing tests**

Address any test failures discovered.

**Step 3: Run frontend type check**

Run: `cd frontend && npm run type-check` (or `tsc --noEmit`)

**Step 4: Fix any type errors**

Address any TypeScript errors.

**Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix(instagram): Address test and type errors"
```

---

## Task 13: Final Integration Test

**Step 1: Start backend server**

Run: `cd backend && python manage.py runserver`

**Step 2: Start frontend server**

Run: `cd frontend && npm run dev`

**Step 3: Manual testing checklist**

- [ ] Free user sees upgrade prompt on Instagram settings
- [ ] Premium user can add Instagram handle
- [ ] Premium user can trigger import
- [ ] Import results display correctly
- [ ] Draft events appear in pending state
- [ ] Duplicate imports are skipped

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(instagram): Complete Instagram event import feature (Task #18)"
```

---

## Environment Variables Required

Add to `.env`:

```
RAPIDAPI_KEY=your_rapidapi_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Add instagram_handle to Business model | 5 min |
| 2 | Create Instagram app structure | 5 min |
| 3 | Create Instagram service abstraction | 10 min |
| 4 | Create LLM event extractor | 10 min |
| 5 | Create import service | 15 min |
| 6 | Create API views | 10 min |
| 7 | Update frontend types | 3 min |
| 8 | Add frontend API methods | 3 min |
| 9 | Create InstagramSettings component | 5 min |
| 10 | Create InstagramImportButton component | 5 min |
| 11 | Integrate into dashboard | 5 min |
| 12 | Run full test suite | 10 min |
| 13 | Final integration test | 10 min |

**Total: ~13 tasks, estimated 90 minutes**
