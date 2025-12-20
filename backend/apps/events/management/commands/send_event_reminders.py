"""
Management command to send event reminder emails.

This command should be run periodically (e.g., every hour via cron) to send
reminder emails to users who have RSVP'd "going" to events.

Usage:
    python manage.py send_event_reminders
    python manage.py send_event_reminders --dry-run
    python manage.py send_event_reminders --reminder-type 24h

Cron example (run every hour):
    0 * * * * cd /path/to/backend && /path/to/venv/bin/python manage.py send_event_reminders >> /var/log/popmap/reminders.log 2>&1
"""

from django.core.management.base import BaseCommand
from apps.events.services import EventReminderService


class Command(BaseCommand):
    help = 'Send event reminder emails to users who RSVP\'d "going"'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending emails',
        )
        parser.add_argument(
            '--reminder-type',
            type=str,
            default='24h',
            choices=['24h'],
            help='Type of reminder to send (default: 24h)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        reminder_type = options['reminder_type']

        self.stdout.write(
            self.style.NOTICE(f'Starting {reminder_type} reminder job...')
        )

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No emails will be sent'))
            self._handle_dry_run(reminder_type)
        else:
            stats = EventReminderService.send_reminders_for_upcoming_events(reminder_type)
            self._report_stats(stats)

    def _handle_dry_run(self, reminder_type):
        """Show what would be sent without actually sending."""
        events = EventReminderService.get_events_needing_reminders(reminder_type)

        if not events.exists():
            self.stdout.write(self.style.SUCCESS('No events need reminders at this time.'))
            return

        self.stdout.write(f'\nFound {events.count()} event(s) needing {reminder_type} reminders:\n')

        total_recipients = 0
        for event in events:
            eligible_rsvps = EventReminderService.get_rsvps_for_reminders(event, reminder_type)

            self.stdout.write(f'\n  Event: {event.title}')
            self.stdout.write(f'  ID: {event.id}')
            self.stdout.write(f'  Start: {event.start_datetime}')
            self.stdout.write(f'  Eligible RSVPs: {len(eligible_rsvps)}')

            for rsvp, email, token in eligible_rsvps:
                user_type = 'guest' if rsvp.is_guest_rsvp else 'user'
                self.stdout.write(f'    - {email} ({user_type})')
                total_recipients += 1

        self.stdout.write(f'\n\nTotal emails that would be sent: {total_recipients}')

    def _report_stats(self, stats):
        """Report the results of the reminder job."""
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write('Event Reminder Job Complete')
        self.stdout.write('=' * 50)
        self.stdout.write(f'Events processed: {stats["events"]}')
        self.stdout.write(f'Emails sent: {stats["sent"]}')
        self.stdout.write(f'Emails failed: {stats["failed"]}')

        if stats['sent'] > 0:
            self.stdout.write(
                self.style.SUCCESS(f'\nSuccessfully sent {stats["sent"]} reminder(s)!')
            )

        if stats['failed'] > 0:
            self.stdout.write(
                self.style.ERROR(f'\nFailed to send {stats["failed"]} reminder(s). Check logs for details.')
            )

        if stats['events'] == 0:
            self.stdout.write(
                self.style.SUCCESS('\nNo events need reminders at this time.')
            )
