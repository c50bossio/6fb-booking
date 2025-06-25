'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

type Theme = 'light' | 'soft-light' | 'dark' | 'charcoal'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  cycleTheme: () => void
  highContrastMode: boolean
  setHighContrastMode: (enabled: boolean) => void
  isHighContrastNeeded: () => boolean
  getThemeColors: () => ThemeColors
}

interface ThemeColors {
  background: string
  cardBackground: string
  textPrimary: string
  textSecondary: string
  border: string
  shadow: string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [highContrastMode, setHighContrastModeState] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Define color palettes for each theme (memoized to prevent re-renders)
  const getThemeColors = useCallback((): ThemeColors => {
    switch (theme) {
      case 'light':
        return {
          background: '#ffffff',
          cardBackground: '#f0f0f0',
          textPrimary: '#000000',
          textSecondary: '#4a5568',
          border: '#cccccc',
          shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.15)'
        }
      case 'soft-light':
        return {
          background: '#f5f5f0',
          cardBackground: '#faf9f6',
          textPrimary: '#3a3a3a',
          textSecondary: '#6b6b6b',
          border: '#c4c4bd',
          shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)'
        }
      case 'dark':
        return {
          background: '#111827',
          cardBackground: '#374151',
          textPrimary: '#ffffff',
          textSecondary: '#d1d5db',
          border: '#4b5563',
          shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
        }
      case 'charcoal':
        return {
          background: '#1a1a1a',
          cardBackground: '#242424',
          textPrimary: '#ffffff',
          textSecondary: '#a8a8a8',
          border: '#404040',
          shadow: '0 8px 16px -4px rgba(0, 0, 0, 0.5)'
        }
      default:
        // Fallback to light theme to prevent infinite recursion
        return {
          background: '#ffffff',
          cardBackground: '#f0f0f0',
          textPrimary: '#000000',
          textSecondary: '#4a5568',
          border: '#cccccc',
          shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.15)'
        }
    }
  }, [theme])

  // Function to detect if high contrast is needed based on user preferences
  const isHighContrastNeeded = (): boolean => {
    if (typeof window === 'undefined') return false

    // Check for OS-level high contrast preference
    const prefersHighContrast = window.matchMedia?.('(prefers-contrast: high)').matches

    // Check for forced colors mode (Windows high contrast)
    const forcedColors = window.matchMedia?.('(forced-colors: active)').matches

    return prefersHighContrast || forcedColors
  }

  // Set high contrast mode with persistence
  const setHighContrastMode = (enabled: boolean) => {
    setHighContrastModeState(enabled)
    if (mounted) {
      localStorage.setItem('bookbarber-high-contrast', enabled.toString())

      // Apply or remove high contrast classes
      if (enabled) {
        document.body.classList.add('high-contrast-mode')
      } else {
        document.body.classList.remove('high-contrast-mode')
      }
    }
  }

  useEffect(() => {
    setMounted(true)

    // Get theme from localStorage
    const savedTheme = localStorage.getItem('bookbarber-theme') as Theme
    if (savedTheme && ['light', 'soft-light', 'dark'].includes(savedTheme)) {
      setTheme(savedTheme)
    } else {
      // Detect system preference and default accordingly
      const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
      if (systemPrefersDark) {
        setTheme('dark')
      } else {
        // Default to 'light' for light system preference
        setTheme('light')
      }
    }

    // Get high contrast preference from localStorage
    const savedHighContrast = localStorage.getItem('bookbarber-high-contrast')
    if (savedHighContrast !== null) {
      setHighContrastModeState(savedHighContrast === 'true')
    } else {
      // Auto-detect high contrast need
      const needsHighContrast = isHighContrastNeeded()
      setHighContrastModeState(needsHighContrast)
      if (needsHighContrast) {
        localStorage.setItem('bookbarber-high-contrast', 'true')
      }
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('bookbarber-theme', theme)

      // Update document class for global theme
      // Remove all theme classes first
      document.documentElement.classList.remove('dark', 'light', 'soft-light', 'charcoal')
      document.body.classList.remove('dark', 'light', 'soft-light', 'charcoal', 'bg-slate-900', 'bg-gray-50', 'bg-gray-100', 'bg-white')

      // Add transition for smooth theme switching
      document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease'

      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
        document.body.classList.add('dark', 'bg-slate-900')
        document.body.style.backgroundColor = '#111827'

        // Only add text color classes if high contrast mode is not enabled
        if (!highContrastMode) {
          document.body.classList.add('text-white')
          document.body.classList.remove('text-gray-900')
        }
      } else if (theme === 'light') {
        document.documentElement.classList.add('light')
        document.body.classList.add('light', 'bg-white')
        document.body.style.backgroundColor = '#ffffff'

        // Only add text color classes if high contrast mode is not enabled
        if (!highContrastMode) {
          document.body.classList.add('text-gray-900')
          document.body.classList.remove('text-white')
        }
      } else if (theme === 'soft-light') {
        document.documentElement.classList.add('soft-light')
        document.body.classList.add('soft-light')
        document.body.style.backgroundColor = '#f5f5f0'

        // Only add text color classes if high contrast mode is not enabled
        if (!highContrastMode) {
          document.body.classList.add('text-gray-900')
          document.body.classList.remove('text-white')
        }
      } else { // charcoal
        document.documentElement.classList.add('charcoal')
        document.body.classList.add('charcoal')
        document.body.style.backgroundColor = '#1a1a1a'

        // Only add text color classes if high contrast mode is not enabled
        if (!highContrastMode) {
          document.body.classList.add('text-white')
          document.body.classList.remove('text-gray-900')
        }
      }
    }
  }, [theme, mounted, highContrastMode])

  // Effect to handle high contrast mode changes
  useEffect(() => {
    if (mounted) {
      if (highContrastMode) {
        document.body.classList.add('high-contrast-mode')
        // Remove theme-based text colors when high contrast is enabled
        document.body.classList.remove('text-white', 'text-gray-900')
      } else {
        document.body.classList.remove('high-contrast-mode')
        // Restore theme-based text colors when high contrast is disabled
        if (theme === 'dark') {
          document.body.classList.add('text-white')
          document.body.classList.remove('text-gray-900')
        } else { // light or soft-light
          document.body.classList.add('text-gray-900')
          document.body.classList.remove('text-white')
        }
      }
    }
  }, [highContrastMode, mounted, theme])

  // Listen for OS-level contrast preference changes
  useEffect(() => {
    if (!mounted) return

    const handleContrastChange = (e: MediaQueryListEvent) => {
      // Only auto-enable if user hasn't manually set a preference
      const savedHighContrast = localStorage.getItem('bookbarber-high-contrast')
      if (savedHighContrast === null && e.matches) {
        setHighContrastMode(true)
      }
    }

    const contrastMediaQuery = window.matchMedia?.('(prefers-contrast: high)')
    contrastMediaQuery?.addEventListener('change', handleContrastChange)

    return () => {
      contrastMediaQuery?.removeEventListener('change', handleContrastChange)
    }
  }, [mounted])

  const toggleTheme = () => {
    setTheme(prev => {
      switch (prev) {
        case 'light':
          return 'soft-light'
        case 'soft-light':
          return 'dark'
        case 'dark':
          return 'light'
        default:
          return 'light'
      }
    })
  }

  const cycleTheme = () => {
    setTheme(prev => {
      switch (prev) {
        case 'light':
          return 'soft-light'
        case 'soft-light':
          return 'dark'
        case 'dark':
          return 'charcoal'
        case 'charcoal':
          return 'light'
        default:
          return 'light'
      }
    })
  }

  // Always render children, but use a default theme during SSR
  const value = mounted
    ? { theme, toggleTheme, setTheme, cycleTheme, highContrastMode, setHighContrastMode, isHighContrastNeeded, getThemeColors }
    : {
        theme: 'light' as Theme,
        toggleTheme: () => {},
        setTheme: () => {},
        cycleTheme: () => {},
        highContrastMode: false,
        setHighContrastMode: () => {},
        isHighContrastNeeded: () => false,
        getThemeColors: () => ({
          background: '#ffffff',
          cardBackground: '#ffffff',
          textPrimary: '#111111',
          textSecondary: '#6b7280',
          border: '#d1d5db',
          shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
        })
      }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    // Return a default value during SSR instead of throwing
    return {
      theme: 'light' as Theme,
      toggleTheme: () => {},
      setTheme: () => {},
      cycleTheme: () => {},
      highContrastMode: false,
      setHighContrastMode: () => {},
      isHighContrastNeeded: () => false,
      getThemeColors: () => ({
        background: '#ffffff',
        cardBackground: '#ffffff',
        textPrimary: '#111111',
        textSecondary: '#6b7280',
        border: '#d1d5db',
        shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
      })
    }
  }
  return context
}
