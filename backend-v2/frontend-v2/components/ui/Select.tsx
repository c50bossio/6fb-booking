'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const selectVariants = cva(
  'w-full rounded-ios border bg-white dark:bg-zinc-800 text-accent-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'border-ios-gray-300 dark:border-ios-gray-600 focus:border-primary-500 focus:ring-primary-500/20 hover:border-ios-gray-400 dark:hover:border-ios-gray-500',
        error: 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
        success: 'border-success-500 focus:border-success-500 focus:ring-success-500/20',
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

const dropdownVariants = cva(
  'absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-ios-gray-200 dark:border-ios-gray-700 rounded-ios shadow-ios-lg max-h-60 overflow-auto',
  {
    variants: {
      position: {
        bottom: 'top-full',
        top: 'bottom-full mb-1',
      },
    },
    defaultVariants: {
      position: 'bottom',
    },
  }
)

const optionVariants = cva(
  'px-4 py-2 cursor-pointer transition-colors duration-150 flex items-center justify-between',
  {
    variants: {
      variant: {
        default: 'hover:bg-ios-gray-50 dark:hover:bg-ios-gray-800 text-accent-900 dark:text-white',
        selected: 'bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900',
        disabled: 'text-ios-gray-400 cursor-not-allowed',
      },
      size: {
        sm: 'py-1.5 px-3 text-ios-footnote',
        md: 'py-2 px-4 text-ios-body',
        lg: 'py-3 px-5 text-ios-headline',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
  description?: string
}

export interface SelectProps extends VariantProps<typeof selectVariants> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  value?: string | string[]
  defaultValue?: string | string[]
  placeholder?: string
  searchable?: boolean
  multiple?: boolean
  clearable?: boolean
  disabled?: boolean
  loading?: boolean
  onCreate?: (inputValue: string) => void
  onChange?: (value: string | string[] | null) => void
  onSearchChange?: (searchValue: string) => void
  maxHeight?: number
  className?: string
  dropdownClassName?: string
  id?: string
  name?: string
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({
    label,
    error,
    helperText,
    options,
    value,
    defaultValue,
    placeholder = 'Select an option...',
    searchable = false,
    multiple = false,
    clearable = false,
    disabled = false,
    loading = false,
    variant,
    size,
    onCreate,
    onChange,
    onSearchChange,
    maxHeight = 240,
    className,
    dropdownClassName,
    id,
    name,
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchValue, setSearchValue] = useState('')
    const [selectedValues, setSelectedValues] = useState<string[]>(() => {
      if (value) {
        return Array.isArray(value) ? value : [value]
      }
      if (defaultValue) {
        return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
      }
      return []
    })
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')

    const selectRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const hasError = !!error

    // Sync internal state with external value
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValues(Array.isArray(value) ? value : value ? [value] : [])
      }
    }, [value])

    // Filter options based on search
    const filteredOptions = useMemo(() => {
      if (!searchable || !searchValue) return options
      return options.filter(option =>
        option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
        option.value.toLowerCase().includes(searchValue.toLowerCase())
      )
    }, [options, searchValue, searchable])

    // Get selected option labels
    const selectedLabels = useMemo(() => {
      return selectedValues
        .map(val => options.find(opt => opt.value === val)?.label)
        .filter(Boolean) as string[]
    }, [selectedValues, options])

    // Handle dropdown position
    const updateDropdownPosition = () => {
      if (!selectRef.current) return
      
      const rect = selectRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      
      setDropdownPosition(spaceBelow < maxHeight && spaceAbove > spaceBelow ? 'top' : 'bottom')
    }

    // Click outside handler
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          selectRef.current &&
          !selectRef.current.contains(event.target as Node) &&
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false)
          setSearchValue('')
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    // Keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) return

      switch (event.key) {
        case 'Enter':
        case ' ':
          if (!isOpen) {
            event.preventDefault()
            setIsOpen(true)
            updateDropdownPosition()
          }
          break
        case 'Escape':
          if (isOpen) {
            event.preventDefault()
            setIsOpen(false)
            setSearchValue('')
          }
          break
        case 'ArrowDown':
        case 'ArrowUp':
          if (!isOpen) {
            event.preventDefault()
            setIsOpen(true)
            updateDropdownPosition()
          }
          break
      }
    }

    // Handle option selection
    const handleOptionSelect = (option: SelectOption) => {
      if (option.disabled) return

      let newValues: string[]
      
      if (multiple) {
        if (selectedValues.includes(option.value)) {
          newValues = selectedValues.filter(val => val !== option.value)
        } else {
          newValues = [...selectedValues, option.value]
        }
      } else {
        newValues = [option.value]
        setIsOpen(false)
        setSearchValue('')
      }

      setSelectedValues(newValues)
      
      const emitValue = multiple ? newValues : (newValues[0] || null)
      onChange?.(emitValue)
    }

    // Handle clear
    const handleClear = (event: React.MouseEvent) => {
      event.stopPropagation()
      setSelectedValues([])
      onChange?.(multiple ? [] : null)
    }

    // Handle search
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value
      setSearchValue(newValue)
      onSearchChange?.(newValue)
    }

    // Handle create option
    const handleCreateOption = () => {
      if (onCreate && searchValue && !filteredOptions.some(opt => opt.label === searchValue)) {
        onCreate(searchValue)
        setSearchValue('')
      }
    }

    const displayValue = selectedLabels.length > 0 
      ? multiple 
        ? `${selectedLabels.length} selected`
        : selectedLabels[0]
      : placeholder

    const showCreateOption = onCreate && searchValue && !filteredOptions.some(opt => opt.label === searchValue)

    return (
      <div className="w-full" ref={ref}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={id}
            className="block text-ios-subheadline font-medium text-accent-700 dark:text-ios-gray-300 mb-2"
          >
            {label}
          </label>
        )}

        {/* Select Button */}
        <div className="relative" ref={selectRef}>
          <button
            type="button"
            id={id}
            name={name}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen)
                updateDropdownPosition()
              }
            }}
            onKeyDown={handleKeyDown}
            className={selectVariants({
              variant: hasError ? 'error' : variant,
              size,
              className: `flex items-center justify-between ${className || ''}`
            })}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-labelledby={label ? `${id}-label` : undefined}
          >
            <span className={`flex-1 text-left truncate ${selectedValues.length === 0 ? 'text-ios-gray-400 dark:text-ios-gray-500' : ''}`}>
              {loading ? 'Loading...' : displayValue}
            </span>
            
            <div className="flex items-center gap-2 ml-2">
              {/* Loading Spinner */}
              {loading && (
                <svg className="animate-spin h-4 w-4 text-ios-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              
              {/* Clear Button */}
              {clearable && selectedValues.length > 0 && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-ios-gray-400 hover:text-ios-gray-600 dark:hover:text-ios-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              
              {/* Dropdown Arrow */}
              <svg 
                className={`w-5 h-5 text-ios-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className={dropdownVariants({ 
                position: dropdownPosition,
                className: dropdownClassName 
              })}
              style={{ maxHeight }}
              role="listbox"
              aria-labelledby={id}
            >
              {/* Search Input */}
              {searchable && (
                <div className="p-2 border-b border-ios-gray-200 dark:border-ios-gray-700">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchValue}
                    onChange={handleSearchChange}
                    placeholder="Search options..."
                    className="w-full px-3 py-2 text-ios-body bg-white dark:bg-zinc-900 text-accent-900 dark:text-white placeholder:text-ios-gray-400 dark:placeholder:text-zinc-400 border border-ios-gray-300 dark:border-ios-gray-600 rounded-ios focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    autoFocus
                  />
                </div>
              )}

              {/* Options */}
              <div className="py-1">
                {filteredOptions.length === 0 && !showCreateOption ? (
                  <div className="px-4 py-2 text-ios-gray-500 dark:text-ios-gray-400 text-ios-body">
                    No options found
                  </div>
                ) : (
                  <>
                    {filteredOptions.map((option) => {
                      const isSelected = selectedValues.includes(option.value)
                      return (
                        <div
                          key={option.value}
                          onClick={() => handleOptionSelect(option)}
                          className={optionVariants({
                            variant: option.disabled ? 'disabled' : isSelected ? 'selected' : 'default',
                            size
                          })}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {option.icon && (
                              <span className="flex-shrink-0 w-5 h-5">
                                {option.icon}
                              </span>
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{option.label}</div>
                              {option.description && (
                                <div className="text-ios-caption1 text-ios-gray-500 dark:text-ios-gray-400">
                                  {option.description}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Checkmark for selected items */}
                          {isSelected && (
                            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Create Option */}
                    {showCreateOption && (
                      <div
                        onClick={handleCreateOption}
                        className={optionVariants({ variant: 'default', size })}
                        role="option"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          <span>Create "{searchValue}"</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Helper Text / Error Message */}
        {(error || helperText) && (
          <div className="mt-2 flex items-start gap-1">
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

Select.displayName = 'Select'

export { Select, selectVariants }