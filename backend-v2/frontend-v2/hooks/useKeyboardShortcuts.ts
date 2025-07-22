'use client'

import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  section?: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return
    
    // Don't trigger shortcuts when user is typing in inputs
    const target = event.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || 
                   target.tagName === 'TEXTAREA' || 
                   target.contentEditable === 'true' ||
                   target.getAttribute('role') === 'textbox'
    
    // Allow certain shortcuts even in inputs (like Cmd+K)
    const allowedInInputs = ['k', 'Escape']
    
    if (isInput && !allowedInInputs.includes(event.key)) {
      return
    }
    
    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.metaKey === event.metaKey &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.altKey === event.altKey
      )
    })
    
    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      matchingShortcut.action()
    }
  }, [shortcuts, enabled])
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Common shortcuts
export const createNavigationShortcuts = (
  openCommandPalette: () => void,
  navigateTo?: (path: string) => void
): KeyboardShortcut[] => [
  {
    key: 'k',
    metaKey: true,
    action: openCommandPalette,
    description: 'Open command palette',
    section: 'Navigation'
  },
  {
    key: 'k',
    ctrlKey: true,
    action: openCommandPalette,
    description: 'Open command palette (Windows/Linux)',
    section: 'Navigation'
  },
  ...(navigateTo ? [
    {
      key: 'd',
      metaKey: true,
      action: () => navigateTo('/dashboard'),
      description: 'Go to Dashboard',
      section: 'Navigation'
    },
    {
      key: 'c',
      metaKey: true,
      shiftKey: true,
      action: () => navigateTo('/calendar'),
      description: 'Go to Calendar',
      section: 'Navigation'
    },
    {
      key: 'p',
      metaKey: true,
      shiftKey: true,
      action: () => navigateTo('/clients'),
      description: 'Go to Clients',
      section: 'Navigation'
    },
    {
      key: 'n',
      metaKey: true,
      action: () => navigateTo('/book'),
      description: 'New Booking',
      section: 'Actions'
    }
  ] : [])
]