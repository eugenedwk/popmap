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
        """Fetch user's posts filtered by hashtag."""
        if not self.api_key:
            raise InstagramServiceError("RAPIDAPI_KEY not configured")

        try:
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

            hashtag_lower = hashtag.lower()
            posts = []

            for post in posts_data[:limit * 2]:
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
