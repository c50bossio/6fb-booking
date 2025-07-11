"use client";

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
// Using native textarea element
import { Label } from '@/components/ui/label';

export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  touched?: boolean;
  dirty?: boolean;
  valid?: boolean;
  validating?: boolean;
  helperText?: string;
  showSuccess?: boolean;
  showCharCount?: boolean;
  textareaClassName?: string;
  labelClassName?: string;
  containerClassName?: string;
  errorClassName?: string;
  helperClassName?: string;
}

export const ValidatedTextarea = forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  (
    {
      label,
      error,
      touched = false,
      dirty = false,
      valid = true,
      validating = false,
      helperText,
      showSuccess = true,
      showCharCount = false,
      className,
      textareaClassName,
      labelClassName,
      containerClassName,
      errorClassName,
      helperClassName,
      maxLength,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    // Determine the current state
    const showError = touched && error;
    const showSuccessState = showSuccess && touched && !error && dirty && valid && !validating;
    const showValidating = validating && dirty;
    
    const charCount = value ? String(value).length : 0;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <Label
            htmlFor={props.id}
            className={cn(
              'text-sm font-medium',
              showError && 'text-red-500',
              labelClassName
            )}
          >
            {label}
            {props.required && <span className="ml-1 text-red-500">*</span>}
          </Label>
        )}
        
        <div className="relative">
          <textarea
            ref={ref}
            value={value}
            disabled={disabled}
            maxLength={maxLength}
            className={cn(
              'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              'resize-none transition-all duration-200',
              showError && 'border-red-500 focus:ring-red-500',
              showSuccessState && 'border-green-500 focus:ring-green-500',
              disabled && 'cursor-not-allowed opacity-50',
              textareaClassName
            )}
            aria-invalid={!!showError}
            aria-describedby={
              showError ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />
          
          {(showValidating || showError || showSuccessState) && (
            <div className="pointer-events-none absolute right-3 top-3">
              {showValidating && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              {showError && <X className="h-4 w-4 text-red-500" />}
              {showSuccessState && <Check className="h-4 w-4 text-green-500" />}
            </div>
          )}
        </div>
        
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {showError && (
              <div
                id={`${props.id}-error`}
                className={cn(
                  'flex items-center gap-1.5 text-sm text-red-500',
                  errorClassName
                )}
                role="alert"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {!showError && helperText && (
              <p
                id={`${props.id}-helper`}
                className={cn(
                  'text-sm text-gray-500',
                  helperClassName
                )}
              >
                {helperText}
              </p>
            )}
          </div>
          
          {showCharCount && maxLength && (
            <span
              className={cn(
                'text-xs tabular-nums',
                charCount > maxLength * 0.9 ? 'text-red-500' : 'text-gray-500'
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

ValidatedTextarea.displayName = 'ValidatedTextarea';