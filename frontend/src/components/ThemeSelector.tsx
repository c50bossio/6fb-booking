'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Sun, Moon, Sunset, Palette, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeOption {
  value: 'light' | 'soft-light' | 'dark'
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  previewColors: {
    background: string
    card: string
    text: string
    accent: string
  }
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light Mode',
    description: 'Clean bright interface',
    icon: Sun,
    previewColors: {
      background: 'bg-white',
      card: 'bg-gray-50',
      text: 'text-gray-900',
      accent: 'bg-teal-500'
    }
  },
  {
    value: 'soft-light',
    label: 'Soft Light Mode',
    description: 'Gentle warm tones',
    icon: Sunset,
    previewColors: {
      background: 'bg-gray-50',
      card: 'bg-white',
      text: 'text-gray-800',
      accent: 'bg-teal-400'
    }
  },
  {
    value: 'dark',
    label: 'Dark Mode',
    description: 'Easy on the eyes',
    icon: Moon,
    previewColors: {
      background: 'bg-gray-900',
      card: 'bg-gray-800',
      text: 'text-gray-100',
      accent: 'bg-teal-400'
    }
  }
]

interface ThemeSelectorProps {
  variant?: 'dropdown' | 'button' | 'compact'
  className?: string
  showLabel?: boolean
}

export function ThemeSelector({
  variant = 'dropdown',
  className = '',
  showLabel = true
}: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentTheme = themeOptions.find(option => option.value === theme)
  const CurrentIcon = currentTheme?.icon || Palette

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle theme selection
  const handleThemeSelect = (newTheme: 'light' | 'soft-light' | 'dark') => {
    setTheme(newTheme)
    setIsOpen(false)
  }

  // Cycle through themes for button variant
  const handleCycleTheme = () => {
    const currentIndex = themeOptions.findIndex(option => option.value === theme)
    const nextIndex = (currentIndex + 1) % themeOptions.length
    setTheme(themeOptions[nextIndex].value)
  }

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCycleTheme}
        className={cn(
          'flex items-center gap-2 transition-all duration-200 hover:scale-105',
          'dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700',
          'bg-white border-gray-200 hover:bg-gray-50',
          className
        )}
        title={`Switch to ${themeOptions[(themeOptions.findIndex(o => o.value === theme) + 1) % themeOptions.length].label}`}
      >
        <CurrentIcon className="h-4 w-4" />
        {showLabel && (
          <span className="text-sm font-medium">
            {currentTheme?.label}
          </span>
        )}
      </Button>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1 p-1 rounded-md bg-gray-100 dark:bg-gray-800', className)}>
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isSelected = option.value === theme
          return (
            <button
              key={option.value}
              onClick={() => handleThemeSelect(option.value)}
              className={cn(
                'p-2 rounded-md transition-all duration-150',
                'hover:bg-white hover:shadow-sm dark:hover:bg-gray-700',
                isSelected && 'bg-white shadow-sm text-teal-600 dark:bg-gray-700 dark:text-teal-400'
              )}
              title={option.label}
            >
              <Icon className="h-4 w-4" />
            </button>
          )
        })}
      </div>
    )
  }

  // Default dropdown variant
  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 min-w-[140px] justify-between transition-all duration-200',
          'dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700',
          'bg-white border-gray-200 hover:bg-gray-50',
          isOpen && 'ring-2 ring-teal-500/20 border-teal-300'
        )}
      >
        <div className="flex items-center gap-2">
          <CurrentIcon className="h-4 w-4" />
          {showLabel && (
            <span className="text-sm font-medium">
              {currentTheme?.label}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50">
          <Card className="w-80 p-2 shadow-xl border-0 ring-1 ring-gray-200 dark:ring-gray-700">
            <div className="space-y-1">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = option.value === theme

                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeSelect(option.value)}
                    className={cn(
                      'w-full p-3 rounded-lg transition-all duration-150 text-left',
                      'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      'focus:outline-none focus:ring-2 focus:ring-teal-500/20',
                      isSelected && 'bg-teal-50 dark:bg-teal-900/20 ring-1 ring-teal-200 dark:ring-teal-800'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className={cn(
                          'h-5 w-5 mt-0.5 transition-colors',
                          isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'
                        )} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={cn(
                              'font-medium text-sm',
                              isSelected ? 'text-teal-900 dark:text-teal-100' : 'text-gray-900 dark:text-gray-100'
                            )}>
                              {option.label}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {option.description}
                          </p>

                          {/* Theme Preview */}
                          <div className="flex items-center gap-1">
                            <div className={cn(
                              'w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600',
                              option.previewColors.background
                            )} />
                            <div className={cn(
                              'w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600',
                              option.previewColors.card
                            )} />
                            <div className={cn(
                              'w-4 h-4 rounded-full',
                              option.previewColors.accent
                            )} />
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Theme preference is saved automatically
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default ThemeSelector
