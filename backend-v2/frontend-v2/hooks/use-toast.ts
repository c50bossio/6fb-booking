'use client'

import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"
import { ToastAction } from "@/components/ui/toast"

const TOAST_LIMIT = 3 // Allow multiple toasts for better error feedback
const TOAST_REMOVE_DELAY = 1000000

export interface ErrorToastOptions {
  errorId?: string
  retryable?: boolean
  onRetry?: () => void | Promise<void>
  onReport?: () => void
  showDetailsOnClick?: boolean
  errorDetails?: string
  supportInfo?: {
    supportEmail?: string
    supportPhone?: string
    ticketId?: string
  }
}

export interface ProgressToastOptions {
  showProgress?: boolean
  progress?: number
  isLoading?: boolean
  onCancel?: () => void
}

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  errorOptions?: ErrorToastOptions
  progressOptions?: ProgressToastOptions
  duration?: number
  persistent?: boolean
  toastType?: 'error' | 'success' | 'info' | 'warning' | 'progress'
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string, customDelay?: number, persistent?: boolean) => {
  if (toastTimeouts.has(toastId) || persistent) {
    return
  }

  const delay = customDelay || TOAST_REMOVE_DELAY
  
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, delay)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        const toast = state.toasts.find(t => t.id === toastId)
        addToRemoveQueue(toastId, toast?.duration, toast?.persistent)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id, toast.duration, toast.persistent)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, []) // CRITICAL FIX: Remove [state] dependency to prevent infinite re-renders

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

// Helper functions for common toast types
export function toastError(
  message: string, 
  description?: string, 
  options?: ErrorToastOptions & { duration?: number; persistent?: boolean }
) {
  const { duration = 3000, persistent = false, ...errorOptions } = options || {}
  
  // Root cause of Radix UI infinite loops fixed in useToast hook dependency array
  
  return toast({
    variant: "destructive",
    title: message,
    description,
    duration,
    persistent,
    toastType: 'error',
    errorOptions,
  })
}

export function toastSuccess(
  message: string, 
  description?: string,
  duration: number = 3000
) {
  
  return toast({
    title: message,
    description,
    duration,
    toastType: 'success',
  })
}

export function toastInfo(
  message: string, 
  description?: string,
  duration: number = 3000
) {
  
  return toast({
    title: message,
    description,
    duration,
    toastType: 'info',
  })
}

export function toastWarning(
  message: string, 
  description?: string,
  duration: number = 4000
) {
  
  return toast({
    variant: "default",
    title: message,
    description,
    className: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    duration,
    toastType: 'warning',
  })
}

export function toastProgress(
  message: string,
  description?: string,
  options?: ProgressToastOptions
) {
  
  const { onCancel, ...progressOptions } = options || {}
  
  return toast({
    title: message,
    description,
    persistent: true, // Progress toasts should persist until updated
    toastType: 'progress',
    progressOptions,
  })
}

// Enhanced error toast for registration flow
export function toastRegistrationError(
  error: Error,
  context?: string,
  options?: {
    onRetry?: () => void | Promise<void>
    showDetails?: boolean
  }
) {
  const title = context ? `${context} Failed` : 'Registration Error'
  let description = error.message
  
  // Make error messages more user-friendly
  if (error.message.toLowerCase().includes('network')) {
    description = 'Unable to connect to the server. Please check your internet connection and try again.'
  } else if (error.message.toLowerCase().includes('timeout')) {
    description = 'The request took too long. Please try again.'
  } else if (error.message.includes('500')) {
    description = 'Server error. Please try again in a few moments.'
  }
  
  
  return toastError(title, description, {
    errorId: `reg_error_${Date.now()}`,
    retryable: Boolean(options?.onRetry),
    onRetry: options?.onRetry,
    showDetailsOnClick: options?.showDetails,
    errorDetails: error.stack,
    duration: 5000,
    persistent: false,
  })
}

// Network connectivity toast
export function toastNetworkStatus(isOnline: boolean) {
  
  if (isOnline) {
    return toastSuccess(
      'Back Online',
      'Your internet connection has been restored.',
      3000
    )
  } else {
    return toastError(
      'Connection Lost',
      'You are currently offline. Some features may not work properly.',
      {
        persistent: true,
        duration: 0, // Don't auto-dismiss
        errorId: 'network_offline'
      }
    )
  }
}

// Data recovery toast
export function toastDataRecovery(businessName: string, onRecover: () => void, onDecline: () => void) {
  
  return toast({
    title: 'Registration Progress Found',
    description: `We found your previous registration progress for "${businessName}". Click this notification to continue where you left off.`,
    persistent: true,
    duration: 0,
    toastType: 'info',
    onOpenChange: (open) => {
      // If user clicks on toast, trigger recovery
      if (!open) {
        onRecover()
      }
    }
  })
}

export { useToast, toast }