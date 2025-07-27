'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Clock, AlertCircle, Loader2, ChevronRight, X, ArrowRight, Download, Upload, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

// Enhanced feedback types
export interface FeedbackState {
  id: string
  type: 'loading' | 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  progress?: number
  maxProgress?: number
  duration?: number
  persistent?: boolean
  actions?: FeedbackAction[]
  metadata?: Record<string, any>
  timestamp: Date
}

export interface FeedbackAction {
  id: string
  label: string
  action: () => void | Promise<void>
  variant?: 'primary' | 'outline' | 'destructive'
  icon?: React.ReactNode
  loading?: boolean
}

export interface LoadingOperation {
  id: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  duration?: number
  error?: string
  subOperations?: LoadingOperation[]
}

// Progress Indicator Component
export interface ProgressIndicatorProps {
  operations: LoadingOperation[]
  title?: string
  description?: string
  showDetails?: boolean
  onCancel?: () => void
  className?: string
}

export function ProgressIndicator({
  operations,
  title = 'Processing',
  description,
  showDetails = false,
  onCancel,
  className,
}: ProgressIndicatorProps) {
  const [expanded, setExpanded] = useState(showDetails)
  
  const totalOperations = operations.length
  const completedOperations = operations.filter(op => op.status === 'completed').length
  const failedOperations = operations.filter(op => op.status === 'failed').length
  const currentOperation = operations.find(op => op.status === 'running')
  
  const overallProgress = totalOperations > 0 ? (completedOperations / totalOperations) * 100 : 0
  
  const getOperationIcon = (status: LoadingOperation['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Overall Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{completedOperations}/{totalOperations}</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          {failedOperations > 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {failedOperations} operation(s) failed
            </p>
          )}
        </div>

        {/* Current Operation */}
        {currentOperation && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">{currentOperation.label}</span>
            </div>
            {currentOperation.progress !== undefined && (
              <Progress value={currentOperation.progress} className="h-1" />
            )}
          </div>
        )}

        {/* Operations Details */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full justify-between p-2"
          >
            <span className="text-sm">Operation Details</span>
            <ChevronRight className={cn(
              'h-4 w-4 transition-transform',
              expanded && 'rotate-90'
            )} />
          </Button>
          
          {expanded && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {operations.map((operation, index) => (
                <div
                  key={operation.id}
                  className={cn(
                    'flex items-center space-x-3 p-2 rounded text-sm',
                    operation.status === 'completed' && 'bg-green-50 dark:bg-green-950',
                    operation.status === 'failed' && 'bg-red-50 dark:bg-red-950',
                    operation.status === 'running' && 'bg-blue-50 dark:bg-blue-950'
                  )}
                >
                  {getOperationIcon(operation.status)}
                  <div className="flex-1">
                    <div className="font-medium">{operation.label}</div>
                    {operation.error && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {operation.error}
                      </div>
                    )}
                    {operation.duration && operation.status === 'completed' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Completed in {operation.duration}ms
                      </div>
                    )}
                  </div>
                  {operation.progress !== undefined && operation.status === 'running' && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {operation.progress}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Success Feedback Component
export interface SuccessFeedbackProps {
  title: string
  message?: string
  details?: string[]
  actions?: FeedbackAction[]
  autoClose?: boolean
  autoCloseDelay?: number
  onClose?: () => void
  showConfetti?: boolean
  className?: string
}

export function SuccessFeedback({
  title,
  message,
  details,
  actions,
  autoClose = false,
  autoCloseDelay = 5000,
  onClose,
  showConfetti = false,
  className,
}: SuccessFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [countdown, setCountdown] = useState(autoClose ? autoCloseDelay / 1000 : 0)

  useEffect(() => {
    if (autoClose) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            handleClose()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [autoClose, autoCloseDelay])

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  return (
    <Card className={cn(
      'border-green-200 bg-green-50 dark:bg-green-950 shadow-lg',
      showConfetti && 'animate-bounce',
      className
    )}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-3 mb-4">
          <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
              {title}
            </h3>
            {message && (
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                {message}
              </p>
            )}
            {details && details.length > 0 && (
              <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                {details.map((detail, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <ArrowRight className="h-3 w-3" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {autoClose && countdown > 0 && (
              <Badge variant="outline" className="text-xs">
                {countdown}s
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="p-1 h-6 w-6"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.action}
                disabled={action.loading}
                className="text-xs"
              >
                {action.loading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : action.icon ? (
                  <span className="mr-1">{action.icon}</span>
                ) : null}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Multi-step Process Feedback
export interface ProcessStep {
  id: string
  title: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress?: number
  error?: string
  duration?: number
  optional?: boolean
}

export interface ProcessFeedbackProps {
  steps: ProcessStep[]
  title: string
  description?: string
  currentStepId?: string
  onCancel?: () => void
  onRetry?: (stepId: string) => void
  className?: string
}

export function ProcessFeedback({
  steps,
  title,
  description,
  currentStepId,
  onCancel,
  onRetry,
  className,
}: ProcessFeedbackProps) {
  const currentStepIndex = currentStepId ? steps.findIndex(step => step.id === currentStepId) : -1
  const completedSteps = steps.filter(step => step.status === 'completed').length
  const totalSteps = steps.filter(step => !step.optional).length
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  const getStepIcon = (step: ProcessStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'skipped':
        return <div className="h-5 w-5 rounded-full bg-gray-300 dark:bg-gray-600" />
      default:
        return (
          <div className={cn(
            'h-5 w-5 rounded-full border-2 flex items-center justify-center text-xs font-bold',
            index <= currentStepIndex 
              ? 'border-blue-500 text-blue-500' 
              : 'border-gray-300 text-gray-400'
          )}>
            {index + 1}
          </div>
        )
    }
  }

  return (
    <Card className={cn('w-full max-w-lg', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{completedSteps}/{totalSteps} steps</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start space-x-3">
              {getStepIcon(step, index)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className={cn(
                    'text-sm font-medium',
                    step.status === 'completed' && 'text-green-700 dark:text-green-300',
                    step.status === 'failed' && 'text-red-700 dark:text-red-300',
                    step.status === 'running' && 'text-blue-700 dark:text-blue-300'
                  )}>
                    {step.title}
                  </h4>
                  {step.optional && (
                    <Badge variant="outline" className="text-xs">
                      Optional
                    </Badge>
                  )}
                  {step.duration && step.status === 'completed' && (
                    <span className="text-xs text-gray-500">
                      ({step.duration}ms)
                    </span>
                  )}
                </div>
                
                {step.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {step.description}
                  </p>
                )}
                
                {step.error && (
                  <div className="mt-2">
                    <Alert variant="destructive" className="py-2">
                      <AlertDescription className="text-xs">
                        {step.error}
                      </AlertDescription>
                    </Alert>
                    {onRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRetry(step.id)}
                        className="mt-2 text-xs"
                      >
                        Retry Step
                      </Button>
                    )}
                  </div>
                )}
                
                {step.progress !== undefined && step.status === 'running' && (
                  <div className="mt-2">
                    <Progress value={step.progress} className="h-1" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Connection Quality Indicator
export function ConnectionQuality() {
  const [connectionState, setConnectionState] = useState<{
    online: boolean
    quality: 'excellent' | 'good' | 'poor' | 'offline'
    latency?: number
    speed?: string
  }>({
    online: navigator.onLine,
    quality: 'excellent'
  })

  useEffect(() => {
    const checkConnection = async () => {
      if (!navigator.onLine) {
        setConnectionState({ online: false, quality: 'offline' })
        return
      }

      try {
        const start = Date.now()
        await fetch('http://localhost:8000/health/', { method: 'HEAD', cache: 'no-cache' })
        const latency = Date.now() - start

        let quality: 'excellent' | 'good' | 'poor'
        if (latency < 100) quality = 'excellent'
        else if (latency < 300) quality = 'good'
        else quality = 'poor'

        setConnectionState({
          online: true,
          quality,
          latency
        })
      } catch {
        setConnectionState({ online: true, quality: 'poor' })
      }
    }

    const handleOnline = () => checkConnection()
    const handleOffline = () => setConnectionState({ online: false, quality: 'offline' })

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    checkConnection()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500'
      case 'good': return 'text-yellow-500'
      case 'poor': return 'text-orange-500'
      case 'offline': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getQualityIcon = (quality: string, online: boolean) => {
    if (!online) return <WifiOff className="h-4 w-4" />
    return <Wifi className="h-4 w-4" />
  }

  if (connectionState.quality === 'excellent' && connectionState.online) {
    return null // Don't show indicator for good connections
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={getQualityColor(connectionState.quality)}>
        {getQualityIcon(connectionState.quality, connectionState.online)}
      </div>
      <span className={cn('capitalize', getQualityColor(connectionState.quality))}>
        {connectionState.online ? connectionState.quality : 'Offline'}
      </span>
      {connectionState.latency && (
        <span className="text-gray-500">
          ({connectionState.latency}ms)
        </span>
      )}
    </div>
  )
}

export default {
  ProgressIndicator,
  SuccessFeedback,
  ProcessFeedback,
  ConnectionQuality,
}