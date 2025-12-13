import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { formsApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, GripVertical, Send, ArrowRight, Check, Sparkles, Mail, MessageSquare, Loader2 } from 'lucide-react'
import type { FormField, FormFieldOption, FormTemplateFormData } from '@/types'

interface Props {
  businessId: number
  templateId?: number
  onSave?: (templateId: number) => void
}

export function FormTemplateBuilder({ businessId, templateId, onSave }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditMode = !!templateId

  const [formData, setFormData] = useState<FormTemplateFormData>({
    business: businessId,
    name: '',
    title: '',
    description: '',
    notification_email: user?.email || '',
    send_confirmation_to_submitter: false,
    confirmation_message: '',
    submit_button_text: 'Submit',
    submit_button_icon: ''
  })
  const [isFormReady, setIsFormReady] = useState(!isEditMode)

  // Fetch existing template when in edit mode
  const { data: existingTemplate, isLoading: templateLoading } = useQuery({
    queryKey: ['form-template', templateId],
    queryFn: async () => {
      const response = await formsApi.getTemplateById(templateId!)
      return response.data
    },
    enabled: isEditMode,
  })

  // Available icons for button customization
  const buttonIcons = [
    { value: '', label: 'No Icon' },
    { value: 'Send', label: 'Send' },
    { value: 'ArrowRight', label: 'Arrow Right' },
    { value: 'Check', label: 'Check' },
    { value: 'Sparkles', label: 'Sparkles' },
    { value: 'Mail', label: 'Mail' },
    { value: 'MessageSquare', label: 'Message' },
  ]

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

  const [fields, setFields] = useState<Partial<FormField>[]>([])
  const [originalFieldIds, setOriginalFieldIds] = useState<number[]>([]) // Track original fields for deletion
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Populate form data when editing an existing template
  useEffect(() => {
    if (existingTemplate && isEditMode && !isFormReady) {
      setFormData({
        business: businessId,
        name: existingTemplate.name || '',
        title: existingTemplate.title || '',
        description: existingTemplate.description || '',
        notification_email: existingTemplate.notification_email || '',
        send_confirmation_to_submitter: existingTemplate.send_confirmation_to_submitter || false,
        confirmation_message: existingTemplate.confirmation_message || '',
        submit_button_text: existingTemplate.submit_button_text || 'Submit',
        submit_button_icon: existingTemplate.submit_button_icon || ''
      })

      // Set fields from existing template
      const existingFields = existingTemplate.fields || []
      setFields(existingFields.map((f: FormField) => ({
        id: f.id,
        field_type: f.field_type,
        label: f.label,
        placeholder: f.placeholder || '',
        help_text: f.help_text || '',
        is_required: f.is_required,
        order: f.order,
        options: f.options || []
      })))

      // Track original field IDs for deletion detection
      setOriginalFieldIds(existingFields.map((f: FormField) => f.id))

      setIsFormReady(true)
    }
  }, [existingTemplate, isEditMode, isFormReady, businessId])

  const addField = () => {
    setFields([...fields, {
      field_type: 'text',
      label: '',
      placeholder: '',
      help_text: '',
      is_required: true,
      order: fields.length,
      options: []
    }])
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const updateField = (index: number, updates: Partial<FormField>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...updates }
    setFields(newFields)
  }

  const addFieldOption = (fieldIndex: number) => {
    const field = fields[fieldIndex]
    const options = field.options || []
    updateField(fieldIndex, {
      options: [...options, { label: '', value: '', order: options.length }]
    })
  }

  const updateFieldOption = (fieldIndex: number, optionIndex: number, updates: Partial<FormFieldOption>) => {
    const field = fields[fieldIndex]
    const newOptions = [...(field.options || [])]
    newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates }
    updateField(fieldIndex, { options: newOptions })
  }

  const removeFieldOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex]
    const newOptions = (field.options || []).filter((_, i) => i !== optionIndex)
    updateField(fieldIndex, { options: newOptions })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validation
      if (!formData.name || !formData.title || !formData.notification_email) {
        setError('Please fill out all required fields')
        return
      }

      if (fields.length === 0) {
        setError('Please add at least one field to your form')
        return
      }

      for (const field of fields) {
        if (!field.label) {
          setError('All fields must have a label')
          return
        }
        if (field.field_type === 'dropdown' && (!field.options || field.options.length === 0)) {
          setError(`Dropdown field "${field.label}" must have at least one option`)
          return
        }
        if (field.field_type === 'radio' && (!field.options || field.options.length < 2)) {
          setError(`Radio field "${field.label}" must have at least two options`)
          return
        }
      }

      let finalTemplateId: number

      if (isEditMode && templateId) {
        // UPDATE MODE
        // Update the template
        await formsApi.updateTemplate(templateId, formData)
        finalTemplateId = templateId

        // Get current field IDs from state
        const currentFieldIds = fields
          .filter(f => f.id !== undefined)
          .map(f => f.id as number)

        // Delete removed fields (fields that were in original but not in current)
        const fieldsToDelete = originalFieldIds.filter(id => !currentFieldIds.includes(id))
        for (const fieldId of fieldsToDelete) {
          await formsApi.deleteField(fieldId)
        }

        // Update or create fields
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i]
          const fieldData = { ...field, form_template: templateId, order: i }

          if (field.id) {
            // Update existing field
            await formsApi.updateField(field.id, fieldData)
          } else {
            // Create new field
            await formsApi.createField(fieldData)
          }
        }

        // Invalidate cache
        queryClient.invalidateQueries({ queryKey: ['form-template', templateId] })
        queryClient.invalidateQueries({ queryKey: ['form-templates'] })
      } else {
        // CREATE MODE
        const response = await formsApi.createTemplate(formData)
        const template = response.data
        finalTemplateId = template.id

        // Create fields
        for (const field of fields) {
          await formsApi.createField({
            ...field,
            form_template: template.id
          })
        }
      }

      if (onSave) {
        onSave(finalTemplateId)
      } else {
        navigate(`/forms/${finalTemplateId}`)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  // Show loading state in edit mode
  if (isEditMode && (templateLoading || !isFormReady)) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Form Template' : 'Create Form Template'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Form Settings</h3>

            <div>
              <Label htmlFor="name">Internal Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Event Registration Form"
              />
              <p className="text-sm text-gray-500 mt-1">
                This name is for your reference only
              </p>
            </div>

            <div>
              <Label htmlFor="title">Form Title (shown to users) *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Register for Event"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description shown at top of form"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="notification_email">Notification Email *</Label>
              <Input
                id="notification_email"
                type="email"
                value={formData.notification_email}
                onChange={(e) => setFormData({ ...formData, notification_email: e.target.value })}
                placeholder="Email to receive submissions"
              />
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="send_confirmation"
                checked={formData.send_confirmation_to_submitter}
                onChange={(e) => setFormData({ ...formData, send_confirmation_to_submitter: e.target.checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="send_confirmation" className="cursor-pointer">
                  Send confirmation email to submitter
                </Label>
                <p className="text-sm text-gray-500">
                  Submitters will receive an email confirming their submission
                </p>
              </div>
            </div>

            {formData.send_confirmation_to_submitter && (
              <div>
                <Label htmlFor="confirmation_message">Confirmation Message</Label>
                <Textarea
                  id="confirmation_message"
                  value={formData.confirmation_message}
                  onChange={(e) => setFormData({ ...formData, confirmation_message: e.target.value })}
                  placeholder="Thank you for your submission!"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Button Customization */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Submit Button</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="submit_button_text">Button Text</Label>
                <Input
                  id="submit_button_text"
                  value={formData.submit_button_text}
                  onChange={(e) => setFormData({ ...formData, submit_button_text: e.target.value })}
                  placeholder="Submit"
                  maxLength={50}
                />
              </div>

              <div>
                <Label htmlFor="submit_button_icon">Button Icon</Label>
                <Select
                  value={formData.submit_button_icon || ''}
                  onValueChange={(value) => setFormData({ ...formData, submit_button_icon: value })}
                >
                  <SelectTrigger id="submit_button_icon">
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {buttonIcons.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <span className="flex items-center gap-2">
                          {icon.value && getIconComponent(icon.value)}
                          {icon.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Button Preview */}
            <div>
              <Label>Preview</Label>
              <div className="mt-2">
                <Button disabled className="pointer-events-none">
                  {formData.submit_button_icon && getIconComponent(formData.submit_button_icon)}
                  <span className={formData.submit_button_icon ? 'ml-2' : ''}>
                    {formData.submit_button_text || 'Submit'}
                  </span>
                </Button>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Form Fields</h3>
              <Button onClick={addField} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={index} className="border-2">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <GripVertical className="h-5 w-5 text-gray-400 mt-2 cursor-move" />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Field Type</Label>
                          <Select
                            value={field.field_type}
                            onValueChange={(value) => updateField(index, { field_type: value as 'text' | 'dropdown' | 'phone' | 'radio' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text Input</SelectItem>
                              <SelectItem value="phone">Phone Number</SelectItem>
                              <SelectItem value="dropdown">Dropdown</SelectItem>
                              <SelectItem value="radio">Radio Selection</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Label *</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(index, { label: e.target.value })}
                            placeholder="Field label"
                          />
                        </div>
                      </div>

                      {(field.field_type === 'text' || field.field_type === 'phone') && (
                        <div>
                          <Label>Placeholder</Label>
                          <Input
                            value={field.placeholder}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder={field.field_type === 'phone' ? 'e.g., (555) 123-4567' : 'Placeholder text'}
                          />
                        </div>
                      )}

                      {(field.field_type === 'dropdown' || field.field_type === 'radio') && (
                        <div className="space-y-2">
                          <Label>Options *</Label>
                          {field.options?.map((option, optIndex) => (
                            <div key={optIndex} className="flex gap-2">
                              <Input
                                placeholder="Option label"
                                value={option.label}
                                onChange={(e) => {
                                  const label = e.target.value
                                  updateFieldOption(index, optIndex, { 
                                    label, 
                                    value: label.toLowerCase().replace(/\s+/g, '_')
                                  })
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFieldOption(index, optIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addFieldOption(index)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Option
                          </Button>
                        </div>
                      )}

                      <div>
                        <Label>Help Text</Label>
                        <Input
                          value={field.help_text}
                          onChange={(e) => updateField(index, { help_text: e.target.value })}
                          placeholder="Optional help text"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`required-${index}`}
                          checked={field.is_required}
                          onChange={(e) => updateField(index, { is_required: e.target.checked })}
                        />
                        <Label htmlFor={`required-${index}`} className="cursor-pointer">
                          Required Field
                        </Label>
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeField(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                No fields added yet. Click "Add Field" to get started.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Form Template')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
