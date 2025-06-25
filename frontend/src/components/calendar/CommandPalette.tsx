'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  PlusIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ClockIcon,
  UserIcon,
  Cog6ToothIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'
import { CalendarAppointment, Barber, Service } from './RobustCalendar'

interface Command {
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  category: 'navigation' | 'actions' | 'view' | 'search' | 'settings'
  keywords: string[]
  action: () => void
  shortcut?: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onExecuteCommand: (commandId: string) => void
  appointments: CalendarAppointment[]
  barbers: Barber[]
  services: Service[]
  currentView: 'day' | 'week' | 'month'
  onViewChange: (view: 'day' | 'week' | 'month') => void
  onCreateAppointment: () => void
  onSearch: () => void
  onFilter: () => void
  onExport: (format: 'csv' | 'pdf' | 'excel') => void
  onShowStats: () => void
  onNavigateToDate: (date: Date) => void
  onNavigateToAppointment: (appointment: CalendarAppointment) => void
}

export default function CommandPalette({
  isOpen,
  onClose,
  onExecuteCommand,
  appointments,
  barbers,
  services,
  currentView,
  onViewChange,
  onCreateAppointment,
  onSearch,
  onFilter,
  onExport,
  onShowStats,
  onNavigateToDate,
  onNavigateToAppointment
}: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Define available commands
  const commands = useMemo<Command[]>(() => [
    // Navigation commands
    {
      id: 'go-to-today',
      title: 'Go to Today',
      description: 'Navigate to current date',
      icon: <CalendarIcon className="w-5 h-5" />,
      category: 'navigation',
      keywords: ['today', 'current', 'now'],
      action: () => {
        onNavigateToDate(new Date())
        onClose()
      },
      shortcut: 'T'
    },
    {
      id: 'go-to-date',
      title: 'Go to Specific Date',
      description: 'Jump to a specific date',
      icon: <CalendarIcon className="w-5 h-5" />,
      category: 'navigation',
      keywords: ['date', 'jump', 'navigate'],
      action: () => {
        const dateStr = prompt('Enter date (YYYY-MM-DD):')
        if (dateStr) {
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            onNavigateToDate(date)
            onClose()
          }
        }
      }
    },

    // View commands
    {
      id: 'view-day',
      title: 'Switch to Day View',
      description: 'Show calendar in day view',
      icon: <CalendarIcon className="w-5 h-5" />,
      category: 'view',
      keywords: ['day', 'view', 'daily'],
      action: () => {
        onViewChange('day')
        onClose()
      },
      shortcut: '1'
    },
    {
      id: 'view-week',
      title: 'Switch to Week View',
      description: 'Show calendar in week view',
      icon: <CalendarIcon className="w-5 h-5" />,
      category: 'view',
      keywords: ['week', 'view', 'weekly'],
      action: () => {
        onViewChange('week')
        onClose()
      },
      shortcut: '2'
    },
    {
      id: 'view-month',
      title: 'Switch to Month View',
      description: 'Show calendar in month view',
      icon: <CalendarIcon className="w-5 h-5" />,
      category: 'view',
      keywords: ['month', 'view', 'monthly'],
      action: () => {
        onViewChange('month')
        onClose()
      },
      shortcut: '3'
    },

    // Action commands
    {
      id: 'new-appointment',
      title: 'Create New Appointment',
      description: 'Add a new appointment to the calendar',
      icon: <PlusIcon className="w-5 h-5" />,
      category: 'actions',
      keywords: ['new', 'create', 'add', 'appointment', 'booking'],
      action: () => {
        onCreateAppointment()
        onClose()
      },
      shortcut: 'N'
    },
    {
      id: 'search-appointments',
      title: 'Search Appointments',
      description: 'Open advanced search panel',
      icon: <MagnifyingGlassIcon className="w-5 h-5" />,
      category: 'search',
      keywords: ['search', 'find', 'lookup', 'query'],
      action: () => {
        onSearch()
        onClose()
      },
      shortcut: 'S'
    },
    {
      id: 'filter-appointments',
      title: 'Filter Appointments',
      description: 'Toggle filter panel',
      icon: <FunnelIcon className="w-5 h-5" />,
      category: 'actions',
      keywords: ['filter', 'sort', 'organize'],
      action: () => {
        onFilter()
        onClose()
      },
      shortcut: 'F'
    },
    {
      id: 'show-statistics',
      title: 'Show Calendar Statistics',
      description: 'View calendar analytics',
      icon: <ChartBarIcon className="w-5 h-5" />,
      category: 'actions',
      keywords: ['stats', 'statistics', 'analytics', 'metrics'],
      action: () => {
        onShowStats()
        onClose()
      }
    },

    // Export commands
    {
      id: 'export-csv',
      title: 'Export as CSV',
      description: 'Export appointments to CSV file',
      icon: <ArrowDownTrayIcon className="w-5 h-5" />,
      category: 'actions',
      keywords: ['export', 'csv', 'download'],
      action: () => {
        onExport('csv')
        onClose()
      }
    },
    {
      id: 'export-pdf',
      title: 'Export as PDF',
      description: 'Export appointments to PDF file',
      icon: <ArrowDownTrayIcon className="w-5 h-5" />,
      category: 'actions',
      keywords: ['export', 'pdf', 'download'],
      action: () => {
        onExport('pdf')
        onClose()
      }
    },
    {
      id: 'export-excel',
      title: 'Export as Excel',
      description: 'Export appointments to Excel file',
      icon: <ArrowDownTrayIcon className="w-5 h-5" />,
      category: 'actions',
      keywords: ['export', 'excel', 'xlsx', 'download'],
      action: () => {
        onExport('excel')
        onClose()
      }
    }
  ], [onNavigateToDate, onViewChange, onCreateAppointment, onSearch, onFilter,
      onExport, onShowStats, onClose])

  // Add recent appointments as commands
  const appointmentCommands = useMemo<Command[]>(() => {
    return appointments.slice(0, 10).map(appointment => ({
      id: `appointment-${appointment.id}`,
      title: `${appointment.client} - ${appointment.service}`,
      description: `${appointment.date} at ${appointment.startTime}`,
      icon: <UserIcon className="w-5 h-5" />,
      category: 'search' as const,
      keywords: [appointment.client, appointment.service, appointment.barber, appointment.date],
      action: () => {
        onNavigateToAppointment(appointment)
        onClose()
      }
    }))
  }, [appointments, onNavigateToAppointment, onClose])

  // Combine all commands
  const allCommands = useMemo(() => [...commands, ...appointmentCommands], [commands, appointmentCommands])

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return allCommands

    const searchLower = search.toLowerCase()
    return allCommands.filter(command => {
      const titleMatch = command.title.toLowerCase().includes(searchLower)
      const descriptionMatch = command.description?.toLowerCase().includes(searchLower)
      const keywordMatch = command.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
      const categoryMatch = selectedCategory ? command.category === selectedCategory : true

      return categoryMatch && (titleMatch || descriptionMatch || keywordMatch)
    })
  }, [search, allCommands, selectedCategory])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: Command[] } = {}

    filteredCommands.forEach(command => {
      if (!groups[command.category]) {
        groups[command.category] = []
      }
      groups[command.category].push(command)
    })

    return groups
  }, [filteredCommands])

  // Category labels
  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions',
    view: 'View',
    search: 'Search & Recent',
    settings: 'Settings'
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'Tab':
          e.preventDefault()
          // Cycle through categories
          const categories = Object.keys(categoryLabels)
          const currentIndex = selectedCategory ? categories.indexOf(selectedCategory) : -1
          const nextIndex = (currentIndex + 1) % (categories.length + 1)
          setSelectedCategory(nextIndex === categories.length ? null : categories[nextIndex])
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, selectedCategory, onClose])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setSearch('')
      setSelectedIndex(0)
      setSelectedCategory(null)
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredCommands.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex, filteredCommands])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[600px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <CommandLineIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setSelectedIndex(0)
                }}
                placeholder="Type a command or search..."
                className="w-full pl-10 pr-4 py-3 text-lg bg-transparent border-0 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                ESC to close
              </div>
            </div>

            {/* Category filters */}
            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === null
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedCategory === key
                      ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Command List */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No commands found
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </div>
                  {commands.map((command, index) => {
                    const globalIndex = filteredCommands.indexOf(command)
                    const isSelected = globalIndex === selectedIndex

                    return (
                      <button
                        key={command.id}
                        data-index={globalIndex}
                        onClick={() => command.action()}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                          isSelected
                            ? 'bg-violet-50 dark:bg-violet-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className={`flex-shrink-0 ${
                          isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'
                        }`}>
                          {command.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className={`font-medium ${
                            isSelected
                              ? 'text-violet-900 dark:text-violet-100'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {command.title}
                          </div>
                          {command.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {command.description}
                            </div>
                          )}
                        </div>
                        {command.shortcut && (
                          <div className="flex-shrink-0">
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">
                              {command.shortcut}
                            </kbd>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 dark:bg-gray-700 rounded">Tab</kbd>
                <span>Filter</span>
              </span>
            </div>
            <div>
              {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
