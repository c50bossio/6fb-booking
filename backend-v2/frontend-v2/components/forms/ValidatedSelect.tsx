"use client";

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectOption } from '@/components/ui/select';

export interface ValidatedSelectProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  showSuccessState?: boolean;
  isValidating?: boolean;
  id?: string;
  name?: string;
  labelClassName?: string;
  className?: string;
  rightIcon?: React.ReactNode;
}

export const ValidatedSelect = forwardRef<HTMLDivElement, ValidatedSelectProps>(
  ({
    label,
    value,
    onChange,
    onBlur,
    options,
    placeholder = "Select an option...",
    disabled = false,
    required = false,
    error,
    helperText,
    showSuccessState = false,
    isValidating = false,
    id,
    name,
    labelClassName,
    className,
    rightIcon,
  }, ref) => {
    const showError = error && error.length > 0;

    const renderRightIcon = () => {
      if (isValidating) {
        return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
      }
      
      if (showError) {
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      }
      
      if (showSuccessState && value) {
        return <Check className="h-4 w-4 text-green-500" />;
      }
      
      return rightIcon;
    };

    return (
      <div className="space-y-2">
        {label && (
          <Label
            htmlFor={id}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              showError && 'text-red-500',
              labelClassName
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </Label>
        )}
        
        <div className="relative">
          <div onBlur={onBlur}>
            <Select
              ref={ref}
              options={options}
              placeholder={placeholder}
              disabled={disabled}
              value={value}
              onChange={(value) => onChange?.(value as string)}
              className={cn(
                'w-full',
                showError && 'border-red-500 focus:ring-red-500',
                showSuccessState && 'border-green-500 focus:ring-green-500',
                className
              )}
            />
          </div>
          
          {(renderRightIcon() || showError || showSuccessState) && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              {renderRightIcon()}
            </div>
          )}
        </div>
        
        {showError && (
          <div
            id={`${id}-error`}
            role="alert"
            className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
          >
            <X className="h-3 w-3" />
            {error}
          </div>
        )}
        
        {helperText && !showError && (
          <div
            id={`${id}-helper`}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

ValidatedSelect.displayName = 'ValidatedSelect';

export default ValidatedSelect;