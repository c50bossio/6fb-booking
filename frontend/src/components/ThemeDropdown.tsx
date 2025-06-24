'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon, Sunset, ChevronDown } from 'lucide-react'

type Theme = 'light' | 'soft-light' | 'dark' | 'charcoal'

interface ThemeOption {
  value: Theme
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light Mode',
    icon: Sun,
    iconColor: 'text-amber-500'
  },
  {
    value: 'soft-light',
    label: 'Soft Light',
    icon: Sunset,
    iconColor: 'text-orange-500'
  },
  {
    value: 'dark',
    label: 'Dark Mode',
    icon: Moon,
    iconColor: 'text-blue-500'
  },
  {
    value: 'charcoal',
    label: 'Charcoal',
    icon: Moon,
    iconColor: 'text-gray-400'
  }
]

interface ThemeDropdownProps {
  isCollapsed?: boolean
}

export default function ThemeDropdown({ isCollapsed = false }: ThemeDropdownProps) {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentTheme = themeOptions.find(option => option.value === theme) || themeOptions[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleThemeSelect = (selectedTheme: Theme) => {
    setTheme(selectedTheme)
    setIsOpen(false)
  }

  const getDropdownStyles = () => {
    switch (theme) {
      case 'dark':
        return 'bg-gray-800 border-gray-700 text-white shadow-2xl backdrop-blur-sm'
      case 'charcoal':
        return 'bg-[#1a1a1a] border-[#2a2a2a] text-white shadow-2xl backdrop-blur-sm'
      case 'soft-light':
        return 'bg-[#faf9f6] border-[#c4c4bd] text-gray-900 shadow-xl backdrop-blur-sm'
      default:
        return 'bg-white border-gray-200 text-gray-900 shadow-xl backdrop-blur-sm'
    }
  }

  const getItemHoverStyles = () => {
    switch (theme) {
      case 'dark':
        return 'hover:bg-gray-700 hover:bg-opacity-80'
      case 'charcoal':
        return 'hover:bg-[#2a2a2a] hover:bg-opacity-80'
      case 'soft-light':
        return 'hover:bg-[#7c9885] hover:bg-opacity-10'
      default:
        return 'hover:bg-gray-100'
    }
  }

  const getButtonStyles = () => {
    switch (theme) {
      case 'dark':
        return 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
      case 'charcoal':
        return 'bg-[#2a2a2a] border-[#3a3a3a] text-white hover:bg-[#333333]'
      case 'soft-light':
        return 'bg-white border-[#c4c4bd] text-gray-900 hover:bg-gray-50'
      default:
        return 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border transition-all duration-200 ${getButtonStyles()}`}
        title={isCollapsed ? currentTheme.label : undefined}
      >
        <div className="flex items-center space-x-2">
          <currentTheme.icon className={`h-4 w-4 ${currentTheme.iconColor}`} />
          {!isCollapsed && <span className="text-sm font-medium">{currentTheme.label}</span>}
        </div>
        {!isCollapsed && <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-full rounded-lg border overflow-hidden transition-all duration-200 z-50 ${getDropdownStyles()}`}>
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isActive = theme === option.value

            return (
              <button
                key={option.value}
                onClick={() => handleThemeSelect(option.value)}
                className={`flex items-center justify-between w-full px-3 py-3 text-sm font-medium transition-all duration-200 first:rounded-t-lg last:rounded-b-lg ${getItemHoverStyles()}`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${option.iconColor}`} />
                  <span className="font-medium">{option.label}</span>
                </div>
                {isActive && (
                  <svg className={`h-4 w-4 ${theme === 'soft-light' ? 'text-[#7c9885]' : theme === 'charcoal' ? 'text-gray-400' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
