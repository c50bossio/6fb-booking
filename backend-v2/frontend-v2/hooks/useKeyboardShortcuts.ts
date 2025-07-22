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
                   target.getAttribute('role') === 'textbox' ||
                   target.getAttribute('contenteditable') === 'true'
    
    // Allow certain shortcuts even in inputs (like Cmd+K, Escape)
    const allowedInInputs = ['k', 'Escape', 'Enter', 'Tab', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
    
    // Special case: navigation shortcuts should work in most contexts
    const navigationKeys = ['d', 'c', 'p', 'n', 'a', 's', 'b', 'l']
    const isNavigationShortcut = navigationKeys.includes(event.key.toLowerCase()) && 
                               (event.metaKey || event.ctrlKey) && 
                               event.shiftKey
    
    if (isInput && !allowedInInputs.includes(event.key) && !isNavigationShortcut) {
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
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [handleKeyDown])
  
  // Return shortcuts for display purposes
  return {
    shortcuts,
    groupedShortcuts: groupShortcutsBySection(shortcuts),
    formatShortcut,
    enabled
  }
}

// Common shortcuts with enhanced desktop support
export const createNavigationShortcuts = (
  openCommandPalette: () => void,
  navigateTo?: (path: string) => void,
  extraActions?: {
    toggleSidebar?: () => void
    openQuickCreate?: () => void
    openNotifications?: () => void
    openBookingLinks?: () => void
  }
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
    },
    {
      key: 'a',
      metaKey: true,
      shiftKey: true,
      action: () => navigateTo('/analytics'),
      description: 'Go to Analytics',
      section: 'Navigation'
    },
    {
      key: 's',
      metaKey: true,
      shiftKey: true,
      action: () => navigateTo('/settings'),
      description: 'Go to Settings',
      section: 'Navigation'
    }
  ] : []),
  ...(extraActions ? [
    ...(extraActions.toggleSidebar ? [{
      key: 'b',
      metaKey: true,
      action: extraActions.toggleSidebar,
      description: 'Toggle sidebar',
      section: 'Layout'
    }] : []),
    ...(extraActions.openQuickCreate ? [{
      key: 'n',
      metaKey: true,
      shiftKey: true,
      action: extraActions.openQuickCreate,
      description: 'Quick create',
      section: 'Actions'
    }] : []),
    ...(extraActions.openNotifications ? [{
      key: 'n',
      metaKey: true,
      altKey: true,
      action: extraActions.openNotifications,
      description: 'Open notifications',
      section: 'Interface'
    }] : []),
    ...(extraActions.openBookingLinks ? [{
      key: 'l',
      metaKey: true,
      shiftKey: true,
      action: extraActions.openBookingLinks,
      description: 'Open booking links',
      section: 'Actions'
    }] : [])
  ] : [])
]

// Common shortcut patterns for displaying in help UI
export const SHORTCUT_PATTERNS = {
  META_KEY: '⌘',
  CTRL_KEY: 'Ctrl',
  SHIFT_KEY: '⇧',
  ALT_KEY: '⌥',
  ESCAPE_KEY: 'Esc',
  ENTER_KEY: '↵',
  ARROW_UP: '↑',
  ARROW_DOWN: '↓',
  ARROW_LEFT: '←',
  ARROW_RIGHT: '→'
} as const

// Format keyboard shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut, separator = ''): string {
  const parts: string[] = []
  
  if (shortcut.metaKey) parts.push(SHORTCUT_PATTERNS.META_KEY)
  if (shortcut.ctrlKey) parts.push(SHORTCUT_PATTERNS.CTRL_KEY)
  if (shortcut.altKey) parts.push(SHORTCUT_PATTERNS.ALT_KEY)
  if (shortcut.shiftKey) parts.push(SHORTCUT_PATTERNS.SHIFT_KEY)
  
  // Format special keys
  const keyMap: Record<string, string> = {
    'Escape': SHORTCUT_PATTERNS.ESCAPE_KEY,
    'Enter': SHORTCUT_PATTERNS.ENTER_KEY,
    'ArrowUp': SHORTCUT_PATTERNS.ARROW_UP,
    'ArrowDown': SHORTCUT_PATTERNS.ARROW_DOWN,
    'ArrowLeft': SHORTCUT_PATTERNS.ARROW_LEFT,
    'ArrowRight': SHORTCUT_PATTERNS.ARROW_RIGHT,
    'Tab': '⇥',
    'Space': '␣',
    'Backspace': '⌫',
    'Delete': '⌦',
    'F1': 'F1',
    'F2': 'F2',
    'F3': 'F3',
    'F4': 'F4',
    'F5': 'F5',
    'F6': 'F6',
    'F7': 'F7',
    'F8': 'F8',
    'F9': 'F9',
    'F10': 'F10',
    'F11': 'F11',
    'F12': 'F12'
  }
  
  const formattedKey = keyMap[shortcut.key] || shortcut.key.toUpperCase()
  parts.push(formattedKey)
  
  return parts.join(separator)
}

// Get platform-specific modifier key
export function getPlatformModifierKey(): string {
  return typeof navigator !== 'undefined' && navigator.platform.includes('Mac') 
    ? SHORTCUT_PATTERNS.META_KEY 
    : SHORTCUT_PATTERNS.CTRL_KEY
}

// Create platform-specific shortcut display
export function createPlatformShortcut(key: string, includeShift = false): string {
  const modifier = getPlatformModifierKey()
  const parts = [modifier]
  
  if (includeShift) {
    parts.push(SHORTCUT_PATTERNS.SHIFT_KEY)
  }
  
  parts.push(key.toUpperCase())
  return parts.join('')
}

// Group shortcuts by section for display
export function groupShortcutsBySection(shortcuts: KeyboardShortcut[]): Record<string, KeyboardShortcut[]> {
  return shortcuts.reduce((groups, shortcut) => {
    const section = shortcut.section || 'General'
    if (!groups[section]) {
      groups[section] = []
    }
    groups[section].push(shortcut)
    return groups
  }, {} as Record<string, KeyboardShortcut[]>)
}