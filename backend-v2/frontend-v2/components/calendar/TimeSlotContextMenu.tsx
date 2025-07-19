'use client'

import React, { useState, useEffect, useRef } from 'react'
import { CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface TimeSlotContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  timeSlot: { date: Date; hour: number; minute: number }
  onClose: () => void
  onBlockSlot: (date: Date, hour: number, minute: number) => void
  onCreateAppointment: (date: Date) => void
}

export const TimeSlotContextMenu: React.FC<TimeSlotContextMenuProps> = ({
  isOpen,
  position,
  timeSlot,
  onClose,
  onBlockSlot,
  onCreateAppointment
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'Enter' || event.key === ' ') {
        // Handle Enter/Space on focused menu items
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && menuRef.current?.contains(activeElement)) {
          event.preventDefault()
          activeElement.click()
        }
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // Navigate menu items with arrow keys
        event.preventDefault()
        const menuItems = menuRef.current?.querySelectorAll('button')
        if (menuItems && menuItems.length > 0) {
          const currentIndex = Array.from(menuItems).findIndex(item => item === document.activeElement)
          let nextIndex
          
          if (event.key === 'ArrowDown') {
            nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1
          }
          
          menuItems[nextIndex].focus()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      
      // Focus first menu item when opened
      setTimeout(() => {
        const firstButton = menuRef.current?.querySelector('button')
        firstButton?.focus()
      }, 50)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleBlockSlot = () => {
    onBlockSlot(timeSlot.date, timeSlot.hour, timeSlot.minute)
    onClose()
  }

  const handleCreateAppointment = () => {
    const slotDate = new Date(timeSlot.date)
    slotDate.setHours(timeSlot.hour, timeSlot.minute, 0, 0)
    onCreateAppointment(slotDate)
    onClose()
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Time slot actions"
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-48 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
        {timeSlot.date.toLocaleDateString()} at {timeSlot.hour}:{String(timeSlot.minute).padStart(2, '0')}
      </div>
      
      <button
        role="menuitem"
        onClick={handleCreateAppointment}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none flex items-center gap-2 transition-colors duration-150"
        aria-label="Create new appointment for this time slot"
      >
        <CalendarDaysIcon className="w-4 h-4" />
        Create Appointment
      </button>
      
      <button
        role="menuitem"
        onClick={handleBlockSlot}
        className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20 focus:outline-none flex items-center gap-2 transition-colors duration-150"
        aria-label="Block this time slot to prevent bookings"
      >
        <XMarkIcon className="w-4 h-4" />
        Block This Slot
      </button>
    </div>
  )
}