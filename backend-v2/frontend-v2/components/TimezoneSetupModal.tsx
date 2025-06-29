'use client'

import { useState, useEffect } from 'react'
import TimezoneSelector from './TimezoneSelector'
import { updateUserTimezone } from '@/lib/api'

interface TimezoneSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (timezone: string) => void
}

export default function TimezoneSetupModal({ isOpen, onClose, onComplete }: TimezoneSetupModalProps) {
  const [timezone, setTimezone] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [showSkipWarning, setShowSkipWarning] = useState(false)

  useEffect(() => {
    // Try to detect browser timezone on mount
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (browserTz) {
        setTimezone(browserTz)
      }
    } catch {
      // Default to common timezone if detection fails
      setTimezone('America/New_York')
    }
  }, [])

  const handleSave = async () => {
    if (!timezone) {
      setError('Please select a timezone')
      return
    }

    setSaving(true)
    setError('')

    try {
      await updateUserTimezone(timezone)
      onComplete(timezone)
    } catch (error: any) {
      setError(error.message || 'Failed to save timezone')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    if (!showSkipWarning) {
      setShowSkipWarning(true)
      return
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome! Let's set up your timezone
          </h2>
          <p className="text-gray-600">
            Setting your timezone ensures all appointment times are displayed correctly for your location.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Timezone
          </label>
          <TimezoneSelector
            value={timezone}
            onChange={setTimezone}
          />
          <p className="mt-2 text-sm text-gray-500">
            We've detected your timezone based on your browser settings. You can change it if needed.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showSkipWarning ? 'Skip anyway' : 'Skip for now'}
          </button>
          
          <div className="flex gap-3">
            {showSkipWarning && (
              <p className="text-sm text-yellow-600 mr-3 self-center">
                Times may display incorrectly without a timezone
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !timezone}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save and Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}