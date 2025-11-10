#!/usr/bin/env python
"""
Add test data to PopMap database
"""
import os
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.events.models import Business, Event, Category
from django.contrib.auth.models import User

# Get or create admin user
admin_user, _ = User.objects.get_or_create(
    username='admin',
    defaults={'is_staff': True, 'is_superuser': True}
)

# Get categories
coffee_cat = Category.objects.get(name='Coffee')
matcha_cat = Category.objects.get(name='Matcha')
baked_cat = Category.objects.get(name='Baked Goods')
organic_cat = Category.objects.get(name='Organic')
food_truck_cat = Category.objects.get(name='Food Truck')
farmers_cat = Category.objects.get(name='Farmer\'s Market')

# Clear existing data (optional)
print("Clearing existing data...")
Event.objects.all().delete()
Business.objects.all().delete()

# Create test businesses
businesses_data = [
    {
        'name': 'Artisan Coffee Pop-up',
        'description': 'Specialty coffee and fresh pastries from local bakers',
        'contact_email': 'hello@artisancoffee.com',
        'contact_phone': '703-555-0101',
        'website': 'https://artisancoffeepopup.com',
        'instagram_url': 'https://instagram.com/artisancoffee',
        'is_verified': True,
        'categories': [coffee_cat, baked_cat]
    },
    {
        'name': 'Local Farmer\'s Market',
        'description': 'Fresh organic produce, honey, and handmade goods',
        'contact_email': 'info@localfarmers.com',
        'contact_phone': '703-555-0202',
        'website': 'https://localfarmersmarket.com',
        'instagram_url': 'https://instagram.com/localfarmersmarket',
        'is_verified': True,
        'categories': [organic_cat, farmers_cat]
    },
    {
        'name': 'Food Truck Rally',
        'description': 'Rotating selection of the best food trucks in the area',
        'contact_email': 'events@foodtruckrally.com',
        'contact_phone': '703-555-0303',
        'website': 'https://foodtruckrally.com',
        'instagram_url': 'https://instagram.com/foodtruckrally',
        'is_verified': True,
        'categories': [food_truck_cat]
    },
]

print("\nCreating businesses...")
businesses = []
for biz_data in businesses_data:
    categories = biz_data.pop('categories')  # Remove categories from dict
    business = Business.objects.create(**biz_data)
    business.categories.set(categories)  # Set many-to-many relationship
    businesses.append(business)
    print(f"✓ Created: {business.name} ({', '.join([c.name for c in categories])})")

# Create test events
events_data = [
    {
        'businesses': [businesses[0]],
        'title': 'Weekend Coffee & Pastries',
        'description': 'Join us for artisan coffee and fresh-baked croissants this weekend!',
        'address': '6224 Old Dominion Dr, McLean, VA 22101',
        'latitude': 38.9325,
        'longitude': -77.1800,
        'start_datetime': timezone.make_aware(datetime(2025, 11, 15, 10, 0)),
        'end_datetime': timezone.make_aware(datetime(2025, 11, 15, 14, 0)),
        'status': 'approved',
        'created_by': admin_user
    },
    {
        'businesses': [businesses[1]],
        'title': 'Saturday Farmer\'s Market',
        'description': 'Fresh vegetables, fruits, honey, and artisan goods',
        'address': '1609 King St, Alexandria, VA 22314',
        'latitude': 38.8048,
        'longitude': -77.0469,
        'start_datetime': timezone.make_aware(datetime(2025, 11, 16, 8, 0)),
        'end_datetime': timezone.make_aware(datetime(2025, 11, 16, 13, 0)),
        'status': 'approved',
        'created_by': admin_user
    },
    {
        'businesses': [businesses[2]],
        'title': 'Food Truck Friday',
        'description': 'Five amazing food trucks serving lunch and dinner',
        'address': '1800 M St NW, Washington, DC 20036',
        'latitude': 38.9057,
        'longitude': -77.0431,
        'start_datetime': timezone.make_aware(datetime(2025, 11, 14, 11, 0)),
        'end_datetime': timezone.make_aware(datetime(2025, 11, 14, 20, 0)),
        'status': 'approved',
        'created_by': admin_user
    },
    {
        'businesses': [businesses[0]],
        'title': 'Holiday Coffee Tasting',
        'description': 'Sample our special holiday blend and seasonal drinks',
        'address': '3201 New Mexico Ave NW, Washington, DC 20016',
        'latitude': 38.9367,
        'longitude': -77.0652,
        'start_datetime': timezone.make_aware(datetime(2025, 12, 1, 9, 0)),
        'end_datetime': timezone.make_aware(datetime(2025, 12, 1, 17, 0)),
        'status': 'approved',
        'created_by': admin_user
    },
    {
        'businesses': [businesses[1]],
        'title': 'Thanksgiving Harvest Market',
        'description': 'Special pre-Thanksgiving market with turkeys, pies, and all the fixings',
        'address': '700 N Fairfax St, Alexandria, VA 22314',
        'latitude': 38.8086,
        'longitude': -77.0455,
        'start_datetime': timezone.make_aware(datetime(2025, 11, 22, 7, 0)),
        'end_datetime': timezone.make_aware(datetime(2025, 11, 22, 15, 0)),
        'status': 'approved',
        'created_by': admin_user
    },
    {
        'businesses': [businesses[2], businesses[0]],  # Multi-business event!
        'title': 'Sunday Brunch Pop-up',
        'description': 'Brunch food trucks with live music PLUS artisan coffee bar',
        'address': '4301 Wilson Blvd, Arlington, VA 22203',
        'latitude': 38.8799,
        'longitude': -77.1067,
        'start_datetime': timezone.make_aware(datetime(2025, 11, 17, 10, 0)),
        'end_datetime': timezone.make_aware(datetime(2025, 11, 17, 15, 0)),
        'status': 'approved',
        'created_by': admin_user
    },
]

print("\nCreating events...")
for event_data in events_data:
    event_businesses = event_data.pop('businesses')  # Remove businesses from dict
    event = Event.objects.create(**event_data)
    event.businesses.set(event_businesses)  # Set many-to-many relationship
    biz_names = ', '.join([b.name for b in event_businesses])
    print(f"✓ Created: {event.title} at {event.address}")
    print(f"  Businesses: {biz_names}")
    print(f"  Date: {event.start_datetime.strftime('%b %d, %Y %I:%M %p')}")

print(f"\n✅ Done! Created {len(businesses)} businesses and {len(events_data)} events.")
print("\nYou can view them at:")
print("- Admin: http://localhost:8000/admin/events/")
print("- API: http://localhost:8000/api/events/")
