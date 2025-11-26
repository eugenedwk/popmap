from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=User)
def merge_guest_rsvps_on_user_creation(sender, instance, created, **kwargs):
    """
    When a new user is created, merge any guest RSVPs that were made with
    the same email address into the new user's account.

    This ensures continuity for users who RSVP'd as guests and later
    decided to create an account.
    """
    if not created:
        return  # Only run for new user creation

    if not instance.email:
        return  # Can't merge without email

    from .models import EventRSVP

    # Find all guest RSVPs with the same email
    guest_rsvps = EventRSVP.objects.filter(
        guest_email=instance.email,
        user__isnull=True
    )

    merged_count = 0
    for guest_rsvp in guest_rsvps:
        # Check if user already has an RSVP for this event
        existing_user_rsvp = EventRSVP.objects.filter(
            event=guest_rsvp.event,
            user=instance
        ).first()

        if existing_user_rsvp:
            # User already has an RSVP for this event, delete the guest one
            # (keep the user's explicit choice)
            guest_rsvp.delete()
            logger.info(
                f"Deleted duplicate guest RSVP for event {guest_rsvp.event_id} "
                f"(user {instance.email} already had RSVP)"
            )
        else:
            # Convert guest RSVP to user RSVP
            guest_rsvp.user = instance
            guest_rsvp.guest_email = None
            guest_rsvp.guest_name = ''
            # Keep GDPR consent info for audit trail
            guest_rsvp.save()
            merged_count += 1
            logger.info(
                f"Merged guest RSVP for event {guest_rsvp.event_id} "
                f"to user {instance.email}"
            )

    if merged_count > 0:
        logger.info(f"Merged {merged_count} guest RSVP(s) for new user {instance.email}")
