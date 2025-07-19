// Utility functions for showing toasts from non-hook contexts (class components, event handlers, etc.)
import { toast as sonnerToast } from 'sonner'

interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

export const showToast = ({ title, description, variant = 'default', duration }: ToastOptions) => {
  if (variant === 'destructive') {
    sonnerToast.error(title, {
      description,
      duration,
    })
  } else {
    sonnerToast.success(title, {
      description,
      duration,
    })
  }
}