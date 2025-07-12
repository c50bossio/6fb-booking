'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'

interface SessionTimeoutWarningProps {
  isVisible: boolean
  timeRemaining: number
  onExtend: () => void
  onLogout: () => void
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  isVisible,
  timeRemaining,
  onExtend,
  onLogout
}) => {
  const [countdown, setCountdown] = useState(timeRemaining)

  useEffect(() => {
    setCountdown(timeRemaining)
  }, [timeRemaining])

  useEffect(() => {
    if (!isVisible || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isVisible, countdown, onLogout])

  if (!isVisible) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Session Expiring Soon
          </h3>
          
          <p className="text-gray-600 mb-4">
            Your session will expire in{' '}
            <span className="font-bold text-red-600">{formatTime(countdown)}</span>
          </p>
          
          <p className="text-sm text-gray-500 mb-6">
            Would you like to extend your session or log out now?
          </p>
          
          <div className="flex gap-3 justify-center">
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
            >
              Log Out
            </Button>
            <Button
              onClick={onExtend}
              variant="primary"
              size="sm"
            >
              Stay Logged In
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}