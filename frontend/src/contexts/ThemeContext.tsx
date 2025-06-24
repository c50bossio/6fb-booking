'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  highContrastMode: boolean
  setHighContrastMode: (enabled: boolean) => void
  isHighContrastNeeded: () => boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [highContrastMode, setHighContrastModeState] = useState(false)
  const [mounted, setMounted] = useState(false)

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
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Default to dark theme like in the screenshot
      setTheme('dark')
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
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
        document.body.classList.add('dark', 'bg-slate-900')
        document.body.classList.remove('light', 'bg-gray-50')

        // Only add text color classes if high contrast mode is not enabled
        if (!highContrastMode) {
          document.body.classList.add('text-white')
          document.body.classList.remove('text-gray-900')
        }
      } else {
        document.documentElement.classList.add('light')
        document.documentElement.classList.remove('dark')
        document.body.classList.add('light', 'bg-gray-50')
        document.body.classList.remove('dark', 'bg-slate-900')

        // Only add text color classes if high contrast mode is not enabled
        if (!highContrastMode) {
          document.body.classList.add('text-gray-900')
          document.body.classList.remove('text-white')
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
        } else {
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
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Always render children, but use a default theme during SSR
  const value = mounted
    ? { theme, toggleTheme, setTheme, highContrastMode, setHighContrastMode, isHighContrastNeeded }
    : {
        theme: 'dark' as Theme,
        toggleTheme: () => {},
        setTheme: () => {},
        highContrastMode: false,
        setHighContrastMode: () => {},
        isHighContrastNeeded: () => false
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
      theme: 'dark' as Theme,
      toggleTheme: () => {},
      setTheme: () => {},
      highContrastMode: false,
      setHighContrastMode: () => {},
      isHighContrastNeeded: () => false
    }
  }
  return context
}
