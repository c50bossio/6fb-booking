'use client'

import { useState } from 'react'
import { useDemoMode } from '@/components/demo/DemoModeProvider'
import DemoWrapper from '@/components/demo/DemoWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { format, addHours, subHours } from 'date-fns'
import { 
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface DemoNotification {
  id: number
  type: 'sms' | 'email' | 'push'
  template: string
  recipient: string
  content: string
  status: 'sent' | 'delivered' | 'failed' | 'pending'
  sent_at: string
  appointment_id?: number
}

const NOTIFICATION_TEMPLATES = [
  {
    id: 'booking_confirmation',
    name: 'Booking Confirmation',
    type: 'email',
    subject: 'Appointment Confirmed',
    content: 'Hi {{client_name}}, your appointment for {{service_name}} on {{date}} at {{time}} is confirmed.',
    trigger: 'Immediately after booking'
  },
  {
    id: 'reminder_24h',
    name: '24-Hour Reminder',
    type: 'sms',
    content: 'Hi {{client_name}}! Reminder: You have a {{service_name}} appointment tomorrow at {{time}} with {{barber_name}}.',
    trigger: '24 hours before appointment'
  },
  {
    id: 'reminder_2h',
    name: '2-Hour Reminder',
    type: 'sms',
    content: 'Your {{service_name}} appointment is in 2 hours at {{location}}. See you soon!',
    trigger: '2 hours before appointment'
  },
  {
    id: 'thank_you',
    name: 'Thank You Message',
    type: 'email',
    subject: 'Thank you for your visit!',
    content: 'Thanks for choosing us, {{client_name}}! We hope you love your new look. Book again anytime.',
    trigger: '2 hours after appointment'
  },
  {
    id: 'reschedule_request',
    name: 'Reschedule Request',
    type: 'email',
    subject: 'Appointment Rescheduled',
    content: 'Your appointment has been moved to {{new_date}} at {{new_time}}. Please confirm if this works for you.',
    trigger: 'When appointment is rescheduled'
  }
]

// Generate realistic demo notifications
const generateDemoNotifications = (): DemoNotification[] => {
  const notifications: DemoNotification[] = []
  const clients = ['Marcus Johnson', 'David Thompson', 'Alex Rivera', 'Jordan Smith', 'Chris Williams']
  const statuses: ('sent' | 'delivered' | 'failed' | 'pending')[] = ['delivered', 'delivered', 'delivered', 'sent', 'failed']
  
  for (let i = 0; i < 20; i++) {
    const template = NOTIFICATION_TEMPLATES[Math.floor(Math.random() * NOTIFICATION_TEMPLATES.length)]
    const client = clients[Math.floor(Math.random() * clients.length)]
    const sentTime = subHours(new Date(), Math.floor(Math.random() * 72))
    
    notifications.push({
      id: i + 1,
      type: template.type as 'sms' | 'email',
      template: template.name,
      recipient: template.type === 'email' ? `${client.toLowerCase().replace(' ', '.')}@email.com` : `+1 (555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      content: template.content.replace('{{client_name}}', client),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      sent_at: sentTime.toISOString(),
      appointment_id: Math.floor(Math.random() * 100) + 1
    })
  }
  
  return notifications.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
}

export default function DemoNotificationsPage() {
  const { user } = useDemoMode()
  const [notifications] = useState<DemoNotification[]>(generateDemoNotifications())
  const [selectedTemplate, setSelectedTemplate] = useState(NOTIFICATION_TEMPLATES[0])
  const [testRecipient, setTestRecipient] = useState('')
  
  // Calculate metrics
  const totalSent = notifications.length
  const deliveryRate = (notifications.filter(n => n.status === 'delivered').length / totalSent * 100)
  const smsCount = notifications.filter(n => n.type === 'sms').length
  const emailCount = notifications.filter(n => n.type === 'email').length
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircleIcon className="w-4 h-4" />
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4" />
      default:
        return <ClockIcon className="w-4 h-4" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <DevicePhoneMobileIcon className="w-4 h-4" />
      case 'email':
        return <EnvelopeIcon className="w-4 h-4" />
      default:
        return <BellIcon className="w-4 h-4" />
    }
  }

  const demoFeatures = [
    'View automated notification history (SMS and email)',
    'Test different message templates with live preview',
    'Monitor delivery rates and failed notifications',
    'See Twilio and SendGrid integration examples'
  ]

  return (
    <DemoWrapper
      title="Notifications Center"
      description="Automated client communications via SMS and Email"
      demoFeatures={demoFeatures}
    >
      <div className="space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sent</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalSent}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Last 30 days
                  </div>
                </div>
                <BellIcon className="w-8 h-8 text-primary-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Rate</p>
                  <div className="text-2xl font-bold text-green-600">
                    {deliveryRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Successfully delivered
                  </div>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">SMS Messages</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {smsCount}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Via Twilio
                  </div>
                </div>
                <DevicePhoneMobileIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email Messages</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {emailCount}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Via SendGrid
                  </div>
                </div>
                <EnvelopeIcon className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Integration Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <DevicePhoneMobileIcon className="w-5 h-5" />
                Twilio SMS Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                <li>• Instant appointment reminders</li>
                <li>• 98.5% delivery rate worldwide</li>
                <li>• Automated retry on failures</li>
                <li>• Custom sender ID support</li>
                <li>• Two-way messaging capability</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-purple-900 dark:text-purple-300 flex items-center gap-2">
                <EnvelopeIcon className="w-5 h-5" />
                SendGrid Email Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-2">
                <li>• Professional email templates</li>
                <li>• Advanced delivery analytics</li>
                <li>• Spam filter optimization</li>
                <li>• Branded email design</li>
                <li>• A/B testing capabilities</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Template Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {NOTIFICATION_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-4 border rounded-lg transition-all ${
                      selectedTemplate.id === template.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(template.type)}
                      <span className="font-medium">{template.name}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.type === 'sms' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {template.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {template.trigger}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    {getTypeIcon(selectedTemplate.type)}
                    <span className="font-medium">{selectedTemplate.name}</span>
                  </div>
                  {selectedTemplate.subject && (
                    <div className="mb-3">
                      <Label className="text-xs text-gray-500">Subject:</Label>
                      <div className="font-medium">{selectedTemplate.subject}</div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-500">Message:</Label>
                    <div className="text-sm bg-white dark:bg-gray-700 p-3 rounded border">
                      {selectedTemplate.content}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="test-recipient">Test Send</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="test-recipient"
                      placeholder={selectedTemplate.type === 'email' ? 'email@example.com' : '+1 (555) 123-4567'}
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                    />
                    <Button variant="outline">
                      Send Test
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.slice(0, 10).map((notification) => (
                <div key={notification.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(notification.type)}
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        notification.type === 'sms' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {notification.type.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {notification.template}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        To: {notification.recipient}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 max-w-md truncate">
                        {notification.content}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(notification.status)}
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(notification.status)}`}>
                        {notification.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {format(new Date(notification.sent_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Automation Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Automation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <CalendarDaysIcon className="w-8 h-8 text-green-600 mb-3" />
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                  Booking Confirmations
                </h4>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Automatically send confirmation emails and SMS when appointments are booked
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <ClockIcon className="w-8 h-8 text-blue-600 mb-3" />
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Smart Reminders
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Send timely reminders 24h and 2h before appointments to reduce no-shows
                </p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-purple-600 mb-3" />
                <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">
                  Follow-up Messages
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-400">
                  Thank clients and encourage rebooking with personalized follow-ups
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DemoWrapper>
  )
}