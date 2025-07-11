import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog'
import { Button } from './Button'
import { CONFIRMATION_MESSAGES } from '@/lib/ui-constants'

export interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  type?: keyof typeof CONFIRMATION_MESSAGES
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  loading?: boolean
  icon?: React.ReactNode
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'default',
  loading = false,
  icon
}: ConfirmationDialogProps) {
  const [isConfirming, setIsConfirming] = React.useState(false)
  
  // Use predefined messages if type is provided
  const predefinedMessages = type ? CONFIRMATION_MESSAGES[type] : null
  
  const finalTitle = title || predefinedMessages?.title || 'Confirm Action'
  const finalMessage = message || predefinedMessages?.message || 'Are you sure you want to proceed?'
  const finalConfirmText = confirmText || predefinedMessages?.confirmText || 'Confirm'
  const finalCancelText = cancelText || predefinedMessages?.cancelText || 'Cancel'
  
  const handleConfirm = async () => {
    try {
      setIsConfirming(true)
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Confirmation action failed:', error)
    } finally {
      setIsConfirming(false)
    }
  }
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          icon: '🗑️',
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          iconColor: 'text-red-600 dark:text-red-400',
          confirmVariant: 'destructive' as const
        }
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          confirmVariant: 'warning' as const
        }
      default:
        return {
          icon: 'ℹ️',
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
          confirmVariant: 'primary' as const
        }
    }
  }
  
  const variantStyles = getVariantStyles()
  const displayIcon = icon || variantStyles.icon
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${variantStyles.iconBg} ${variantStyles.iconColor} flex items-center justify-center text-xl`}>
              {displayIcon}
            </div>
            <div className="flex-1">
              <AlertDialogTitle>{finalTitle}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {finalMessage}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="ghost" disabled={isConfirming || loading}>
              {finalCancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={variantStyles.confirmVariant}
              onClick={handleConfirm}
              loading={isConfirming || loading}
              loadingText="Processing..."
            >
              {finalConfirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Hook for easier usage
export function useConfirmationDialog() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean
    props: Partial<ConfirmationDialogProps>
  }>({
    isOpen: false,
    props: {}
  })
  
  const openDialog = React.useCallback((props: Partial<ConfirmationDialogProps>) => {
    setDialogState({
      isOpen: true,
      props
    })
  }, [])
  
  const closeDialog = React.useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      isOpen: false
    }))
  }, [])
  
  const confirm = React.useCallback((
    props: Partial<ConfirmationDialogProps>
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      openDialog({
        ...props,
        onConfirm: () => {
          resolve(true)
          if (props.onConfirm) {
            props.onConfirm()
          }
        },
        onClose: () => {
          resolve(false)
          closeDialog()
          if (props.onClose) {
            props.onClose()
          }
        }
      })
    })
  }, [openDialog, closeDialog])
  
  const DialogComponent = React.useCallback(() => {
    if (!dialogState.isOpen) return null
    
    return (
      <ConfirmationDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        {...dialogState.props}
      />
    )
  }, [dialogState, closeDialog])
  
  return {
    openDialog,
    closeDialog,
    confirm,
    Dialog: DialogComponent
  }
}

// Common confirmation dialogs
export function DeleteConfirmationDialog(props: Omit<ConfirmationDialogProps, 'type' | 'variant'>) {
  return <ConfirmationDialog {...props} type="delete" variant="destructive" />
}

export function CancelConfirmationDialog(props: Omit<ConfirmationDialogProps, 'type' | 'variant'>) {
  return <ConfirmationDialog {...props} type="cancel" variant="warning" />
}

export function UnsavedChangesDialog(props: Omit<ConfirmationDialogProps, 'type' | 'variant'>) {
  return <ConfirmationDialog {...props} type="unsavedChanges" variant="warning" />
}