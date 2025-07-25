import React from 'react'
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/lib/ui-constants'

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

// Toast options
export interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

// Default durations
const DEFAULT_DURATION = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 4000
}

// Icons for each type
const TOAST_ICONS = {
  success: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
  error: <XCircleIcon className="w-5 h-5 text-red-600" />,
  warning: <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />,
  info: <InformationCircleIcon className="w-5 h-5 text-blue-600" />
}

// Enhanced custom toast component with design system
function CustomToast({
  type,
  title,
  description,
  action
}: {
  type: ToastType
  title: string
  description?: string
  action?: ToastOptions['action']
}) {
  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  }
  
  const textColors = {
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
    warning: 'text-yellow-800 dark:text-yellow-200',
    info: 'text-blue-800 dark:text-blue-200'
  }
  
  return (
    <div className={`
      flex items-start gap-3 p-4 rounded-lg border shadow-sm backdrop-blur-sm
      transition-all duration-200 ease-out hover:shadow-md transform-gpu
      ${bgColors[type]}
    `}>
      <div className="flex-shrink-0 mt-0.5">
        <div className="animate-in fade-in duration-200">
          {TOAST_ICONS[type]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textColors[type]} animate-in slide-in-from-left duration-300`}>
          {title}
        </p>
        {description && (
          <p className={`mt-1 text-sm ${textColors[type]} opacity-90 animate-in slide-in-from-left duration-300 delay-75`}>
            {description}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={`
              mt-2 text-sm font-medium ${textColors[type]} 
              hover:underline transition-all duration-200 ease-out
              hover:scale-105 active:scale-95 transform-gpu
            `}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

// Main hook
export function useToast() {
  // Success toast with predefined messages
  const success = (keyOrMessage: keyof typeof SUCCESS_MESSAGES | string, options?: ToastOptions) => {
    const message = keyOrMessage in SUCCESS_MESSAGES 
      ? SUCCESS_MESSAGES[keyOrMessage as keyof typeof SUCCESS_MESSAGES]
      : keyOrMessage
    
    sonnerToast.custom((t) => (
      <CustomToast
        type="success"
        title={options?.title || message}
        description={options?.description}
        action={options?.action}
      />
    ), {
      duration: options?.duration || DEFAULT_DURATION.success,
      dismissible: options?.dismissible !== false,
      position: options?.position || 'bottom-right'
    })
  }
  
  // Error toast with predefined messages
  const error = (keyOrMessage: keyof typeof ERROR_MESSAGES | string | Error, options?: ToastOptions) => {
    let message: string
    
    if (keyOrMessage instanceof Error) {
      message = keyOrMessage.message
    } else if (typeof keyOrMessage === 'string' && keyOrMessage in ERROR_MESSAGES) {
      message = ERROR_MESSAGES[keyOrMessage as keyof typeof ERROR_MESSAGES]
    } else {
      message = keyOrMessage as string
    }
    
    sonnerToast.custom((t) => (
      <CustomToast
        type="error"
        title={options?.title || message}
        description={options?.description}
        action={options?.action}
      />
    ), {
      duration: options?.duration || DEFAULT_DURATION.error,
      dismissible: options?.dismissible !== false,
      position: options?.position || 'bottom-right'
    })
  }
  
  // Warning toast
  const warning = (message: string, options?: ToastOptions) => {
    sonnerToast.custom((t) => (
      <CustomToast
        type="warning"
        title={options?.title || message}
        description={options?.description}
        action={options?.action}
      />
    ), {
      duration: options?.duration || DEFAULT_DURATION.warning,
      dismissible: options?.dismissible !== false,
      position: options?.position || 'bottom-right'
    })
  }
  
  // Info toast
  const info = (message: string, options?: ToastOptions) => {
    sonnerToast.custom((t) => (
      <CustomToast
        type="info"
        title={options?.title || message}
        description={options?.description}
        action={options?.action}
      />
    ), {
      duration: options?.duration || DEFAULT_DURATION.info,
      dismissible: options?.dismissible !== false,
      position: options?.position || 'bottom-right'
    })
  }
  
  // Promise toast for async operations
  const promise = async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: ToastOptions
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: (data) => {
        const successMessage = typeof messages.success === 'function' 
          ? messages.success(data) 
          : messages.success
        
        return (
          <CustomToast
            type="success"
            title={successMessage}
            description={options?.description}
            action={options?.action}
          />
        )
      },
      error: (error) => {
        const errorMessage = typeof messages.error === 'function'
          ? messages.error(error)
          : messages.error
          
        return (
          <CustomToast
            type="error"
            title={errorMessage}
            description={options?.description}
            action={options?.action}
          />
        )
      }
    })
  }
  
  // Dismiss toast
  const dismiss = (toastId?: string | number) => {
    sonnerToast.dismiss(toastId)
  }
  
  // Dismiss all toasts
  const dismissAll = () => {
    sonnerToast.dismiss()
  }
  
  return {
    success,
    error,
    warning,
    info,
    promise,
    dismiss,
    dismissAll
  }
}

// Toast provider component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SonnerToaster
        richColors
        closeButton
        expand
        position="bottom-right"
        offset="16px"
        toastOptions={{
          className: 'sonner-toast',
          style: {
            borderRadius: '0.5rem',
            border: '1px solid',
            borderColor: 'var(--border)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            maxWidth: '420px',
            width: 'calc(100vw - 32px)', // Responsive width with margin
            marginRight: '16px',
            marginBottom: '16px'
          }
        }}
      />
    </>
  )
}

// Helper functions for common toast patterns
export const toastHelpers = {
  // API error handler
  apiError: (error: any, fallbackMessage = 'An error occurred') => {
    const toast = useToast()
    
    if (error.response?.data?.detail) {
      toast.error(error.response.data.detail)
    } else if (error.message) {
      toast.error(error.message)
    } else {
      toast.error(fallbackMessage)
    }
  },
  
  // Form submission handler
  formSubmit: async <T,>(
    submitFn: () => Promise<T>,
    successMessage = 'Saved successfully',
    errorMessage = 'Failed to save'
  ) => {
    const toast = useToast()
    
    return toast.promise(submitFn(), {
      loading: 'Saving...',
      success: successMessage,
      error: errorMessage
    })
  },
  
  // Delete confirmation handler
  deleteWithConfirmation: async (
    deleteFn: () => Promise<void>,
    itemName: string
  ) => {
    const toast = useToast()
    
    return toast.promise(deleteFn(), {
      loading: `Deleting ${itemName}...`,
      success: `${itemName} deleted successfully`,
      error: `Failed to delete ${itemName}`
    })
  }
}