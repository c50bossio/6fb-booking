'use client'

import { ReactNode } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface ThemeAwarePageWrapperProps {
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export default function ThemeAwarePageWrapper({
  children,
  className = '',
  noPadding = false
}: ThemeAwarePageWrapperProps) {
  const { theme } = useTheme()

  // Base classes that apply to all themes
  const baseClasses = `min-h-screen transition-colors duration-200 ${
    noPadding ? '' : 'p-4 sm:p-6 lg:p-8'
  }`

  // Theme-specific classes
  const themeClasses = {
    light: 'bg-gray-50 text-gray-900',
    'soft-light': 'bg-[#f5f5f0] text-gray-900',
    dark: 'bg-gray-900 text-white',
    charcoal: 'bg-[#1a1a1a] text-white'
  }

  return (
    <div className={`${baseClasses} ${themeClasses[theme]} ${className}`}>
      {children}
    </div>
  )
}
