'use client'

import { useState, useEffect } from 'react'
import { Modal, ModalBody, ModalFooter } from './ui/Modal'
import { Button } from './ui/Button'
import { LoadingButton } from './ui/LoadingStates'
import TimezoneSelector from './TimezoneSelector'
import { updateUserTimezone } from '@/lib/api'
import { 
  ClockIcon, 
  ExclamationTriangleIcon, 
  GlobeAltIcon 
} from '@heroicons/react/24/outline'

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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError('')
      setShowSkipWarning(false)
    }
  }, [isOpen])

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome! Let's set up your timezone"
      size="lg"
      variant="default"
      position="center"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      className="max-w-lg"
    >
      <ModalBody className="space-y-6">
        {/* Welcome Section */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <GlobeAltIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Setting your timezone ensures all appointment times are displayed correctly for your location.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Skip Warning */}
        {showSkipWarning && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg border border-yellow-200 dark:border-yellow-800 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Warning:</strong> Times may display incorrectly without a timezone. 
              This could lead to missed appointments or scheduling confusion.
            </div>
          </div>
        )}

        {/* Timezone Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            Your Timezone
          </label>
          <TimezoneSelector
            value={timezone}
            onChange={setTimezone}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">💡</span>
            We've detected your timezone based on your browser settings. You can change it if needed.
          </p>
        </div>

        {/* Timezone Info */}
        {timezone && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                Current time in {timezone}: {' '}
                <strong>
                  {new Date().toLocaleTimeString('en-US', { 
                    timeZone: timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </strong>
              </span>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={saving}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {showSkipWarning ? 'Skip anyway' : 'Skip for now'}
        </Button>
        
        <LoadingButton
          onClick={handleSave}
          loading={saving}
          disabled={!timezone}
          variant="primary"
          size="lg"
          className="min-w-[160px]"
        >
          Save and Continue
        </LoadingButton>
      </ModalFooter>
    </Modal>
  )
}