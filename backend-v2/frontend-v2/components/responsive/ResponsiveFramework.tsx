/**
 * Responsive Framework - Mobile-First Design System
 * Enterprise mobile-first responsive components for 6FB AI Agent System
 * Built for professional barbershop platform with touch-optimized interactions
 */

'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { breakpoints, touchTargets, componentSpacing } from '@/lib/design-tokens'

interface ResponsiveState {
  // Device Detection
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  
  // Screen Dimensions
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
  
  // Touch Capabilities
  isTouchDevice: boolean
  supportsHover: boolean
  
  // Network & Performance
  isSlowConnection: boolean
  prefersReducedData: boolean
  
  // Current Breakpoint
  currentBreakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

interface ResponsiveContextType extends ResponsiveState {
  // Utility Functions
  showOnMobile: boolean
  showOnTablet: boolean
  showOnDesktop: boolean
  getOptimalImageSize: () => { width: number; height: number }
  getOptimalGridColumns: () => number
  getTouchTargetSize: () => string
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined)

interface ResponsiveProviderProps {
  children: React.ReactNode
}

export function ResponsiveProvider({ children }: ResponsiveProviderProps) {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLargeDesktop: false,
    screenWidth: 1920,
    screenHeight: 1080,
    orientation: 'landscape',
    isTouchDevice: false,
    supportsHover: true,
    isSlowConnection: false,
    prefersReducedData: false,
    currentBreakpoint: 'xl'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateResponsiveState = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Determine breakpoint and device type
      const isMobile = width < parseInt(breakpoints.md)
      const isTablet = width >= parseInt(breakpoints.md) && width < parseInt(breakpoints.lg)
      const isDesktop = width >= parseInt(breakpoints.lg) && width < parseInt(breakpoints['2xl'])
      const isLargeDesktop = width >= parseInt(breakpoints['2xl'])
      
      // Determine current breakpoint
      let currentBreakpoint: ResponsiveState['currentBreakpoint'] = 'sm'
      if (width >= parseInt(breakpoints['2xl'])) currentBreakpoint = '2xl'
      else if (width >= parseInt(breakpoints.xl)) currentBreakpoint = 'xl'
      else if (width >= parseInt(breakpoints.lg)) currentBreakpoint = 'lg'
      else if (width >= parseInt(breakpoints.md)) currentBreakpoint = 'md'
      
      // Detect touch device and hover support
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const supportsHover = window.matchMedia('(hover: hover)').matches
      
      // Detect slow connection
      const connection = (navigator as any).connection
      const isSlowConnection = connection && 
        (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')
      
      // Detect reduced data preference
      const prefersReducedData = window.matchMedia('(prefers-reduced-data: reduce)').matches
      
      setState({
        isMobile,
        isTablet,
        isDesktop,
        isLargeDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
        isTouchDevice,
        supportsHover,
        isSlowConnection,
        prefersReducedData,
        currentBreakpoint
      })
    }

    // Initial state
    updateResponsiveState()

    // Listen for resize events
    window.addEventListener('resize', updateResponsiveState)
    window.addEventListener('orientationchange', updateResponsiveState)

    // Listen for connection changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connection.addEventListener('change', updateResponsiveState)
    }

    return () => {
      window.removeEventListener('resize', updateResponsiveState)
      window.removeEventListener('orientationchange', updateResponsiveState)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        connection.removeEventListener('change', updateResponsiveState)
      }
    }
  }, [])

  // Utility functions
  const getOptimalImageSize = () => {
    if (state.isMobile) return { width: 400, height: 300 }
    if (state.isTablet) return { width: 600, height: 400 }
    return { width: 800, height: 600 }
  }

  const getOptimalGridColumns = () => {
    if (state.isMobile) return 1
    if (state.isTablet) return 2
    if (state.isDesktop) return 3
    return 4
  }

  const getTouchTargetSize = () => {
    return state.isTouchDevice ? touchTargets.comfortable : touchTargets.minimum
  }

  const contextValue: ResponsiveContextType = {
    ...state,
    showOnMobile: state.isMobile,
    showOnTablet: state.isTablet,
    showOnDesktop: state.isDesktop || state.isLargeDesktop,
    getOptimalImageSize,
    getOptimalGridColumns,
    getTouchTargetSize
  }

  return (
    <ResponsiveContext.Provider value={contextValue}>
      {children}
    </ResponsiveContext.Provider>
  )
}

// Hook to use responsive context
export function useResponsive() {
  const context = useContext(ResponsiveContext)
  if (context === undefined) {
    throw new Error('useResponsive must be used within a ResponsiveProvider')
  }
  return context
}

// Responsive Grid Component
interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
    largeDesktop?: number
  }
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  autoFit?: boolean
  minItemWidth?: string
}

export function ResponsiveGrid({
  children,
  className = '',
  cols = { mobile: 1, tablet: 2, desktop: 3, largeDesktop: 4 },
  gap = 'md',
  autoFit = false,
  minItemWidth = '280px'
}: ResponsiveGridProps) {
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useResponsive()

  const getCurrentCols = () => {
    if (isMobile) return cols.mobile || 1
    if (isTablet) return cols.tablet || 2
    if (isDesktop) return cols.desktop || 3
    if (isLargeDesktop) return cols.largeDesktop || 4
    return 3
  }

  const gapSizes = {
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  }

  const gridStyle = autoFit 
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
        gap: gapSizes[gap]
      }
    : {
        display: 'grid',
        gridTemplateColumns: `repeat(${getCurrentCols()}, 1fr)`,
        gap: gapSizes[gap]
      }

  return (
    <div className={className} style={gridStyle}>
      {children}
    </div>
  )
}

