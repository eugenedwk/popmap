from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator


class Business(models.Model):
    """
    Represents a small business that can submit popup events.
    Phase 1: Created by admin only
    Phase 2: Businesses can self-register
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    contact_email = models.EmailField()
    contact_phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
        )]
    )
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='business_logos/', blank=True, null=True)

    # For Phase 2: link to user account
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='businesses'
    )

    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Businesses"
        ordering = ['name']

    def __str__(self):
        return self.name


class Event(models.Model):
    """
    Represents a popup event that will be displayed on the map.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='events'
    )

    # Event details
    title = models.CharField(max_length=255)
    description = models.TextField()

    # Location
    address = models.CharField(max_length=500)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)

    # Timing
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()

    # Media
    image = models.ImageField(upload_to='event_images/', blank=True, null=True)

    # Status and moderation
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='approved'  # Phase 1: auto-approve admin-created events
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_events'
    )

    class Meta:
        ordering = ['-start_datetime']
        indexes = [
            models.Index(fields=['status', 'start_datetime']),
            models.Index(fields=['latitude', 'longitude']),
        ]

    def __str__(self):
        return f"{self.title} - {self.business.name}"

    @property
    def is_active(self):
        """Check if event is currently happening or upcoming"""
        from django.utils import timezone
        return self.end_datetime >= timezone.now() and self.status == 'approved'
