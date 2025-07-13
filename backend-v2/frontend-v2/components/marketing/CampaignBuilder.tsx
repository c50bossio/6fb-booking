import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { 
  Mail, 
  MessageSquare,
  Users,
  Calendar,
  Settings,
  Send,
  Save,
  Eye,
  ArrowLeft,
  ArrowRight,
  Clock,
  Target,
  Zap,
  CheckCircle,
  AlertTriangle,
  User,
  Hash,
  AtSign
} from 'lucide-react'
import { marketingApi } from '@/lib/api/integrations'
import { useToast } from '@/hooks/use-toast'

interface CampaignBuilderProps {
  campaignId?: number
  onCancel: () => void
  onSave: (campaign: any) => void
  className?: string
}

interface CampaignData {
  name: string
  type: 'email' | 'sms'
  subject?: string
  content: string
  template_id?: number
  contact_lists: number[]
  scheduled_at?: string
  send_immediately: boolean
}

interface Template {
  id: number
  name: string
  type: 'email' | 'sms'
  subject?: string
  content: string
  variables: string[]
}

interface ContactList {
  id: number
  name: string
  contact_count: number
  description?: string
}

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  campaignId,
  onCancel,
  onSave,
  className = ''
}) => {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    type: 'email',
    content: '',
    contact_lists: [],
    send_immediately: true
  })
  const [previewData, setPreviewData] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadBuilderData()
  }, [])

  const loadBuilderData = async () => {
    try {
      setIsLoading(true)
      
      const [emailTemplates, smsTemplates] = await Promise.all([
        marketingApi.getEmailTemplates(),
        marketingApi.getSMSTemplates()
      ])

      setTemplates([...emailTemplates, ...smsTemplates])
      
      // Mock contact lists - would be loaded from API
      setContactLists([
        { id: 1, name: 'All Clients', contact_count: 150, description: 'All active clients' },
        { id: 2, name: 'New Clients', contact_count: 25, description: 'Clients who joined this month' },
        { id: 3, name: 'VIP Clients', contact_count: 30, description: 'High-value clients' },
        { id: 4, name: 'Inactive Clients', contact_count: 45, description: 'Clients who haven\'t booked in 3+ months' }
      ])
    } catch (err) {
      console.error('Failed to load builder data:', err)
      toast({
        title: 'Error',
        description: 'Failed to load campaign builder data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateSelect = async (template: Template) => {
    setCampaignData(prev => ({
      ...prev,
      type: template.type,
      subject: template.subject || prev.subject,
      content: template.content,
      template_id: template.id
    }))

    // Generate preview
    try {
      const preview = await generatePreview(template.content, {
        first_name: 'John',
        last_name: 'Doe',
        business_name: 'Your Business'
      })
      setPreviewData(preview)
    } catch (err) {
      console.error('Failed to generate preview:', err)
    }
  }

  const generatePreview = async (content: string, sampleData: Record<string, string>) => {
    // Simple template variable replacement for preview
    let preview = content
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value)
    })
    return preview
  }

  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {}

    switch (step) {
      case 1: // Campaign Details
        if (!campaignData.name.trim()) {
          stepErrors.name = 'Campaign name is required'
        }
        if (campaignData.type === 'email' && !campaignData.subject?.trim()) {
          stepErrors.subject = 'Email subject is required'
        }
        if (!campaignData.content.trim()) {
          stepErrors.content = 'Campaign content is required'
        }
        break
      
      case 2: // Audience
        if (campaignData.contact_lists.length === 0) {
          stepErrors.contact_lists = 'At least one contact list must be selected'
        }
        break
      
      case 3: // Schedule
        if (!campaignData.send_immediately && !campaignData.scheduled_at) {
          stepErrors.scheduled_at = 'Scheduled date/time is required'
        }
        break
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSaveDraft = async () => {
    try {
      setIsLoading(true)
      // API call to save draft
      const savedCampaign = await marketingApi.createCampaign({
        ...campaignData,
        status: 'draft'
      })
      
      toast({
        title: 'Draft Saved',
        description: 'Campaign has been saved as draft'
      })
      
      onSave(savedCampaign)
    } catch (err) {
      console.error('Failed to save draft:', err)
      toast({
        title: 'Save Failed',
        description: 'Failed to save campaign draft',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendCampaign = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      toast({
        title: 'Validation Error',
        description: 'Please complete all required fields',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)
      // API call to send campaign
      const sentCampaign = await marketingApi.createCampaign({
        ...campaignData,
        status: campaignData.send_immediately ? 'sending' : 'scheduled'
      })
      
      toast({
        title: campaignData.send_immediately ? 'Campaign Sent' : 'Campaign Scheduled',
        description: campaignData.send_immediately 
          ? 'Your campaign is being sent to recipients'
          : 'Your campaign has been scheduled successfully'
      })
      
      onSave(sentCampaign)
    } catch (err) {
      console.error('Failed to send campaign:', err)
      toast({
        title: 'Send Failed',
        description: 'Failed to send campaign',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getTotalRecipients = () => {
    return contactLists
      .filter(list => campaignData.contact_lists.includes(list.id))
      .reduce((sum, list) => sum + list.contact_count, 0)
  }

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1: return <Mail className="h-4 w-4" />
      case 2: return <Users className="h-4 w-4" />
      case 3: return <Calendar className="h-4 w-4" />
      case 4: return <Send className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const availableVariables = [
    { key: 'first_name', label: 'First Name', example: 'John' },
    { key: 'last_name', label: 'Last Name', example: 'Doe' },
    { key: 'email', label: 'Email', example: 'john@example.com' },
    { key: 'phone', label: 'Phone', example: '(555) 123-4567' },
    { key: 'business_name', label: 'Business Name', example: 'Your Business' },
    { key: 'booking_date', label: 'Next Booking', example: 'January 15, 2024' }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {campaignId ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
          <p className="text-muted-foreground">
            {currentStep === 1 && 'Design your campaign content'}
            {currentStep === 2 && 'Select your audience'}
            {currentStep === 3 && 'Choose when to send'}
            {currentStep === 4 && 'Review and send'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step <= currentStep 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'border-muted-foreground text-muted-foreground'
            }`}>
              {step < currentStep ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                getStepIcon(step)
              )}
            </div>
            {step < 4 && (
              <div className={`w-16 h-0.5 mx-2 ${
                step < currentStep ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Step 1: Campaign Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Campaign Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Campaign Type */}
                <div>
                  <label className="text-sm font-medium">Campaign Type</label>
                  <div className="flex gap-4 mt-2">
                    <Button
                      variant={campaignData.type === 'email' ? 'default' : 'outline'}
                      onClick={() => setCampaignData(prev => ({ ...prev, type: 'email' }))}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant={campaignData.type === 'sms' ? 'default' : 'outline'}
                      onClick={() => setCampaignData(prev => ({ ...prev, type: 'sms' }))}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS
                    </Button>
                  </div>
                </div>

                {/* Campaign Name */}
                <div>
                  <label className="text-sm font-medium">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignData.name}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                    className="w-full mt-1 p-2 border rounded"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Email Subject */}
                {campaignData.type === 'email' && (
                  <div>
                    <label className="text-sm font-medium">Subject Line</label>
                    <input
                      type="text"
                      value={campaignData.subject || ''}
                      onChange={(e) => setCampaignData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Enter email subject"
                      className="w-full mt-1 p-2 border rounded"
                    />
                    {errors.subject && (
                      <p className="text-xs text-red-500 mt-1">{errors.subject}</p>
                    )}
                  </div>
                )}

                {/* Template Selection */}
                <div>
                  <label className="text-sm font-medium">Choose Template (Optional)</label>
                  <div className="grid gap-3 mt-2">
                    {templates
                      .filter(t => t.type === campaignData.type)
                      .slice(0, 3)
                      .map((template) => (
                        <div
                          key={template.id}
                          className={`p-3 border rounded-lg cursor-pointer hover:border-primary ${
                            campaignData.template_id === template.id ? 'border-primary bg-primary/5' : ''
                          }`}
                          onClick={() => handleTemplateSelect(template)}
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-sm">{template.name}</h5>
                            <Badge variant="outline">{template.variables.length} variables</Badge>
                          </div>
                          {template.subject && (
                            <p className="text-xs text-muted-foreground mt-1">{template.subject}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Content Editor */}
                <div>
                  <label className="text-sm font-medium">Message Content</label>
                  <textarea
                    value={campaignData.content}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder={`Enter your ${campaignData.type} content here...`}
                    className="w-full mt-1 p-3 border rounded resize-none"
                    rows={campaignData.type === 'sms' ? 4 : 8}
                  />
                  {errors.content && (
                    <p className="text-xs text-red-500 mt-1">{errors.content}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {campaignData.content.length} characters
                      {campaignData.type === 'sms' && campaignData.content.length > 160 && 
                        ` (${Math.ceil(campaignData.content.length / 160)} SMS segments)`
                      }
                    </p>
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Audience Selection */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Audience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {contactLists.map((list) => (
                    <div
                      key={list.id}
                      className={`p-4 border rounded-lg cursor-pointer ${
                        campaignData.contact_lists.includes(list.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setCampaignData(prev => ({
                          ...prev,
                          contact_lists: prev.contact_lists.includes(list.id)
                            ? prev.contact_lists.filter(id => id !== list.id)
                            : [...prev.contact_lists, list.id]
                        }))
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium">{list.name}</h5>
                          <p className="text-sm text-muted-foreground">{list.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{list.contact_count} contacts</Badge>
                          {campaignData.contact_lists.includes(list.id) && (
                            <CheckCircle className="h-4 w-4 text-primary mt-1 ml-auto" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.contact_lists && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{errors.contact_lists}</AlertDescription>
                  </Alert>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <h5 className="font-medium mb-2">Campaign Reach</h5>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Recipients:</span>
                    <span className="font-medium">{getTotalRecipients()} contacts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Schedule */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="send-now"
                      checked={campaignData.send_immediately}
                      onChange={() => setCampaignData(prev => ({ ...prev, send_immediately: true }))}
                    />
                    <label htmlFor="send-now" className="text-sm font-medium cursor-pointer">
                      Send immediately
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="schedule"
                      checked={!campaignData.send_immediately}
                      onChange={() => setCampaignData(prev => ({ ...prev, send_immediately: false }))}
                    />
                    <label htmlFor="schedule" className="text-sm font-medium cursor-pointer">
                      Schedule for later
                    </label>
                  </div>

                  {!campaignData.send_immediately && (
                    <div className="ml-6">
                      <input
                        type="datetime-local"
                        value={campaignData.scheduled_at || ''}
                        onChange={(e) => setCampaignData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                        className="p-2 border rounded"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      {errors.scheduled_at && (
                        <p className="text-xs text-red-500 mt-1">{errors.scheduled_at}</p>
                      )}
                    </div>
                  )}
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    {campaignData.send_immediately
                      ? 'Your campaign will be sent immediately after confirmation.'
                      : 'Your campaign will be sent at the scheduled time in your local timezone.'
                    }
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Review & Send
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h5 className="font-medium mb-2">Campaign Details</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Name:</span>
                        <span>{campaignData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <Badge variant="outline">{campaignData.type}</Badge>
                      </div>
                      {campaignData.subject && (
                        <div className="flex justify-between">
                          <span>Subject:</span>
                          <span className="text-right">{campaignData.subject}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2">Audience & Schedule</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Recipients:</span>
                        <span>{getTotalRecipients()} contacts</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Send Time:</span>
                        <span>{campaignData.send_immediately ? 'Immediately' : 'Scheduled'}</span>
                      </div>
                      {campaignData.scheduled_at && (
                        <div className="flex justify-between">
                          <span>Date:</span>
                          <span>{new Date(campaignData.scheduled_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium mb-2">Content Preview</h5>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <pre className="text-sm whitespace-pre-wrap">{campaignData.content}</pre>
                  </div>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your campaign is ready to send! Once sent, it cannot be modified.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Variables Helper */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Variables</CardTitle>
                <CardDescription>
                  Click to insert into your content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableVariables.map((variable) => (
                    <Button
                      key={variable.key}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        const newContent = campaignData.content + `{{${variable.key}}}`
                        setCampaignData(prev => ({ ...prev, content: newContent }))
                      }}
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      {variable.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <Badge variant="outline">{campaignData.type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Recipients:</span>
                  <span>{getTotalRecipients()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant="outline">Draft</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentStep < 4 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSendCampaign} disabled={isLoading}>
              <Send className="h-4 w-4 mr-2" />
              {campaignData.send_immediately ? 'Send Campaign' : 'Schedule Campaign'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}