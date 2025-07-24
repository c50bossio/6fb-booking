/**
 * DataRecoveryPrompt - Component for prompting users to recover saved registration data
 * 
 * Features:
 * - Friendly and informative prompt for data recovery
 * - Shows saved progress details (step, business name, save time)
 * - Clear accept/decline options
 * - Accessibility compliant with ARIA labels
 * - Mobile-responsive design
 */

'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface RecoveryPromptData {
  hasData: boolean
  stepNumber: number
  businessName: string
  savedAt: Date
  isExpired: boolean
}

interface DataRecoveryPromptProps {
  isOpen: boolean
  recoveryData: RecoveryPromptData
  onAccept: () => Promise<void>
  onDecline: () => Promise<void>
  onClose: () => void
  isLoading?: boolean
}

export function DataRecoveryPrompt({
  isOpen,
  recoveryData,
  onAccept,
  onDecline,
  onClose,
  isLoading = false
}: DataRecoveryPromptProps) {
  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays === 1) return 'yesterday'
    return `${diffDays} days ago`
  }

  const getStepName = (stepNumber: number): string => {
    const stepNames = {
      1: 'Business Type Selection',
      2: 'Account Setup',
      3: 'Business Information',
      4: 'Service Templates',
      5: 'Pricing Confirmation',
      6: 'Payment Setup'
    }
    return stepNames[stepNumber as keyof typeof stepNames] || `Step ${stepNumber}`
  }

  const getProgressPercentage = (stepNumber: number): number => {
    return Math.round((stepNumber / 6) * 100)
  }

  const handleAccept = async () => {
    try {
      await onAccept()
    } catch (error) {
      console.error('[DataRecoveryPrompt] Accept failed:', error)
      // Error handling is managed by parent component
    }
  }

  const handleDecline = async () => {
    try {
      await onDecline()
    } catch (error) {
      console.error('[DataRecoveryPrompt] Decline failed:', error)
      // Error handling is managed by parent component
    }
  }

  if (!recoveryData.hasData) {
    return null
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-lg" data-testid="recovery-prompt">
        <AlertDialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            {/* Recovery Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <svg 
                className="w-5 h-5 text-blue-600 dark:text-blue-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Welcome back! We saved your progress
              </AlertDialogTitle>
            </div>
          </div>
          
          <AlertDialogDescription className="text-left space-y-3">
            <p className="text-gray-600 dark:text-gray-300">
              We found your previous registration session and can help you pick up where you left off.
            </p>
            
            {/* Progress Summary Card */}
            <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
              <div className="space-y-3">
                {/* Business Name */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Business Name:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white font-semibold">
                    {recoveryData.businessName || 'Not specified'}
                  </span>
                </div>
                
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress:
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {getProgressPercentage(recoveryData.stepNumber)}% complete
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(recoveryData.stepNumber)}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Last step: {getStepName(recoveryData.stepNumber)}
                  </div>
                </div>
                
                {/* Save Time */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Saved:
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatTimeAgo(recoveryData.savedAt)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Benefits */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Restoring your progress will:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Continue from step {recoveryData.stepNumber} of 6
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Keep all your previously entered information
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Save time and avoid re-entering data
                </li>
              </ul>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                    Privacy Note
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Sensitive information like passwords is never saved for your security.
                  </p>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={handleDecline}
            disabled={isLoading}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Start Fresh
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full sm:w-auto order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Restoring...
              </div>
            ) : (
              'Continue Registration'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DataRecoveryPrompt