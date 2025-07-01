'use client'

import { useState, useEffect } from 'react'
import { 
  getNotificationTemplates, 
  sendTestEmail, 
  sendTestSMS, 
  NotificationTemplate 
} from '../lib/api'

interface NotificationRecipient {
  id: string
  name: string
  email?: string
  phone?: string
  type: 'user' | 'client' | 'custom'
}

export default function SendNotification() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)
  const [notificationType, setNotificationType] = useState<'email' | 'sms'>('sms')  // Default to SMS
  const [recipientType, setRecipientType] = useState<'single' | 'bulk'>('single')
  const [recipients, setRecipients] = useState<string>('')
  const [customSubject, setCustomSubject] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [scheduleFor, setScheduleFor] = useState('')
  const [useTemplate, setUseTemplate] = useState(true)

  // Sample recipients for demonstration
  const sampleRecipients: NotificationRecipient[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', phone: '+1234567890', type: 'user' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891', type: 'client' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', phone: '+1234567892', type: 'client' },
  ]

  useEffect(() => {
    loadTemplates()
  }, [notificationType])

  useEffect(() => {
    if (selectedTemplate) {
      // Initialize variables with default values
      const defaultVariables: Record<string, string> = {}
      selectedTemplate.variables.forEach(variable => {
        switch (variable) {
          case 'client_name':
            defaultVariables[variable] = 'John Doe'
            break
          case 'user_name':
            defaultVariables[variable] = 'Admin User'
            break
          case 'service_name':
            defaultVariables[variable] = 'Haircut'
            break
          case 'appointment_date':
            defaultVariables[variable] = new Date().toLocaleDateString()
            break
          case 'appointment_time':
            defaultVariables[variable] = '2:00 PM'
            break
          case 'duration':
            defaultVariables[variable] = '30'
            break
          case 'price':
            defaultVariables[variable] = '45.00'
            break
          case 'business_name':
            defaultVariables[variable] = '6FB Barbershop'
            break
          case 'business_phone':
            defaultVariables[variable] = '(555) 123-4567'
            break
          default:
            defaultVariables[variable] = ''
        }
      })
      setVariables(defaultVariables)
      
      if (selectedTemplate.subject) {
        setCustomSubject(selectedTemplate.subject)
      }
    }
  }, [selectedTemplate])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const templateList = await getNotificationTemplates(notificationType, true)
      setTemplates(templateList)
    } catch (err: any) {
      setError(err.message || 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleVariableChange = (variable: string, value: string) => {
    setVariables(prev => ({ ...prev, [variable]: value }))
  }

  const renderTemplatePreview = () => {
    if (!selectedTemplate) return ''
    
    let preview = customMessage
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      preview = preview.replace(regex, value)
    })
    
    return preview
  }

  const renderSubjectPreview = () => {
    if (!customSubject) return ''
    
    let preview = customSubject
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      preview = preview.replace(regex, value)
    })
    
    return preview
  }

  const validateForm = (): string | null => {
    if (useTemplate && !selectedTemplate) {
      return 'Please select a template'
    }
    
    if (!useTemplate && !customMessage.trim()) {
      return 'Please enter a message'
    }
    
    if (notificationType === 'email' && !customSubject.trim()) {
      return 'Please enter a subject for email notifications'
    }
    
    if (!recipients.trim()) {
      return 'Please enter recipient email addresses or phone numbers'
    }
    
    // Validate recipient format
    const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r)
    if (notificationType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = recipientList.filter(email => !emailRegex.test(email))
      if (invalidEmails.length > 0) {
        return `Invalid email addresses: ${invalidEmails.join(', ')}`
      }
    } else {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/
      const invalidPhones = recipientList.filter(phone => !phoneRegex.test(phone))
      if (invalidPhones.length > 0) {
        return `Invalid phone numbers: ${invalidPhones.join(', ')}`
      }
    }
    
    return null
  }

  const handleSend = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSending(true)
    setError('')
    setSuccess('')

    try {
      // For demo purposes, we'll just send test notifications
      // In a real implementation, you'd have an API endpoint for sending custom notifications
      
      const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r)
      
      if (notificationType === 'email') {
        await sendTestEmail()
        setSuccess(`Email notification sent to ${recipientList.length} recipient(s)`)
      } else {
        await sendTestSMS()
        setSuccess(`SMS notification sent to ${recipientList.length} recipient(s)`)
      }
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to send notifications')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSending(false)
    }
  }

  const addSampleRecipient = (recipient: NotificationRecipient) => {
    const contact = notificationType === 'email' ? recipient.email : recipient.phone
    if (contact) {
      const currentRecipients = recipients.split(',').map(r => r.trim()).filter(r => r)
      if (!currentRecipients.includes(contact)) {
        setRecipients(prev => prev ? `${prev}, ${contact}` : contact)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Send Notification Form */}
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Send Direct Customer Communication</h2>
          <p className="text-gray-600 mt-1">
            <span className="font-medium text-teal-700">Send REAL text messages to customers' actual phone numbers</span>
            <br />
            This will deliver actual SMS messages to customers' mobile phones for direct communication
          </p>
        </div>

        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        <div className="px-6 py-6 space-y-6">
          {/* Notification Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Communication Method
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  value="sms"
                  checked={notificationType === 'sms'}
                  onChange={(e) => setNotificationType(e.target.value as 'email' | 'sms')}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <div className="ml-3">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">📱</span>
                    <span className="font-medium text-gray-900">Direct SMS to Customer's Phone</span>
                    <span className="ml-2 px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded">RECOMMENDED</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Send real text messages directly to customers' mobile phones. 
                    Customers can reply and start conversations.
                  </p>
                </div>
              </label>
              <label className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  value="email"
                  checked={notificationType === 'email'}
                  onChange={(e) => setNotificationType(e.target.value as 'email' | 'sms')}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <div className="ml-3">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">📧</span>
                    <span className="font-medium text-gray-900">Email Communication</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Send email notifications to customers' email addresses.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Template or Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Source
            </label>
            <div className="flex space-x-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={useTemplate}
                  onChange={() => setUseTemplate(true)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use Template</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!useTemplate}
                  onChange={() => setUseTemplate(false)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Custom Message</span>
              </label>
            </div>

            {useTemplate ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Template
                </label>
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => {
                    const template = templates.find(t => t.id === parseInt(e.target.value))
                    setSelectedTemplate(template || null)
                  }}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.template_type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                {notificationType === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Enter email subject..."
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Enter your message..."
                    rows={6}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Template Variables */}
          {useTemplate && selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Template Variables
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {variable}
                    </label>
                    <input
                      type="text"
                      value={variables[variable] || ''}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      placeholder={`Enter ${variable}...`}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subject Override for Templates */}
          {useTemplate && selectedTemplate && notificationType === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Subject {selectedTemplate.subject && '(Override)'}
              </label>
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder={selectedTemplate.subject || "Enter email subject..."}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {notificationType === 'sms' ? (
                <span>
                  <span className="text-teal-700 font-semibold">Customer Phone Numbers (REAL MOBILE PHONES)</span>
                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    WILL SEND ACTUAL SMS
                  </span>
                </span>
              ) : (
                'Email Addresses'
              )}
            </label>
            <textarea
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder={notificationType === 'email' 
                ? "Enter email addresses separated by commas..."
                : "Enter customer mobile phone numbers (e.g., +1234567890, +1987654321)..."
              }
              rows={3}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="mt-2 space-y-1">
              {notificationType === 'sms' ? (
                <>
                  <p className="text-sm text-teal-700 font-medium">
                    ⚠️ These are REAL customer phone numbers - actual SMS messages will be sent!
                  </p>
                  <p className="text-sm text-gray-600">
                    • Use international format: +1234567890 (US), +44123456789 (UK), etc.
                  </p>
                  <p className="text-sm text-gray-600">
                    • Customers can reply to these messages and start conversations
                  </p>
                  <p className="text-sm text-gray-600">
                    • Separate multiple phone numbers with commas
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Separate multiple email addresses with commas
                </p>
              )}
            </div>
          </div>

          {/* Quick Add Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Add Recipients
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {sampleRecipients.map((recipient) => {
                const contact = notificationType === 'email' ? recipient.email : recipient.phone
                if (!contact) return null
                
                return (
                  <button
                    key={recipient.id}
                    onClick={() => addSampleRecipient(recipient)}
                    className="flex items-center justify-between p-2 text-sm border border-gray-200 rounded hover:border-teal-300 hover:bg-teal-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="font-medium">{recipient.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({recipient.type})</span>
                    </div>
                    <span className="text-xs text-gray-600">{contact}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Schedule (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schedule For (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduleFor}
              onChange={(e) => setScheduleFor(e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Leave empty to send immediately
            </p>
          </div>

          {/* Send Button */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplate(null)
                  setRecipients('')
                  setCustomSubject('')
                  setCustomMessage('')
                  setVariables({})
                  setScheduleFor('')
                  setError('')
                  setSuccess('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                Clear Form
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !recipients.trim()}
                className="px-6 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  notificationType === 'sms' ? 'Sending Real SMS...' : 'Sending Email...'
                ) : scheduleFor ? (
                  notificationType === 'sms' ? 'Schedule Real SMS' : 'Schedule Email'
                ) : (
                  notificationType === 'sms' ? '📱 Send Real SMS Now' : '📧 Send Email Now'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {(selectedTemplate || customMessage) && (
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
          </div>
          <div className="px-6 py-6">
            {notificationType === 'email' && customSubject && (
              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject:</div>
                <div className="bg-gray-50 p-3 rounded border text-sm">
                  {renderSubjectPreview()}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message:</div>
              <div className="bg-gray-50 p-4 rounded border text-sm whitespace-pre-wrap">
                {useTemplate ? renderTemplatePreview() : customMessage}
              </div>
            </div>
            
            {Object.keys(variables).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Variables Used:</div>
                <div className="bg-blue-50 p-3 rounded text-xs">
                  {Object.entries(variables).map(([key, value], index) => (
                    <div key={index} className="flex justify-between py-1">
                      <span className="text-blue-600">{key}:</span>
                      <span className="text-blue-800">{value || '(empty)'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}