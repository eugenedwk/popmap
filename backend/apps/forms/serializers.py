from rest_framework import serializers
from .models import (
    FormTemplate, FormField, FormFieldOption,
    FormSubmission, FormResponse
)


class FormFieldOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormFieldOption
        fields = ['id', 'label', 'value', 'order']


class FormFieldSerializer(serializers.ModelSerializer):
    options = FormFieldOptionSerializer(many=True, read_only=True)

    class Meta:
        model = FormField
        fields = [
            'id', 'form_template', 'field_type', 'label', 'placeholder',
            'help_text', 'is_required', 'order', 'options'
        ]


class FormFieldCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating fields with options"""
    options = FormFieldOptionSerializer(many=True, required=False)

    class Meta:
        model = FormField
        fields = [
            'id', 'form_template', 'field_type', 'label', 'placeholder',
            'help_text', 'is_required', 'order', 'options'
        ]

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        field = FormField.objects.create(**validated_data)

        # Create options if this is a dropdown or radio field
        if field.field_type in ['dropdown', 'radio']:
            for option_data in options_data:
                FormFieldOption.objects.create(field=field, **option_data)

        return field

    def update(self, instance, validated_data):
        options_data = validated_data.pop('options', None)

        # Update field attributes
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update options if provided for dropdown or radio fields
        if options_data is not None and instance.field_type in ['dropdown', 'radio']:
            # Delete existing options
            instance.options.all().delete()
            # Create new options
            for option_data in options_data:
                FormFieldOption.objects.create(field=instance, **option_data)

        return instance


class FormTemplateListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list view"""
    business_name = serializers.CharField(source='business.name', read_only=True)
    submission_count = serializers.SerializerMethodField()
    field_count = serializers.SerializerMethodField()

    class Meta:
        model = FormTemplate
        fields = [
            'id', 'business', 'business_name', 'name', 'title',
            'is_active', 'created_at', 'updated_at',
            'submission_count', 'field_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_submission_count(self, obj):
        return obj.submissions.count()

    def get_field_count(self, obj):
        return obj.fields.count()


class FormTemplateSerializer(serializers.ModelSerializer):
    """Full serializer with nested fields"""
    fields = FormFieldSerializer(many=True, read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)
    submission_count = serializers.SerializerMethodField()

    class Meta:
        model = FormTemplate
        fields = [
            'id', 'business', 'business_name', 'name', 'title',
            'description', 'notification_email',
            'send_confirmation_to_submitter', 'confirmation_message',
            'submit_button_text', 'submit_button_icon',
            'is_active', 'created_at', 'updated_at', 'fields',
            'submission_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_submission_count(self, obj):
        return obj.submissions.count()


class FormResponseSerializer(serializers.ModelSerializer):
    field_label = serializers.CharField(source='field.label', read_only=True)
    field_type = serializers.CharField(source='field.field_type', read_only=True)

    class Meta:
        model = FormResponse
        fields = ['id', 'field', 'field_label', 'field_type', 'value']


class FormSubmissionSerializer(serializers.ModelSerializer):
    responses = FormResponseSerializer(many=True, read_only=True)
    form_name = serializers.CharField(source='form_template.name', read_only=True)
    form_title = serializers.CharField(source='form_template.title', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = FormSubmission
        fields = [
            'id', 'form_template', 'form_name', 'form_title',
            'user', 'user_email', 'submitter_email',
            'event', 'submitted_at', 'responses',
            'notification_sent', 'confirmation_sent'
        ]
        read_only_fields = ['id', 'submitted_at', 'user']


class CreateFormSubmissionSerializer(serializers.Serializer):
    """Serializer for creating form submissions with responses"""
    submitter_email = serializers.EmailField(required=False, allow_blank=True)
    event_id = serializers.IntegerField(required=False, allow_null=True)
    responses = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {field_id: int, value: str} objects"
    )

    def validate_responses(self, responses):
        """Validate response structure"""
        for response in responses:
            if 'field_id' not in response or 'value' not in response:
                raise serializers.ValidationError(
                    "Each response must have 'field_id' and 'value'"
                )

            # Ensure field_id is an integer
            try:
                int(response['field_id'])
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    "field_id must be an integer"
                )

        return responses

    def validate(self, data):
        """Validate that all required fields have responses"""
        # This will be done in the view where we have access to the form template
        return data