// Responsive Container Component
interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
  centerContent?: boolean
}

export function ResponsiveContainer({
  children,
  className = '',
  maxWidth = 'xl',
  padding = true,
  centerContent = false
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  }

  const paddingClasses = padding ? 'px-4 sm:px-6 lg:px-8' : ''
  const centerClasses = centerContent ? 'mx-auto' : ''

  return (
    <div className={`${maxWidthClasses[maxWidth]} ${paddingClasses} ${centerClasses} ${className}`}>
      {children}
    </div>
  )
}

// Responsive Typography Component
interface ResponsiveTextProps {
  children: React.ReactNode
  className?: string
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption'
  responsive?: boolean
}

export function ResponsiveText({
  children,
  className = '',
  variant = 'body',
  responsive = true
}: ResponsiveTextProps) {
  const { isMobile } = useResponsive()

  const getResponsiveClasses = () => {
    if (!responsive) return ''

    const responsiveVariants = {
      h1: isMobile ? 'text-2xl' : 'text-4xl lg:text-5xl',
      h2: isMobile ? 'text-xl' : 'text-2xl lg:text-3xl',
      h3: isMobile ? 'text-lg' : 'text-xl lg:text-2xl',
      h4: isMobile ? 'text-base' : 'text-lg lg:text-xl',
      body: isMobile ? 'text-sm' : 'text-base',
      caption: isMobile ? 'text-xs' : 'text-sm'
    }

    return responsiveVariants[variant]
  }

  const baseVariants = {
    h1: 'font-bold leading-tight',
    h2: 'font-semibold leading-tight',
    h3: 'font-semibold leading-snug',
    h4: 'font-medium leading-snug',
    body: 'leading-relaxed',
    caption: 'leading-normal'
  }

  const Tag = variant.startsWith('h') ? variant as keyof JSX.IntrinsicElements : 'p'

  return (
    <Tag className={`${baseVariants[variant]} ${getResponsiveClasses()} ${className}`}>
      {children}
    </Tag>
  )
}

// Mobile-First Image Component
interface ResponsiveImageProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  quality?: number
  sizes?: string
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
}

export function ResponsiveImage({
  src,
  alt,
  className = '',
  priority = false,
  quality = 75,
  sizes,
  objectFit = 'cover'
}: ResponsiveImageProps) {
  const { getOptimalImageSize, isSlowConnection, prefersReducedData } = useResponsive()
  const optimalSize = getOptimalImageSize()

  // Reduce quality for slow connections or reduced data preference
  const adjustedQuality = (isSlowConnection || prefersReducedData) 
    ? Math.max(quality - 25, 40) 
    : quality

  const defaultSizes = sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'

  return (
    <img
      src={src}
      alt={alt}
      className={`object-${objectFit} ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      sizes={defaultSizes}
      style={{
        width: '100%',
        height: 'auto',
        maxWidth: `${optimalSize.width}px`,
        maxHeight: `${optimalSize.height}px`
      }}
    />
  )
}

// Touch-Optimized Button Component
interface TouchButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function TouchButton({
  children,
  className = '',
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md'
}: TouchButtonProps) {
  const { isTouchDevice, getTouchTargetSize } = useResponsive()

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  }

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  const touchTargetSize = getTouchTargetSize()
  const touchOptimizedStyle = isTouchDevice ? {
    minHeight: touchTargetSize,
    minWidth: touchTargetSize
  } : {}

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={touchOptimizedStyle}
    >
      {children}
    </button>
  )
}

// Responsive Navigation Component
interface ResponsiveNavProps {
  children: React.ReactNode
  className?: string
  mobileBreakpoint?: 'sm' | 'md' | 'lg'
}

export function ResponsiveNav({
  children,
  className = '',
  mobileBreakpoint = 'lg'
}: ResponsiveNavProps) {
  const { currentBreakpoint } = useResponsive()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isMobileView = () => {
    const breakpointOrder = ['sm', 'md', 'lg', 'xl', '2xl']
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint)
    const mobileIndex = breakpointOrder.indexOf(mobileBreakpoint)
    return currentIndex < mobileIndex
  }

  if (isMobileView()) {
    return (
      <nav className={`relative ${className}`}>
        {/* Mobile Menu Button */}
        <button
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-lg mt-2 py-2 z-50">
            {children}
          </div>
        )}
      </nav>
    )
  }

  return (
    <nav className={`flex items-center space-x-6 ${className}`}>
      {children}
    </nav>
  )
}

// Performance-Aware Component Loader
interface PerformanceAwareProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  lazy?: boolean
  priority?: 'high' | 'medium' | 'low'
}

export function PerformanceAware({
  children,
  fallback = <div>Loading...</div>,
  lazy = false,
  priority = 'medium'
}: PerformanceAwareProps) {
  const { isSlowConnection, prefersReducedData } = useResponsive()
  const [shouldRender, setShouldRender] = useState(!lazy)

  useEffect(() => {
    if (lazy && !shouldRender) {
      const delay = isSlowConnection || prefersReducedData ? 1000 : 500
      const timer = setTimeout(() => setShouldRender(true), delay)
      return () => clearTimeout(timer)
    }
  }, [lazy, shouldRender, isSlowConnection, prefersReducedData])

  // Don't render low priority components on slow connections
  if ((isSlowConnection || prefersReducedData) && priority === 'low') {
    return null
  }

  return shouldRender ? <>{children}</> : <>{fallback}</>
}

export default ResponsiveProvider