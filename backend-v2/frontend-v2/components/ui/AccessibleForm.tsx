'use client'

import * as React from 'react'
// For now, use a simple label until Radix UI is properly configured
// import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
)

// Simple label component for accessibility
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = 'Label'

// Enhanced Input with built-in accessibility features
const inputVariants = cva(
  'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: '',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-green-500 focus-visible:ring-green-500'
      },
      size: {
        default: 'h-11',
        sm: 'h-10',
        lg: 'h-12'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface AccessibleInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  label?: string
  error?: string
  helperText?: string
  required?: boolean
}

const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ 
    className, 
    variant, 
    size,
    type = 'text',
    label,
    error,
    helperText,
    required = false,
    id,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const inputId = id || React.useId()
    const errorId = `${inputId}-error`
    const helperTextId = `${inputId}-helper`
    
    const describedBy = [
      error ? errorId : null,
      helperText ? helperTextId : null,
      ariaDescribedBy
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-2">
        {label && (
          <Label 
            htmlFor={inputId}
            className={cn(
              required && "after:content-['*'] after:ml-0.5 after:text-destructive"
            )}
          >
            {label}
          </Label>
        )}
        
        <input
          type={type}
          className={cn(inputVariants({ variant: error ? 'error' : variant, size, className }))}
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required}
          {...props}
        />
        
        {error && (
          <p 
            id={errorId}
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p 
            id={helperTextId}
            className="text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
AccessibleInput.displayName = 'AccessibleInput'

// Enhanced Checkbox with proper labeling
export interface AccessibleCheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
  error?: string
}

const AccessibleCheckbox = React.forwardRef<HTMLInputElement, AccessibleCheckboxProps>(
  ({ 
    className,
    label,
    description,
    error,
    id,
    required = false,
    ...props 
  }, ref) => {
    const checkboxId = id || React.useId()
    const descriptionId = `${checkboxId}-description`
    const errorId = `${checkboxId}-error`
    
    const describedBy = [
      description ? descriptionId : null,
      error ? errorId : null
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-2">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            ref={ref}
            id={checkboxId}
            className={cn(
              'h-5 w-5 rounded border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive',
              className
            )}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : undefined}
            aria-required={required}
            {...props}
          />
          
          <div className="flex-1 space-y-1">
            <Label 
              htmlFor={checkboxId}
              className={cn(
                'text-sm font-medium cursor-pointer',
                required && "after:content-['*'] after:ml-0.5 after:text-destructive"
              )}
            >
              {label}
            </Label>
            
            {description && (
              <p 
                id={descriptionId}
                className="text-sm text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
        </div>
        
        {error && (
          <p 
            id={errorId}
            className="text-sm text-destructive ml-8"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)
AccessibleCheckbox.displayName = 'AccessibleCheckbox'

// Form Field wrapper for consistent spacing and accessibility
export interface FormFieldProps {
  children: React.ReactNode
  className?: string
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('space-y-2', className)}
      {...props}
    >
      {children}
    </div>
  )
)
FormField.displayName = 'FormField'

export { 
  Label, 
  AccessibleInput, 
  AccessibleCheckbox, 
  FormField,
  inputVariants 
}