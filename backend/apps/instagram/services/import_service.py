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
        """Import Instagram posts as draft events for a business."""
        result = ImportResult()

        # Check premium subscription
        if not business.can_use_premium_customization():
            result.error = "Premium subscription required for Instagram import"
            return result

        # Check Instagram handle
        if not business.instagram_handle:
            result.error = "No Instagram handle configured"
            return result

        # Fetch posts from Instagram
        try:
            posts = self.instagram_service.fetch_user_posts_by_hashtag(
                username=business.instagram_handle,
                hashtag='popmap',
                limit=limit
            )
        except InstagramServiceError as e:
            result.error = str(e)
            return result

        # Get existing imported post IDs for deduplication
        existing_ids = set(
            InstagramPostLog.objects.filter(business=business)
            .values_list('instagram_post_id', flat=True)
        )

        for post in posts:
            # Skip duplicates
            if post.post_id in existing_ids:
                result.skipped_duplicate += 1
                continue

            # Extract event info using LLM
            extracted = self.extractor.extract(post.caption, business)

            # Skip non-events or low confidence
            if not extracted.is_event or extracted.confidence < self.extractor.confidence_threshold:
                result.skipped_not_event += 1
                continue

            try:
                # Create draft event
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
        # Handle dates and times
        start_date = extracted.start_date or timezone.now().date()
        start_time = extracted.start_time or datetime.strptime("12:00", "%H:%M").time()
        start_datetime = timezone.make_aware(
            datetime.combine(start_date, start_time)
        )

        # Calculate end datetime
        if extracted.end_time:
            end_time = extracted.end_time
            end_date = extracted.end_date or start_date
            end_datetime = timezone.make_aware(
                datetime.combine(end_date, end_time)
            )
        else:
            # Default: 2 hours after start
            end_datetime = start_datetime + timedelta(hours=2)

        # Use extracted location or fall back to business venue
        location = extracted.location
        if not location and hasattr(business, 'venues') and business.venues.exists():
            venue = business.venues.first()
            location = venue.address

        # Create the event as pending (draft)
        event = Event.objects.create(
            host_business=business,
            title=extracted.title or f"Event by {business.name}",
            description=extracted.description or post.caption[:500],
            address=location or "Location TBD",
            latitude=0,
            longitude=0,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            status='pending',
            created_by=business.owner
        )

        # Add business to the event's businesses
        event.businesses.add(business)

        # Attach image if available
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
            filename = f"instagram_{event.id}.jpg"
            event.image.save(filename, ContentFile(response.content), save=True)
