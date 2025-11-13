from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, UserRole


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""

    class Meta:
        model = UserProfile
        fields = [
            'role',
            'identity_provider',
            'is_profile_complete',
            'email_notifications_enabled',
            'event_reminder_enabled',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['identity_provider', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for Django User with profile information."""
    profile = UserProfileSerializer(read_only=True)
    role = serializers.CharField(source='profile.role', read_only=True)
    is_business_owner = serializers.BooleanField(source='profile.is_business_owner', read_only=True)
    is_attendee = serializers.BooleanField(source='profile.is_attendee', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'profile',
            'role',
            'is_business_owner',
            'is_attendee'
        ]
        read_only_fields = ['id', 'username']


class UpdateProfileSerializer(serializers.Serializer):
    """Serializer for updating user profile."""
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    role = serializers.ChoiceField(
        choices=UserRole.choices,
        required=False,
        help_text="User role: business_owner or attendee"
    )
    email_notifications_enabled = serializers.BooleanField(required=False)
    event_reminder_enabled = serializers.BooleanField(required=False)

    def update(self, instance, validated_data):
        """Update user and profile."""
        # Update User fields
        if 'first_name' in validated_data:
            instance.first_name = validated_data['first_name']
        if 'last_name' in validated_data:
            instance.last_name = validated_data['last_name']
        instance.save()

        # Update UserProfile fields
        profile = instance.profile
        if 'role' in validated_data:
            profile.role = validated_data['role']
        if 'email_notifications_enabled' in validated_data:
            profile.email_notifications_enabled = validated_data['email_notifications_enabled']
        if 'event_reminder_enabled' in validated_data:
            profile.event_reminder_enabled = validated_data['event_reminder_enabled']

        # Mark profile as complete if role is set
        if 'role' in validated_data:
            profile.is_profile_complete = True

        profile.save()

        return instance
