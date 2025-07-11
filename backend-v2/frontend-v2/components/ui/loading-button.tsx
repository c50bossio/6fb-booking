import React from 'react'
import { Button, ButtonProps } from './button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ className, children, disabled, loading, loadingText, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || 'Loading...'}
          </>
        ) : (
          children
        )}
      </Button>
    )
  }
)

LoadingButton.displayName = 'LoadingButton'

// Convenience components for common button types
export const SubmitButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loadingText = 'Submitting...', ...props }, ref) => {
    return <LoadingButton ref={ref} type="submit" loadingText={loadingText} {...props} />
  }
)

SubmitButton.displayName = 'SubmitButton'

export const SaveButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loadingText = 'Saving...', children = 'Save', ...props }, ref) => {
    return <LoadingButton ref={ref} loadingText={loadingText} {...props}>{children}</LoadingButton>
  }
)

SaveButton.displayName = 'SaveButton'

export const DeleteButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loadingText = 'Deleting...', children = 'Delete', variant = 'destructive', ...props }, ref) => {
    return <LoadingButton ref={ref} variant={variant} loadingText={loadingText} {...props}>{children}</LoadingButton>
  }
)

DeleteButton.displayName = 'DeleteButton'