from rest_framework import serializers
from .models import Business, Event


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            'id', 'name', 'description', 'contact_email', 'contact_phone',
            'website', 'logo', 'is_verified', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_verified']


class EventSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)
    business_logo = serializers.ImageField(source='business.logo', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'business', 'business_name', 'business_logo',
            'title', 'description', 'address',
            'latitude', 'longitude',
            'start_datetime', 'end_datetime',
            'image', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'business_name', 'business_logo']

    def validate(self, data):
        """Ensure end_datetime is after start_datetime"""
        if data.get('end_datetime') and data.get('start_datetime'):
            if data['end_datetime'] <= data['start_datetime']:
                raise serializers.ValidationError(
                    "End datetime must be after start datetime"
                )
        return data


class EventListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for map markers"""
    business_name = serializers.CharField(source='business.name', read_only=True)

    class Meta:
        model = Event
        fields = [
            'id', 'business_name', 'title',
            'latitude', 'longitude',
            'start_datetime', 'end_datetime'
        ]
