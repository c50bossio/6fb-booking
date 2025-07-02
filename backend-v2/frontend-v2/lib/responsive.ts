/**
 * Responsive Design System Utilities
 * Mobile-first responsive design utilities for consistent layouts and typography
 */

// Breakpoint system aligned with Tailwind config
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
} as const

export type Breakpoint = keyof typeof breakpoints

// Container classes for consistent max-widths
export const containerClasses = {
  default: 'container mx-auto px-4 sm:px-6 lg:px-8',
  narrow: 'container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl',
  wide: 'container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl',
  full: 'w-full px-4 sm:px-6 lg:px-8',
  fluid: 'w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16',
  prose: 'container mx-auto px-4 sm:px-6 lg:px-8 max-w-prose',
} as const

// Grid system classes
export const gridClasses = {
  cols1: 'grid grid-cols-1',
  cols2: 'grid grid-cols-1 sm:grid-cols-2',
  cols3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  cols4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  cols5: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  cols6: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
  responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  autoFit: 'grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
  autoFill: 'grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))]',
} as const

// Spacing system for consistent gaps and padding
export const spacing = {
  section: {
    xs: 'py-section-xs',
    sm: 'py-section-sm',
    md: 'py-section-md',
    lg: 'py-section-lg',
    xl: 'py-section-xl',
    y: 'py-8 sm:py-12 lg:py-16 xl:py-20',
  },
  card: {
    xs: 'p-2',
    sm: 'p-card-sm',
    md: 'p-card-md',
    lg: 'p-card-lg',
    xl: 'p-card-xl',
  },
  stack: {
    xs: 'space-y-2',
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  },
  gap: {
    xs: 'gap-2',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  },
} as const

// Typography system with responsive scaling
export const typography = {
  // Display headings
  display: {
    sm: 'text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight',
    md: 'text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight',
    lg: 'text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight',
  },
  
  // Standard headings
  h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight',
  h2: 'text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight',
  h3: 'text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight',
  h4: 'text-base sm:text-lg lg:text-xl font-semibold tracking-tight',
  h5: 'text-sm sm:text-base lg:text-lg font-semibold tracking-tight',
  h6: 'text-xs sm:text-sm lg:text-base font-semibold tracking-tight',
  
  // Body text
  body: {
    sm: 'text-sm leading-relaxed',
    md: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed',
  },
  
  // Lead text
  lead: 'text-lg sm:text-xl lg:text-2xl leading-relaxed text-ios-gray-600 dark:text-ios-gray-400',
  
  // Captions and small text
  caption: 'text-xs sm:text-sm text-ios-gray-500 dark:text-ios-gray-400',
  small: 'text-sm text-ios-gray-600 dark:text-ios-gray-400',
  
  // iOS-style typography
  ios: {
    largeTitle: 'text-ios-large-title font-normal',
    title1: 'text-ios-title1 font-normal',
    title2: 'text-ios-title2 font-normal',
    title3: 'text-ios-title3 font-normal',
    headline: 'text-ios-headline font-semibold',
    body: 'text-ios-body font-normal',
    callout: 'text-ios-callout font-normal',
    subheadline: 'text-ios-subheadline font-normal',
    footnote: 'text-ios-footnote font-normal',
    caption1: 'text-ios-caption1 font-normal',
    caption2: 'text-ios-caption2 font-normal',
  },
} as const

// Responsive visibility utilities
export const visibility = {
  showOnMobile: 'block sm:hidden',
  hideOnMobile: 'hidden sm:block',
  showOnTablet: 'hidden sm:block lg:hidden',
  hideOnTablet: 'block sm:hidden lg:block',
  showOnDesktop: 'hidden lg:block',
  hideOnDesktop: 'block lg:hidden',
  mobileOnly: 'sm:hidden',
  tabletUp: 'hidden sm:block',
  desktopUp: 'hidden lg:block',
} as const

// Touch-friendly sizing for mobile devices
export const touchTargets = {
  sm: 'min-w-[40px] min-h-[40px]',
  md: 'min-w-[44px] min-h-[44px]', // Apple's recommended minimum
  lg: 'min-w-[48px] min-h-[48px]',
  xl: 'min-w-[56px] min-h-[56px]',
} as const

// Mobile-first responsive utilities functions
export const responsive = {
  // Get responsive classes for different screen sizes
  getResponsiveClasses: (
    mobile: string,
    tablet?: string,
    desktop?: string,
    wide?: string
  ): string => {
    let classes = mobile
    if (tablet) classes += ` sm:${tablet}`
    if (desktop) classes += ` lg:${desktop}`
    if (wide) classes += ` xl:${wide}`
    return classes
  },

  // Generate responsive spacing
  getSpacing: (
    property: 'p' | 'px' | 'py' | 'pt' | 'pb' | 'pl' | 'pr' | 'm' | 'mx' | 'my' | 'mt' | 'mb' | 'ml' | 'mr',
    mobile: number | string,
    tablet?: number | string,
    desktop?: number | string
  ): string => {
    let classes = `${property}-${mobile}`
    if (tablet) classes += ` sm:${property}-${tablet}`
    if (desktop) classes += ` lg:${property}-${desktop}`
    return classes
  },

  // Generate responsive typography
  getTypography: (
    mobile: string,
    tablet?: string,
    desktop?: string
  ): string => {
    let classes = mobile
    if (tablet) classes += ` sm:${tablet}`
    if (desktop) classes += ` lg:${desktop}`
    return classes
  },
} as const

