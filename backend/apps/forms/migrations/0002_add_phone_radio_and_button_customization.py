# Generated migration for phone/radio field types and button customization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('forms', '0001_initial'),
    ]

    operations = [
        # Add submit_button_text field to FormTemplate
        migrations.AddField(
            model_name='formtemplate',
            name='submit_button_text',
            field=models.CharField(
                default='Submit',
                help_text='Custom text for the submit button',
                max_length=50,
            ),
        ),
        # Add submit_button_icon field to FormTemplate
        migrations.AddField(
            model_name='formtemplate',
            name='submit_button_icon',
            field=models.CharField(
                blank=True,
                help_text="Icon name (e.g., 'Send', 'ArrowRight', 'Check')",
                max_length=50,
            ),
        ),
        # Update FormField field_type choices (this is informational - choices are validated at runtime)
        migrations.AlterField(
            model_name='formfield',
            name='field_type',
            field=models.CharField(
                choices=[
                    ('text', 'Text Input'),
                    ('dropdown', 'Dropdown'),
                    ('phone', 'Phone Number'),
                    ('radio', 'Radio Selection'),
                ],
                default='text',
                max_length=20,
            ),
        ),
    ]
