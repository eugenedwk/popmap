import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { formsApi } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { FormSubmission } from '@/types'

interface Props {
  templateId?: number
}

export function FormSubmissionsList({ templateId: propTemplateId }: Props) {
  const { templateId: paramTemplateId } = useParams<{ templateId: string }>()
  const templateId = propTemplateId ?? (paramTemplateId ? parseInt(paramTemplateId, 10) : undefined)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (templateId) {
      loadSubmissions()
    } else {
      setLoading(false)
      setError('No form template specified')
    }
  }, [templateId])

  const loadSubmissions = async () => {
    if (!templateId) return
    try {
      setLoading(true)
      const response = await formsApi.getSubmissions(templateId)
      setSubmissions(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading submissions...</div>
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Form Submissions</h2>
        <Badge variant="secondary">{submissions.length} total</Badge>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No submissions yet.
          </CardContent>
        </Card>
      ) : (
        submissions.map((submission) => (
          <Card key={submission.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {new Date(submission.submitted_at).toLocaleString()}
                  </CardTitle>
                  {submission.submitter_email && (
                    <p className="text-sm text-gray-600 mt-1">
                      {submission.submitter_email}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {submission.notification_sent && (
                    <Badge variant="outline" className="bg-green-50">
                      Notified
                    </Badge>
                  )}
                  {submission.confirmation_sent && (
                    <Badge variant="outline" className="bg-blue-50">
                      Confirmed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {submission.responses.map((response) => (
                  <div
                    key={response.id}
                    className="border-l-2 border-gray-200 pl-3 py-1"
                  >
                    <div className="font-semibold text-sm text-gray-700">
                      {response.field_label}
                    </div>
                    <div className="text-gray-900">{response.value}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