// Layout patterns for common use cases
export const layouts = {
  // Centered content with max width
  centered: 'flex flex-col items-center justify-center text-center max-w-2xl mx-auto',
  
  // Two column layout
  twoColumn: 'grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12',
  
  // Three column layout
  threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8',
  
  // Sidebar layout
  sidebar: 'grid grid-cols-1 lg:grid-cols-4 gap-8',
  sidebarContent: 'lg:col-span-3',
  sidebarAside: 'lg:col-span-1',
  
  // Hero section
  hero: 'relative overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900',
  heroContent: 'relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32',
  
  // Card grid
  cardGrid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
  
  // Feature list
  featureList: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8',
  
  // Testimonial grid
  testimonialGrid: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8',
  
  // Masonry-like layout
  masonry: 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6',
} as const

// Mobile navigation patterns
export const navigation = {
  // Mobile menu button
  mobileMenuButton: 'inline-flex items-center justify-center p-2 rounded-md text-ios-gray-700 dark:text-ios-gray-300 hover:text-primary-500 hover:bg-ios-gray-100 dark:hover:bg-ios-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden',
  
  // Mobile menu panel
  mobileMenuPanel: 'absolute top-0 inset-x-0 p-2 transition transform origin-top-right lg:hidden',
  
  // Desktop navigation
  desktopNav: 'hidden lg:flex lg:items-center lg:space-x-8',
  
  // Tab navigation
  tabNav: 'flex space-x-1 rounded-lg bg-ios-gray-100 dark:bg-ios-gray-800 p-1',
  tabButton: 'relative min-w-0 flex-1 overflow-hidden bg-white dark:bg-ios-gray-700 py-2 px-4 text-sm font-medium text-center rounded-md focus:z-10',
} as const

// Form layouts and spacing
export const forms = {
  // Form containers
  container: 'space-y-6',
  section: 'space-y-4',
  group: 'space-y-2',
  
  // Form grids
  grid: 'grid grid-cols-1 gap-6 sm:grid-cols-2',
  gridThree: 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3',
  
  // Input sizing
  inputSm: 'px-3 py-2 text-sm',
  inputMd: 'px-4 py-3 text-base',
  inputLg: 'px-5 py-4 text-lg',
  
  // Button groups
  buttonGroup: 'flex flex-col sm:flex-row gap-3 sm:gap-4',
  buttonGroupInline: 'flex flex-wrap gap-2',
} as const

// Animation and transition utilities
export const animations = {
  // Page transitions
  pageEnter: 'animate-fade-in',
  pageExit: 'animate-fade-out',
  
  // Element animations
  slideUp: 'animate-slide-up',
  slideDown: 'animate-slide-down',
  slideLeft: 'animate-slide-left',
  slideRight: 'animate-slide-right',
  scaleIn: 'animate-scale-in',
  
  // Hover effects
  hoverScale: 'transition-transform duration-200 hover:scale-105',
  hoverFloat: 'transition-transform duration-300 hover:-translate-y-1',
  hoverGlow: 'transition-shadow duration-300 hover:shadow-glow-primary',
  
  // Loading states
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  shimmer: 'animate-shimmer',
} as const

// Utility function to combine responsive classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Helper function to check if we're on mobile
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < breakpoints.sm
}

// Helper function to get current breakpoint
export function getCurrentBreakpoint(): Breakpoint | null {
  if (typeof window === 'undefined') return null
  
  const width = window.innerWidth
  
  if (width >= breakpoints['3xl']) return '3xl'
  if (width >= breakpoints['2xl']) return '2xl'
  if (width >= breakpoints.xl) return 'xl'
  if (width >= breakpoints.lg) return 'lg'
  if (width >= breakpoints.md) return 'md'
  if (width >= breakpoints.sm) return 'sm'
  if (width >= breakpoints.xs) return 'xs'
  
  return null
}

// Export all utilities as a single object for easier importing
export const responsiveUtils = {
  breakpoints,
  containerClasses,
  gridClasses,
  spacing,
  typography,
  visibility,
  touchTargets,
  responsive,
  layouts,
  navigation,
  forms,
  animations,
  cn,
  isMobileDevice,
  getCurrentBreakpoint,
} as const

// Default export for convenience
export default responsiveUtils