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
