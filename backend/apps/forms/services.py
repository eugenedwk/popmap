from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service for sending form-related emails.
    """

    @staticmethod
    def send_form_submission_notification(submission):
        """
        Send email notification to business owner when form is submitted.
        """
        try:
            form_template = submission.form_template

            # Prepare submission data
            responses_data = []
            for response in submission.responses.all():
                responses_data.append({
                    'label': response.field.label,
                    'value': response.value
                })

            # Email context
            context = {
                'form_name': form_template.name,
                'form_title': form_template.title,
                'business_name': form_template.business.name,
                'submitted_at': submission.submitted_at,
                'submitter_email': submission.submitter_email,
                'responses': responses_data,
                'event': submission.event,
            }

            # Render email (with fallback to plain text if templates don't exist)
            subject = f"New Form Submission: {form_template.name}"

            try:
                html_message = render_to_string(
                    'forms/emails/submission_notification.html',
                    context
                )
                plain_message = render_to_string(
                    'forms/emails/submission_notification.txt',
                    context
                )
            except Exception:
                # Fallback to simple text email if templates don't exist
                plain_message = EmailService._generate_plain_notification(context)
                html_message = None

            # Send email
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[form_template.notification_email],
                html_message=html_message,
                fail_silently=False
            )

            # Update submission
            submission.notification_sent = True
            submission.notification_sent_at = timezone.now()
            submission.save(update_fields=[
                'notification_sent',
                'notification_sent_at'
            ])

            # Send confirmation to submitter if enabled
            if form_template.send_confirmation_to_submitter and submission.submitter_email:
                EmailService.send_submission_confirmation(submission)

            logger.info(f"Sent form submission notification for submission {submission.id}")

        except Exception as e:
            logger.error(f"Failed to send form submission notification: {str(e)}")
            raise

    @staticmethod
    def send_submission_confirmation(submission):
        """
        Send confirmation email to person who submitted the form.
        """
        try:
            form_template = submission.form_template

            context = {
                'form_title': form_template.title,
                'business_name': form_template.business.name,
                'confirmation_message': form_template.confirmation_message,
                'submitted_at': submission.submitted_at,
            }

            subject = f"Thank you for your submission: {form_template.title}"

            try:
                html_message = render_to_string(
                    'forms/emails/submission_confirmation.html',
                    context
                )
                plain_message = render_to_string(
                    'forms/emails/submission_confirmation.txt',
                    context
                )
            except Exception:
                # Fallback to simple text email
                plain_message = EmailService._generate_plain_confirmation(context)
                html_message = None

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[submission.submitter_email],
                html_message=html_message,
                fail_silently=False
            )

            submission.confirmation_sent = True
            submission.save(update_fields=['confirmation_sent'])

            logger.info(f"Sent confirmation email for submission {submission.id}")

        except Exception as e:
            logger.error(f"Failed to send confirmation email: {str(e)}")

    @staticmethod
    def _generate_plain_notification(context):
        """Generate plain text notification email"""
        message = f"""New Form Submission: {context['form_title']}

Business: {context['business_name']}
Submitted: {context['submitted_at'].strftime('%B %d, %Y %I:%M %p')}
"""
        if context.get('submitter_email'):
            message += f"Submitter Email: {context['submitter_email']}\n"

        if context.get('event'):
            message += f"Related Event: {context['event'].title}\n"

        message += "\nResponses:\n"
        for response in context['responses']:
            message += f"\n{response['label']}: {response['value']}\n"

        message += "\n---\nThis is an automated notification from PopMap.\n"
        return message

    @staticmethod
    def _generate_plain_confirmation(context):
        """Generate plain text confirmation email"""
        message = f"""Thank you for your submission!

Form: {context['form_title']}
Business: {context['business_name']}
Submitted: {context['submitted_at'].strftime('%B %d, %Y %I:%M %p')}

"""
        if context.get('confirmation_message'):
            message += f"{context['confirmation_message']}\n\n"

        message += "---\nThis is an automated confirmation from PopMap.\n"
        return message
