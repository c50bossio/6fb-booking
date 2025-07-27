/**
 * Accessibility Provider - WCAG 2.1 AA Compliance
 * Enterprise accessibility framework for 6FB AI Agent System
 * Ensures professional accessibility standards for barbershop platform
 */

'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { accessibility, enterpriseAnimations } from '@/lib/design-tokens'

interface AccessibilityState {
  // Visual Accessibility
  highContrast: boolean
  reducedMotion: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  
  // Motor Accessibility
  keyboardNavigation: boolean
  largerClickTargets: boolean
  
  // Cognitive Accessibility
  reducedComplexity: boolean
  extendedTimeouts: boolean
  
  // Screen Reader Support
  announcements: string[]
  liveRegion: string
  
  // Focus Management
  focusTrapping: boolean
  skipLinks: boolean
}

interface AccessibilityActions {
  setHighContrast: (enabled: boolean) => void
  setReducedMotion: (enabled: boolean) => void
  setFontSize: (size: AccessibilityState['fontSize']) => void
  setKeyboardNavigation: (enabled: boolean) => void
  setLargerClickTargets: (enabled: boolean) => void
  setReducedComplexity: (enabled: boolean) => void
  setExtendedTimeouts: (enabled: boolean) => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  setLiveRegion: (message: string) => void
  clearAnnouncements: () => void
  resetToDefaults: () => void
}

interface AccessibilityContextType extends AccessibilityState, AccessibilityActions {}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

const defaultState: AccessibilityState = {
  highContrast: false,
  reducedMotion: false,
  fontSize: 'medium',
  keyboardNavigation: false,
  largerClickTargets: false,
  reducedComplexity: false,
  extendedTimeouts: false,
  announcements: [],
  liveRegion: '',
  focusTrapping: false,
  skipLinks: true,
}

interface AccessibilityProviderProps {
  children: React.ReactNode
  persistSettings?: boolean
}

