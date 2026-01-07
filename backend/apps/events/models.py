from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
import uuid


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

    # Active form template to display on profile
    active_form_template = models.ForeignKey(
        'forms.FormTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_for_businesses',
        help_text="The form template to display on the business profile page"
    )

    # Premium customization options (requires active subscription)
    # Background options
    background_image = models.ImageField(
        upload_to='business_backgrounds/',
        blank=True,
        null=True,
        help_text="Upload a custom background image (premium feature)"
    )
    background_image_url = models.URLField(
        blank=True,
        help_text="URL for custom background image - alternative to upload (premium feature)"
    )
    background_color = models.CharField(
        max_length=7,
        blank=True,
        help_text="Custom background color in hex format, e.g., #1a1a2e (premium feature)"
    )
    background_overlay_opacity = models.IntegerField(
        default=0,
        help_text="Overlay opacity (0-100) for better text readability over background images (premium feature)"
    )

    # Branding colors
    custom_primary_color = models.CharField(
        max_length=7,
        blank=True,
        help_text="Custom primary color in hex format, e.g., #FF5733 (premium feature)"
    )
    secondary_color = models.CharField(
        max_length=7,
        blank=True,
        help_text="Custom secondary/accent color for buttons and links, e.g., #3498db (premium feature)"
    )

    # Header banner
    header_banner = models.ImageField(
        upload_to='business_banners/',
        blank=True,
        null=True,
        help_text="Banner image displayed at top of business page (premium feature)"
    )

    # Layout options
    default_view_mode = models.CharField(
        max_length=20,
        choices=[
            ('map', 'Map View'),
            ('list', 'List View'),
            ('card', 'Card View')
        ],
        default='card',
        help_text="Default view mode for business page (premium feature)"
    )
    hide_contact_info = models.BooleanField(
        default=False,
        help_text="Hide email and phone from public page (premium feature)"
    )
    hide_social_links = models.BooleanField(
        default=False,
        help_text="Hide Instagram and TikTok links from public page (premium feature)"
    )

    # Content display options
    show_upcoming_events_first = models.BooleanField(
        default=True,
        help_text="Show upcoming events before past events (premium feature)"
    )
    hide_past_events = models.BooleanField(
        default=False,
        help_text="Only show upcoming events, hide past events (premium feature)"
    )
    events_per_page = models.IntegerField(
        default=12,
        choices=[
            (6, '6 events'),
            (12, '12 events'),
            (24, '24 events')
        ],
        help_text="Number of events to display per page (premium feature)"
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

    def can_use_premium_customization(self):
        """
        Check if business owner has an active subscription that allows premium customization.
        """
        if not self.owner:
            return False

        try:
            from apps.billing.models import Subscription
            # Check for active subscription
            subscription = Subscription.objects.filter(
                user=self.owner,
                status__in=['active', 'trialing']
            ).first()
            return subscription is not None
        except ImportError:
            # If billing app is not installed, return False
            return False

    def can_use_form_builder(self):
        """
        Check if business owner has an active subscription that allows form builder.
        Same as premium customization for now - any active subscription grants access.
        """
        return self.can_use_premium_customization()


class Venue(models.Model):
    """
    Represents a saved venue/location that can be reused across events.
    Linked to a business so each business can save their common venues.
    """
    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name='venues',
        help_text="The business that owns this venue"
    )
    name = models.CharField(max_length=255, help_text="Name of the venue (e.g., 'Central Park', 'The Coffee Shop')")
    address = models.CharField(max_length=500, help_text="Full address of the venue")
    latitude = models.DecimalField(max_digits=20, decimal_places=16)
    longitude = models.DecimalField(max_digits=20, decimal_places=16)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['business', 'name']),
        ]

    def __str__(self):
        return f"{self.name} ({self.business.name})"


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
    venue = models.ForeignKey(
        Venue,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
        help_text="Select a saved venue to auto-populate location fields"
    )
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

    # Form Template (optional)
    form_template = models.ForeignKey(
        'forms.FormTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
        help_text="Optional form for this event"
    )

    # RSVP Settings
    require_login_for_rsvp = models.BooleanField(
        default=True,
        help_text="If checked, only registered users can RSVP. If unchecked, anyone can RSVP with an email."
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
    Supports both registered users and guest RSVPs (with email only).
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
    # Registered user (nullable for guest RSVPs)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='event_rsvps',
        help_text="The registered user making the RSVP (null for guest RSVPs)"
    )
    # Guest RSVP fields
    guest_email = models.EmailField(
        blank=True,
        null=True,
        help_text="Email for guest RSVPs (when user is not logged in)"
    )
    guest_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional name for guest RSVPs"
    )
    # GDPR consent fields
    # TODO: GDPR Compliance - Implement full consent management:
    # - Link to privacy policy in consent text
    # - Implement data export endpoint for guest RSVPs
    # - Implement deletion endpoint for guests (via email verification)
    # - Add consent withdrawal mechanism
    gdpr_consent = models.BooleanField(
        default=False,
        help_text="Whether the guest has consented to data processing"
    )
    gdpr_consent_timestamp = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when GDPR consent was given"
    )
    status = models.CharField(
        max_length=20,
        choices=RSVP_STATUS_CHOICES,
        help_text="The type of RSVP (interested or going)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event', 'status']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['guest_email']),
        ]
        verbose_name = "Event RSVP"
        verbose_name_plural = "Event RSVPs"
        # Custom constraints to prevent duplicate RSVPs
        constraints = [
            # Unique constraint for registered users
            models.UniqueConstraint(
                fields=['event', 'user'],
                condition=models.Q(user__isnull=False),
                name='unique_event_user_rsvp'
            ),
            # Unique constraint for guest RSVPs by email
            models.UniqueConstraint(
                fields=['event', 'guest_email'],
                condition=models.Q(guest_email__isnull=False),
                name='unique_event_guest_email_rsvp'
            ),
        ]

    def clean(self):
        """Validate that either user or guest_email is provided, but not both."""
        from django.core.exceptions import ValidationError

        if self.user and self.guest_email:
            raise ValidationError("Cannot have both user and guest_email. Use one or the other.")
        if not self.user and not self.guest_email:
            raise ValidationError("Either user or guest_email must be provided.")
        if self.guest_email and not self.gdpr_consent:
            raise ValidationError("GDPR consent is required for guest RSVPs.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        if self.user:
            return f"{self.user.username} - {self.event.title} ({self.get_status_display()})"
        return f"{self.guest_email} (guest) - {self.event.title} ({self.get_status_display()})"

    @property
    def is_guest_rsvp(self):
        """Check if this is a guest RSVP (no user account)."""
        return self.user is None

    @property
    def display_email(self):
        """Get the email for this RSVP (user email or guest email)."""
        if self.user:
            return self.user.email
        return self.guest_email


class GuestEmailPreference(models.Model):
    """
    Track email preferences for guest RSVPs (users without accounts).
    Allows guests to opt-out of reminder emails via unsubscribe link.
    """
    email = models.EmailField(unique=True, db_index=True)
    unsubscribe_token = models.UUIDField(default=uuid.uuid4, unique=True)
    event_reminders_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Guest Email Preference"
        verbose_name_plural = "Guest Email Preferences"

    def __str__(self):
        status = "enabled" if self.event_reminders_enabled else "disabled"
        return f"{self.email} (reminders {status})"


class EventReminderLog(models.Model):
    """
    Track sent event reminders to prevent duplicate emails.
    One record per RSVP per reminder type.
    """
    REMINDER_TYPE_CHOICES = [
        ('24h', '24 Hours Before'),
        ('1h', '1 Hour Before'),
    ]

    rsvp = models.ForeignKey(
        EventRSVP,
        on_delete=models.CASCADE,
        related_name='reminder_logs'
    )
    reminder_type = models.CharField(
        max_length=10,
        choices=REMINDER_TYPE_CHOICES,
        default='24h'
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    email_sent_to = models.EmailField()
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    class Meta:
        verbose_name = "Event Reminder Log"
        verbose_name_plural = "Event Reminder Logs"
        unique_together = ['rsvp', 'reminder_type']
        indexes = [
            models.Index(fields=['rsvp', 'reminder_type']),
            models.Index(fields=['sent_at']),
        ]

    def __str__(self):
        return f"Reminder ({self.reminder_type}) for {self.rsvp} - {'sent' if self.success else 'failed'}"
