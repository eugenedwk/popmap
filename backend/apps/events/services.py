from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.db import IntegrityError
from datetime import timedelta
import logging

from .models import Event, EventRSVP, EventReminderLog, GuestEmailPreference

logger = logging.getLogger(__name__)


class EventReminderService:
    """
    Service for sending event reminder emails to attendees who RSVP'd as "going".
    """

    REMINDER_WINDOWS = {
        '24h': {
            'hours_before': 24,
            'window_minutes': 60,  # Send reminders for events starting in 23-24 hours
        },
    }

    @classmethod
    def get_events_needing_reminders(cls, reminder_type='24h'):
        """
        Get events that need reminders sent for the specified reminder type.

        Args:
            reminder_type: '24h' for 24-hour reminders

        Returns:
            QuerySet of Event objects needing reminders
        """
        config = cls.REMINDER_WINDOWS.get(reminder_type)
        if not config:
            raise ValueError(f"Unknown reminder type: {reminder_type}")

        now = timezone.now()
        hours_before = config['hours_before']
        window_minutes = config['window_minutes']

        # Calculate the time window
        # Events starting between (now + hours_before - window) and (now + hours_before)
        window_start = now + timedelta(hours=hours_before) - timedelta(minutes=window_minutes)
        window_end = now + timedelta(hours=hours_before)

        events = Event.objects.filter(
            status='approved',
            start_datetime__gte=window_start,
            start_datetime__lt=window_end
        )

        return events

    @classmethod
    def get_rsvps_for_reminders(cls, event, reminder_type='24h'):
        """
        Get RSVPs that should receive reminders for an event.

        Filters out:
        - RSVPs that are not 'going'
        - RSVPs that already received this reminder type
        - Users who have disabled event reminders
        - Guests who have unsubscribed

        Returns:
            List of tuples: (rsvp, email, unsubscribe_token)
        """
        # Get all 'going' RSVPs for this event
        rsvps = EventRSVP.objects.filter(
            event=event,
            status='going'
        ).select_related('user', 'user__profile')

        # Filter out RSVPs that already received this reminder
        already_sent_rsvp_ids = EventReminderLog.objects.filter(
            rsvp__event=event,
            reminder_type=reminder_type,
            success=True
        ).values_list('rsvp_id', flat=True)

        eligible_rsvps = []

        for rsvp in rsvps:
            if rsvp.id in already_sent_rsvp_ids:
                continue

            email = rsvp.display_email
            if not email:
                continue

            unsubscribe_token = None

            if rsvp.user:
                # Registered user - check their profile preferences
                try:
                    profile = rsvp.user.profile
                    if not profile.email_notifications_enabled or not profile.event_reminder_enabled:
                        continue
                except Exception:
                    # No profile - skip this user
                    continue
            else:
                # Guest RSVP - check guest email preferences
                pref, created = GuestEmailPreference.objects.get_or_create(
                    email=email,
                    defaults={'event_reminders_enabled': True}
                )
                if not pref.event_reminders_enabled:
                    continue
                unsubscribe_token = str(pref.unsubscribe_token)

            eligible_rsvps.append((rsvp, email, unsubscribe_token))

        return eligible_rsvps

    @classmethod
    def send_reminder(cls, rsvp, email, unsubscribe_token=None, reminder_type='24h'):
        """
        Send a reminder email for a single RSVP.

        Args:
            rsvp: EventRSVP instance
            email: Email address to send to
            unsubscribe_token: UUID token for guest unsubscribe (None for registered users)
            reminder_type: Type of reminder ('24h')

        Returns:
            bool: True if sent successfully, False otherwise
        """
        event = rsvp.event

        # Build unsubscribe URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://popmap.co')
        if unsubscribe_token:
            # Guest unsubscribe
            unsubscribe_url = f"{frontend_url}/unsubscribe?token={unsubscribe_token}&type=guest"
        elif rsvp.user:
            # Registered user - link to settings
            unsubscribe_url = f"{frontend_url}/settings/notifications"
        else:
            unsubscribe_url = None

        # Build event URL
        event_url = f"{frontend_url}/events/{event.id}"

        # Format event time
        local_tz = timezone.get_current_timezone()
        local_start = event.start_datetime.astimezone(local_tz)
        local_end = event.end_datetime.astimezone(local_tz)

        context = {
            'event': event,
            'event_title': event.title,
            'event_description': event.description,
            'event_location': event.address,
            'location_name': event.location_name,
            'event_date': local_start.strftime('%A, %B %d, %Y'),
            'event_time': f"{local_start.strftime('%I:%M %p')} - {local_end.strftime('%I:%M %p')}",
            'event_url': event_url,
            'unsubscribe_url': unsubscribe_url,
            'recipient_name': rsvp.user.first_name if rsvp.user and rsvp.user.first_name else rsvp.guest_name or 'there',
            'is_guest': rsvp.is_guest_rsvp,
        }

        # Get businesses for the event
        businesses = event.businesses.all()
        if businesses:
            context['businesses'] = [b.name for b in businesses]

        subject = f"Reminder: {event.title} is tomorrow!"

        try:
            html_message = render_to_string(
                'events/emails/event_reminder.html',
                context
            )
            plain_message = render_to_string(
                'events/emails/event_reminder.txt',
                context
            )
        except Exception as e:
            logger.warning(f"Template not found, using fallback: {e}")
            plain_message = cls._generate_plain_reminder(context)
            html_message = None

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False
            )

            # Log successful send
            cls._log_reminder(rsvp, email, reminder_type, success=True)
            logger.info(f"Sent {reminder_type} reminder for event {event.id} to {email}")
            return True

        except Exception as e:
            # Log failed send
            cls._log_reminder(rsvp, email, reminder_type, success=False, error=str(e))
            logger.error(f"Failed to send reminder for event {event.id} to {email}: {e}")
            return False

    @classmethod
    def _log_reminder(cls, rsvp, email, reminder_type, success=True, error=''):
        """Log a reminder send attempt."""
        try:
            EventReminderLog.objects.create(
                rsvp=rsvp,
                reminder_type=reminder_type,
                email_sent_to=email,
                success=success,
                error_message=error
            )
        except IntegrityError:
            # Already logged (duplicate) - update existing
            EventReminderLog.objects.filter(
                rsvp=rsvp,
                reminder_type=reminder_type
            ).update(
                success=success,
                error_message=error
            )

    @classmethod
    def _generate_plain_reminder(cls, context):
        """Generate plain text reminder email as fallback."""
        message = f"""Hi {context['recipient_name']},

This is a friendly reminder that you're going to:

{context['event_title']}

📅 Date: {context['event_date']}
🕐 Time: {context['event_time']}
📍 Location: {context['event_location']}
"""
        if context.get('location_name'):
            message += f"   ({context['location_name']})\n"

        if context.get('businesses'):
            message += f"\nFeaturing: {', '.join(context['businesses'])}\n"

        if context.get('event_description'):
            message += f"\n{context['event_description'][:200]}...\n"

        message += f"\nView event details: {context['event_url']}\n"

        message += "\n---\nSee you there!\nThe PopMap Team\n"

        if context.get('unsubscribe_url'):
            message += f"\nDon't want these reminders? Unsubscribe: {context['unsubscribe_url']}\n"

        return message

    @classmethod
    def send_reminders_for_upcoming_events(cls, reminder_type='24h'):
        """
        Send all pending reminders for upcoming events.

        This is the main entry point called by the management command.

        Returns:
            dict with stats: {'events': int, 'sent': int, 'failed': int, 'skipped': int}
        """
        stats = {
            'events': 0,
            'sent': 0,
            'failed': 0,
            'skipped': 0,
        }

        events = cls.get_events_needing_reminders(reminder_type)
        stats['events'] = events.count()

        for event in events:
            eligible_rsvps = cls.get_rsvps_for_reminders(event, reminder_type)

            for rsvp, email, unsubscribe_token in eligible_rsvps:
                success = cls.send_reminder(rsvp, email, unsubscribe_token, reminder_type)
                if success:
                    stats['sent'] += 1
                else:
                    stats['failed'] += 1

        logger.info(
            f"Reminder job complete: {stats['events']} events, "
            f"{stats['sent']} sent, {stats['failed']} failed"
        )

        return stats
