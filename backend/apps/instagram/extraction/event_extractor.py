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
        """Extract event details from Instagram caption."""
        if not self.api_key:
            return ExtractedEvent(is_event=False, confidence=0.0)

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
