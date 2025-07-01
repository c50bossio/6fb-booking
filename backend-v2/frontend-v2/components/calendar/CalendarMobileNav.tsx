'use client'

import React from 'react'
import { CalendarIcon, CalendarDaysIcon, ListBulletIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { CalendarIcon as CalendarIconSolid, CalendarDaysIcon as CalendarDaysIconSolid, ListBulletIcon as ListBulletIconSolid, Squares2X2Icon as Squares2X2IconSolid } from '@heroicons/react/24/solid'
import type { CalendarViewMode } from '@/hooks/useResponsiveCalendar'

interface CalendarMobileNavProps {
  currentView: CalendarViewMode
  onViewChange: (view: CalendarViewMode) => void
  className?: string
}

export default function CalendarMobileNav({
  currentView,
  onViewChange,
  className = ''
}: CalendarMobileNavProps) {
  const navItems = [
    {
      view: 'day' as CalendarViewMode,
      label: 'Day',
      icon: CalendarIcon,
      iconActive: CalendarIconSolid
    },
    {
      view: 'week' as CalendarViewMode,
      label: 'Week',
      icon: CalendarDaysIcon,
      iconActive: CalendarDaysIconSolid
    },
    {
      view: 'month' as CalendarViewMode,
      label: 'Month',
      icon: Squares2X2Icon,
      iconActive: Squares2X2IconSolid
    },
    {
      view: 'agenda' as CalendarViewMode,
      label: 'Agenda',
      icon: ListBulletIcon,
      iconActive: ListBulletIconSolid
    }
  ]

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40 md:hidden ${className}`}>
      <div className="grid grid-cols-4 h-16">
        {navItems.map(({ view, label, icon: Icon, iconActive: IconActive }) => {
          const isActive = currentView === view
          const IconComponent = isActive ? IconActive : Icon
          
          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              aria-label={`Switch to ${label} view`}
              aria-current={isActive ? 'page' : undefined}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}