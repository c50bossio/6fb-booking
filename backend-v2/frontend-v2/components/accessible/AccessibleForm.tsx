'use client'

import React, { forwardRef, useId } from 'react'
import { Label } from "'@/components/ui/Label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { Info, AlertCircle } from 'lucide-react'

// Accessible form field wrapper
interface AccessibleFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactElement
  className?: string
}

export const AccessibleField = forwardRef<HTMLDivElement, AccessibleFieldProps>(
  ({ label, error, hint, required, children, className }, ref) => {
    const fieldId = useId()
    const errorId = `${fieldId}-error`
    const hintId = `${fieldId}-hint`

    // Clone child element with accessibility props
    const accessibleChild = React.cloneElement(children, {
      id: fieldId,
      'aria-invalid': !!error,
      'aria-describedby': [
        error && errorId,
        hint && hintId,
      ].filter(Boolean).join(' ') || undefined,
      'aria-required': required,
    })

    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <Label htmlFor={fieldId} className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive" aria-label="required">*</span>}
        </Label>
        
        {hint && (
          <p id={hintId} className="text-sm text-muted-foreground flex items-start gap-1">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {hint}
          </p>
        )}
        
        {accessibleChild}
        
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive flex items-start gap-1">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleField.displayName = 'AccessibleField'

// Accessible input with enhanced features
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  icon?: React.ReactNode
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ label, error, hint, required, icon, className, ...props }, ref) => {
    return (
      <AccessibleField label={label} error={error} hint={hint} required={required}>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <Input
            ref={ref}
            className={cn(icon && 'pl-10', className)}
            {...props}
          />
        </div>
      </AccessibleField>
    )
  }
)

AccessibleInput.displayName = 'AccessibleInput'

// Accessible textarea
interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
  showCharCount?: boolean
  maxCharacters?: number
}

export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({ label, error, hint, required, showCharCount, maxCharacters, value, className, ...props }, ref) => {
    const charCount = String(value || '').length
    const charCountId = useId()

    return (
      <AccessibleField label={label} error={error} hint={hint} required={required}>
        <div className="space-y-1">
          <Textarea
            ref={ref}
            value={value}
            className={className}
            aria-describedby={showCharCount ? charCountId : undefined}
            {...props}
          />
          {showCharCount && (
            <p id={charCountId} className="text-xs text-muted-foreground text-right">
              {charCount}
              {maxCharacters && ` / ${maxCharacters}`}
              {maxCharacters && charCount > maxCharacters && (
                <span className="text-destructive ml-1" role="alert">
                  (exceeds limit)
                </span>
              )}
            </p>
          )}
        </div>
      </AccessibleField>
    )
  }
)

AccessibleTextarea.displayName = 'AccessibleTextarea'

// Accessible select
interface AccessibleSelectProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  className?: string
}

export const AccessibleSelect = forwardRef<HTMLButtonElement, AccessibleSelectProps>(
  ({ label, error, hint, required, placeholder, value, onValueChange, options, className }, ref) => {
    return (
      <AccessibleField label={label} error={error} hint={hint} required={required}>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger ref={ref} className={className}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AccessibleField>
    )
  }
)

AccessibleSelect.displayName = 'AccessibleSelect'

// Accessible checkbox group
interface AccessibleCheckboxGroupProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  options: Array<{
    value: string
    label: string
    disabled?: boolean
    hint?: string
  }>
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

export function AccessibleCheckboxGroup({
  label,
  error,
  hint,
  required,
  options,
  value,
  onChange,
  className,
}: AccessibleCheckboxGroupProps) {
  const groupId = useId()

  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue])
    } else {
      onChange(value.filter(v => v !== optionValue))
    }
  }

  return (
    <fieldset className={cn('space-y-3', className)}>
      <legend className="text-sm font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-destructive" aria-label="required">*</span>}
      </legend>
      
      {hint && (
        <p className="text-sm text-muted-foreground flex items-start gap-1">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {hint}
        </p>
      )}
      
      <div className="space-y-2" role="group" aria-describedby={error ? `${groupId}-error` : undefined}>
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`
          const hintId = `${optionId}-hint`
          
          return (
            <div key={option.value} className="flex items-start space-x-2">
              <Checkbox
                id={optionId}
                checked={value.includes(option.value)}
                onCheckedChange={(checked) => handleChange(option.value, !!checked)}
                disabled={option.disabled}
                aria-describedby={option.hint ? hintId : undefined}
              />
              <div className="space-y-1">
                <Label
                  htmlFor={optionId}
                  className={cn(
                    'text-sm font-normal cursor-pointer',
                    option.disabled && 'text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {option.label}
                </Label>
                {option.hint && (
                  <p id={hintId} className="text-xs text-muted-foreground">
                    {option.hint}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {error && (
        <p id={`${groupId}-error`} role="alert" className="text-sm text-destructive flex items-start gap-1">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  )
}

// Accessible radio group
interface AccessibleRadioGroupProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  options: Array<{
    value: string
    label: string
    disabled?: boolean
    hint?: string
  }>
  value?: string
  onChange: (value: string) => void
  className?: string
}

export function AccessibleRadioGroup({
  label,
  error,
  hint,
  required,
  options,
  value,
  onChange,
  className,
}: AccessibleRadioGroupProps) {
  const groupId = useId()

  return (
    <fieldset className={cn('space-y-3', className)}>
      <legend className="text-sm font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-destructive" aria-label="required">*</span>}
      </legend>
      
      {hint && (
        <p className="text-sm text-muted-foreground flex items-start gap-1">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {hint}
        </p>
      )}
      
      <RadioGroup
        value={value}
        onValueChange={onChange}
        aria-describedby={error ? `${groupId}-error` : undefined}
        aria-required={required}
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`
          const hintId = `${optionId}-hint`
          
          return (
            <div key={option.value} className="flex items-start space-x-2">
              <RadioGroupItem
                id={optionId}
                value={option.value}
                disabled={option.disabled}
                aria-describedby={option.hint ? hintId : undefined}
              />
              <div className="space-y-1">
                <Label
                  htmlFor={optionId}
                  className={cn(
                    'text-sm font-normal cursor-pointer',
                    option.disabled && 'text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {option.label}
                </Label>
                {option.hint && (
                  <p id={hintId} className="text-xs text-muted-foreground">
                    {option.hint}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </RadioGroup>
      
      {error && (
        <p id={`${groupId}-error`} role="alert" className="text-sm text-destructive flex items-start gap-1">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  )
}

// Form section for grouping related fields
interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}