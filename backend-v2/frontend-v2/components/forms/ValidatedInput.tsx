"use client";

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  touched?: boolean;
  dirty?: boolean;
  valid?: boolean;
  validating?: boolean;
  helperText?: string;
  showSuccess?: boolean;
  showPasswordToggle?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputClassName?: string;
  labelClassName?: string;
  containerClassName?: string;
  errorClassName?: string;
  helperClassName?: string;
}

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
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
      showPasswordToggle = false,
      leftIcon,
      rightIcon,
      className,
      inputClassName,
      labelClassName,
      containerClassName,
      errorClassName,
      helperClassName,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    
    // Determine the current state
    const showError = touched && error;
    const showSuccessState = showSuccess && touched && !error && dirty && valid && !validating;
    const showValidating = validating && dirty;

    // Determine input type
    const inputType = type === 'password' && showPassword ? 'text' : type;

    // Build the right icon
    const renderRightIcon = () => {
      if (showValidating) {
        return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
      }
      
      if (showError) {
        return <X className="h-4 w-4 text-red-500" />;
      }
      
      if (showSuccessState) {
        return <Check className="h-4 w-4 text-green-500" />;
      }
      
      if (type === 'password' && showPasswordToggle) {
        return (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="focus:outline-none text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        );
      }
      
      return rightIcon;
    };

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
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              {leftIcon}
            </div>
          )}
          
          <Input
            ref={ref}
            type={inputType}
            disabled={disabled}
            autoComplete={
              props.autoComplete || 
              (type === 'password' && !props.autoComplete ? 'current-password' : 
               type === 'email' && !props.autoComplete ? 'username' : undefined)
            }
            className={cn(
              'pr-10 transition-all duration-200',
              leftIcon && 'pl-10',
              showError && 'border-red-500 focus:ring-red-500',
              showSuccessState && 'border-green-500 focus:ring-green-500',
              disabled && 'cursor-not-allowed opacity-50',
              inputClassName
            )}
            aria-invalid={!!showError}
            aria-label={props.placeholder || props.name || `${type} input`}
            aria-describedby={
              showError ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...(({ size, autoComplete, ...rest }) => rest)(props)}
          />
          
          {(renderRightIcon() || showValidating || showError || showSuccessState) && (
            <div className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2">
              {renderRightIcon()}
            </div>
          )}
        </div>
        
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
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

// Password strength indicator component
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string;
}

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return { score: 0, feedback: 'Enter a password' };
  
  let score = 0;
  const feedback: string[] = [];
  
  // Length check
  if (password.length >= 8) score++;
  else feedback.push('at least 8 characters');
  
  if (password.length >= 12) score++;
  
  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else if (!/[a-z]/.test(password)) feedback.push('lowercase letters');
  else if (!/[A-Z]/.test(password)) feedback.push('uppercase letters');
  
  if (/\d/.test(password)) score++;
  else feedback.push('numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('special characters');
  
  const getFeedbackMessage = () => {
    if (score === 0) return 'Very weak';
    if (score === 1) return 'Weak';
    if (score === 2) return 'Fair';
    if (score === 3) return 'Good';
    if (score >= 4) return 'Strong';
    return '';
  };
  
  return {
    score: Math.min(score, 4),
    feedback: feedback.length > 0 
      ? `Password should include ${feedback.join(', ')}`
      : getFeedbackMessage(),
  };
};

export interface PasswordStrengthIndicatorProps {
  password: string;
  show?: boolean;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  show = true,
  className,
}) => {
  if (!show || !password) return null;
  
  const strength = getPasswordStrength(password);
  
  const getStrengthColor = () => {
    switch (strength.score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-yellow-500';
      case 3:
        return 'bg-blue-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };
  
  const getStrengthText = () => {
    switch (strength.score) {
      case 0:
      case 1:
        return 'text-red-600';
      case 2:
        return 'text-yellow-600';
      case 3:
        return 'text-blue-600';
      case 4:
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              index < strength.score ? getStrengthColor() : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs', getStrengthText())}>{strength.feedback}</p>
    </div>
  );
};