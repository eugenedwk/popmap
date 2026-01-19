# Instagram Event Import Design

**Date**: 2026-01-18
**Status**: Ready for implementation
**Task**: #18 from CLAUDE.md

## Overview

Premium businesses can import Instagram posts tagged #popmap as draft events. An LLM extracts event details from the caption, and the business reviews/edits before publishing.

## User Flow

1. **Setup (one-time)**: Business adds their Instagram handle in PopMap settings (e.g., `@theirbakery`)

2. **Import trigger**: Business clicks "Import from Instagram" in their dashboard

3. **Fetch & filter**: System fetches their recent #popmap posts, LLM evaluates each for event content. Posts without event info are skipped.

4. **Extraction**: For valid event posts, LLM extracts title, date/time, location, description. Category is suggested based on business type.

5. **Draft creation**: Draft events are created with Instagram image as default photo. Duplicates (by post ID) are skipped.

6. **Result notification**: "3 events imported, 1 skipped (already imported), 2 skipped (not an event)"

7. **Review & publish**: Business reviews drafts, fills missing fields, swaps image if desired, then publishes

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Instagram linking | Manual handle entry in settings | Simple setup, no OAuth needed per-business |
| Trigger mechanism | Manual "Import" button | Start simple, architecture supports future webhooks |
| Event extraction | LLM with confidence threshold | Flexible parsing, handles varied caption formats |
| Image handling | Instagram image as preview, business can upload different one | Reliability + flexibility |
| Non-event filtering | Skip posts below confidence threshold | Reduces noise in draft queue |
| Duplicate handling | Block by post ID, notify user | Clear feedback, prevents clutter |
| Access | Premium only | Compelling upgrade incentive |
| Fields extracted | Title, date/time, location, description + category suggestion | Core fields from caption, smart defaults from business context |
| API approach | Abstraction layer (`InstagramService` interface) | Easy swap from scraper to Graph API |
| Initial implementation | Free-tier scraper (RapidAPI) | Validate feature before committing spend |

## Technical Architecture

### New Directory Structure

```
backend/apps/instagram/
├── services/
│   ├── base.py              # InstagramService abstract interface
│   ├── scraper.py           # ScraperInstagramService (RapidAPI free tier)
│   └── graph_api.py         # GraphAPIInstagramService (future)
├── extraction/
│   └── event_extractor.py   # LLM-based event extraction logic
├── models.py                # InstagramImport, InstagramPostLog
├── views.py                 # Import trigger endpoint
├── serializers.py
└── urls.py
```

### Models

**InstagramPostLog** - Tracks imported post IDs for deduplication:
- `business` (FK to Business)
- `instagram_post_id` (CharField, unique per business)
- `imported_at` (DateTimeField)
- `event` (FK to Event, nullable - the created draft)
- `original_permalink` (URLField)

**Business model addition**:
- `instagram_handle` (CharField, nullable, max_length=30)

### Service Interface

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

@dataclass
class InstagramPost:
    post_id: str
    caption: str
    image_url: str
    posted_at: datetime
    permalink: str

class InstagramService(ABC):
    @abstractmethod
    def fetch_user_posts_by_hashtag(
        self,
        username: str,
        hashtag: str,
        limit: int = 20
    ) -> list[InstagramPost]:
        """Fetch posts from a user that contain the specified hashtag."""
        pass
```

### LLM Extraction

**Prompt Structure**:

```
You are extracting event information from an Instagram post.

Business context:
- Name: {business.name}
- Default category: {business.primary_category}
- Location: {business.address}

Instagram caption:
"{caption}"

Extract event details if this is an event announcement. Return JSON:
{
  "is_event": true/false,
  "confidence": 0.0-1.0,
  "title": "...",
  "description": "...",
  "start_date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_date": null or "YYYY-MM-DD",
  "end_time": null or "HH:MM",
  "location": "..." or null (use business address if not specified),
  "suggested_category": "..."
}
```

**Confidence Threshold**: 0.6 - Posts below this are skipped as "not an event"

**Missing Fields**: Drafts created with null fields are flagged as "needs attention" in the review UI.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/instagram/import/` | Trigger import for authenticated business |
| `GET` | `/api/instagram/import/history/` | List previous imports with results |

**Import Endpoint Response**:

```json
{
  "imported": 3,
  "skipped_duplicate": 1,
  "skipped_not_event": 2,
  "skipped_error": 0,
  "draft_ids": [45, 46, 47]
}
```

**Authorization**: Requires authenticated business user with active premium subscription. Returns 403 with upgrade prompt if not premium.

## Frontend UI

### Business Settings Addition

- New field: "Instagram Handle" text input with `@` prefix
- Validation: alphanumeric, underscores, periods only
- Save updates `Business.instagram_handle`

### Dashboard - Import Section (Premium Only)

- "Import from Instagram" button (disabled if no handle set)
- Shows last import timestamp if applicable
- Free users see the button but get upgrade modal on click

### Import Results Modal

```
✓ 3 events imported as drafts
⊘ 1 skipped (already imported)
⊘ 2 skipped (not an event)

[View Drafts]  [Close]
```

### Draft Review Page Enhancements

- Instagram-imported drafts show source badge: "Imported from Instagram"
- Optional link to original post
- Image section: Instagram image as default, "Change Image" button to upload different one
- Missing fields highlighted with yellow "Required" indicator
- Standard publish flow once all required fields are filled

## Error Handling

### Instagram Service Errors

| Error | User Message |
|-------|--------------|
| Rate limited | "Instagram is temporarily unavailable. Try again in a few minutes." |
| Invalid handle | "No Instagram account found for @{handle}. Please check your settings." |
| Service down | "Unable to connect to Instagram. Please try again later." |

### LLM Extraction Errors

| Error | Behavior |
|-------|----------|
| LLM timeout/failure | Skip that post, continue with others. Include in results: "1 post couldn't be processed" |
| Malformed response | Treat as low confidence, skip the post |

### Edge Cases

| Case | Behavior |
|------|----------|
| No #popmap posts found | "No posts with #popmap found. Make sure to include the hashtag in your Instagram captions." |
| All posts already imported | "All your #popmap posts have already been imported." |
| Handle changed | Previous logs remain tied to business. New handle starts fresh. |
| Instagram image unavailable | Draft created without image, flagged as "needs image" |

## Environment Variables

```
INSTAGRAM_SERVICE_TYPE=scraper  # or 'graph_api'
RAPIDAPI_KEY=xxx                # For scraper implementation
INSTAGRAM_GRAPH_API_TOKEN=xxx   # For future Graph API implementation
LLM_API_KEY=xxx                 # For event extraction
```

## Future Enhancements

1. **Webhook automation**: When Meta Graph API access is approved, add `InstagramWebhookView` to receive real-time post notifications

2. **Batch scheduling**: Allow businesses to schedule automatic imports (e.g., daily at 6am)

3. **Multi-hashtag support**: Import from business-specific hashtags beyond #popmap

## Dependencies

- Premium subscription system (Task #9) - completed
- Event draft system - exists
- Business settings page - exists
