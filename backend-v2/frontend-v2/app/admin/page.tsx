'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getBookingSettings, updateBookingSettings, BookingSettings, BookingSettingsUpdate } from '../../lib/api'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<BookingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState<BookingSettingsUpdate>({})

  useEffect(() => {
    async function loadData() {
      try {
        // Check if user is authenticated and is admin or super_admin
        const userProfile = await getProfile()
        if (userProfile.role !== 'admin' && userProfile.role !== 'super_admin') {
          router.push('/dashboard')
          return
        }
        setUser(userProfile)

        // Load current booking settings
        const currentSettings = await getBookingSettings()
        setSettings(currentSettings)
        setFormData({
          business_name: currentSettings.business_name,
          min_lead_time_minutes: currentSettings.min_lead_time_minutes,
          max_advance_days: currentSettings.max_advance_days,
          same_day_cutoff_time: currentSettings.same_day_cutoff_time || '',
          business_start_time: currentSettings.business_start_time,
          business_end_time: currentSettings.business_end_time,
          slot_duration_minutes: currentSettings.slot_duration_minutes,
          show_soonest_available: currentSettings.show_soonest_available,
          allow_same_day_booking: currentSettings.allow_same_day_booking,
          require_advance_booking: currentSettings.require_advance_booking,
          business_type: currentSettings.business_type
        })
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleInputChange = (field: keyof BookingSettingsUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const validateTimeFormat = (time: string): boolean => {
    if (!time) return true // Optional field
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }

  const validateBusinessLogic = (): string | null => {
    if (formData.business_start_time && formData.business_end_time) {
      const [startHour, startMin] = formData.business_start_time.split(':').map(Number)
      const [endHour, endMin] = formData.business_end_time.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      
      if (startMinutes >= endMinutes) {
        return 'Business end time must be after start time'
      }
    }

    if (formData.slot_duration_minutes && ![15, 30, 45, 60].includes(formData.slot_duration_minutes)) {
      return 'Slot duration must be 15, 30, 45, or 60 minutes'
    }

    if (formData.min_lead_time_minutes && formData.min_lead_time_minutes < 0) {
      return 'Minimum lead time cannot be negative'
    }

    if (formData.max_advance_days && formData.max_advance_days < 1) {
      return 'Maximum advance days must be at least 1'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      // Validate time formats
      const timeFields = ['same_day_cutoff_time', 'business_start_time', 'business_end_time'] as const
      for (const field of timeFields) {
        if (formData[field] && !validateTimeFormat(formData[field] as string)) {
          throw new Error(`Invalid time format for ${field}. Use HH:MM format (24-hour)`)
        }
      }

      // Validate business logic
      const validationError = validateBusinessLogic()
      if (validationError) {
        throw new Error(validationError)
      }

      // Prepare update data (remove empty strings)
      const updateData: BookingSettingsUpdate = {}
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          (updateData as any)[key] = value
        }
      })

      const updatedSettings = await updateBookingSettings(updateData)
      setSettings(updatedSettings)
      setSuccess('Settings updated successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">Access denied. Admin role required.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
                <p className="text-gray-600 mt-1">Manage booking configuration and business settings</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/admin/services')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Manage Services
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Admin Navigation */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => router.push('/admin/users')}
                className="px-3 py-2 text-sm bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Users
              </button>
              <button
                onClick={() => router.push('/admin/services')}
                className="px-3 py-2 text-sm bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Services
              </button>
              <button
                onClick={() => router.push('/clients')}
                className="px-3 py-2 text-sm bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Clients
              </button>
              <button
                onClick={() => router.push('/analytics')}
                className="px-3 py-2 text-sm bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
              <button
                onClick={() => router.push('/barber-availability')}
                className="px-3 py-2 text-sm bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Availability
              </button>
              <button
                onClick={() => router.push('/admin/booking-rules')}
                className="px-3 py-2 text-sm bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Booking Rules
              </button>
              <button
                onClick={() => router.push('/notifications')}
                className="px-3 py-2 text-sm bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 11-15 0v5z" />
                </svg>
                Notifications
              </button>
              <button
                onClick={() => router.push('/admin/webhooks')}
                className="px-3 py-2 text-sm bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Webhooks
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-700">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Business Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={formData.business_name || ''}
                      onChange={(e) => handleInputChange('business_name', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter business name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Type
                    </label>
                    <select
                      value={formData.business_type || ''}
                      onChange={(e) => handleInputChange('business_type', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="barbershop">Barbershop</option>
                      <option value="hair_salon">Hair Salon</option>
                      <option value="medical">Medical</option>
                      <option value="consultation">Consultation</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Business Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Time (24-hour format)
                    </label>
                    <input
                      type="time"
                      value={formData.business_start_time || ''}
                      onChange={(e) => handleInputChange('business_start_time', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Time (24-hour format)
                    </label>
                    <input
                      type="time"
                      value={formData.business_end_time || ''}
                      onChange={(e) => handleInputChange('business_end_time', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Slot Duration (minutes)
                    </label>
                    <select
                      value={formData.slot_duration_minutes || ''}
                      onChange={(e) => handleInputChange('slot_duration_minutes', parseInt(e.target.value))}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Booking Rules */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Lead Time (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.min_lead_time_minutes || ''}
                      onChange={(e) => handleInputChange('min_lead_time_minutes', parseInt(e.target.value))}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Maximum Advance Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_advance_days || ''}
                      onChange={(e) => handleInputChange('max_advance_days', parseInt(e.target.value))}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Same-day Cutoff Time (optional)
                    </label>
                    <input
                      type="time"
                      value={formData.same_day_cutoff_time || ''}
                      onChange={(e) => handleInputChange('same_day_cutoff_time', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Toggles */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_soonest_available"
                      checked={formData.show_soonest_available || false}
                      onChange={(e) => handleInputChange('show_soonest_available', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="show_soonest_available" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Show soonest available slot
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allow_same_day_booking"
                      checked={formData.allow_same_day_booking || false}
                      onChange={(e) => handleInputChange('allow_same_day_booking', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allow_same_day_booking" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Allow same-day booking
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="require_advance_booking"
                      checked={formData.require_advance_booking || false}
                      onChange={(e) => handleInputChange('require_advance_booking', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="require_advance_booking" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Require advance booking
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Current Settings Display */}
        {settings && (
          <div className="mt-8 bg-white shadow-lg rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Current Settings</h2>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Business Hours:</span>
                  <span className="ml-2 text-gray-600">
                    {settings.business_start_time} - {settings.business_end_time}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Slot Duration:</span>
                  <span className="ml-2 text-gray-600">{settings.slot_duration_minutes} minutes</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Lead Time:</span>
                  <span className="ml-2 text-gray-600">{settings.min_lead_time_minutes} minutes</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Max Advance:</span>
                  <span className="ml-2 text-gray-600">{settings.max_advance_days} days</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Same-day Cutoff:</span>
                  <span className="ml-2 text-gray-600">
                    {settings.same_day_cutoff_time || 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Last Updated:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(settings.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}