export function AccessibilityProvider({ 
  children, 
  persistSettings = true 
}: AccessibilityProviderProps) {
  const [state, setState] = useState<AccessibilityState>(defaultState)
  const liveRegionRef = useRef<HTMLDivElement>(null)
  const announcementTimeouts = useRef<NodeJS.Timeout[]>([])

  // Load saved preferences on mount
  useEffect(() => {
    if (persistSettings && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('6fb-accessibility-settings')
        if (saved) {
          const parsedSettings = JSON.parse(saved)
          setState(prev => ({ ...prev, ...parsedSettings }))
        }
      } catch (error) {
        console.warn('Failed to load accessibility settings:', error)
      }

      // Detect system preferences
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
      
      setState(prev => ({
        ...prev,
        reducedMotion: prev.reducedMotion || prefersReducedMotion,
        highContrast: prev.highContrast || prefersHighContrast,
      }))
    }
  }, [persistSettings])

  // Save preferences when state changes
  useEffect(() => {
    if (persistSettings && typeof window !== 'undefined') {
      try {
        localStorage.setItem('6fb-accessibility-settings', JSON.stringify(state))
      } catch (error) {
        console.warn('Failed to save accessibility settings:', error)
      }
    }
  }, [state, persistSettings])

  // Apply CSS custom properties based on accessibility settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement

      // High contrast mode
      if (state.highContrast) {
        root.classList.add('high-contrast')
        root.style.setProperty('--color-contrast-multiplier', '1.5')
      } else {
        root.classList.remove('high-contrast')
        root.style.removeProperty('--color-contrast-multiplier')
      }

      // Font size adjustment
      const fontSizeMap = {
        small: '0.875',
        medium: '1',
        large: '1.125',
        'extra-large': '1.25'
      }
      root.style.setProperty('--font-size-multiplier', fontSizeMap[state.fontSize])

      // Larger click targets
      if (state.largerClickTargets) {
        root.style.setProperty('--touch-target-size', '48px')
        root.classList.add('larger-click-targets')
      } else {
        root.style.setProperty('--touch-target-size', '44px')
        root.classList.remove('larger-click-targets')
      }

      // Reduced motion
      if (state.reducedMotion) {
        root.classList.add('reduced-motion')
      } else {
        root.classList.remove('reduced-motion')
      }

      // Keyboard navigation
      if (state.keyboardNavigation) {
        root.classList.add('keyboard-navigation')
      } else {
        root.classList.remove('keyboard-navigation')
      }
    }
  }, [state])

  // Handle keyboard navigation detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setState(prev => ({ ...prev, keyboardNavigation: true }))
      }
    }

    const handleMouseDown = () => {
      setState(prev => ({ ...prev, keyboardNavigation: false }))
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Clear announcement timeouts on unmount
  useEffect(() => {
    return () => {
      announcementTimeouts.current.forEach(clearTimeout)
    }
  }, [])

  const actions: AccessibilityActions = {
    setHighContrast: (enabled) => 
      setState(prev => ({ ...prev, highContrast: enabled })),
    
    setReducedMotion: (enabled) => 
      setState(prev => ({ ...prev, reducedMotion: enabled })),
    
    setFontSize: (size) => 
      setState(prev => ({ ...prev, fontSize: size })),
    
    setKeyboardNavigation: (enabled) => 
      setState(prev => ({ ...prev, keyboardNavigation: enabled })),
    
    setLargerClickTargets: (enabled) => 
      setState(prev => ({ ...prev, largerClickTargets: enabled })),
    
    setReducedComplexity: (enabled) => 
      setState(prev => ({ ...prev, reducedComplexity: enabled })),
    
    setExtendedTimeouts: (enabled) => 
      setState(prev => ({ ...prev, extendedTimeouts: enabled })),
    
    announce: (message, priority = 'polite') => {
      setState(prev => ({
        ...prev,
        announcements: [...prev.announcements, message]
      }))

      // Auto-clear announcement after 5 seconds
      const timeout = setTimeout(() => {
        setState(prev => ({
          ...prev,
          announcements: prev.announcements.filter(a => a !== message)
        }))
      }, 5000)

      announcementTimeouts.current.push(timeout)

      // Also announce to live region
      if (liveRegionRef.current) {
        liveRegionRef.current.setAttribute('aria-live', priority)
        liveRegionRef.current.textContent = message
        
        // Clear live region after announcement
        setTimeout(() => {
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = ''
          }
        }, 1000)
      }
    },
    
    setLiveRegion: (message) => 
      setState(prev => ({ ...prev, liveRegion: message })),
    
    clearAnnouncements: () => 
      setState(prev => ({ ...prev, announcements: [] })),
    
    resetToDefaults: () => 
      setState(defaultState),
  }

  const contextValue = { ...state, ...actions }

  // Motion configuration based on reduced motion preference
  const motionConfig = {
    transition: state.reducedMotion 
      ? { duration: 0.01 }
      : { 
          duration: parseFloat(enterpriseAnimations.duration.normal) / 1000,
          ease: 'easeOut'
        }
  }

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <MotionConfig {...motionConfig}>
        {/* Skip Links */}
        {state.skipLinks && <SkipLinks />}
        
        {/* Live Region for Screen Reader Announcements */}
        <div
          ref={liveRegionRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          role="status"
        />
        
        {/* Alternative live region for assertive announcements */}
        <div
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
          role="alert"
        >
          {state.liveRegion}
        </div>

        {/* Visual announcements for sighted users */}
        <AnnouncementRegion announcements={state.announcements} />
        
        {children}
      </MotionConfig>
    </AccessibilityContext.Provider>
  )
}

// Skip Links Component
function SkipLinks() {
  const skipLinks = [
    { href: '#main-content', text: 'Skip to main content' },
    { href: '#navigation', text: 'Skip to navigation' },
    { href: '#search', text: 'Skip to search' },
  ]

  return (
    <div className="skip-links">
      {skipLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="skip-link"
          onFocus={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          onBlur={(e) => e.currentTarget.style.transform = 'translateY(-100%)'}
        >
          {link.text}
        </a>
      ))}
      
      <style jsx>{`
        .skip-links {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1000;
        }
        
        .skip-link {
          position: absolute;
          top: 0;
          left: 0;
          background: #000;
          color: #fff;
          padding: 8px 16px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 0 0 4px 0;
          transform: translateY(-100%);
          transition: transform 0.2s ease;
        }
        
        .skip-link:focus {
          transform: translateY(0) !important;
        }
      `}</style>
    </div>
  )
}

