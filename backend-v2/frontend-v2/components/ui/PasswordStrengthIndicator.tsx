'use client'

import React from 'react'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export interface PasswordStrength {
  score: number // 0-4
  feedback: string[]
  requirements: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
}

interface PasswordStrengthIndicatorProps {
  password: string
  show?: boolean
  className?: string
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  }

  const metRequirements = Object.values(requirements).filter(Boolean).length
  let score = 0
  const feedback: string[] = []

  // Calculate score based on requirements met
  if (metRequirements >= 4 && password.length >= 12) {
    score = 4 // Very Strong
  } else if (metRequirements >= 4 && password.length >= 8) {
    score = 3 // Strong
  } else if (metRequirements >= 3) {
    score = 2 // Fair
  } else if (metRequirements >= 2) {
    score = 1 // Weak
  } else {
    score = 0 // Very Weak
  }

  // Generate feedback
  if (!requirements.length) {
    feedback.push('Password must be at least 8 characters long')
  }
  if (!requirements.uppercase) {
    feedback.push('Add an uppercase letter')
  }
  if (!requirements.lowercase) {
    feedback.push('Add a lowercase letter')
  }
  if (!requirements.number) {
    feedback.push('Add a number')
  }
  if (!requirements.special) {
    feedback.push('Add a special character (!@#$%^&*)')
  }

  if (password.length >= 12 && metRequirements >= 4) {
    feedback.push('Excellent! Your password is very strong')
  } else if (metRequirements >= 4) {
    feedback.push('Good password! Consider making it longer for extra security')
  }

  return {
    score,
    feedback,
    requirements
  }
}

export function PasswordStrengthIndicator({ 
  password, 
  show = true, 
  className = '' 
}: PasswordStrengthIndicatorProps) {
  if (!show || !password) {
    return null
  }

  const strength = calculatePasswordStrength(password)
  
  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 0: return 'Very Weak'
      case 1: return 'Weak'
      case 2: return 'Fair'
      case 3: return 'Strong'
      case 4: return 'Very Strong'
      default: return 'Very Weak'
    }
  }

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0: return 'bg-red-500'
      case 1: return 'bg-orange-500'
      case 2: return 'bg-yellow-500'
      case 3: return 'bg-blue-500'
      case 4: return 'bg-green-500'
      default: return 'bg-gray-300'
    }
  }

  const getTextColor = (score: number) => {
    switch (score) {
      case 0: return 'text-red-600'
      case 1: return 'text-orange-600'
      case 2: return 'text-yellow-600'
      case 3: return 'text-blue-600'
      case 4: return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className={`mt-2 space-y-3 ${className}`}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">Password Strength</span>
          <span className={`font-medium ${getTextColor(strength.score)}`}>
            {getStrengthLabel(strength.score)}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strength.score)}`}
            style={{ width: `${(strength.score / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-1 gap-1 text-xs">
        {[
          { key: 'length', label: 'At least 8 characters' },
          { key: 'uppercase', label: 'One uppercase letter' },
          { key: 'lowercase', label: 'One lowercase letter' },
          { key: 'number', label: 'One number' },
          { key: 'special', label: 'One special character' }
        ].map(({ key, label }) => {
          const isMet = strength.requirements[key as keyof typeof strength.requirements]
          return (
            <div key={key} className="flex items-center space-x-2">
              {isMet ? (
                <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <span className={`${isMet ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Additional Feedback */}
      {strength.feedback.length > 0 && strength.score >= 3 && (
        <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
          {strength.feedback[strength.feedback.length - 1]}
        </div>
      )}
    </div>
  )
}