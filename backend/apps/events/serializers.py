from rest_framework import serializers
from .models import Business, Event, Category, EventRSVP
from .geocoding import get_geocoding_service
import logging

logger = logging.getLogger(__name__)


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
    can_use_custom_subdomain = serializers.BooleanField(read_only=True)
    subdomain_url = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = [
            'id', 'name', 'description', 'contact_email', 'contact_phone',
            'website', 'instagram_url', 'tiktok_url', 'available_for_hire',
            'logo', 'categories', 'category_ids', 'custom_subdomain',
            'can_use_custom_subdomain', 'subdomain_url',
            'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_verified']

    def get_subdomain_url(self, obj):
        """Return the subdomain URL if available"""
        return obj.get_subdomain_url()

    def validate_custom_subdomain(self, value):
        """Validate that the business can use custom subdomains"""
        if value and not self.instance.can_use_custom_subdomain():
            raise serializers.ValidationError(
                "Your subscription plan does not include custom subdomains. "
                "Please upgrade to use this feature."
            )
        return value


class BusinessMinimalSerializer(serializers.ModelSerializer):
    """Minimal business info for event listings"""
    categories = CategorySerializer(many=True, read_only=True)

    class Meta:
        model = Business
        fields = ['id', 'name', 'logo', 'instagram_url', 'tiktok_url', 'available_for_hire', 'categories']


class EventRSVPSerializer(serializers.ModelSerializer):
    """Serializer for EventRSVP model - handles both registered and guest RSVPs"""
    # For display purposes, show either user email or guest email
    display_email = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    event_title = serializers.CharField(source='event.title', read_only=True)
    is_guest_rsvp = serializers.BooleanField(read_only=True)

    class Meta:
        model = EventRSVP
        fields = [
            'id', 'event', 'event_title', 'user', 'display_email', 'display_name',
            'guest_email', 'guest_name', 'is_guest_rsvp',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'is_guest_rsvp']

    def get_display_email(self, obj):
        """Return email address (user email for registered, guest_email for guests)"""
        return obj.display_email

    def get_display_name(self, obj):
        """Return display name (username for registered, guest_name for guests)"""
        if obj.user:
            return obj.user.username
        return obj.guest_name or 'Guest'


class GuestRSVPSerializer(serializers.ModelSerializer):
    """Serializer for creating guest RSVPs (non-authenticated users)"""

    class Meta:
        model = EventRSVP
        fields = ['id', 'event', 'guest_email', 'guest_name', 'gdpr_consent', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        """Validate guest RSVP data"""
        if not data.get('guest_email'):
            raise serializers.ValidationError({'guest_email': 'Email is required for guest RSVPs.'})
        if not data.get('gdpr_consent'):
            raise serializers.ValidationError({
                'gdpr_consent': 'You must consent to data processing to RSVP.'
            })
        if data.get('status') not in ['interested', 'going']:
            raise serializers.ValidationError({'status': 'Status must be either "interested" or "going".'})
        return data

    def create(self, validated_data):
        """Create a guest RSVP with GDPR consent timestamp"""
        from django.utils import timezone
        validated_data['gdpr_consent_timestamp'] = timezone.now()
        return super().create(validated_data)


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
            'image', 'cta_button_text', 'cta_button_url',
            'require_login_for_rsvp',
            'status', 'created_at', 'updated_at',
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

    def create(self, validated_data):
        """
        Create an event with automatic geocoding if lat/long not provided.
        If latitude/longitude are not provided or are empty, attempt to geocode the address.
        """
        latitude = validated_data.get('latitude')
        longitude = validated_data.get('longitude')
        address = validated_data.get('address')

        # Check if we need to geocode
        needs_geocoding = (
            address and
            (not latitude or not longitude or str(latitude).strip() == '' or str(longitude).strip() == '')
        )

        if needs_geocoding:
            logger.info(f"Attempting to geocode address: {address}")
            geocoding_service = get_geocoding_service()
            coordinates = geocoding_service.geocode_address(address)

            if coordinates:
                validated_data['latitude'] = coordinates[0]
                validated_data['longitude'] = coordinates[1]
                logger.info(f"Successfully geocoded to: {coordinates}")
            else:
                logger.warning(f"Failed to geocode address: {address}")
                # If geocoding fails and no coordinates provided, raise error
                if not latitude or not longitude:
                    raise serializers.ValidationError({
                        'address': 'Could not geocode address. Please provide latitude and longitude manually.'
                    })

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Update an event with automatic geocoding if address changed but lat/long not updated.
        """
        # Check if address is being updated
        new_address = validated_data.get('address')
        address_changed = new_address and new_address != instance.address

        # Check if lat/long are being explicitly updated
        lat_in_data = 'latitude' in validated_data
        lng_in_data = 'longitude' in validated_data

        # If address changed but lat/long not explicitly updated, geocode
        if address_changed and not (lat_in_data and lng_in_data):
            logger.info(f"Address changed to: {new_address}, attempting geocoding")
            geocoding_service = get_geocoding_service()
            coordinates = geocoding_service.geocode_address(new_address)

            if coordinates:
                validated_data['latitude'] = coordinates[0]
                validated_data['longitude'] = coordinates[1]
                logger.info(f"Successfully geocoded to: {coordinates}")
            else:
                logger.warning(f"Failed to geocode new address: {new_address}")

        return super().update(instance, validated_data)


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
