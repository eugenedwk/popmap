from django.db import models
from django.contrib.auth.models import User


class UserRole(models.TextChoices):
    """User role choices for PopMap users."""
    BUSINESS_OWNER = 'business_owner', 'Business Owner'
    ATTENDEE = 'attendee', 'Attendee'


class UserProfile(models.Model):
    """
    Extended user profile for PopMap users.
    Links Django User to AWS Cognito and stores additional user information.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    cognito_sub = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Cognito user's sub (subject) identifier"
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.ATTENDEE,
        help_text="User role: business owner or attendee"
    )
    # Social provider information
    identity_provider = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Identity provider used (Cognito, Facebook, Google)"
    )
    # Profile completion tracking
    is_profile_complete = models.BooleanField(
        default=False,
        help_text="Whether user has completed their profile"
    )
    # Notification preferences
    email_notifications_enabled = models.BooleanField(
        default=True,
        help_text="Whether user wants to receive email notifications"
    )
    event_reminder_enabled = models.BooleanField(
        default=True,
        help_text="Whether user wants event reminders"
    )
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        indexes = [
            models.Index(fields=['cognito_sub']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

    @property
    def is_business_owner(self):
        """Check if user is a business owner."""
        return self.role == UserRole.BUSINESS_OWNER

    @property
    def is_attendee(self):
        """Check if user is an attendee."""
        return self.role == UserRole.ATTENDEE


# Backwards compatibility - alias for CognitoUser
CognitoUser = UserProfile