// Announcement Region for Visual Users
function AnnouncementRegion({ announcements }: { announcements: string[] }) {
  return (
    <div 
      className="fixed top-4 right-4 z-50 space-y-2 max-w-sm"
      role="region"
      aria-label="System announcements"
    >
      <AnimatePresence>
        {announcements.map((announcement, index) => (
          <motion.div
            key={`${announcement}-${index}`}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg text-sm"
            role="status"
            aria-live="polite"
          >
            {announcement}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Custom hook to use accessibility context
export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Accessibility Settings Panel Component
export function AccessibilitySettingsPanel({ className = '' }: { className?: string }) {
  const {
    highContrast,
    reducedMotion,
    fontSize,
    largerClickTargets,
    reducedComplexity,
    extendedTimeouts,
    setHighContrast,
    setReducedMotion,
    setFontSize,
    setLargerClickTargets,
    setReducedComplexity,
    setExtendedTimeouts,
    resetToDefaults,
    announce
  } = useAccessibility()

  const handleSettingChange = (setting: string, value: any) => {
    announce(`${setting} ${value ? 'enabled' : 'disabled'}`)
  }

  return (
    <div className={`space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${className}`}>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Accessibility Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Customize your experience for better accessibility
        </p>
      </div>

      {/* Visual Accessibility */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Visual Accessibility
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => {
                setHighContrast(e.target.checked)
                handleSettingChange('High contrast', e.target.checked)
              }}
              className="w-4 h-4 text-primary-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                High Contrast Mode
              </span>
              <p className="text-xs text-gray-500">
                Increases contrast for better visibility
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => {
                setReducedMotion(e.target.checked)
                handleSettingChange('Reduced motion', e.target.checked)
              }}
              className="w-4 h-4 text-primary-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Reduce Motion
              </span>
              <p className="text-xs text-gray-500">
                Minimizes animations and transitions
              </p>
            </div>
          </label>

          <div>
            <label className="text-sm font-medium text-gray-900 dark:text-white block mb-2">
              Font Size
            </label>
            <select
              value={fontSize}
              onChange={(e) => {
                const size = e.target.value as AccessibilityState['fontSize']
                setFontSize(size)
                announce(`Font size changed to ${size}`)
              }}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
        </div>
      </div>

      {/* Motor Accessibility */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Motor Accessibility
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={largerClickTargets}
              onChange={(e) => {
                setLargerClickTargets(e.target.checked)
                handleSettingChange('Larger click targets', e.target.checked)
              }}
              className="w-4 h-4 text-primary-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Larger Click Targets
              </span>
              <p className="text-xs text-gray-500">
                Makes buttons and links easier to click
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Cognitive Accessibility */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Cognitive Accessibility
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={reducedComplexity}
              onChange={(e) => {
                setReducedComplexity(e.target.checked)
                handleSettingChange('Reduced complexity', e.target.checked)
              }}
              className="w-4 h-4 text-primary-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Simplify Interface
              </span>
              <p className="text-xs text-gray-500">
                Reduces visual complexity and distractions
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={extendedTimeouts}
              onChange={(e) => {
                setExtendedTimeouts(e.target.checked)
                handleSettingChange('Extended timeouts', e.target.checked)
              }}
              className="w-4 h-4 text-primary-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Extended Timeouts
              </span>
              <p className="text-xs text-gray-500">
                Provides more time for form completion
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t">
        <button
          onClick={() => {
            resetToDefaults()
            announce('Accessibility settings reset to defaults')
          }}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

// HOC for accessible components
export function withAccessibility<T extends object>(
  Component: React.ComponentType<T>
) {
  return function AccessibleComponent(props: T) {
    const accessibility = useAccessibility()
    
    return (
      <div data-accessibility-enhanced="true">
        <Component {...props} accessibility={accessibility} />
      </div>
    )
  }
}

export default AccessibilityProvider