import React from 'react'
import { AlertCircle } from 'lucide-react'

interface ValidationDisplayProps {
  error?: string
  className?: string
}

export function ValidationDisplay({ error, className = '' }: ValidationDisplayProps) {
  if (!error) return null

  return (
    <div className={`flex items-center gap-1 mt-1 text-sm text-red-600 dark:text-red-400 ${className}`}>
      <AlertCircle className="h-4 w-4" />
      <span>{error}</span>
    </div>
  )
}

interface ValidationSummaryProps {
  errors: Array<{ field: string; message: string }>
  className?: string
}

export function ValidationSummary({ errors, className = '' }: ValidationSummaryProps) {
  if (errors.length === 0) return null

  return (
    <div className={`rounded-md bg-red-50 dark:bg-red-900/20 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Please fix the following errors
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <ul className="list-disc space-y-1 pl-5">
              {errors.map((error, index) => (
                <li key={`${error.field}-${index}`}>{error.message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}