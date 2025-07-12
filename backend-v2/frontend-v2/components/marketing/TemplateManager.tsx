import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { 
  Mail, 
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Save,
  X,
  Hash,
  AtSign,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { marketingApi } from '@/lib/api/integrations'
import { useToast } from '@/hooks/use-toast'

interface TemplateManagerProps {
  onSelectTemplate?: (template: Template) => void
  className?: string
}

interface Template {
  id: number
  name: string
  type: 'email' | 'sms'
  subject?: string
  content: string
  variables: string[]
  usage_count: number
  created_at: string
  updated_at: string
}

interface TemplateForm {
  name: string
  type: 'email' | 'sms'
  subject?: string
  content: string
  variables: string[]
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  onSelectTemplate,
  className = ''
}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [templateForm, setTemplateForm] = useState<TemplateForm>({
    name: '',
    type: 'email',
    content: '',
    variables: []
  })
  const [previewData, setPreviewData] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      
      const [emailTemplates, smsTemplates] = await Promise.all([
        marketingApi.getEmailTemplates(),
        marketingApi.getSMSTemplates()
      ])

      setTemplates([...emailTemplates, ...smsTemplates])
    } catch (err) {
      console.error('Failed to load templates:', err)
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const extractVariables = (content: string): string[] => {
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g
    const variables = new Set<string>()
    let match

    while ((match = variableRegex.exec(content)) !== null) {
      variables.add(match[1].trim())
    }

    return Array.from(variables)
  }

  const generatePreview = (content: string, variables: string[]) => {
    let preview = content
    const sampleData: Record<string, string> = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      business_name: 'Your Business',
      booking_date: 'January 15, 2024',
      service_name: 'Premium Haircut',
      appointment_time: '2:00 PM',
      price: '$65.00'
    }

    variables.forEach(variable => {
      const value = sampleData[variable] || `[${variable}]`
      preview = preview.replace(new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'g'), value)
    })

    return preview
  }

  const handleCreateTemplate = () => {
    setIsCreating(true)
    setIsEditing(false)
    setTemplateForm({
      name: '',
      type: 'email',
      content: '',
      variables: []
    })
    setErrors({})
  }

  const handleEditTemplate = (template: Template) => {
    setIsEditing(true)
    setIsCreating(false)
    setSelectedTemplate(template)
    setTemplateForm({
      name: template.name,
      type: template.type,
      subject: template.subject,
      content: template.content,
      variables: template.variables
    })
    setErrors({})
  }

  const handleContentChange = (content: string) => {
    const variables = extractVariables(content)
    setTemplateForm(prev => ({ ...prev, content, variables }))
    setPreviewData(generatePreview(content, variables))
  }

  const validateTemplate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!templateForm.name.trim()) {
      newErrors.name = 'Template name is required'
    }

    if (templateForm.type === 'email' && !templateForm.subject?.trim()) {
      newErrors.subject = 'Email subject is required'
    }

    if (!templateForm.content.trim()) {
      newErrors.content = 'Template content is required'
    }

    if (templateForm.type === 'sms' && templateForm.content.length > 320) {
      newErrors.content = 'SMS content should be under 320 characters for optimal delivery'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveTemplate = async () => {
    if (!validateTemplate()) return

    try {
      setIsLoading(true)

      if (isCreating) {
        const newTemplate = await marketingApi.createEmailTemplate(templateForm)
        setTemplates(prev => [...prev, newTemplate])
        toast({
          title: 'Template Created',
          description: 'Template has been created successfully'
        })
      } else if (selectedTemplate) {
        const updatedTemplate = await marketingApi.updateEmailTemplate(selectedTemplate.id, templateForm)
        setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? updatedTemplate : t))
        toast({
          title: 'Template Updated',
          description: 'Template has been updated successfully'
        })
      }

      setIsCreating(false)
      setIsEditing(false)
      setSelectedTemplate(null)
    } catch (err) {
      console.error('Failed to save template:', err)
      toast({
        title: 'Save Failed',
        description: 'Failed to save template',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return

    try {
      await marketingApi.deleteEmailTemplate(template.id)
      setTemplates(prev => prev.filter(t => t.id !== template.id))
      toast({
        title: 'Template Deleted',
        description: 'Template has been deleted successfully'
      })
    } catch (err) {
      console.error('Failed to delete template:', err)
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete template',
        variant: 'destructive'
      })
    }
  }

  const handleDuplicateTemplate = async (template: Template) => {
    setTemplateForm({
      name: `${template.name} (Copy)`,
      type: template.type,
      subject: template.subject,
      content: template.content,
      variables: template.variables
    })
    setIsCreating(true)
    setIsEditing(false)
  }

  const availableVariables = [
    { key: 'first_name', label: 'First Name', example: 'John' },
    { key: 'last_name', label: 'Last Name', example: 'Doe' },
    { key: 'email', label: 'Email', example: 'john@example.com' },
    { key: 'phone', label: 'Phone', example: '(555) 123-4567' },
    { key: 'business_name', label: 'Business Name', example: 'Your Business' },
    { key: 'booking_date', label: 'Booking Date', example: 'January 15, 2024' },
    { key: 'service_name', label: 'Service', example: 'Premium Haircut' },
    { key: 'appointment_time', label: 'Time', example: '2:00 PM' },
    { key: 'price', label: 'Price', example: '$65.00' }
  ]

  const emailTemplates = templates.filter(t => t.type === 'email')
  const smsTemplates = templates.filter(t => t.type === 'sms')

  if (isLoading && templates.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Manager</h2>
          <p className="text-muted-foreground">
            Create and manage reusable email and SMS templates
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || isEditing) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {isCreating ? 'Create New Template' : 'Edit Template'}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreating(false)
                  setIsEditing(false)
                  setSelectedTemplate(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {/* Template Type */}
                <div>
                  <label className="text-sm font-medium">Template Type</label>
                  <div className="flex gap-4 mt-2">
                    <Button
                      variant={templateForm.type === 'email' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTemplateForm(prev => ({ ...prev, type: 'email' }))}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant={templateForm.type === 'sms' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTemplateForm(prev => ({ ...prev, type: 'sms' }))}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS
                    </Button>
                  </div>
                </div>

                {/* Template Name */}
                <div>
                  <label className="text-sm font-medium">Template Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter template name"
                    className="w-full mt-1 p-2 border rounded"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Email Subject */}
                {templateForm.type === 'email' && (
                  <div>
                    <label className="text-sm font-medium">Subject Line</label>
                    <input
                      type="text"
                      value={templateForm.subject || ''}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enter email subject"
                      className="w-full mt-1 p-2 border rounded"
                    />
                    {errors.subject && (
                      <p className="text-xs text-red-500 mt-1">{errors.subject}</p>
                    )}
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <textarea
                    value={templateForm.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder={`Enter your ${templateForm.type} template content...`}
                    className="w-full mt-1 p-3 border rounded resize-none"
                    rows={templateForm.type === 'sms' ? 6 : 10}
                  />
                  {errors.content && (
                    <p className="text-xs text-red-500 mt-1">{errors.content}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {templateForm.content.length} characters
                      {templateForm.type === 'sms' && templateForm.content.length > 160 && 
                        ` (${Math.ceil(templateForm.content.length / 160)} SMS segments)`
                      }
                    </p>
                    {templateForm.variables.length > 0 && (
                      <Badge variant="outline">
                        {templateForm.variables.length} variables detected
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Variables */}
                <div>
                  <label className="text-sm font-medium">Available Variables</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableVariables.map((variable) => (
                      <Button
                        key={variable.key}
                        variant="outline"
                        size="sm"
                        className="justify-start text-xs"
                        onClick={() => {
                          const newContent = templateForm.content + `{{${variable.key}}}`
                          handleContentChange(newContent)
                        }}
                      >
                        <Hash className="h-3 w-3 mr-1" />
                        {variable.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveTemplate} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isCreating ? 'Create Template' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (templateForm.content) {
                        const preview = generatePreview(templateForm.content, templateForm.variables)
                        setPreviewData(preview)
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="text-sm font-medium">Preview</label>
                <div className="mt-2 p-4 border rounded-lg bg-muted/50 min-h-[200px]">
                  {templateForm.type === 'email' && templateForm.subject && (
                    <div className="mb-3 pb-3 border-b">
                      <p className="text-sm font-medium">Subject: {templateForm.subject}</p>
                    </div>
                  )}
                  <pre className="text-sm whitespace-pre-wrap">
                    {previewData || templateForm.content || 'Enter content to see preview...'}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">
            Email Templates ({emailTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="sms">
            SMS Templates ({smsTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          {emailTemplates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {emailTemplates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline">Email</Badge>
                    </div>
                    {template.subject && (
                      <CardDescription className="text-xs">
                        {template.subject}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {template.content.substring(0, 120)}...
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Used {template.usage_count} times</span>
                      <span>{template.variables.length} variables</span>
                    </div>

                    <div className="flex gap-1">
                      {onSelectTemplate && (
                        <Button
                          size="sm"
                          onClick={() => onSelectTemplate(template)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Use
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Email Templates</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first email template to get started
                </p>
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Email Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          {smsTemplates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {smsTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge variant="outline">SMS</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {template.content}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Used {template.usage_count} times</span>
                      <span>{template.content.length} chars</span>
                    </div>

                    <div className="flex gap-1">
                      {onSelectTemplate && (
                        <Button
                          size="sm"
                          onClick={() => onSelectTemplate(template)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Use
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicateTemplate(template)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No SMS Templates</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first SMS template to get started
                </p>
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create SMS Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}