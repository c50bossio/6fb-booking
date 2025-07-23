'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { ChevronDownIcon, UserIcon } from '@heroicons/react/24/outline'
import { type User } from '@/lib/api'
import { cn } from '@/lib/utils'

interface BarberSelectorProps {
  selectedBarber: User | null
  onSelectBarber: (barber: User | null) => void
  barbers: User[]
  loadingBarbers: boolean
  isPublicBooking?: boolean
  className?: string
}

export const BarberSelector = memo(function BarberSelector({
  selectedBarber,
  onSelectBarber,
  barbers,
  loadingBarbers,
  isPublicBooking = false,
  className = ''
}: BarberSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-semibold text-gray-900 dark:text-white">
        Barber {!isPublicBooking ? '(Optional)' : ''}
      </label>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-gray-400" />
            <span className={selectedBarber ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
              {selectedBarber ? selectedBarber.name : 'Any available barber'}
            </span>
          </div>
          <ChevronDownIcon className={cn(
            'w-5 h-5 text-gray-400 transition-transform',
            isDropdownOpen && 'rotate-180'
          )} />
        </button>

        {isDropdownOpen && (
          <BarberDropdownContent
            barbers={barbers}
            loadingBarbers={loadingBarbers}
            selectedBarber={selectedBarber}
            onSelectBarber={(barber) => {
              onSelectBarber(barber)
              setIsDropdownOpen(false)
            }}
          />
        )}
      </div>
    </div>
  )
})

// Separate component for dropdown content
const BarberDropdownContent = memo(function BarberDropdownContent({
  barbers,
  loadingBarbers,
  selectedBarber,
  onSelectBarber
}: {
  barbers: User[]
  loadingBarbers: boolean
  selectedBarber: User | null
  onSelectBarber: (barber: User | null) => void
}) {
  return (
    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
      {loadingBarbers ? (
        <div className="p-3 text-center text-gray-500">Loading barbers...</div>
      ) : (
        <>
          {/* Any available barber option */}
          <button
            onClick={() => onSelectBarber(null)}
            className={cn(
              'w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2',
              !selectedBarber && 'bg-gray-50 dark:bg-gray-600'
            )}
          >
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              Any available barber
            </span>
          </button>
          
          {barbers.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              {barbers.map((barber) => (
                <BarberItem
                  key={barber.id}
                  barber={barber}
                  isSelected={selectedBarber?.id === barber.id}
                  onSelect={() => onSelectBarber(barber)}
                />
              ))}
            </div>
          )}
          
          {barbers.length === 0 && (
            <div className="p-3 text-center text-gray-500">
              No barbers available
            </div>
          )}
        </>
      )}
    </div>
  )
})

// Individual barber item component
const BarberItem = memo(function BarberItem({
  barber,
  isSelected,
  onSelect
}: {
  barber: User
  isSelected: boolean
  onSelect: () => void
}) {
  // Generate initials for avatar
  const initials = barber.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-3 transition-colors',
        isSelected && 'bg-gray-50 dark:bg-gray-600'
      )}
    >
      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
          {initials}
        </span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-gray-900 dark:text-white truncate">
          {barber.name || 'Unknown Barber'}
        </span>
        <span className="text-sm text-gray-500 capitalize">
          {barber.role}
        </span>
      </div>
      {isSelected && (
        <div className="ml-auto flex-shrink-0">
          <div className="w-2 h-2 bg-primary-600 dark:bg-primary-400 rounded-full" />
        </div>
      )}
    </button>
  )
})

// Helper function to sort barbers by name
export function sortBarbersByName(barbers: User[]): User[] {
  return [...barbers].sort((a, b) => {
    const nameA = a.name || ''
    const nameB = b.name || ''
    return nameA.localeCompare(nameB)
  })
}