'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface SessionTimeoutWarningProps {
  sessionDurationMinutes?: number
  warningMinutesBeforeTimeout?: number
  onExtendSession?: () => Promise<void>
  onLogout?: () => void
  enabled?: boolean
}

export function SessionTimeoutWarning({
  sessionDurationMinutes = 30,
  warningMinutesBeforeTimeout = 5,
  onExtendSession,
  onLogout,
  enabled = true
}: SessionTimeoutWarningProps) {
  const { user, logout, refreshToken } = useAuth()
  const { toast } = useToast()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(warningMinutesBeforeTimeout * 60)
  const [isExtending, setIsExtending] = useState(false)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [sessionStartTime, setSessionStartTime] = useState(Date.now())

  // Reset session start time when user changes
  useEffect(() => {
    if (user) {
      setSessionStartTime(Date.now())
      setLastActivity(Date.now())
    }
  }, [user?.id])

  // Track user activity
  useEffect(() => {
    if (!enabled || !user) return

    const updateActivity = () => {
      setLastActivity(Date.now())
      // If warning is showing and user is active, hide it
      if (showWarning) {
        setShowWarning(false)
        setTimeRemaining(warningMinutesBeforeTimeout * 60)
      }
    }

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      window.addEventListener(event, updateActivity)
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
    }
  }, [enabled, user, showWarning, warningMinutesBeforeTimeout])

  // Check for session timeout
  useEffect(() => {
    if (!enabled || !user) return

    const checkSessionTimeout = () => {
      const now = Date.now()
      const timeSinceLastActivity = (now - lastActivity) / 1000 / 60 // in minutes
      const sessionDuration = (now - sessionStartTime) / 1000 / 60 // in minutes

      // Check if we should show warning based on inactivity or session duration
      const shouldWarnInactivity = timeSinceLastActivity >= (sessionDurationMinutes - warningMinutesBeforeTimeout)
      const shouldWarnSession = sessionDuration >= (sessionDurationMinutes - warningMinutesBeforeTimeout)

      if ((shouldWarnInactivity || shouldWarnSession) && !showWarning) {
        setShowWarning(true)
        setTimeRemaining(warningMinutesBeforeTimeout * 60)
      }

      // Auto logout if time exceeded
      if (timeSinceLastActivity >= sessionDurationMinutes || sessionDuration >= sessionDurationMinutes) {
        handleLogout()
      }
    }

    const interval = setInterval(checkSessionTimeout, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [enabled, user, lastActivity, sessionStartTime, sessionDurationMinutes, warningMinutesBeforeTimeout, showWarning])

  // Countdown timer when warning is shown
  useEffect(() => {
    if (!showWarning || timeRemaining <= 0) return

    const countdown = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdown)
  }, [showWarning, timeRemaining])

  const handleExtendSession = useCallback(async () => {
    setIsExtending(true)
    try {
      if (onExtendSession) {
        await onExtendSession()
      } else if (refreshToken) {
        await refreshToken()
      }

      // Reset timers
      setSessionStartTime(Date.now())
      setLastActivity(Date.now())
      setShowWarning(false)
      setTimeRemaining(warningMinutesBeforeTimeout * 60)

      toast({
        title: 'Session Extended',
        description: `Your session has been extended for another ${sessionDurationMinutes} minutes.`
      })
    } catch (error) {
      console.error('Failed to extend session:', error)
      toast({
        variant: 'destructive',
        title: 'Extension Failed',
        description: 'Failed to extend your session. Please login again.'
      })
      handleLogout()
    } finally {
      setIsExtending(false)
    }
  }, [onExtendSession, refreshToken, sessionDurationMinutes, warningMinutesBeforeTimeout, toast])

  const handleLogout = useCallback(() => {
    if (onLogout) {
      onLogout()
    } else {
      logout()
    }
    setShowWarning(false)
  }, [onLogout, logout])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!enabled || !user) return null

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <DialogTitle>Session Expiring Soon</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Your session will expire due to inactivity. Would you like to continue working?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <Clock className="h-10 w-10 text-gray-600 dark:text-gray-400" />
          </div>
          
          <div className="text-3xl font-bold mb-2">
            {formatTime(timeRemaining)}
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Time remaining before automatic logout
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isExtending}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout Now
          </Button>
          <Button
            onClick={handleExtendSession}
            disabled={isExtending}
            className={cn(
              "w-full sm:w-auto",
              timeRemaining < 30 && "animate-pulse"
            )}
          >
            {isExtending ? (
              <>
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                Extending...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Continue Working
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easy integration
export function useSessionTimeout(options?: Omit<SessionTimeoutWarningProps, 'enabled'>) {
  const [enabled, setEnabled] = useState(true)

  return {
    SessionTimeoutWarning: () => <SessionTimeoutWarning {...options} enabled={enabled} />,
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    isEnabled: enabled
  }
}