import { useState } from 'react'
import { formsApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Send, ArrowRight, Check, Sparkles, Mail, MessageSquare } from 'lucide-react'
import type { FormTemplate, FormSubmissionRequest } from '@/types'

// Icon mapping for button customization
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'Send': <Send className="h-4 w-4" />,
    'ArrowRight': <ArrowRight className="h-4 w-4" />,
    'Check': <Check className="h-4 w-4" />,
    'Sparkles': <Sparkles className="h-4 w-4" />,
    'Mail': <Mail className="h-4 w-4" />,
    'MessageSquare': <MessageSquare className="h-4 w-4" />,
  }
  return iconMap[iconName] || null
}

interface Props {
  template: FormTemplate
  eventId?: number
  onSubmitSuccess?: () => void
}

export function FormRenderer({ template, eventId, onSubmitSuccess }: Props) {
  const [responses, setResponses] = useState<Record<number, string>>({})
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      setError(null)

      // Validate required fields
      for (const field of template.fields || []) {
        if (field.is_required && !responses[field.id!]) {
          setError(`Please fill out: ${field.label}`)
          return
        }
      }

      const submissionData: FormSubmissionRequest = {
        submitter_email: submitterEmail,
        event_id: eventId,
        responses: Object.entries(responses).map(([fieldId, value]) => ({
          field_id: parseInt(fieldId),
          value
        }))
      }

      await formsApi.submitForm(template.id, submissionData)
      setSuccess(true)

      if (onSubmitSuccess) {
        onSubmitSuccess()
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <AlertDescription className="text-green-800">
          Thank you! Your form has been submitted successfully.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.title}</CardTitle>
        {template.description && (
          <CardDescription>{template.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email field */}
          <div>
            <Label htmlFor="email">Your Email *</Label>
            <Input
              id="email"
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          {/* Form fields */}
          {(template.fields || []).map((field) => (
            <div key={field.id}>
              <Label htmlFor={`field-${field.id}`}>
                {field.label}
                {field.is_required && <span className="text-red-500 ml-1">*</span>}
              </Label>

              {field.field_type === 'text' && (
                <Input
                  id={`field-${field.id}`}
                  value={responses[field.id!] || ''}
                  onChange={(e) => setResponses({ ...responses, [field.id!]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.is_required}
                />
              )}

              {field.field_type === 'phone' && (
                <Input
                  id={`field-${field.id}`}
                  type="tel"
                  value={responses[field.id!] || ''}
                  onChange={(e) => setResponses({ ...responses, [field.id!]: e.target.value })}
                  placeholder={field.placeholder || '(555) 123-4567'}
                  required={field.is_required}
                />
              )}

              {field.field_type === 'dropdown' && (
                <Select
                  value={responses[field.id!] || ''}
                  onValueChange={(value) => setResponses({ ...responses, [field.id!]: value })}
                  required={field.is_required}
                >
                  <SelectTrigger id={`field-${field.id}`}>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {field.field_type === 'radio' && (
                <RadioGroup
                  value={responses[field.id!] || ''}
                  onValueChange={(value) => setResponses({ ...responses, [field.id!]: value })}
                  className="mt-2"
                >
                  {field.options?.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`field-${field.id}-${option.id}`} />
                      <Label htmlFor={`field-${field.id}-${option.id}`} className="font-normal cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {field.help_text && (
                <p className="text-sm text-gray-500 mt-1">{field.help_text}</p>
              )}
            </div>
          ))}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              'Submitting...'
            ) : (
              <>
                {template.submit_button_icon && getIconComponent(template.submit_button_icon)}
                <span className={template.submit_button_icon ? 'ml-2' : ''}>
                  {template.submit_button_text || 'Submit'}
                </span>
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
