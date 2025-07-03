import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * Automatically handles conflicting classes and maintains proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Theme-aware utility functions
 */
export const themeUtils = {
  /**
   * Get appropriate glass morphism classes based on theme and intensity
   */
  getGlassClasses: (intensity: 'light' | 'medium' | 'strong' = 'medium', darkMode?: boolean) => {
    const baseClasses = 'backdrop-blur-ios border'
    
    switch (intensity) {
      case 'light':
        return cn(
          baseClasses,
          darkMode 
            ? 'bg-white/5 border-white/10' 
            : 'bg-white/20 border-white/30'
        )
      case 'strong':
        return cn(
          baseClasses,
          'backdrop-blur-strong',
          darkMode 
            ? 'bg-black/40 border-white/10' 
            : 'bg-white/30 border-white/40'
        )
      default: // medium
        return cn(
          baseClasses,
          darkMode 
            ? 'bg-white/10 border-white/20' 
            : 'bg-white/25 border-white/35'
        )
    }
  },

  /**
   * Get iOS-style shadow classes based on elevation level
   */
  getShadowClasses: (elevation: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md') => {
    const shadowMap = {
      sm: 'shadow-ios-sm',
      md: 'shadow-ios-md', 
      lg: 'shadow-ios-lg',
      xl: 'shadow-ios-xl',
      '2xl': 'shadow-ios-2xl'
    }
    return shadowMap[elevation]
  },

  /**
   * Get appropriate text color classes for the current theme
   */
  getTextClasses: (variant: 'primary' | 'secondary' | 'muted' | 'accent' = 'primary') => {
    const textMap = {
      primary: 'text-gray-900 dark:text-white',
      secondary: 'text-gray-700 dark:text-gray-200', 
      muted: 'text-gray-500 dark:text-gray-400',
      accent: 'text-primary-600 dark:text-primary-400'
    }
    return textMap[variant]
  },

  /**
   * Get background classes with proper dark mode support
   */
  getBackgroundClasses: (variant: 'surface' | 'elevated' | 'card' | 'muted' = 'surface') => {
    const bgMap = {
      surface: 'bg-white dark:bg-dark-surface-100',
      elevated: 'bg-white dark:bg-dark-elevated-100',
      card: 'bg-white dark:bg-dark-surface-100',
      muted: 'bg-gray-50 dark:bg-dark-surface-200'
    }
    return bgMap[variant]
  }
}

/**
 * Animation and transition utilities
 */
export const animationUtils = {
  /**
   * Get iOS-style animation classes
   */
  getEntranceAnimation: (type: 'fade' | 'slide-up' | 'slide-down' | 'scale' | 'bounce' = 'fade') => {
    const animationMap = {
      fade: 'animate-fade-in',
      'slide-up': 'animate-slide-up',
      'slide-down': 'animate-slide-down', 
      scale: 'animate-scale-in',
      bounce: 'animate-bounce-gentle'
    }
    return animationMap[type]
  },

  /**
   * Get hover effect classes
   */
  getHoverClasses: (effect: 'lift' | 'glow' | 'scale' | 'none' = 'lift') => {
    const effectMap = {
      lift: 'hover-lift',
      glow: 'hover-glow',
      scale: 'transform transition-all duration-200 hover:scale-[1.02]',
      none: ''
    }
    return effectMap[effect]
  },

  /**
   * Get focus ring classes with theme awareness
   */
  getFocusClasses: (color: 'primary' | 'secondary' | 'error' | 'success' = 'primary') => {
    const focusMap = {
      primary: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-surface-100',
      secondary: 'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-dark-surface-100',
      error: 'focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 dark:focus:ring-offset-dark-surface-100',
      success: 'focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 dark:focus:ring-offset-dark-surface-100'
    }
    return focusMap[color]
  }
}

/**
 * Component variant utilities for consistent styling
 */
export const componentUtils = {
  /**
   * Get button variant classes
   */
  getButtonClasses: (
    variant: 'primary' | 'secondary' | 'ghost' | 'outline' = 'primary',
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm rounded-ios',
      md: 'px-6 py-3 text-base rounded-ios-lg', 
      lg: 'px-8 py-4 text-lg rounded-ios-xl'
    }

    const variantClasses = {
      primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-ios-md hover:shadow-ios-lg transform hover:scale-[1.02] active:scale-[0.98] focus:ring-primary-500',
      secondary: 'bg-white dark:bg-dark-surface-100 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-dark-elevated-100 shadow-ios-sm hover:shadow-ios-md transform hover:scale-[1.02] active:scale-[0.98] focus:ring-primary-500',
      ghost: 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-elevated-100 transform hover:scale-[1.02] active:scale-[0.98] focus:ring-primary-500',
      outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transform hover:scale-[1.02] active:scale-[0.98] focus:ring-primary-500'
    }

    return cn(baseClasses, sizeClasses[size], variantClasses[variant])
  },

  /**
   * Get input variant classes
   */
  getInputClasses: (
    variant: 'default' | 'error' | 'success' = 'default',
    size: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const baseClasses = 'w-full border transition-all duration-200 bg-white dark:bg-dark-surface-100 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400'
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm rounded-ios',
      md: 'px-4 py-3 text-base rounded-ios-lg',
      lg: 'px-5 py-4 text-lg rounded-ios-xl'
    }

    const variantClasses = {
      default: 'border-gray-200 dark:border-gray-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 shadow-ios-sm focus:shadow-ios-md',
      error: 'border-error-300 dark:border-error-700 focus:border-error-500 focus:ring-2 focus:ring-error-500 focus:ring-opacity-20 shadow-ios-sm focus:shadow-ios-md',
      success: 'border-success-300 dark:border-success-700 focus:border-success-500 focus:ring-2 focus:ring-success-500 focus:ring-opacity-20 shadow-ios-sm focus:shadow-ios-md'
    }

    return cn(baseClasses, sizeClasses[size], variantClasses[variant])
  },

  /**
   * Get card variant classes
   */
  getCardClasses: (
    variant: 'default' | 'elevated' | 'glass' | 'outline' = 'default',
    padding: 'sm' | 'md' | 'lg' = 'md'
  ) => {
    const baseClasses = 'rounded-ios-lg transition-all duration-200'
    
    const paddingClasses = {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }

    const variantClasses = {
      default: 'bg-white dark:bg-dark-surface-100 border border-gray-100 dark:border-gray-800 shadow-ios-md hover:shadow-ios-lg transform hover:scale-[1.01]',
      elevated: 'bg-white dark:bg-dark-elevated-100 border border-gray-100 dark:border-gray-700 shadow-ios-lg hover:shadow-ios-xl transform hover:scale-[1.02]',
      glass: 'glass hover:scale-[1.01]',
      outline: 'border-2 border-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-50 dark:hover:bg-dark-surface-100/50 transform hover:scale-[1.01]'
    }

    return cn(baseClasses, paddingClasses[padding], variantClasses[variant])
  }
}

