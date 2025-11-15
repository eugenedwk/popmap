from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator


class Category(models.Model):
    """
    Represents a business category (e.g., matcha, coffee, baked goods).
    Can be predefined or custom-added by admins.
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class Business(models.Model):
    """
    Represents a small business that can submit popup events.
    Phase 1: Created by admin only
    Phase 2: Businesses can self-register
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
        )]
    )
    website = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True, verbose_name="Instagram URL")
    tiktok_url = models.URLField(blank=True, verbose_name="TikTok URL")
    available_for_hire = models.BooleanField(default=False, verbose_name="Available for Hire")
    logo = models.ImageField(upload_to='business_logos/', blank=True, null=True)

    # Categories (can select multiple)
    categories = models.ManyToManyField(
        Category,
        blank=True,
        related_name='businesses',
        help_text="Select one or more categories (e.g., matcha, coffee, baked goods)"
    )

    # For Phase 2: link to user account
    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='businesses'
    )

    # Custom subdomain (requires premium subscription)
    custom_subdomain = models.SlugField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        help_text="Custom subdomain for this business (e.g., 'mybusiness' for mybusiness.popmap.co)"
    )

    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Businesses"
        ordering = ['name']

    def __str__(self):
        return self.name

    def can_use_custom_subdomain(self):
        """
        Check if business owner has an active subscription that allows custom subdomains.
        Requires the billing app to be installed.
        """
        if not self.owner:
            return False

        try:
            from apps.billing.models import Subscription
            # Check for active subscription with custom subdomain feature
            subscription = Subscription.objects.filter(
                user=self.owner,
                status__in=['active', 'trialing'],
                plan__custom_subdomain_enabled=True
            ).first()
            return subscription is not None
        except ImportError:
            # If billing app is not installed, return False
            return False

    def get_subdomain_url(self):
        """Get the full subdomain URL for this business"""
        if self.custom_subdomain:
            return f"https://{self.custom_subdomain}.popmap.co"
        return None


class Event(models.Model):
    """
    Represents a popup event that will be displayed on the map.
    Can feature multiple businesses (e.g., a market with several vendors).
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    # Primary/host business (optional)
    host_business = models.ForeignKey(
        Business,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hosted_events',
        help_text="Primary business hosting this event (optional)"
    )

    businesses = models.ManyToManyField(
        Business,
        blank=True,
        related_name='events',
        help_text="Select one or more businesses participating in this event"
    )

    # Event details
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Location
    location_name = models.CharField(max_length=255, blank=True, help_text="Name of the venue/location (optional)")
    address = models.CharField(max_length=500)
    latitude = models.DecimalField(max_digits=20, decimal_places=16)
    longitude = models.DecimalField(max_digits=20, decimal_places=16)

    # Timing
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()

    # Media
    image = models.ImageField(upload_to='event_images/', blank=True, null=True)

    # Call to Action
    cta_button_text = models.CharField(
        max_length=50,
        blank=True,
        help_text="Text for the call-to-action button (e.g., 'Buy Tickets', 'Register Now')"
    )
    cta_button_url = models.URLField(
        blank=True,
        help_text="URL for the call-to-action button"
    )

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
        business_count = self.businesses.count()
        if business_count == 0:
            return self.title
        elif business_count == 1:
            return f"{self.title} - {self.businesses.first().name}"
        else:
            return f"{self.title} - {business_count} businesses"

    @property
    def is_active(self):
        """Check if event is currently happening or upcoming"""
        from django.utils import timezone
        return self.end_datetime >= timezone.now() and self.status == 'approved'


class EventRSVP(models.Model):
    """
    Represents a user's RSVP to an event.
    Users can mark themselves as 'interested' or 'going'.
    """
    RSVP_STATUS_CHOICES = [
        ('interested', 'Interested'),
        ('going', 'Going'),
    ]

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='rsvps',
        help_text="The event the user is RSVPing to"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='event_rsvps',
        help_text="The user making the RSVP"
    )
    status = models.CharField(
        max_length=20,
        choices=RSVP_STATUS_CHOICES,
        help_text="The type of RSVP (interested or going)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['event', 'user']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'status']),
            models.Index(fields=['user', 'created_at']),
        ]
        verbose_name = "Event RSVP"
        verbose_name_plural = "Event RSVPs"

    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.get_status_display()})"
