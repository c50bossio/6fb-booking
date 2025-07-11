'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, Lock, Shield, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

interface RateLimitIndicatorProps {
  attempts: number
  maxAttempts?: number
  lockoutMinutes?: number
  lockedUntil?: Date | null
  variant?: 'inline' | 'floating' | 'embedded'
  showWarning?: boolean
  className?: string
}

export function RateLimitIndicator({
  attempts,
  maxAttempts = 5,
  lockoutMinutes = 15,
  lockedUntil,
  variant = 'inline',
  showWarning = true,
  className
}: RateLimitIndicatorProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const remainingAttempts = Math.max(0, maxAttempts - attempts)
  const isLocked = !!lockedUntil && new Date() < new Date(lockedUntil)
  const percentageUsed = (attempts / maxAttempts) * 100
  
  // Show warning when 2 or fewer attempts remain
  const shouldShowWarning = showWarning && remainingAttempts <= 2 && remainingAttempts > 0

  useEffect(() => {
    if (!isLocked || !lockedUntil) {
      setTimeRemaining('')
      return
    }

    const updateTimer = () => {
      const now = new Date()
      const lockoutTime = new Date(lockedUntil)
      const diff = lockoutTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [isLocked, lockedUntil])

  // Don't show indicator if no attempts have been made
  if (attempts === 0 && !isLocked) {
    return null
  }

  const getStatusColor = () => {
    if (isLocked) return 'text-red-600 dark:text-red-400'
    if (remainingAttempts <= 1) return 'text-red-500 dark:text-red-400'
    if (remainingAttempts <= 2) return 'text-yellow-500 dark:text-yellow-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getProgressColor = () => {
    if (isLocked) return 'bg-red-500'
    if (remainingAttempts <= 1) return 'bg-red-400'
    if (remainingAttempts <= 2) return 'bg-yellow-400'
    return 'bg-green-400'
  }

  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed bottom-4 right-4 z-50 p-4 bg-background border rounded-lg shadow-lg max-w-sm",
        isLocked && "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950",
        shouldShowWarning && "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950",
        className
      )}>
        {renderContent()}
      </div>
    )
  }

  if (variant === 'embedded') {
    return (
      <div className={cn(
        "rounded-lg p-4 border",
        isLocked && "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950",
        shouldShowWarning && "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950",
        !isLocked && !shouldShowWarning && "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950",
        className
      )}>
        {renderContent()}
      </div>
    )
  }

  // Inline variant (default)
  return (
    <div className={cn("space-y-2", className)}>
      {renderContent()}
    </div>
  )

  function renderContent() {
    if (isLocked) {
      return (
        <>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Lock className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Account temporarily locked
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Too many failed attempts. Try again in {timeRemaining || `${lockoutMinutes} minutes`}.
              </p>
            </div>
          </div>
          {timeRemaining && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-medium">{timeRemaining}</span>
            </div>
          )}
        </>
      )
    }

    return (
      <>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {shouldShowWarning ? (
              <AlertCircle className={cn("h-5 w-5", getStatusColor())} />
            ) : (
              <Shield className={cn("h-5 w-5", getStatusColor())} />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <p className={cn("text-sm font-medium", getStatusColor())}>
                {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining
              </p>
              <span className="text-xs text-muted-foreground">
                {attempts} of {maxAttempts} used
              </span>
            </div>
            
            <Progress 
              value={percentageUsed} 
              className="h-2"
              indicatorClassName={getProgressColor()}
            />
            
            {shouldShowWarning && (
              <p className="text-xs text-muted-foreground">
                {remainingAttempts === 1 
                  ? `Last attempt before ${lockoutMinutes}-minute lockout`
                  : `Account will be locked after ${remainingAttempts} more failed attempts`
                }
              </p>
            )}
          </div>
        </div>
      </>
    )
  }
}

// Hook for managing rate limit state
export function useRateLimit(storageKey = 'auth-rate-limit') {
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null)
  const maxAttempts = 5
  const lockoutMinutes = 15

  useEffect(() => {
    // Load state from localStorage
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setAttempts(data.attempts || 0)
        if (data.lockedUntil) {
          const lockoutTime = new Date(data.lockedUntil)
          if (lockoutTime > new Date()) {
            setLockedUntil(lockoutTime)
          } else {
            // Lockout expired, reset
            resetAttempts()
          }
        }
      } catch {
        // Invalid data, reset
        resetAttempts()
      }
    }
  }, [])

  const incrementAttempts = () => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    let newLockedUntil: Date | null = null
    if (newAttempts >= maxAttempts) {
      newLockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000)
      setLockedUntil(newLockedUntil)
    }

    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify({
      attempts: newAttempts,
      lockedUntil: newLockedUntil?.toISOString() || null,
      lastAttempt: new Date().toISOString()
    }))

    return {
      attempts: newAttempts,
      isLocked: !!newLockedUntil,
      lockedUntil: newLockedUntil
    }
  }

  const resetAttempts = () => {
    setAttempts(0)
    setLockedUntil(null)
    localStorage.removeItem(storageKey)
  }

  const isLocked = !!lockedUntil && new Date() < lockedUntil

  return {
    attempts,
    maxAttempts,
    lockedUntil,
    isLocked,
    incrementAttempts,
    resetAttempts,
    remainingAttempts: Math.max(0, maxAttempts - attempts)
  }
}