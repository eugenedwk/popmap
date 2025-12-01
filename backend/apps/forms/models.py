from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class FormTemplate(models.Model):
    """
    Represents a reusable form template created by a business owner.
    Can be attached to events or used standalone.
    """
    # Ownership
    business = models.ForeignKey(
        'events.Business',
        on_delete=models.CASCADE,
        related_name='form_templates',
        help_text="Business that owns this form template"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_forms'
    )

    # Form Info
    name = models.CharField(
        max_length=255,
        help_text="Internal name for this form (not shown to users)"
    )
    title = models.CharField(
        max_length=255,
        help_text="Form title shown to users"
    )
    description = models.TextField(
        blank=True,
        help_text="Optional description shown at top of form"
    )

    # Email Notification Settings
    notification_email = models.EmailField(
        help_text="Email address to receive form submissions"
    )
    send_confirmation_to_submitter = models.BooleanField(
        default=False,
        help_text="Send confirmation email to person who submitted the form"
    )
    confirmation_message = models.TextField(
        blank=True,
        help_text="Custom message in confirmation email"
    )

    # Button Customization
    submit_button_text = models.CharField(
        max_length=50,
        default='Submit',
        help_text="Custom text for the submit button"
    )
    submit_button_icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Icon name (e.g., 'Send', 'ArrowRight', 'Check')"
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this form is accepting submissions"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['business', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} - {self.business.name}"


class FormField(models.Model):
    """
    Represents a single field in a form template.
    """
    FIELD_TYPE_CHOICES = [
        ('text', 'Text Input'),
        ('dropdown', 'Dropdown'),
        ('phone', 'Phone Number'),
        ('radio', 'Radio Selection'),
    ]

    form_template = models.ForeignKey(
        FormTemplate,
        on_delete=models.CASCADE,
        related_name='fields'
    )

    # Field Configuration
    field_type = models.CharField(
        max_length=20,
        choices=FIELD_TYPE_CHOICES,
        default='text'
    )
    label = models.CharField(
        max_length=255,
        help_text="Field label shown to users"
    )
    placeholder = models.CharField(
        max_length=255,
        blank=True,
        help_text="Placeholder text for input fields"
    )
    help_text = models.CharField(
        max_length=500,
        blank=True,
        help_text="Optional help text shown below the field"
    )

    # Validation
    is_required = models.BooleanField(
        default=True,
        help_text="Whether this field must be filled out"
    )

    # Order
    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order (lower numbers appear first)"
    )

    class Meta:
        ordering = ['order', 'id']
        indexes = [
            models.Index(fields=['form_template', 'order']),
        ]

    def __str__(self):
        return f"{self.label} ({self.get_field_type_display()})"


class FormFieldOption(models.Model):
    """
    Represents options for dropdown and radio fields.
    """
    field = models.ForeignKey(
        FormField,
        on_delete=models.CASCADE,
        related_name='options',
        limit_choices_to={'field_type__in': ['dropdown', 'radio']}
    )

    label = models.CharField(
        max_length=255,
        help_text="Option text shown to users"
    )
    value = models.CharField(
        max_length=255,
        help_text="Internal value stored when selected"
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order"
    )

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.label} - {self.field.label}"


class FormSubmission(models.Model):
    """
    Represents a submission of a form template.
    """
    form_template = models.ForeignKey(
        FormTemplate,
        on_delete=models.CASCADE,
        related_name='submissions'
    )

    # Submitter Info (optional - may be anonymous)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='form_submissions',
        help_text="User who submitted (if authenticated)"
    )
    submitter_email = models.EmailField(
        blank=True,
        help_text="Email collected from form or user profile"
    )

    # Related Event (optional)
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='form_submissions',
        help_text="Event this submission is related to (if any)"
    )

    # Notification Tracking
    notification_sent = models.BooleanField(
        default=False,
        help_text="Whether notification email was sent"
    )
    notification_sent_at = models.DateTimeField(
        null=True,
        blank=True
    )
    confirmation_sent = models.BooleanField(
        default=False,
        help_text="Whether confirmation email was sent to submitter"
    )

    # Metadata
    submitted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of submitter"
    )

    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['form_template', 'submitted_at']),
            models.Index(fields=['event', 'submitted_at']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"Submission to {self.form_template.name} at {self.submitted_at}"


class FormResponse(models.Model):
    """
    Stores individual field responses within a submission.
    """
    submission = models.ForeignKey(
        FormSubmission,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    field = models.ForeignKey(
        FormField,
        on_delete=models.CASCADE,
        related_name='responses'
    )

    # Response Value
    value = models.TextField(
        help_text="User's response to this field"
    )

    class Meta:
        unique_together = ['submission', 'field']
        indexes = [
            models.Index(fields=['submission', 'field']),
        ]

    def __str__(self):
        return f"{self.field.label}: {self.value[:50]}"
