/**
 * Biometric Login Prompt Component
 * Quick biometric authentication prompt for login flows
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Progress } from './ui/progress'
import { useBiometricQuickLogin } from '@/hooks/useBiometricLogin'

interface BiometricLoginPromptProps {
  onSuccess?: () => void
  onFallback?: () => void
  onCancel?: () => void
  className?: string
  autoPrompt?: boolean
  showFallback?: boolean
  title?: string
  subtitle?: string
}

export default function BiometricLoginPrompt({
  onSuccess,
  onFallback,
  onCancel,
  className = '',
  autoPrompt = true,
  showFallback = true,
  title = 'Welcome back',
  subtitle = 'Use your biometric to sign in quickly and securely'
}: BiometricLoginPromptProps) {
  const { 
    quickLogin, 
    isQuickLoginAvailable, 
    isAuthenticating, 
    error 
  } = useBiometricQuickLogin()

  const [showPrompt, setShowPrompt] = useState(false)
  const [animationStep, setAnimationStep] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (autoPrompt && isQuickLoginAvailable) {
      setShowPrompt(true)
      
      // Auto-trigger biometric prompt after brief delay
      const timer = setTimeout(() => {
        handleBiometricAuth()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [autoPrompt, isQuickLoginAvailable])

  useEffect(() => {
    if (isAuthenticating) {
      setAnimationStep('scanning')
      startProgressAnimation()
    }
  }, [isAuthenticating])

  useEffect(() => {
    if (error) {
      setAnimationStep('error')
      setProgress(0)
    }
  }, [error])

  const startProgressAnimation = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 10
      })
    }, 100)
  }

  const handleBiometricAuth = async () => {
    try {
      setAnimationStep('scanning')
      const success = await quickLogin()
      
      if (success) {
        setAnimationStep('success')
        setProgress(100)
        setTimeout(() => {
          onSuccess?.()
        }, 1000)
      } else {
        setAnimationStep('error')
        setProgress(0)
      }
    } catch (error) {
      setAnimationStep('error')
      setProgress(0)
    }
  }

  const handleFallback = () => {
    setShowPrompt(false)
    onFallback?.()
  }

  const handleCancel = () => {
    setShowPrompt(false)
    onCancel?.()
  }

  const getBiometricIcon = () => {
    switch (animationStep) {
      case 'scanning':
        return '🔄'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '👆'
    }
  }

  const getStatusMessage = () => {
    switch (animationStep) {
      case 'scanning':
        return 'Scanning biometric...'
      case 'success':
        return 'Authentication successful!'
      case 'error':
        return error || 'Authentication failed'
      default:
        return 'Touch sensor or look at camera'
    }
  }

  if (!isQuickLoginAvailable || !showPrompt) {
    return null
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${className}`}>
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-gray-600">{subtitle}</p>
            </div>

            {/* Biometric Animation */}
            <div className="relative">
              <div className={`w-24 h-24 mx-auto rounded-full border-4 flex items-center justify-center text-4xl transition-all duration-300 ${
                animationStep === 'scanning' 
                  ? 'border-blue-400 bg-blue-50 animate-pulse' 
                  : animationStep === 'success'
                  ? 'border-green-400 bg-green-50'
                  : animationStep === 'error'
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
              }`}
              onClick={animationStep === 'idle' ? handleBiometricAuth : undefined}
              >
                <span className={animationStep === 'scanning' ? 'animate-spin' : ''}>
                  {getBiometricIcon()}
                </span>
              </div>

              {/* Progress Ring */}
              {animationStep === 'scanning' && (
                <div className="absolute inset-0 w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="#e5e7eb"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="#3b82f6"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                      className="transition-all duration-300"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Status Message */}
            <div className="space-y-2">
              <p className={`font-medium ${
                animationStep === 'success' 
                  ? 'text-green-600' 
                  : animationStep === 'error'
                  ? 'text-red-600'
                  : 'text-gray-700'
              }`}>
                {getStatusMessage()}
              </p>

              {/* Progress Bar for Scanning */}
              {animationStep === 'scanning' && (
                <Progress value={progress} className="w-full h-2" />
              )}
            </div>

            {/* Error Alert */}
            {animationStep === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription>
                  Biometric authentication failed. Please try again or use password login.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {animationStep === 'idle' && (
                <Button 
                  onClick={handleBiometricAuth}
                  disabled={isAuthenticating}
                  className="w-full flex items-center space-x-2"
                >
                  <span>👆</span>
                  <span>Use Biometric</span>
                </Button>
              )}

              {animationStep === 'error' && (
                <Button 
                  onClick={handleBiometricAuth}
                  variant="outline"
                  className="w-full flex items-center space-x-2"
                >
                  <span>🔄</span>
                  <span>Try Again</span>
                </Button>
              )}

              {showFallback && animationStep !== 'success' && (
                <Button 
                  onClick={handleFallback}
                  variant="ghost"
                  className="w-full"
                  disabled={isAuthenticating}
                >
                  Use Password Instead
                </Button>
              )}

              {animationStep !== 'success' && (
                <Button 
                  onClick={handleCancel}
                  variant="ghost"
                  size="sm"
                  className="w-full text-gray-500"
                  disabled={isAuthenticating}
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Help Text */}
            {animationStep === 'idle' && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>Your biometric data never leaves your device</p>
                <p>Secure • Fast • Private</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Inline Biometric Button Component
 * For embedding in existing forms
 */
export function BiometricLoginButton({
  onSuccess,
  onError,
  className = '',
  size = 'default',
  variant = 'outline'
}: {
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
}) {
  const { 
    quickLogin, 
    isQuickLoginAvailable, 
    isAuthenticating, 
    error 
  } = useBiometricQuickLogin()

  const [animationState, setAnimationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (isAuthenticating) {
      setAnimationState('loading')
    }
  }, [isAuthenticating])

  useEffect(() => {
    if (error) {
      setAnimationState('error')
      onError?.(error)
      
      // Reset to idle after showing error
      setTimeout(() => {
        setAnimationState('idle')
      }, 2000)
    }
  }, [error, onError])

  const handleBiometricAuth = async () => {
    try {
      setAnimationState('loading')
      const success = await quickLogin()
      
      if (success) {
        setAnimationState('success')
        onSuccess?.()
      } else {
        setAnimationState('error')
      }
    } catch (error) {
      setAnimationState('error')
      onError?.(error.message)
    }
  }

  const getButtonContent = () => {
    switch (animationState) {
      case 'loading':
        return (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            <span>Authenticating...</span>
          </>
        )
      case 'success':
        return (
          <>
            <span>✅</span>
            <span>Success!</span>
          </>
        )
      case 'error':
        return (
          <>
            <span>❌</span>
            <span>Try Again</span>
          </>
        )
      default:
        return (
          <>
            <span>👆</span>
            <span>Use Biometric</span>
          </>
        )
    }
  }

  if (!isQuickLoginAvailable) {
    return null
  }

  return (
    <Button
      onClick={handleBiometricAuth}
      disabled={isAuthenticating}
      variant={variant}
      size={size}
      className={`flex items-center space-x-2 ${className}`}
    >
      {getButtonContent()}
    </Button>
  )
}