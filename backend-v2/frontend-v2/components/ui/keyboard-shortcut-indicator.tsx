'use client'

import React, { useState, useEffect } from 'react'

interface KeyboardShortcutIndicatorProps {
  shortcut: string
  description: string
  className?: string
}

export const KeyboardShortcutIndicator: React.FC<KeyboardShortcutIndicatorProps> = ({
  shortcut,
  description,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`}>
      <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
        {shortcut}
      </kbd>
      <span>{description}</span>
    </div>
  )
}

export const useKeyboardShortcutIndicator = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [lastKeyPressed, setLastKeyPressed] = useState<string>('')

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setLastKeyPressed(event.key)
      setIsVisible(true)
      
      // Hide after 2 seconds
      setTimeout(() => {
        setIsVisible(false)
      }, 2000)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isVisible,
    lastKeyPressed,
    show: () => setIsVisible(true),
    hide: () => setIsVisible(false)
  }
}