/**
 * Responsive utilities
 */
export const responsiveUtils = {
  /**
   * Get responsive classes for mobile-first design
   */
  getMobileOptimized: (className: string) => {
    return cn(className, 'touch-manipulation')
  },

  /**
   * Get responsive padding classes
   */
  getResponsivePadding: (mobile: string, desktop: string) => {
    return cn(`p-${mobile}`, `md:p-${desktop}`)
  },

  /**
   * Get responsive text size classes
   */
  getResponsiveText: (mobile: string, desktop: string) => {
    return cn(`text-${mobile}`, `md:text-${desktop}`)
  }
}

/**
 * Accessibility utilities
 */
export const a11yUtils = {
  /**
   * Get screen reader only classes
   */
  getScreenReaderOnly: () => {
    return 'sr-only'
  },

  /**
   * Get high contrast mode classes
   */
  getHighContrastClasses: (element: 'button' | 'input' | 'card' = 'button') => {
    const contrastMap = {
      button: 'contrast-more:border-2 contrast-more:border-current',
      input: 'contrast-more:border-2 contrast-more:border-gray-600',
      card: 'contrast-more:border-2 contrast-more:border-gray-400'
    }
    return contrastMap[element]
  },

  /**
   * Get reduced motion classes for accessibility
   */
  getReducedMotionClasses: () => {
    return 'motion-reduce:transition-none motion-reduce:animation-none'
  }
}

/**
 * Format utilities for common data types
 */
export const formatUtils = {
  /**
   * Format currency with locale support
   */
  formatCurrency: (amount: number, currency: string = 'USD', locale: string = 'en-US') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  },

  /**
   * Format phone numbers
   */
  formatPhoneNumber: (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`
    }
    return phone
  },

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  formatRelativeTime: (date: Date | string) => {
    const now = new Date()
    const target = new Date(date)
    const diffInMs = now.getTime() - target.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return target.toLocaleDateString()
  },

  /**
   * Truncate text with ellipsis
   */
  truncateText: (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
  }
}

/**
 * Validation utilities
 */
export const validationUtils = {
  /**
   * Validate email format
   */
  isValidEmail: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  /**
   * Validate phone number format
   */
  isValidPhoneNumber: (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/
    const cleaned = phone.replace(/\D/g, '')
    return phoneRegex.test(phone) && cleaned.length >= 10
  },

  /**
   * Validate password strength
   */
  getPasswordStrength: (password: string) => {
    let score = 0
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password), 
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }

    Object.values(checks).forEach(check => {
      if (check) score++
    })

    if (score < 3) return { strength: 'weak', score, checks }
    if (score < 5) return { strength: 'medium', score, checks }
    return { strength: 'strong', score, checks }
  }
}

/**
 * Local storage utilities with error handling
 */
export const storageUtils = {
  /**
   * Get item from localStorage with fallback
   */
  getItem: (key: string, fallback: string = '') => {
    try {
      if (typeof window === 'undefined') return fallback
      return localStorage.getItem(key) || fallback
    } catch (error) {
      console.warn(`Failed to get localStorage item "${key}":`, error)
      return fallback
    }
  },

  /**
   * Set item in localStorage with error handling
   */
  setItem: (key: string, value: string) => {
    try {
      if (typeof window === 'undefined') return false
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn(`Failed to set localStorage item "${key}":`, error)
      return false
    }
  },

  /**
   * Remove item from localStorage
   */
  removeItem: (key: string) => {
    try {
      if (typeof window === 'undefined') return false
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn(`Failed to remove localStorage item "${key}":`, error)
      return false
    }
  }
}

/**
 * Debug utilities for development
 */
export const debugUtils = {
  /**
   * Log with timestamp and component context
   */
  log: (component: string, message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] ${component}: ${message}`, data || '')
    }
  },

  /**
   * Measure performance of functions
   */
  measurePerformance: <T>(name: string, fn: () => T): T => {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`)
    }
    
    return result
  }
}

// Export individual utilities for backward compatibility
export const formatCurrency = formatUtils.formatCurrency
export const formatPhoneNumber = formatUtils.formatPhoneNumber
export const formatRelativeTime = formatUtils.formatRelativeTime
export const truncateText = formatUtils.truncateText