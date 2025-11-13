from rest_framework import serializers
from .models import Business, Event, Category, EventRSVP


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


class EventRSVPSerializer(serializers.ModelSerializer):
    """Serializer for EventRSVP model"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = EventRSVP
        fields = ['id', 'event', 'event_title', 'user', 'user_email', 'user_name', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class EventSerializer(serializers.ModelSerializer):
    businesses = BusinessMinimalSerializer(many=True, read_only=True)
    business_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Business.objects.all(),
        source='businesses',
        write_only=True,
        required=False
    )
    user_rsvp_status = serializers.SerializerMethodField()
    rsvp_counts = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            'id', 'businesses', 'business_ids',
            'title', 'description', 'address',
            'latitude', 'longitude',
            'start_datetime', 'end_datetime',
            'image', 'status', 'created_at', 'updated_at',
            'user_rsvp_status', 'rsvp_counts'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_rsvp_status(self, obj):
        """Return the current user's RSVP status for this event"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            rsvp = obj.rsvps.filter(user=request.user).first()
            return rsvp.status if rsvp else None
        return None

    def get_rsvp_counts(self, obj):
        """Return counts of interested and going RSVPs"""
        from django.db.models import Count, Q
        counts = obj.rsvps.aggregate(
            interested=Count('id', filter=Q(status='interested')),
            going=Count('id', filter=Q(status='going'))
        )
        return counts

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
        """Return list of businesses with id, name, logo, and categories for linking and filtering"""
        return [{
            'id': business.id,
            'name': business.name,
            'logo': business.logo.url if business.logo else None,
            'categories': [{'id': cat.id, 'name': cat.name, 'slug': cat.slug} for cat in business.categories.all()]
        } for business in obj.businesses.all()]

    def get_categories(self, obj):
        """Return unique categories from all businesses in this event"""
        categories_set = set()
        for business in obj.businesses.all():
            for category in business.categories.all():
                categories_set.add(category.name)
        return sorted(list(categories_set))
