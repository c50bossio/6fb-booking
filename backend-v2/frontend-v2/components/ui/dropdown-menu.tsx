'use client'

import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DropdownMenuContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement>
}

const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(undefined)

const useDropdownContext = () => {
  const context = useContext(DropdownMenuContext)
  if (!context) {
    throw new Error('Dropdown components must be used within a DropdownMenu')
  }
  return context
}

interface DropdownMenuProps {
  children: React.ReactNode
  className?: string
}

export function DropdownMenu({ children, className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div className={cn('relative inline-block text-left', className)}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

export function DropdownMenuTrigger({ children, className, asChild }: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen, triggerRef } = useDropdownContext()

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: () => setIsOpen(!isOpen),
      'aria-expanded': isOpen,
      'aria-haspopup': true,
      className: cn(children.props.className, className),
    })
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
        'border border-gray-300 bg-white text-gray-700 shadow-sm',
        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      aria-expanded={isOpen}
      aria-haspopup={true}
    >
      {children}
    </button>
  )
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function DropdownMenuContent({ 
  children, 
  className, 
  align = 'start',
  side = 'bottom' 
}: DropdownMenuContentProps) {
  const { isOpen } = useDropdownContext()

  if (!isOpen) return null

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 transform -translate-x-1/2',
    end: 'right-0'
  }

  const sideClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  }

  return (
    <div
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white shadow-md',
        'animate-in fade-in-0 zoom-in-95',
        alignmentClasses[align],
        sideClasses[side],
        className
      )}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
}

interface DropdownMenuItemProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
  asChild?: boolean
}

export function DropdownMenuItem({ 
  children, 
  className, 
  disabled, 
  onClick,
  asChild 
}: DropdownMenuItemProps) {
  const { setIsOpen } = useDropdownContext()

  const handleClick = () => {
    if (!disabled) {
      onClick?.()
      setIsOpen(false)
    }
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      className: cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'hover:bg-gray-100 focus:bg-gray-100',
        disabled && 'pointer-events-none opacity-50',
        children.props.className,
        className
      ),
    })
  }

  return (
    <button
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'hover:bg-gray-100 focus:bg-gray-100',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

interface DropdownMenuSeparatorProps {
  className?: string
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return (
    <div
      className={cn(
        '-mx-1 my-1 h-px bg-gray-200',
        className
      )}
    />
  )
}

interface DropdownMenuLabelProps {
  children: React.ReactNode
  className?: string
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div
      className={cn(
        'px-2 py-1.5 text-sm font-semibold text-gray-900',
        className
      )}
    >
      {children}
    </div>
  )
}

interface DropdownMenuGroupProps {
  children: React.ReactNode
  className?: string
}

export function DropdownMenuGroup({ children, className }: DropdownMenuGroupProps) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  )
}

// Checkbox Menu Item
interface DropdownMenuCheckboxItemProps {
  children: React.ReactNode
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

export function DropdownMenuCheckboxItem({
  children,
  checked = false,
  onCheckedChange,
  className,
  disabled
}: DropdownMenuCheckboxItemProps) {
  const { setIsOpen } = useDropdownContext()

  const handleClick = () => {
    if (!disabled) {
      onCheckedChange?.(!checked)
      // Don't close menu for checkbox items
    }
  }

  return (
    <button
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'hover:bg-gray-100 focus:bg-gray-100',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </span>
      {children}
    </button>
  )
}

// Radio Menu Item
interface DropdownMenuRadioItemProps {
  children: React.ReactNode
  value: string
  className?: string
  disabled?: boolean
}

export function DropdownMenuRadioItem({
  children,
  value,
  className,
  disabled
}: DropdownMenuRadioItemProps) {
  return (
    <button
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'hover:bg-gray-100 focus:bg-gray-100',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      disabled={disabled}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-current" />
      </span>
      {children}
    </button>
  )
}

// Sub-menu (more complex, simplified version)
interface DropdownMenuSubProps {
  children: React.ReactNode
}

export function DropdownMenuSub({ children }: DropdownMenuSubProps) {
  return <>{children}</>
}

interface DropdownMenuSubTriggerProps {
  children: React.ReactNode
  className?: string
}

export function DropdownMenuSubTrigger({ children, className }: DropdownMenuSubTriggerProps) {
  return (
    <button
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'hover:bg-gray-100 focus:bg-gray-100',
        className
      )}
    >
      {children}
      <svg
        className="ml-auto h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  )
}

interface DropdownMenuSubContentProps {
  children: React.ReactNode
  className?: string
}

export function DropdownMenuSubContent({ children, className }: DropdownMenuSubContentProps) {
  return (
    <div
      className={cn(
        'absolute left-full top-0 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white shadow-md',
        className
      )}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
}