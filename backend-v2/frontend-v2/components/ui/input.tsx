'use client'

import React, { useState, useEffect } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const inputVariants = cva(
  'w-full rounded-ios border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 peer shadow-sm hover:shadow-md focus:shadow-lg transform-gpu will-change-transform',
  {
    variants: {
      variant: {
        default: 'border-ios-gray-300 dark:border-ios-gray-600 focus:border-primary-500 focus:ring-primary-500/20 hover:border-primary-400 dark:hover:border-primary-500 hover:-translate-y-0.5 focus:-translate-y-1',
        error: 'border-error-500 focus:border-error-500 focus:ring-error-500/20 hover:border-error-600 shadow-error/10',
        success: 'border-success-500 focus:border-success-500 focus:ring-success-500/20 hover:border-success-600 shadow-success/10',
        floating: 'border-ios-gray-300 dark:border-ios-gray-600 focus:border-primary-500 focus:ring-primary-500/20 placeholder:opacity-0 focus:placeholder:opacity-100 hover:border-primary-400 hover:-translate-y-0.5 focus:-translate-y-1',
      },
      size: {
        sm: 'px-3 py-2 text-ios-footnote',
        md: 'px-4 py-3 text-ios-body',
        lg: 'px-5 py-4 text-ios-headline',
      },
      rounded: {
        default: 'rounded-ios',
        full: 'rounded-full',
        none: 'rounded-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      rounded: 'default',
    },
  }
)

const labelVariants = cva(
  'absolute transition-all duration-300 pointer-events-none text-ios-gray-600 dark:text-ios-gray-400',
  {
    variants: {
      variant: {
        default: 'peer-focus:text-primary-600 dark:peer-focus:text-primary-400',
        error: 'text-error-600 dark:text-error-400',
        success: 'text-success-600 dark:text-success-400',
      },
      size: {
        sm: 'text-ios-footnote peer-focus:text-ios-caption1 peer-placeholder-shown:text-ios-footnote left-3 peer-placeholder-shown:top-2 peer-focus:top-1 peer-focus:-translate-y-2',
        md: 'text-ios-subheadline peer-focus:text-ios-footnote peer-placeholder-shown:text-ios-subheadline left-4 peer-placeholder-shown:top-3 peer-focus:top-1 peer-focus:-translate-y-2',
        lg: 'text-ios-callout peer-focus:text-ios-subheadline peer-placeholder-shown:text-ios-callout left-5 peer-placeholder-shown:top-4 peer-focus:top-1 peer-focus:-translate-y-2',
      },
      floating: {
        true: 'peer-placeholder-shown:scale-100 peer-focus:scale-90 peer-focus:bg-white dark:peer-focus:bg-gray-700 peer-focus:px-2',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      floating: false,
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  floatingLabel?: boolean
  showPasswordToggle?: boolean
  animateError?: boolean
  clearable?: boolean
  onClear?: () => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size,
    rounded,
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    floatingLabel = false,
    showPasswordToggle = false,
    animateError = true,
    clearable = false,
    onClear,
    type = 'text',
    value,
    id,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [hasValue, setHasValue] = useState(false)
    
    const inputId = id || props.name
    const hasError = !!error
    const inputType = showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type
    
    useEffect(() => {
      setHasValue(!!value || !!props.defaultValue)
    }, [value, props.defaultValue])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      setHasValue(!!e.target.value)
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value)
      props.onChange?.(e)
    }

    const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
    const paddingLeft = leftIcon ? (size === 'sm' ? 'pl-9' : size === 'lg' ? 'pl-12' : 'pl-10') : ''
    const paddingRight = (rightIcon || showPasswordToggle || clearable) ? (size === 'sm' ? 'pr-9' : size === 'lg' ? 'pr-12' : 'pr-10') : ''
    
    return (
      <div className="w-full">
        {/* Static Label */}
        {label && !floatingLabel && (
          <label 
            htmlFor={inputId}
            className="block text-ios-subheadline font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray-400 dark:text-ios-gray-500 ${iconSize}`}>
              {leftIcon}
            </div>
          )}
          
          {/* Input Field */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            value={value}
            className={inputVariants({ 
              variant: hasError ? 'error' : (floatingLabel ? 'floating' : variant), 
              size, 
              rounded,
              className: `${paddingLeft} ${paddingRight} ${animateError && hasError ? 'animate-ios-bounce' : ''} ${className || ''}` 
            })}
            placeholder={floatingLabel ? ' ' : props.placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />
          
          {/* Floating Label */}
          {label && floatingLabel && (
            <label 
              htmlFor={inputId}
              className={labelVariants({ 
                variant: hasError ? 'error' : 'default',
                size,
                floating: true,
                className: hasValue || isFocused ? 'scale-90 -translate-y-2 bg-white dark:bg-gray-700 px-2' : ''
              })}
            >
              {label}
            </label>
          )}
          
          {/* Right Icons Container */}
          {(rightIcon || showPasswordToggle || (clearable && hasValue)) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {/* Clear Button */}
              {clearable && hasValue && (
                <button
                  type="button"
                  onClick={() => {
                    setHasValue(false)
                    onClear?.()
                  }}
                  className={`text-ios-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-all duration-200 ease-out hover:scale-110 active:scale-95 transform-gpu ${iconSize}`}
                  tabIndex={-1}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              
              {/* Password Toggle */}
              {showPasswordToggle && type === 'password' && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`text-ios-gray-400 hover:text-primary-500 dark:hover:text-primary-400 transition-all duration-200 ease-out hover:scale-110 active:scale-95 transform-gpu ${iconSize}`}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}
              
              {/* Custom Right Icon */}
              {rightIcon && (
                <div className={`text-ios-gray-400 dark:text-ios-gray-500 ${iconSize}`}>
                  {rightIcon}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Helper Text / Error Message */}
        {(error || helperText) && (
          <div className={`mt-2 flex items-start gap-1 ${animateError && hasError ? 'animate-ios-slide-up' : ''}`}>
            {hasError && (
              <svg className="w-4 h-4 text-error-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <p className={`text-ios-footnote ${hasError ? 'text-error-600 dark:text-error-400' : 'text-ios-gray-500 dark:text-ios-gray-400'}`}>
              {error || helperText}
            </p>
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea component using similar styling
const textareaVariants = cva(
  'w-full rounded-ios border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[100px] shadow-sm hover:shadow-md focus:shadow-lg transform-gpu will-change-transform',
  {
    variants: {
      variant: {
        default: 'border-ios-gray-300 dark:border-ios-gray-600 focus:border-primary-500 focus:ring-primary-500/20 hover:border-primary-400 dark:hover:border-primary-500 hover:-translate-y-0.5 focus:-translate-y-1',
        error: 'border-error-500 focus:border-error-500 focus:ring-error-500/20 hover:border-error-600 shadow-error/10',
        success: 'border-success-500 focus:border-success-500 focus:ring-success-500/20 hover:border-success-600 shadow-success/10',
      },
      size: {
        sm: 'px-3 py-2 text-ios-footnote',
        md: 'px-4 py-3 text-ios-body',
        lg: 'px-5 py-4 text-ios-headline',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  label?: string
  error?: string
  helperText?: string
  floatingLabel?: boolean
  animateError?: boolean
  autoResize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    size,
    label,
    error,
    helperText,
    floatingLabel = false,
    animateError = true,
    autoResize = false,
    value,
    id,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [hasValue, setHasValue] = useState(false)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    const textareaId = id || props.name
    const hasError = !!error
    
    useEffect(() => {
      setHasValue(!!value || !!props.defaultValue)
    }, [value, props.defaultValue])

    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current
        textarea.style.height = 'auto'
        textarea.style.height = textarea.scrollHeight + 'px'
      }
    }, [value, autoResize])

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      setHasValue(!!e.target.value)
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(!!e.target.value)
      if (autoResize) {
        e.target.style.height = 'auto'
        e.target.style.height = e.target.scrollHeight + 'px'
      }
      props.onChange?.(e)
    }
    
    return (
      <div className="w-full">
        {/* Static Label */}
        {label && !floatingLabel && (
          <label 
            htmlFor={textareaId}
            className="block text-ios-subheadline font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={(node) => {
              if (node) {
                (textareaRef as any).current = node
              }
              if (typeof ref === 'function') {
                ref(node)
              } else if (ref && node) {
                (ref as any).current = node
              }
            }}
            id={textareaId}
            value={value}
            className={textareaVariants({ 
              variant: hasError ? 'error' : variant, 
              size, 
              className: `${animateError && hasError ? 'animate-ios-bounce' : ''} peer ${className || ''}` 
            })}
            placeholder={floatingLabel ? ' ' : props.placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />
          
          {/* Floating Label */}
          {label && floatingLabel && (
            <label 
              htmlFor={textareaId}
              className={labelVariants({ 
                variant: hasError ? 'error' : 'default',
                size,
                floating: true,
                className: hasValue || isFocused ? 'scale-90 -translate-y-2 bg-white dark:bg-gray-700 px-2' : ''
              })}
            >
              {label}
            </label>
          )}
        </div>
        
        {/* Helper Text / Error Message */}
        {(error || helperText) && (
          <div className={`mt-2 flex items-start gap-1 ${animateError && hasError ? 'animate-ios-slide-up' : ''}`}>
            {hasError && (
              <svg className="w-4 h-4 text-error-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <p className={`text-ios-footnote ${hasError ? 'text-error-600 dark:text-error-400' : 'text-ios-gray-500 dark:text-ios-gray-400'}`}>
              {error || helperText}
            </p>
          </div>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Input, Textarea, inputVariants, textareaVariants }