#!/usr/bin/env python
"""
Create predefined categories for businesses
"""
import os
import django
from django.utils.text import slugify

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.events.models import Category

# Predefined categories
categories_list = [
    'Matcha',
    'Coffee',
    'Baked Goods',
    'Tea',
    'Food Truck',
    'Farmer\'s Market',
    'Organic',
    'Artisan',
]

print("Creating predefined categories...")
for category_name in categories_list:
    category, created = Category.objects.get_or_create(
        name=category_name,
        defaults={'slug': slugify(category_name)}
    )
    if created:
        print(f"✓ Created: {category_name}")
    else:
        print(f"- Already exists: {category_name}")

print(f"\n✅ Done! {Category.objects.count()} categories available")
