"use client";

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ValidatedSelectProps {
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  touched?: boolean;
  dirty?: boolean;
  valid?: boolean;
  validating?: boolean;
  helperText?: string;
  showSuccess?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  containerClassName?: string;
  errorClassName?: string;
  helperClassName?: string;
}

export const ValidatedSelect = forwardRef<HTMLDivElement, ValidatedSelectProps>(
  (
    {
      id,
      name,
      label,
      placeholder = 'Select an option',
      options,
      value,
      onChange,
      onBlur,
      error,
      touched = false,
      dirty = false,
      valid = true,
      validating = false,
      helperText,
      showSuccess = true,
      required = false,
      disabled = false,
      className,
      labelClassName,
      containerClassName,
      errorClassName,
      helperClassName,
    },
    ref
  ) => {
    // Determine the current state
    const showError = touched && error;
    const showSuccessState = showSuccess && touched && !error && dirty && valid && !validating;
    const showValidating = validating && dirty;

    return (
      <div ref={ref} className={cn('space-y-2', containerClassName)}>
        {label && (
          <Label
            htmlFor={id}
            className={cn(
              'text-sm font-medium',
              showError && 'text-red-500',
              labelClassName
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </Label>
        )}
        
        <div className="relative">
          <Select
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            name={name}
          >
            <SelectTrigger
              id={id}
              className={cn(
                'w-full',
                showError && 'border-red-500 focus:ring-red-500',
                showSuccessState && 'border-green-500 focus:ring-green-500',
                disabled && 'cursor-not-allowed opacity-50',
                className
              )}
              onBlur={onBlur}
              aria-invalid={showError}
              aria-describedby={
                showError ? `${id}-error` : helperText ? `${id}-helper` : undefined
              }
            >
              <SelectValue placeholder={placeholder} />
              <div className="absolute right-8 top-1/2 -translate-y-1/2">
                {showValidating && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                {showError && <X className="h-4 w-4 text-red-500" />}
                {showSuccessState && <Check className="h-4 w-4 text-green-500" />}
              </div>
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
        </div>
        
        {showError && (
          <div
            id={`${id}-error`}
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
            id={`${id}-helper`}
            className={cn(
              'text-sm text-gray-500',
              helperClassName
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

ValidatedSelect.displayName = 'ValidatedSelect';