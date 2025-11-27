import { useState } from 'react'
import { formsApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { FormTemplate, FormSubmissionRequest } from '@/types'

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

              {field.help_text && (
                <p className="text-sm text-gray-500 mt-1">{field.help_text}</p>
              )}
            </div>
          ))}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
