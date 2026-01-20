from rest_framework import serializers
from .models import Business, Event, Category, EventRSVP, Venue
from .geocoding import get_geocoding_service
import logging

logger = logging.getLogger(__name__)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class VenueSerializer(serializers.ModelSerializer):
    """Serializer for Venue model - saved locations that can be reused across events"""
    business_name = serializers.CharField(source='business.name', read_only=True)

    class Meta:
        model = Venue
        fields = [
            'id', 'business', 'business_name', 'name', 'address',
            'latitude', 'longitude', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Ensure the business belongs to the current user"""
        request = self.context.get('request')
        business = data.get('business')

        if request and business:
            # Check if user owns this business
            if not request.user.is_staff and business.owner != request.user:
                raise serializers.ValidationError({
                    'business': 'You can only create venues for businesses you own.'
                })
        return data


class VenueMinimalSerializer(serializers.ModelSerializer):
    """Minimal venue info for dropdowns and event forms"""

    class Meta:
        model = Venue
        fields = ['id', 'name', 'address', 'latitude', 'longitude']


class ActiveFormTemplateField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        # Import here to avoid circular imports
        from apps.forms.models import FormTemplate
        request = self.context.get('request', None)
        if hasattr(self, 'parent') and hasattr(self.parent, 'instance') and self.parent.instance:
            # When updating, only allow templates for this business
            return FormTemplate.objects.filter(
                business=self.parent.instance,
                is_active=True
            )
        # For creation or when no instance, return all (will be filtered later)
        return FormTemplate.objects.filter(is_active=True)


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
    can_use_premium_customization = serializers.BooleanField(read_only=True)
    can_use_form_builder = serializers.BooleanField(read_only=True)
    subdomain_url = serializers.SerializerMethodField()
    active_form_template_id = ActiveFormTemplateField(
        source='active_form_template',
        required=False,
        allow_null=True,
        write_only=True
    )
    active_form_template = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Business
        fields = [
            'id', 'name', 'description', 'contact_email', 'contact_phone',
            'website', 'instagram_url', 'tiktok_url', 'available_for_hire',
            'logo', 'categories', 'category_ids', 'custom_subdomain',
            'can_use_custom_subdomain', 'subdomain_url',
            'active_form_template', 'active_form_template_id',
            # Instagram integration
            'instagram_handle',
            # Background options
            'background_image', 'background_image_url', 'background_color',
            'background_overlay_opacity',
            # Branding colors
            'custom_primary_color', 'secondary_color',
            # Header banner
            'header_banner',
            # Layout options
            'default_view_mode', 'hide_contact_info', 'hide_social_links',
            # Content display options
            'show_upcoming_events_first', 'hide_past_events', 'events_per_page',
            # Permissions and metadata
            'can_use_premium_customization', 'can_use_form_builder',
            'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_verified']


    def get_active_form_template(self, obj):
        """Return the full active form template if available"""
        if obj.active_form_template:
            from apps.forms.serializers import FormTemplateSerializer
            return FormTemplateSerializer(obj.active_form_template).data
        return None

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

    def validate(self, attrs):
        """Validate premium features require subscription"""
        if self.instance:
            # Check if premium customization fields are being modified
            premium_fields = [
                # Background options
                'background_image', 'background_image_url', 'background_color',
                'background_overlay_opacity',
                # Branding colors
                'custom_primary_color', 'secondary_color',
                # Header banner
                'header_banner',
                # Layout options
                'default_view_mode', 'hide_contact_info', 'hide_social_links',
                # Content display options
                'show_upcoming_events_first', 'hide_past_events', 'events_per_page',
            ]
            is_modifying_premium = any(
                field in attrs and attrs.get(field) != getattr(self.instance, field)
                for field in premium_fields
            )

            if is_modifying_premium and not self.instance.can_use_premium_customization():
                raise serializers.ValidationError(
                    "Premium customization features require an active subscription. Please upgrade to use these features."
                )

        return attrs


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
    venue = VenueMinimalSerializer(read_only=True)
    venue_id = serializers.PrimaryKeyRelatedField(
        queryset=Venue.objects.all(),
        source='venue',
        write_only=True,
        required=False,
        allow_null=True
    )
    user_rsvp_status = serializers.SerializerMethodField()
    rsvp_counts = serializers.SerializerMethodField()
    # Recurring event fields (write-only, handled in view)
    is_recurring = serializers.BooleanField(write_only=True, required=False, default=False)
    recurrence_count = serializers.IntegerField(write_only=True, required=False, default=1)

    class Meta:
        model = Event
        fields = [
            'id', 'businesses', 'business_ids',
            'venue', 'venue_id',
            'title', 'description', 'address',
            'latitude', 'longitude',
            'start_datetime', 'end_datetime',
            'image', 'cta_button_text', 'cta_button_url',
            'require_login_for_rsvp',
            'status', 'created_at', 'updated_at',
            'user_rsvp_status', 'rsvp_counts',
            'is_recurring', 'recurrence_count'
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
        # Pop recurring fields - they are handled in the view, not stored on the model
        validated_data.pop('is_recurring', None)
        validated_data.pop('recurrence_count', None)

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
