'use client'

import React, { useEffect, useCallback, useState } from 'react'
import { format, addDays, addWeeks, addMonths, startOfToday } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CommandLineIcon, 
  InformationCircleIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { KeyboardShortcutDisplay } from './CalendarTooltips'

interface CalendarKeyboardShortcutsProps {
  currentDate: Date
  view: 'day' | 'week' | 'month'
  onDateChange: (date: Date) => void
  onViewChange: (view: 'day' | 'week' | 'month') => void
  onCreateAppointment?: () => void
  onRefresh?: () => void
  onToggleSmartPanel?: () => void
  onSearch?: () => void
  onShowHelp?: () => void
  isEnabled?: boolean
  enabledShortcuts?: string[]
}

interface KeyboardShortcut {
  id: string
  keys: string[]
  description: string
  category: 'navigation' | 'views' | 'actions' | 'smart' | 'general'
  action: () => void
  enabled: boolean
}

export function CalendarKeyboardShortcuts({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onCreateAppointment,
  onRefresh,
  onToggleSmartPanel,
  onSearch,
  onShowHelp,
  isEnabled = true,
  enabledShortcuts = []
}: CalendarKeyboardShortcutsProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [lastShortcut, setLastShortcut] = useState<string | null>(null)

  // Define all keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    {
      id: 'nav-left',
      keys: ['←', 'ArrowLeft'],
      description: 'Previous day/week/month',
      category: 'navigation',
      action: () => {
        const newDate = view === 'day' ? addDays(currentDate, -1) :
                       view === 'week' ? addWeeks(currentDate, -1) :
                       addMonths(currentDate, -1)
        onDateChange(newDate)
        announceShortcut(`Navigated to ${format(newDate, 'MMM d')}`)
      },
      enabled: true
    },
    {
      id: 'nav-right',
      keys: ['→', 'ArrowRight'],
      description: 'Next day/week/month',
      category: 'navigation',
      action: () => {
        const newDate = view === 'day' ? addDays(currentDate, 1) :
                       view === 'week' ? addWeeks(currentDate, 1) :
                       addMonths(currentDate, 1)
        onDateChange(newDate)
        announceShortcut(`Navigated to ${format(newDate, 'MMM d')}`)
      },
      enabled: true
    },
    {
      id: 'nav-today',
      keys: ['t'],
      description: 'Go to today',
      category: 'navigation',
      action: () => {
        const today = startOfToday()
        onDateChange(today)
        announceShortcut('Navigated to today')
      },
      enabled: true
    },
    {
      id: 'nav-prev-week',
      keys: ['k'],
      description: 'Previous week',
      category: 'navigation',
      action: () => {
        const newDate = addWeeks(currentDate, -1)
        onDateChange(newDate)
        announceShortcut(`Navigated to week of ${format(newDate, 'MMM d')}`)
      },
      enabled: true
    },
    {
      id: 'nav-next-week',
      keys: ['j'],
      description: 'Next week',
      category: 'navigation',
      action: () => {
        const newDate = addWeeks(currentDate, 1)
        onDateChange(newDate)
        announceShortcut(`Navigated to week of ${format(newDate, 'MMM d')}`)
      },
      enabled: true
    },

    // View shortcuts
    {
      id: 'view-day',
      keys: ['1'],
      description: 'Switch to day view',
      category: 'views',
      action: () => {
        onViewChange('day')
        announceShortcut('Switched to day view')
      },
      enabled: true
    },
    {
      id: 'view-week',
      keys: ['2'],
      description: 'Switch to week view',
      category: 'views',
      action: () => {
        onViewChange('week')
        announceShortcut('Switched to week view')
      },
      enabled: true
    },
    {
      id: 'view-month',
      keys: ['3'],
      description: 'Switch to month view',
      category: 'views',
      action: () => {
        onViewChange('month')
        announceShortcut('Switched to month view')
      },
      enabled: true
    },

    // Action shortcuts
    {
      id: 'action-create',
      keys: ['n'],
      description: 'Create new appointment',
      category: 'actions',
      action: () => {
        onCreateAppointment?.()
        announceShortcut('Creating new appointment')
      },
      enabled: !!onCreateAppointment
    },
    {
      id: 'action-refresh',
      keys: ['r'],
      description: 'Refresh calendar',
      category: 'actions',
      action: () => {
        onRefresh?.()
        announceShortcut('Refreshing calendar')
      },
      enabled: !!onRefresh
    },
    {
      id: 'action-search',
      keys: ['/', 'cmd+f', 'ctrl+f'],
      description: 'Search appointments',
      category: 'actions',
      action: () => {
        onSearch?.()
        announceShortcut('Opening search')
      },
      enabled: !!onSearch
    },

    // Smart features
    {
      id: 'smart-panel',
      keys: ['s'],
      description: 'Toggle smart scheduling panel',
      category: 'smart',
      action: () => {
        onToggleSmartPanel?.()
        announceShortcut('Toggled smart scheduling panel')
      },
      enabled: !!onToggleSmartPanel
    },

    // General shortcuts
    {
      id: 'general-help',
      keys: ['?', 'h'],
      description: 'Show keyboard shortcuts',
      category: 'general',
      action: () => {
        setIsHelpOpen(true)
        announceShortcut('Opened keyboard shortcuts help')
      },
      enabled: true
    },
    {
      id: 'general-escape',
      keys: ['Escape'],
      description: 'Close modals/panels',
      category: 'general',
      action: () => {
        setIsHelpOpen(false)
        announceShortcut('Closed modal')
      },
      enabled: true
    }
  ]

  // Filter enabled shortcuts
  const enabledShortcutsList = shortcuts.filter(shortcut => {
    if (!shortcut.enabled) return false
    if (enabledShortcuts.length > 0) {
      return enabledShortcuts.includes(shortcut.id)
    }
    return true
  })

  // Screen reader announcement
  const announceShortcut = useCallback((message: string) => {
    setLastShortcut(message)
    
    // Create temporary announcement for screen readers
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
      setLastShortcut(null)
    }, 1000)
  }, [])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return

    // Ignore shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true') {
      return
    }

    // Build current key combination
    const currentKeys = new Set<string>()
    if (event.ctrlKey) currentKeys.add('ctrl')
    if (event.metaKey) currentKeys.add('cmd')
    if (event.shiftKey) currentKeys.add('shift')
    if (event.altKey) currentKeys.add('alt')
    currentKeys.add(event.key.toLowerCase())

    // Create key string for comparison
    const keyString = Array.from(currentKeys).sort().join('+')
    const simpleKey = event.key.toLowerCase()

    // Find matching shortcut
    const matchingShortcut = enabledShortcutsList.find(shortcut => {
      return shortcut.keys.some(key => {
        const normalizedKey = key.toLowerCase()
        return normalizedKey === simpleKey || 
               normalizedKey === keyString ||
               normalizedKey === event.code.toLowerCase() ||
               (normalizedKey === 'arrowleft' && event.key === 'ArrowLeft') ||
               (normalizedKey === 'arrowright' && event.key === 'ArrowRight')
      })
    })

    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      matchingShortcut.action()
    }

    setPressedKeys(currentKeys)
  }, [isEnabled, enabledShortcutsList, currentDate, view, onDateChange, onViewChange, onCreateAppointment, onRefresh, onToggleSmartPanel, onSearch, announceShortcut])

  const handleKeyUp = useCallback(() => {
    setPressedKeys(new Set())
  }, [])

  // Attach event listeners
  useEffect(() => {
    if (!isEnabled) return

    document.addEventListener('keydown', handleKeyDown, { capture: true })
    document.addEventListener('keyup', handleKeyUp, { capture: true })

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
      document.removeEventListener('keyup', handleKeyUp, { capture: true })
    }
  }, [handleKeyDown, handleKeyUp, isEnabled])

  // Group shortcuts by category
  const shortcutsByCategory = enabledShortcutsList.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  const categoryInfo = {
    navigation: { title: 'Navigation', icon: '🧭', color: 'bg-blue-50 text-blue-700' },
    views: { title: 'Views', icon: '👁️', color: 'bg-green-50 text-green-700' },
    actions: { title: 'Actions', icon: '⚡', color: 'bg-orange-50 text-orange-700' },
    smart: { title: 'Smart Features', icon: '🧠', color: 'bg-purple-50 text-purple-700' },
    general: { title: 'General', icon: '⚙️', color: 'bg-gray-50 text-gray-700' }
  }

  return (
    <>
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {lastShortcut}
      </div>

      {/* Visual feedback for pressed keys (optional) */}
      {pressedKeys.size > 0 && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg z-50 backdrop-blur">
          <div className="flex items-center space-x-1 text-sm">
            {Array.from(pressedKeys).map((key) => (
              <kbd key={key} className="px-2 py-1 bg-white/20 rounded text-xs">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </kbd>
            ))}
          </div>
        </div>
      )}

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-xl">
              <CommandLineIcon className="h-6 w-6 mr-2" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => {
              const info = categoryInfo[category as keyof typeof categoryInfo]
              if (!info || shortcuts.length === 0) return null

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Badge className={info.color}>
                      <span className="mr-1">{info.icon}</span>
                      {info.title}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {shortcuts.map((shortcut) => (
                      <KeyboardShortcutDisplay
                        key={shortcut.id}
                        shortcut={shortcut.keys}
                        description={shortcut.description}
                        className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Pro Tips:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Most shortcuts work from anywhere in the calendar</li>
                  <li>• Press <kbd className="px-1 bg-white/50 rounded">?</kbd> or <kbd className="px-1 bg-white/50 rounded">h</kbd> anytime to see this help</li>
                  <li>• Use arrow keys for quick navigation between periods</li>
                  <li>• Combine with Smart Scheduling for maximum efficiency</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsHelpOpen(false)}
              className="flex items-center"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Hook for managing keyboard shortcuts
export function useCalendarKeyboardShortcuts(
  enabled: boolean = true,
  customShortcuts: Record<string, () => void> = {}
) {
  const [isHelpVisible, setIsHelpVisible] = useState(false)
  const [lastTriggered, setLastTriggered] = useState<string | null>(null)

  const showHelp = useCallback(() => {
    setIsHelpVisible(true)
  }, [])

  const hideHelp = useCallback(() => {
    setIsHelpVisible(false)
  }, [])

  const triggerShortcut = useCallback((shortcutId: string) => {
    if (customShortcuts[shortcutId]) {
      customShortcuts[shortcutId]()
      setLastTriggered(shortcutId)
      setTimeout(() => setLastTriggered(null), 1000)
    }
  }, [customShortcuts])

  return {
    isHelpVisible,
    showHelp,
    hideHelp,
    lastTriggered,
    triggerShortcut,
    enabled
  }
}

// Quick shortcut display component for showing in tooltips
export function QuickShortcuts({ shortcuts }: { shortcuts: Array<{ keys: string[], description: string }> }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Quick Shortcuts:</div>
      {shortcuts.map((shortcut, index) => (
        <KeyboardShortcutDisplay
          key={index}
          shortcut={shortcut.keys}
          description={shortcut.description}
          className="text-xs"
        />
      ))}
    </div>
  )
}

export default CalendarKeyboardShortcuts