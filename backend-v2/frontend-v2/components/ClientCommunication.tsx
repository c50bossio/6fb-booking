'use client'

import { useState, useEffect } from 'react'
import { 
  getClientCommunicationPreferences, 
  updateClientCommunicationPreferences,
  type Client 
} from '@/lib/api'

interface CommunicationProps {
  clientId: number
  preferences: any
  client: Client
  onRefresh: () => void
}

interface CommunicationPreferences {
  email_notifications: boolean
  sms_notifications: boolean
  marketing_emails: boolean
  appointment_reminders: boolean
  promotional_offers: boolean
  newsletter: boolean
  preferred_contact_method: string
  reminder_timing: number // hours before appointment
  language_preference: string
  timezone: string
}

interface MessageTemplate {
  id: string
  name: string
  subject: string
  content: string
  type: 'email' | 'sms'
}

interface MessageHistory {
  id: number
  type: string
  subject: string
  content: string
  sent_at: string
  status: string
  template_used: string
}

export default function ClientCommunication({ clientId, preferences, client, onRefresh }: CommunicationProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPreferences, setCurrentPreferences] = useState<CommunicationPreferences>({
    email_notifications: true,
    sms_notifications: true,
    marketing_emails: false,
    appointment_reminders: true,
    promotional_offers: false,
    newsletter: false,
    preferred_contact_method: 'email',
    reminder_timing: 24,
    language_preference: 'en',
    timezone: 'America/New_York'
  })
  
  const [activeTab, setActiveTab] = useState('preferences')
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([])
  const [composeMode, setComposeMode] = useState(false)
  const [newMessage, setNewMessage] = useState({
    type: 'email',
    subject: '',
    content: '',
    template: ''
  })

  const messageTemplates: MessageTemplate[] = [
    {
      id: 'appointment_reminder',
      name: 'Appointment Reminder',
      subject: 'Upcoming Appointment Reminder',
      content: 'Hi {{client_name}}, this is a reminder that you have an appointment scheduled for {{appointment_date}} at {{appointment_time}}. We look forward to seeing you!',
      type: 'email'
    },
    {
      id: 'appointment_confirmation',
      name: 'Appointment Confirmation',
      subject: 'Appointment Confirmed',
      content: 'Hi {{client_name}}, your appointment has been confirmed for {{appointment_date}} at {{appointment_time}}. See you soon!',
      type: 'email'
    },
    {
      id: 'thank_you',
      name: 'Thank You Message',
      subject: 'Thank you for visiting us!',
      content: 'Hi {{client_name}}, thank you for visiting us today! We hope you loved your new look. Don\'t forget to book your next appointment!',
      type: 'email'
    },
    {
      id: 'promotional',
      name: 'Promotional Offer',
      subject: 'Special Offer Just for You!',
      content: 'Hi {{client_name}}, we have a special offer just for you! Book your next appointment this month and save 20%.',
      type: 'email'
    },
    {
      id: 'sms_reminder',
      name: 'SMS Reminder',
      subject: '',
      content: 'Hi {{client_name}}, reminder: appointment {{appointment_date}} at {{appointment_time}}. Reply CONFIRM to confirm.',
      type: 'sms'
    }
  ]

  useEffect(() => {
    if (preferences) {
      setCurrentPreferences({ ...currentPreferences, ...preferences })
    }
    loadMessageHistory()
  }, [preferences])

  const loadMessageHistory = async () => {
    // Mock message history - in real app, this would come from an API
    setMessageHistory([
      {
        id: 1,
        type: 'email',
        subject: 'Appointment Reminder',
        content: 'Your appointment is tomorrow at 2 PM',
        sent_at: '2024-06-28T10:00:00Z',
        status: 'delivered',
        template_used: 'appointment_reminder'
      },
      {
        id: 2,
        type: 'sms',
        subject: '',
        content: 'Hi John, reminder: appointment tomorrow 2 PM. Reply CONFIRM to confirm.',
        sent_at: '2024-06-27T14:00:00Z',
        status: 'delivered',
        template_used: 'sms_reminder'
      }
    ])
  }

  const handlePreferenceChange = (key: string, value: any) => {
    setCurrentPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const savePreferences = async () => {
    try {
      setLoading(true)
      setError('')
      await updateClientCommunicationPreferences(clientId, currentPreferences)
      setSuccess('Communication preferences updated successfully!')
      onRefresh()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to update preferences: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Replace template variables
      let content = newMessage.content
      content = content.replace('{{client_name}}', `${client.first_name} ${client.last_name}`)
      content = content.replace('{{appointment_date}}', new Date().toLocaleDateString())
      content = content.replace('{{appointment_time}}', '2:00 PM')
      
      // Mock sending - in real app, this would call an API
      console.log('Sending message:', { ...newMessage, content })
      
      // Add to message history
      const newHistoryItem = {
        id: Date.now(),
        type: newMessage.type,
        subject: newMessage.subject,
        content: content,
        sent_at: new Date().toISOString(),
        status: 'sent',
        template_used: newMessage.template
      }
      
      setMessageHistory(prev => [newHistoryItem, ...prev])
      setSuccess(`${newMessage.type.toUpperCase()} sent successfully!`)
      setComposeMode(false)
      setNewMessage({ type: 'email', subject: '', content: '', template: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to send message: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const useTemplate = (template: MessageTemplate) => {
    setNewMessage({
      type: template.type,
      subject: template.subject,
      content: template.content,
      template: template.id
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-100'
      case 'sent':
        return 'text-blue-600 bg-blue-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Communication Center</h2>
            <p className="text-gray-600 mt-1">Manage communication preferences and send messages</p>
          </div>
          <button 
            onClick={() => setComposeMode(true)}
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Compose Message
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {error}
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <nav className="flex overflow-x-auto">
          {[
            { id: 'preferences', label: 'Preferences', icon: '⚙️' },
            { id: 'history', label: 'Message History', icon: '📧' },
            { id: 'templates', label: 'Templates', icon: '📝' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'preferences' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Communication Preferences</h3>
            
            <div className="space-y-8">
              {/* Contact Methods */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Methods</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentPreferences.email_notifications}
                        onChange={(e) => handlePreferenceChange('email_notifications', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Email Notifications</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentPreferences.sms_notifications}
                        onChange={(e) => handlePreferenceChange('sms_notifications', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">SMS Notifications</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notification Types */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentPreferences.appointment_reminders}
                        onChange={(e) => handlePreferenceChange('appointment_reminders', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Appointment Reminders</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentPreferences.marketing_emails}
                        onChange={(e) => handlePreferenceChange('marketing_emails', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Marketing Emails</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentPreferences.promotional_offers}
                        onChange={(e) => handlePreferenceChange('promotional_offers', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Promotional Offers</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={currentPreferences.newsletter}
                        onChange={(e) => handlePreferenceChange('newsletter', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Newsletter</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preferred Contact Method
                    </label>
                    <select
                      value={currentPreferences.preferred_contact_method}
                      onChange={(e) => handlePreferenceChange('preferred_contact_method', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="phone">Phone Call</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reminder Timing (hours before appointment)
                    </label>
                    <select
                      value={currentPreferences.reminder_timing}
                      onChange={(e) => handlePreferenceChange('reminder_timing', parseInt(e.target.value))}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>1 hour</option>
                      <option value={2}>2 hours</option>
                      <option value={4}>4 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language Preference
                    </label>
                    <select
                      value={currentPreferences.language_preference}
                      onChange={(e) => handlePreferenceChange('language_preference', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={currentPreferences.timezone}
                      onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-6 border-t">
                <button
                  onClick={savePreferences}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Message History</h3>
            
            {messageHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.208a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No messages sent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messageHistory.map((message: any) => (
                  <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          message.type === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {message.type.toUpperCase()}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(message.status)}`}>
                          {message.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(message.sent_at)}</span>
                    </div>
                    
                    {message.subject && (
                      <h4 className="font-medium text-gray-900 mb-2">{message.subject}</h4>
                    )}
                    
                    <p className="text-gray-700 dark:text-gray-300 text-sm bg-gray-50 p-3 rounded">
                      {message.content}
                    </p>
                    
                    {message.template_used && (
                      <div className="mt-2 text-xs text-gray-500">
                        Template used: {message.template_used}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Message Templates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {messageTemplates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                        template.type === 'email' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {template.type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => useTemplate(template)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Use Template
                    </button>
                  </div>
                  
                  {template.subject && (
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject: {template.subject}
                    </p>
                  )}
                  
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {template.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Compose Message Modal */}
      {composeMode && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Compose Message</h3>
                <button
                  onClick={() => setComposeMode(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Type</label>
                  <select
                    value={newMessage.type}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, type: e.target.value as 'email' | 'sms' }))}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                
                {newMessage.type === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                    <input
                      type="text"
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email subject"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message Content</label>
                  <textarea
                    value={newMessage.content}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                    rows={newMessage.type === 'email' ? 8 : 4}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={newMessage.type === 'email' ? 'Enter your email message...' : 'Enter your SMS message (160 characters max)...'}
                  />
                  {newMessage.type === 'sms' && (
                    <p className="text-xs text-gray-500 mt-1">
                      {newMessage.content.length}/160 characters
                    </p>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <strong>Available variables:</strong> {`{{client_name}}, {{appointment_date}}, {{appointment_time}}`}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setComposeMode(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={loading || !newMessage.content.trim() || (newMessage.type === 'email' && !newMessage.subject.trim())}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : `Send ${newMessage.type.toUpperCase()}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}