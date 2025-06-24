import { Theme } from '@/contexts/ThemeContext'

export interface ThemeClasses {
  // Backgrounds
  background: string
  cardBackground: string
  hoverBackground: string

  // Text
  textPrimary: string
  textSecondary: string
  textMuted: string

  // Borders
  border: string
  borderHover: string

  // Buttons
  primaryButton: string
  primaryButtonHover: string
  secondaryButton: string
  secondaryButtonHover: string

  // Inputs
  input: string
  inputFocus: string

  // Status colors
  success: string
  warning: string
  error: string
  info: string
}

export function getThemeClasses(theme: Theme): ThemeClasses {
  switch (theme) {
    case 'light':
      return {
        // Backgrounds
        background: 'bg-gray-50',
        cardBackground: 'bg-white',
        hoverBackground: 'hover:bg-gray-50',

        // Text
        textPrimary: 'text-gray-900',
        textSecondary: 'text-gray-600',
        textMuted: 'text-gray-500',

        // Borders
        border: 'border-gray-200',
        borderHover: 'hover:border-gray-300',

        // Buttons
        primaryButton: 'bg-teal-600 text-white hover:bg-teal-700',
        primaryButtonHover: 'hover:bg-teal-700',
        secondaryButton: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        secondaryButtonHover: 'hover:bg-gray-200',

        // Inputs
        input: 'bg-white border-gray-300 text-gray-900 focus:border-teal-500 focus:ring-teal-500',
        inputFocus: 'focus:border-teal-500 focus:ring-teal-500',

        // Status
        success: 'bg-green-50 text-green-700 border-green-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        error: 'bg-red-50 text-red-700 border-red-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200'
      }

    case 'soft-light':
      return {
        // Backgrounds
        background: 'bg-[#f5f5f0]',
        cardBackground: 'bg-white',
        hoverBackground: 'hover:bg-gray-50',

        // Text
        textPrimary: 'text-gray-900',
        textSecondary: 'text-gray-600',
        textMuted: 'text-gray-500',

        // Borders
        border: 'border-[#c4c4bd]',
        borderHover: 'hover:border-[#b0b0a8]',

        // Buttons
        primaryButton: 'bg-[#7c9885] text-white hover:bg-[#6a8574]',
        primaryButtonHover: 'hover:bg-[#6a8574]',
        secondaryButton: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        secondaryButtonHover: 'hover:bg-gray-200',

        // Inputs
        input: 'bg-white border-[#c4c4bd] text-gray-900 focus:border-[#7c9885] focus:ring-[#7c9885]',
        inputFocus: 'focus:border-[#7c9885] focus:ring-[#7c9885]',

        // Status
        success: 'bg-green-50 text-green-700 border-green-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        error: 'bg-red-50 text-red-700 border-red-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200'
      }

    case 'dark':
      return {
        // Backgrounds
        background: 'bg-gray-900',
        cardBackground: 'bg-gray-800',
        hoverBackground: 'hover:bg-gray-700',

        // Text
        textPrimary: 'text-white',
        textSecondary: 'text-gray-300',
        textMuted: 'text-gray-400',

        // Borders
        border: 'border-gray-700',
        borderHover: 'hover:border-gray-600',

        // Buttons
        primaryButton: 'bg-teal-600 text-white hover:bg-teal-700',
        primaryButtonHover: 'hover:bg-teal-700',
        secondaryButton: 'bg-gray-700 text-gray-200 hover:bg-gray-600',
        secondaryButtonHover: 'hover:bg-gray-600',

        // Inputs
        input: 'bg-gray-800 border-gray-600 text-white focus:border-teal-500 focus:ring-teal-500',
        inputFocus: 'focus:border-teal-500 focus:ring-teal-500',

        // Status
        success: 'bg-green-900/30 text-green-400 border-green-800',
        warning: 'bg-amber-900/30 text-amber-400 border-amber-800',
        error: 'bg-red-900/30 text-red-400 border-red-800',
        info: 'bg-blue-900/30 text-blue-400 border-blue-800'
      }

    case 'charcoal':
      return {
        // Backgrounds
        background: 'bg-[#1a1a1a]',
        cardBackground: 'bg-[#242424]',
        hoverBackground: 'hover:bg-[#2a2a2a]',

        // Text
        textPrimary: 'text-white',
        textSecondary: 'text-gray-300',
        textMuted: 'text-gray-500',

        // Borders
        border: 'border-[#2a2a2a]',
        borderHover: 'hover:border-[#3a3a3a]',

        // Buttons - Note: Charcoal uses grays instead of teals
        primaryButton: 'bg-gray-600 text-white hover:bg-gray-500',
        primaryButtonHover: 'hover:bg-gray-500',
        secondaryButton: 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]',
        secondaryButtonHover: 'hover:bg-[#333333]',

        // Inputs
        input: 'bg-[#2a2a2a] border-[#3a3a3a] text-white focus:border-gray-500 focus:ring-gray-500',
        inputFocus: 'focus:border-gray-500 focus:ring-gray-500',

        // Status
        success: 'bg-green-900/20 text-green-400 border-green-900',
        warning: 'bg-amber-900/20 text-amber-400 border-amber-900',
        error: 'bg-red-900/20 text-red-400 border-red-900',
        info: 'bg-blue-900/20 text-blue-400 border-blue-900'
      }

    default:
      return getThemeClasses('light')
  }
}

// Helper function to get accent color based on theme
export function getAccentColor(theme: Theme): string {
  switch (theme) {
    case 'soft-light':
      return '#7c9885' // Sage green
    case 'charcoal':
      return '#6b7280' // Gray
    default:
      return '#0d9488' // Teal
  }
}

// Helper function to get theme-aware icon color
export function getIconColor(theme: Theme): string {
  switch (theme) {
    case 'soft-light':
      return 'text-[#7c9885]'
    case 'charcoal':
      return 'text-gray-400'
    default:
      return 'text-teal-600'
  }
}
