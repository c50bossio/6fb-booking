'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Shortcut {
  keys: string[]
  description: string
  context?: string
}

interface ShortcutCategory {
  title: string
  shortcuts: Shortcut[]
}

interface KeyboardHelpProps {
  isOpen: boolean
  onClose: () => void
  currentContext?: 'calendar' | 'appointment' | 'modal'
}

export default function KeyboardHelp({ isOpen, onClose, currentContext = 'calendar' }: KeyboardHelpProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const categories: ShortcutCategory[] = [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['↑', '↓', '←', '→'], description: 'Navigate between dates and time slots' },
        { keys: ['Home'], description: 'Go to first item' },
        { keys: ['End'], description: 'Go to last item' },
        { keys: ['Page Up'], description: 'Previous week/month' },
        { keys: ['Page Down'], description: 'Next week/month' },
        { keys: ['Ctrl', '←'], description: 'Previous day' },
        { keys: ['Ctrl', '→'], description: 'Next day' },
        { keys: ['Tab'], description: 'Move to next interactive element' },
        { keys: ['Shift', 'Tab'], description: 'Move to previous interactive element' }
      ]
    },
    {
      title: 'Actions',
      shortcuts: [
        { keys: ['N'], description: 'Create new appointment' },
        { keys: ['E'], description: 'Edit selected appointment', context: 'appointment' },
        { keys: ['D', 'Delete'], description: 'Delete selected appointment', context: 'appointment' },
        { keys: ['Space', 'Enter'], description: 'Select/Open item' },
        { keys: ['Escape'], description: 'Close dialog or cancel action' }
      ]
    },
    {
      title: 'Views',
      shortcuts: [
        { keys: ['1'], description: 'Switch to day view' },
        { keys: ['2'], description: 'Switch to week view' },
        { keys: ['3'], description: 'Switch to month view' },
        { keys: ['T'], description: 'Go to today' }
      ]
    },
    {
      title: 'Features',
      shortcuts: [
        { keys: ['F'], description: 'Toggle filters' },
        { keys: ['S', '/'], description: 'Open search' },
        { keys: ['Ctrl', 'K'], description: 'Open command palette' },
        { keys: ['?', 'H'], description: 'Show this help' }
      ]
    },
    {
      title: 'Editing',
      shortcuts: [
        { keys: ['Ctrl', 'Z'], description: 'Undo last action' },
        { keys: ['Ctrl', 'Y'], description: 'Redo last action' },
        { keys: ['Ctrl', 'C'], description: 'Copy appointment', context: 'appointment' },
        { keys: ['Ctrl', 'V'], description: 'Paste appointment', context: 'calendar' }
      ]
    }
  ]

  const renderKey = (key: string) => {
    const specialKeys: { [key: string]: string } = {
      '←': '←',
      '→': '→',
      '↑': '↑',
      '↓': '↓',
      'Space': 'Space',
      'Enter': '↵',
      'Delete': 'Del',
      'Escape': 'Esc',
      'Tab': 'Tab',
      'Shift': '⇧',
      'Ctrl': 'Ctrl',
      'Cmd': '⌘',
      'Alt': 'Alt',
      'Page Up': 'PgUp',
      'Page Down': 'PgDn',
      'Home': 'Home',
      'End': 'End'
    }

    return specialKeys[key] || key
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Use these shortcuts to navigate and control the calendar efficiently
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close help"
            >
              <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categories.map((category) => (
                <div key={category.title}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {category.title}
                  </h3>
                  <div className="space-y-3">
                    {category.shortcuts
                      .filter(shortcut => !shortcut.context || shortcut.context === currentContext)
                      .map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center space-x-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              {keyIndex > 0 && (
                                <span className="text-xs text-gray-400">+</span>
                              )}
                              <kbd className="px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded shadow-sm">
                                {renderKey(key)}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tips Section */}
            <div className="mt-8 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
              <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-100 mb-2">
                Pro Tips
              </h4>
              <ul className="space-y-1 text-sm text-violet-700 dark:text-violet-300">
                <li>• Use Tab to navigate through all interactive elements</li>
                <li>• Press ? at any time to show this help</li>
                <li>• The calendar automatically detects keyboard vs mouse usage</li>
                <li>• Focus indicators appear when using keyboard navigation</li>
                <li>• Screen reader announcements are provided for all actions</li>
              </ul>
            </div>

            {/* Accessibility Section */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Accessibility Features
              </h4>
              <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li>• Full keyboard navigation support</li>
                <li>• ARIA labels and live regions for screen readers</li>
                <li>• High contrast mode available in settings</li>
                <li>• Reduced motion support for accessibility preferences</li>
                <li>• Focus trapping in modals and dialogs</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div>
                Press <kbd className="px-1.5 py-0.5 font-semibold bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> to close
              </div>
              <div>
                Current context: <span className="font-medium text-gray-700 dark:text-gray-300">{currentContext}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
