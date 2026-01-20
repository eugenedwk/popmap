from django.db import models
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
