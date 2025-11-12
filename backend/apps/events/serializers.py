from rest_framework import serializers
from .models import Business, Event, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class BusinessSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        source='categories',
        write_only=True,
        required=False
    )

    class Meta:
        model = Business
        fields = [
            'id', 'name', 'description', 'contact_email', 'contact_phone',
            'website', 'instagram_url', 'tiktok_url', 'available_for_hire',
            'logo', 'categories', 'category_ids', 'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_verified']


class BusinessMinimalSerializer(serializers.ModelSerializer):
    """Minimal business info for event listings"""
    categories = CategorySerializer(many=True, read_only=True)

    class Meta:
        model = Business
        fields = ['id', 'name', 'logo', 'instagram_url', 'tiktok_url', 'available_for_hire', 'categories']


class EventSerializer(serializers.ModelSerializer):
    businesses = BusinessMinimalSerializer(many=True, read_only=True)
    business_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Business.objects.all(),
        source='businesses',
        write_only=True,
        required=False
    )

    class Meta:
        model = Event
        fields = [
            'id', 'businesses', 'business_ids',
            'title', 'description', 'address',
            'latitude', 'longitude',
            'start_datetime', 'end_datetime',
            'image', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Ensure end_datetime is after start_datetime"""
        if data.get('end_datetime') and data.get('start_datetime'):
            if data['end_datetime'] <= data['start_datetime']:
                raise serializers.ValidationError(
                    "End datetime must be after start datetime"
                )
        return data


class EventListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for map markers and list views"""
    business_names = serializers.SerializerMethodField()
    businesses = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'business_names', 'businesses', 'title',
            'latitude', 'longitude',
            'start_datetime', 'end_datetime',
            'categories', 'image', 'address'
        ]

    def get_business_names(self, obj):
        """Return comma-separated list of business names"""
        return ", ".join([business.name for business in obj.businesses.all()])

    def get_businesses(self, obj):
        """Return list of businesses with id, name, and categories for linking and filtering"""
        return [{
            'id': business.id,
            'name': business.name,
            'categories': [{'id': cat.id, 'name': cat.name, 'slug': cat.slug} for cat in business.categories.all()]
        } for business in obj.businesses.all()]

    def get_categories(self, obj):
        """Return unique categories from all businesses in this event"""
        categories_set = set()
        for business in obj.businesses.all():
            for category in business.categories.all():
                categories_set.add(category.name)
        return sorted(list(categories_set))
