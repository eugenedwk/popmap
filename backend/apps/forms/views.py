from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from .models import (
    FormTemplate, FormField, FormFieldOption,
    FormSubmission, FormResponse
)
from .serializers import (
    FormTemplateSerializer, FormTemplateListSerializer,
    FormFieldSerializer, FormFieldCreateSerializer,
    FormSubmissionSerializer, CreateFormSubmissionSerializer
)
from .permissions import IsBusinessOwnerOrReadOnly


class FormTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing form templates.
    Business owners can create, update, delete their forms.
    Anyone can view active forms.
    """
    permission_classes = [IsBusinessOwnerOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return FormTemplateListSerializer
        return FormTemplateSerializer

    def get_queryset(self):
        user = self.request.user

        # Business owners see their forms
        if user.is_authenticated and hasattr(user, 'profile'):
            if user.profile.is_business_owner:
                # Return forms from businesses owned by user
                businesses = user.owned_businesses.all()
                return FormTemplate.objects.filter(
                    business__in=businesses
                ).prefetch_related('fields', 'fields__options').distinct()

        # Public access - only active forms
        return FormTemplate.objects.filter(
            is_active=True
        ).prefetch_related('fields', 'fields__options')

    def perform_create(self, serializer):
        # Ensure user owns the business
        business = serializer.validated_data['business']
        if business.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't own this business")

        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def submit(self, request, pk=None):
        """
        POST /api/forms/templates/{id}/submit/
        Submit a form with responses
        """
        form_template = self.get_object()

        if not form_template.is_active:
            return Response(
                {'error': 'This form is not currently accepting submissions'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CreateFormSubmissionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Validate required fields
        response_field_ids = {
            int(r['field_id']) for r in serializer.validated_data['responses']
        }
        required_fields = form_template.fields.filter(is_required=True)

        for field in required_fields:
            if field.id not in response_field_ids:
                return Response(
                    {'error': f'Required field missing: {field.label}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            with transaction.atomic():
                # Create submission
                submission = FormSubmission.objects.create(
                    form_template=form_template,
                    user=request.user if request.user.is_authenticated else None,
                    submitter_email=serializer.validated_data.get('submitter_email', ''),
                    event_id=serializer.validated_data.get('event_id'),
                    ip_address=self.get_client_ip(request)
                )

                # Create responses
                for response_data in serializer.validated_data['responses']:
                    # Validate field belongs to this form
                    try:
                        field = form_template.fields.get(id=response_data['field_id'])
                    except FormField.DoesNotExist:
                        raise ValueError(f"Invalid field_id: {response_data['field_id']}")

                    FormResponse.objects.create(
                        submission=submission,
                        field=field,
                        value=response_data['value']
                    )

                # Send email notifications (async task would be better in production)
                try:
                    from .services import EmailService
                    EmailService.send_form_submission_notification(submission)
                except Exception as e:
                    # Log error but don't fail the submission
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send email notification: {str(e)}")

            return Response({
                'message': 'Form submitted successfully',
                'submission_id': submission.id
            }, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'An error occurred while submitting the form'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def submissions(self, request, pk=None):
        """
        GET /api/forms/templates/{id}/submissions/
        Get all submissions for this form (business owner only)
        """
        form_template = self.get_object()

        # Verify ownership
        if form_template.business.owner != request.user:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        submissions = form_template.submissions.all().prefetch_related(
            'responses', 'responses__field'
        ).order_by('-submitted_at')

        serializer = FormSubmissionSerializer(submissions, many=True)
        return Response(serializer.data)

    def get_client_ip(self, request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class FormFieldViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing form fields.
    Only business owners can create/update/delete fields for their forms.
    """
    permission_classes = [IsAuthenticated, IsBusinessOwnerOrReadOnly]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return FormFieldCreateSerializer
        return FormFieldSerializer

    def get_queryset(self):
        # Only show fields from forms owned by user
        businesses = self.request.user.owned_businesses.all()
        return FormField.objects.filter(
            form_template__business__in=businesses
        ).select_related('form_template').prefetch_related('options')

    def perform_create(self, serializer):
        # Verify user owns the form template
        form_template = serializer.validated_data['form_template']
        if form_template.business.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You don't own this form template")
        serializer.save()


class FormSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing form submissions.
    Business owners can view submissions for their forms.
    """
    serializer_class = FormSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only show submissions from forms owned by user
        businesses = self.request.user.owned_businesses.all()
        return FormSubmission.objects.filter(
            form_template__business__in=businesses
        ).select_related(
            'form_template', 'user', 'event'
        ).prefetch_related(
            'responses', 'responses__field'
        ).order_by('-submitted_at')
