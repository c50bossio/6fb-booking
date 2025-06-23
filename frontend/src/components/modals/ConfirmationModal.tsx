'use client'

import { ReactNode } from 'react'
import BaseModal from './BaseModal'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonClass?: string
  cancelButtonClass?: string
  icon?: ReactNode
  isLoading?: boolean
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "bg-red-600 hover:bg-red-700 text-white",
  cancelButtonClass = "premium-button-secondary",
  icon,
  isLoading = false
}: ConfirmationModalProps) {

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnOverlayClick={!isLoading}
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
          {icon || <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`${cancelButtonClass} text-sm`}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`
              ${confirmButtonClass}
              font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl
              transform hover:-translate-y-0.5 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              text-sm
            `}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
