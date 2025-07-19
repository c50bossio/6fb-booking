'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  useScreenReader, 
  ariaHelpers, 
  keyboardHelpers, 
  SkipLink, 
  VisuallyHidden,
  useAccessibilityPreferences
} from '@/lib/accessibility'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  const { reducedMotion } = useAccessibilityPreferences()
  
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
        !reducedMotion && 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showSkipLink?: boolean
    announceOnOpen?: boolean
  }
>(({ className, children, showSkipLink = true, announceOnOpen = true, ...props }, ref) => {
  const { announce } = useScreenReader()
  const { reducedMotion } = useAccessibilityPreferences()
  
  // Announce dialog opening
  React.useEffect(() => {
    if (announceOnOpen) {
      announce('Dialog opened', 'polite')
    }
  }, [announce, announceOnOpen])

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg',
          !reducedMotion && 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          className
        )}
        {...props}
      >
        {/* Skip link for keyboard users */}
        {showSkipLink && (
          <SkipLink href="#dialog-close" className="absolute top-2 left-2 z-10">
            Skip to close button
          </SkipLink>
        )}

        {children}
        
        <DialogPrimitive.Close 
          id="dialog-close"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground touch-target"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close dialog</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

// Alert Dialog for important confirmations
export const AlertDialog = ({ children, ...props }: React.ComponentProps<typeof Dialog>) => (
  <Dialog {...props}>
    {children}
  </Dialog>
)

// Confirmation Dialog Component
export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: 'default' | 'destructive'
  loading?: boolean
}

export const ConfirmationDialog = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  ConfirmationDialogProps
>(({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  loading = false,
  ...props
}, ref) => {
  const { announce } = useScreenReader()

  const handleConfirm = () => {
    onConfirm()
    announce(`${title} confirmed`, 'polite')
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
    announce('Action cancelled', 'polite')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={ref}
        className="sm:max-w-[425px]"
        announceOnOpen={false} // Custom announcement below
        {...props}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors duration-200',
              variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
            )}
            onClick={handleConfirm}
            disabled={loading}
            aria-describedby={loading ? 'loading-description' : undefined}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
          {loading && (
            <VisuallyHidden id="loading-description">
              Please wait while your request is being processed
            </VisuallyHidden>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

ConfirmationDialog.displayName = 'ConfirmationDialog'

// Hook for using dialogs with accessibility features
export const useDialog = () => {
  const [open, setOpen] = React.useState(false)
  const { announce } = useScreenReader()

  const openDialog = React.useCallback((title?: string) => {
    setOpen(true)
    if (title) {
      announce(`Opening ${title}`, 'polite')
    }
  }, [announce])
  
  const closeDialog = React.useCallback((title?: string) => {
    setOpen(false)
    if (title) {
      announce(`Closed ${title}`, 'polite')
    }
  }, [announce])

  return {
    open,
    setOpen,
    openDialog,
    closeDialog,
    dialogProps: {
      open,
      onOpenChange: setOpen,
    },
  }
}

// Enhanced dialog components with accessibility
export const AccessibleDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent> & {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  }
>(({ className, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  }

  return (
    <DialogContent
      ref={ref}
      className={cn(
        sizeClasses[size],
        'max-h-[90vh] overflow-auto',
        className
      )}
      {...props}
    />
  )
})

AccessibleDialogContent.displayName = 'AccessibleDialogContent'

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}