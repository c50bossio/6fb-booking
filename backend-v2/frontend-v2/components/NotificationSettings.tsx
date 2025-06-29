'use client'

import { useState, useEffect } from 'react'
import { 
  getNotificationPreferences, 
  updateNotificationPreferences, 
  sendTestEmail, 
  sendTestSMS,
  NotificationPreferences,
  NotificationPreferencesUpdate 
} from '../lib/api'

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingSMS, setTestingSMS] = useState(false)
  
  const [formData, setFormData] = useState<NotificationPreferencesUpdate>({})

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setLoading(true)
    setError('')
    try {
      const userPreferences = await getNotificationPreferences()
      setPreferences(userPreferences)
      setFormData({
        email_enabled: userPreferences.email_enabled,
        email_appointment_confirmation: userPreferences.email_appointment_confirmation,
        email_appointment_reminder: userPreferences.email_appointment_reminder,
        email_appointment_changes: userPreferences.email_appointment_changes,
        email_marketing: userPreferences.email_marketing,
        sms_enabled: userPreferences.sms_enabled,
        sms_appointment_confirmation: userPreferences.sms_appointment_confirmation,
        sms_appointment_reminder: userPreferences.sms_appointment_reminder,
        sms_appointment_changes: userPreferences.sms_appointment_changes,
        sms_marketing: userPreferences.sms_marketing,
        reminder_hours: userPreferences.reminder_hours
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof NotificationPreferencesUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const handleReminderHoursChange = (hours: string) => {
    try {
      const hoursArray = hours.split(',').map(h => parseInt(h.trim())).filter(h => !isNaN(h) && h > 0)
      handleInputChange('reminder_hours', hoursArray)
    } catch (err) {
      setError('Invalid reminder hours format. Use comma-separated numbers (e.g., 24,2)')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Validate reminder hours
      if (formData.reminder_hours && formData.reminder_hours.length === 0) {
        throw new Error('At least one reminder hour must be specified')
      }

      // Update preferences
      const updatedPreferences = await updateNotificationPreferences(formData)
      setPreferences(updatedPreferences)
      setSuccess('Notification preferences updated successfully!')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to update notification preferences')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    setTestingEmail(true)
    setError('')
    setSuccess('')
    try {
      const result = await sendTestEmail()
      setSuccess('Test email sent successfully! Check your inbox.')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to send test email')
      setTimeout(() => setError(''), 5000)
    } finally {
      setTestingEmail(false)
    }
  }

  const handleTestSMS = async () => {
    setTestingSMS(true)
    setError('')
    setSuccess('')
    try {
      const result = await sendTestSMS()
      setSuccess('Test SMS sent successfully! Check your phone.')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to send test SMS')
      setTimeout(() => setError(''), 5000)
    } finally {
      setTestingSMS(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Notification Settings</h2>
        </div>
        <div className="px-6 py-8 text-center">
          <div className="text-gray-500">Loading notification settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
          <p className="text-gray-600 mt-1">Configure how and when you receive notifications</p>
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

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">
          {/* Email Notifications */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📧</span>
              Email Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="email_enabled"
                  checked={formData.email_enabled || false}
                  onChange={(e) => handleInputChange('email_enabled', e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="email_enabled" className="ml-3 text-sm font-medium text-gray-700">
                  Enable email notifications
                </label>
              </div>
              
              {formData.email_enabled && (
                <div className="ml-7 space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="email_appointment_confirmation"
                      checked={formData.email_appointment_confirmation || false}
                      onChange={(e) => handleInputChange('email_appointment_confirmation', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="email_appointment_confirmation" className="ml-3 text-sm text-gray-600">
                      Appointment confirmations
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="email_appointment_reminder"
                      checked={formData.email_appointment_reminder || false}
                      onChange={(e) => handleInputChange('email_appointment_reminder', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="email_appointment_reminder" className="ml-3 text-sm text-gray-600">
                      Appointment reminders
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="email_appointment_changes"
                      checked={formData.email_appointment_changes || false}
                      onChange={(e) => handleInputChange('email_appointment_changes', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="email_appointment_changes" className="ml-3 text-sm text-gray-600">
                      Appointment changes and cancellations
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="email_marketing"
                      checked={formData.email_marketing || false}
                      onChange={(e) => handleInputChange('email_marketing', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="email_marketing" className="ml-3 text-sm text-gray-600">
                      Marketing and promotional emails
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SMS Notifications */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📱</span>
              SMS Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sms_enabled"
                  checked={formData.sms_enabled || false}
                  onChange={(e) => handleInputChange('sms_enabled', e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="sms_enabled" className="ml-3 text-sm font-medium text-gray-700">
                  Enable SMS notifications
                </label>
              </div>
              
              {formData.sms_enabled && (
                <div className="ml-7 space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sms_appointment_confirmation"
                      checked={formData.sms_appointment_confirmation || false}
                      onChange={(e) => handleInputChange('sms_appointment_confirmation', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sms_appointment_confirmation" className="ml-3 text-sm text-gray-600">
                      Appointment confirmations
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sms_appointment_reminder"
                      checked={formData.sms_appointment_reminder || false}
                      onChange={(e) => handleInputChange('sms_appointment_reminder', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sms_appointment_reminder" className="ml-3 text-sm text-gray-600">
                      Appointment reminders
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sms_appointment_changes"
                      checked={formData.sms_appointment_changes || false}
                      onChange={(e) => handleInputChange('sms_appointment_changes', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sms_appointment_changes" className="ml-3 text-sm text-gray-600">
                      Appointment changes and cancellations
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sms_marketing"
                      checked={formData.sms_marketing || false}
                      onChange={(e) => handleInputChange('sms_marketing', e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sms_marketing" className="ml-3 text-sm text-gray-600">
                      Marketing and promotional messages
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reminder Timing */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <span className="mr-2">⏰</span>
              Reminder Timing
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Send reminders (hours before appointment)
                </label>
                <input
                  type="text"
                  value={formData.reminder_hours?.join(', ') || ''}
                  onChange={(e) => handleReminderHoursChange(e.target.value)}
                  placeholder="e.g., 24, 2"
                  className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter comma-separated hours (e.g., "24, 2" for 24 hours and 2 hours before)
                </p>
              </div>
              
              {formData.reminder_hours && formData.reminder_hours.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 mb-2">Reminder Schedule:</div>
                  <div className="space-y-1">
                    {formData.reminder_hours.map((hours, index) => (
                      <div key={index} className="text-sm text-blue-700">
                        • {hours} hour{hours !== 1 ? 's' : ''} before appointment
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Test Notifications */}
      <div className="bg-white shadow-lg rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Test Notifications</h3>
          <p className="text-gray-600 mt-1">Send test notifications to verify your settings</p>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <span className="mr-2">📧</span>
                Test Email
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Send a test email notification to verify email settings and template rendering.
              </p>
              <button
                onClick={handleTestEmail}
                disabled={testingEmail || !formData.email_enabled}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingEmail ? 'Sending...' : 'Send Test Email'}
              </button>
              {!formData.email_enabled && (
                <p className="text-xs text-gray-500 mt-2">
                  Email notifications must be enabled to send test emails
                </p>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                <span className="mr-2">📱</span>
                Test SMS
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Send a test SMS notification to verify SMS settings and template rendering.
              </p>
              <button
                onClick={handleTestSMS}
                disabled={testingSMS || !formData.sms_enabled}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingSMS ? 'Sending...' : 'Send Test SMS'}
              </button>
              {!formData.sms_enabled && (
                <p className="text-xs text-gray-500 mt-2">
                  SMS notifications must be enabled to send test messages
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Settings Summary */}
      {preferences && (
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Current Settings Summary</h3>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Email Notifications</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enabled:</span>
                    <span className={preferences.email_enabled ? 'text-green-600' : 'text-red-600'}>
                      {preferences.email_enabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confirmations:</span>
                    <span className={preferences.email_appointment_confirmation ? 'text-green-600' : 'text-gray-500'}>
                      {preferences.email_appointment_confirmation ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reminders:</span>
                    <span className={preferences.email_appointment_reminder ? 'text-green-600' : 'text-gray-500'}>
                      {preferences.email_appointment_reminder ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Changes:</span>
                    <span className={preferences.email_appointment_changes ? 'text-green-600' : 'text-gray-500'}>
                      {preferences.email_appointment_changes ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">SMS Notifications</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enabled:</span>
                    <span className={preferences.sms_enabled ? 'text-green-600' : 'text-red-600'}>
                      {preferences.sms_enabled ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confirmations:</span>
                    <span className={preferences.sms_appointment_confirmation ? 'text-green-600' : 'text-gray-500'}>
                      {preferences.sms_appointment_confirmation ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reminders:</span>
                    <span className={preferences.sms_appointment_reminder ? 'text-green-600' : 'text-gray-500'}>
                      {preferences.sms_appointment_reminder ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Changes:</span>
                    <span className={preferences.sms_appointment_changes ? 'text-green-600' : 'text-gray-500'}>
                      {preferences.sms_appointment_changes ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Reminder Schedule</h4>
              <div className="text-gray-600">
                {preferences.reminder_hours.length > 0 
                  ? `Reminders sent ${preferences.reminder_hours.join(', ')} hours before appointments`
                  : 'No reminders configured'
                }
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Last updated: {new Date(preferences.updated_at).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}