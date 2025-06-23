'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

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
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('bookbarber-theme', theme)

      // Update document class for global theme
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
        document.body.classList.add('dark', 'bg-slate-900', 'text-white')
        document.body.classList.remove('light', 'bg-gray-50', 'text-gray-900')
      } else {
        document.documentElement.classList.add('light')
        document.documentElement.classList.remove('dark')
        document.body.classList.add('light', 'bg-gray-50', 'text-gray-900')
        document.body.classList.remove('dark', 'bg-slate-900', 'text-white')
      }
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Always render children, but use a default theme during SSR
  const value = mounted ? { theme, toggleTheme, setTheme } : { theme: 'dark' as Theme, toggleTheme: () => {}, setTheme: () => {} }

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
    return { theme: 'dark' as Theme, toggleTheme: () => {}, setTheme: () => {} }
  }
  return context
}
