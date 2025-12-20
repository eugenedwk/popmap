"""
Management command to launch the PopMap TUI Admin Dashboard.
Run: python manage.py tui
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Launch the PopMap TUI Admin Dashboard'

    def add_arguments(self, parser):
        parser.add_argument(
            '--readonly',
            action='store_true',
            help='Run in read-only mode (no modifications allowed)',
        )

    def handle(self, *args, **options):
        try:
            from apps.admin_tui.tui.app import PopMapAdminApp
        except ImportError as e:
            self.stderr.write(
                self.style.ERROR(
                    f'Failed to import Textual app. Make sure textual is installed:\n'
                    f'pip install textual rich\n\n'
                    f'Error: {e}'
                )
            )
            return

        self.stdout.write(self.style.SUCCESS('Starting PopMap Admin TUI...'))
        self.stdout.write('Press Q to quit, ? for help\n')

        readonly = options.get('readonly', False)
        if readonly:
            self.stdout.write(self.style.WARNING('Running in READ-ONLY mode'))

        app = PopMapAdminApp(readonly=readonly)
        app.run()

        self.stdout.write(self.style.SUCCESS('\nPopMap Admin TUI closed.'))
