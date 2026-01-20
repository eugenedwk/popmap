"""
Management command to add missing vendors to Winter Clubhouse events.

Usage:
    python manage.py add_winter_clubhouse_vendors --dry-run  # Preview changes
    python manage.py add_winter_clubhouse_vendors            # Apply changes
"""
from django.core.management.base import BaseCommand
from apps.events.models import Business, Event, Category


class Command(BaseCommand):
    help = 'Add missing vendors to Winter Clubhouse events (Jan 24-25, 2026)'

    # Vendors for BOTH days
    BOTH_DAYS = [
        "ADAPTIVE HEALTH LIFESTYLE",
        "AZUL AGAVE",
        "BAKED BY DANIELLE",
        "BLISSDAY",
        "COCO SKY CAFE",
        "COOKIEPHORIA",
        "DESIGNS BY ROSSANA",
        "DIVINE JEWELRY",
        "EARTH'S GROOVE",
        "GRASSHOPPER",
        "LARRY ISSA DESIGN",
        "LETTERS BY TALA",
        "MARISOL CAKES & SWEETS",
        "MILAN JEWELRY",
        "MT EVENTS",
        "PARIS X PUFF",
        "POST NOSTALGIA PRINTS",
        "SNOW CRANE",
        "STOLN HOURS, THE CAFE",
        "STONEAGE VINTAGE",
        "SUKUSHINE",
        "THE BLOOM SALOON",
        "THE DC INFLUENCE",
        "THE PERSIAN TABLE",
        "TRĂM PHẦN TRĂM",
        "TWELVETWENTYCOFFEE",
        "WHISK'D TEA",
        "YUME ASIAN FUSION",
        "ZANA TEA",
    ]

    # Vendors for SATURDAY only (Jan 24 - Event #29)
    SATURDAY_ONLY = [
        "CROSS RHODES VINTAGE",
        "CURATED BY LW",
        "DELLAPAZDESIGN",
        "DOUGH MARKET LLC",
        "ÉCLAT GOURMAND",
        "EVERM JEWELRY",
        "EZTILO",
        "FLOR DEL SOL",
        "HACIENDA",
        "JANE",
        "MAKIN' IT HERS",
        "PAPER CRANE + LOTUS",
        "PINKIE PROMISE NAILS",
        "SASHA'S GROCERY",
        "SNAP GEMS",
        "STAPLETON'S",
        "SWEETS BY CAROLINE",
        "THE BLACK SWAN COMPANY",
        "THE FEDERAL LUNCH",
        "THE GOOD SEITAN",
        "THREE BUTTERFLIES VINTAGE",
        "TO.A.T CO",
        "TRESSE",
        "WICK AND PAPER",
        "YUZU PAPER COMPANY",
    ]

    # Vendors for SUNDAY only (Jan 25 - Event #30)
    SUNDAY_ONLY = [
        "ÀIMORE",
        "AMAZING BEVERAGE COMPANY",
        "ASTER FLORALS & KILN",
        "BLUSH & BLISS JEWELRY",
        "KHOKAFE",
        "KOMUNIDAD COFFEE",
        "KYRU MATCHA",
        "LEI MUSUBI",
        "MAGANDIAT HERS",
        "MERRI MATCHA",
        "OGCOCKTAILS",
        "PUA'S PLATE LUNCH",
        "TULIPS AND TOADS",
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without applying them',
        )
        parser.add_argument(
            '--saturday-event-id',
            type=int,
            default=29,
            help='Event ID for Saturday (default: 29)',
        )
        parser.add_argument(
            '--sunday-event-id',
            type=int,
            default=30,
            help='Event ID for Sunday (default: 30)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        sat_event_id = options['saturday_event_id']
        sun_event_id = options['sunday_event_id']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made\n'))

        # Get events
        try:
            saturday_event = Event.objects.get(id=sat_event_id)
            sunday_event = Event.objects.get(id=sun_event_id)
        except Event.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f'Event not found: {e}'))
            return

        self.stdout.write(f'Saturday Event: {saturday_event.title} (ID: {sat_event_id})')
        self.stdout.write(f'Sunday Event: {sunday_event.title} (ID: {sun_event_id})\n')

        # Get or create default category
        default_category, _ = Category.objects.get_or_create(
            slug='vendor',
            defaults={'name': 'Vendor'}
        )

        created_count = 0
        added_to_saturday = 0
        added_to_sunday = 0

        # Process BOTH DAYS vendors
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== BOTH DAYS VENDORS ==='))
        for name in self.BOTH_DAYS:
            business, created, added_sat, added_sun = self._process_vendor(
                name, saturday_event, sunday_event, default_category, dry_run
            )
            if created:
                created_count += 1
            if added_sat:
                added_to_saturday += 1
            if added_sun:
                added_to_sunday += 1

        # Process SATURDAY ONLY vendors
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== SATURDAY ONLY VENDORS ==='))
        for name in self.SATURDAY_ONLY:
            business, created, added_sat, _ = self._process_vendor(
                name, saturday_event, None, default_category, dry_run
            )
            if created:
                created_count += 1
            if added_sat:
                added_to_saturday += 1

        # Process SUNDAY ONLY vendors
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== SUNDAY ONLY VENDORS ==='))
        for name in self.SUNDAY_ONLY:
            business, created, _, added_sun = self._process_vendor(
                name, None, sunday_event, default_category, dry_run
            )
            if created:
                created_count += 1
            if added_sun:
                added_to_sunday += 1

        # Summary
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'\nSUMMARY:'))
        self.stdout.write(f'  Businesses created: {created_count}')
        self.stdout.write(f'  Added to Saturday event: {added_to_saturday}')
        self.stdout.write(f'  Added to Sunday event: {added_to_sunday}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN - No changes were made. Run without --dry-run to apply.'))

    def _process_vendor(self, name, saturday_event, sunday_event, default_category, dry_run):
        """Process a single vendor - create if needed and add to events."""
        created = False
        added_sat = False
        added_sun = False

        # Check if business exists (case-insensitive)
        business = Business.objects.filter(name__iexact=name).first()

        if not business:
            if dry_run:
                self.stdout.write(f'  [CREATE] {name}')
            else:
                business = Business.objects.create(
                    name=name,
                    description=f'{name} - Winter Clubhouse vendor',
                    contact_email='vendor@popmap.co',  # Placeholder
                )
                business.categories.add(default_category)
                self.stdout.write(self.style.SUCCESS(f'  [CREATED] {name}'))
            created = True
        else:
            self.stdout.write(f'  [EXISTS] {name}')

        # Add to Saturday event
        if saturday_event:
            if dry_run:
                if business and business not in saturday_event.businesses.all():
                    self.stdout.write(f'    -> Would add to Saturday')
                    added_sat = True
            elif business and business not in saturday_event.businesses.all():
                saturday_event.businesses.add(business)
                self.stdout.write(f'    -> Added to Saturday')
                added_sat = True

        # Add to Sunday event
        if sunday_event:
            if dry_run:
                if business and business not in sunday_event.businesses.all():
                    self.stdout.write(f'    -> Would add to Sunday')
                    added_sun = True
            elif business and business not in sunday_event.businesses.all():
                sunday_event.businesses.add(business)
                self.stdout.write(f'    -> Added to Sunday')
                added_sun = True

        return business, created, added_sat, added_sun
