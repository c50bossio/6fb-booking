'use client'

import React, { useState, useEffect } from 'react'

interface KeyboardShortcut {
  key: string
  description: string
  category: string
}

const shortcuts: KeyboardShortcut[] = [
  { key: '←/→', description: 'Navigate between dates', category: 'Navigation' },
  { key: 'Enter', description: 'Select date', category: 'Selection' },
  { key: 'Space', description: 'Select date', category: 'Selection' },
  { key: 'Escape', description: 'Close modal/cancel', category: 'General' },
  { key: 'Tab', description: 'Navigate between elements', category: 'Navigation' },
]

export const useKeyboardShortcutsHelp = () => {
  const [isHelpVisible, setIsHelpVisible] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show help with Ctrl+? or Cmd+?
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault()
        setIsHelpVisible(prev => !prev)
      }
      
      // Hide help with Escape
      if (event.key === 'Escape' && isHelpVisible) {
        setIsHelpVisible(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isHelpVisible])

  const toggleHelp = () => setIsHelpVisible(prev => !prev)
  const hideHelp = () => setIsHelpVisible(false)
  const showHelp = () => setIsHelpVisible(true)

  return {
    isHelpVisible,
    shortcuts,
    toggleHelp,
    hideHelp,
    showHelp
  }
}

interface KeyboardShortcutsHelpProps {
  isVisible: boolean
  onClose: () => void
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isVisible,
  onClose
}) => {
  if (!isVisible) return null

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Ctrl+/</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  )
}