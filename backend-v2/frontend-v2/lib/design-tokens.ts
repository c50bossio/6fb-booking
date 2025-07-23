/**
 * Design Tokens for 6FB Booking Platform
 * A premium, professional design system for a luxury barber booking experience
 */

export const colors = {
  // Primary palette - Premium teal/turquoise
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  
  // Accent - Deep navy for contrast
  accent: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Neutral - Sophisticated grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Semantic colors
  success: {
    light: '#10b981',
    DEFAULT: '#059669',
    dark: '#047857',
  },
  
  error: {
    light: '#f87171',
    DEFAULT: '#ef4444',
    dark: '#dc2626',
  },
  
  warning: {
    light: '#fbbf24',
    DEFAULT: '#f59e0b',
    dark: '#d97706',
  },
  
  info: {
    light: '#60a5fa',
    DEFAULT: '#3b82f6',
    dark: '#2563eb',
  },
}

export const typography = {
  // Font families
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace'],
  },
  
  // Font sizes with line heights
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
  },
  
  // Font weights
  fontWeight: {
    thin: '100',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
}

export const spacing = {
  // Consistent spacing scale
  0: '0px',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  7: '1.75rem',    // 28px
  8: '2rem',       // 32px
  9: '2.25rem',    // 36px
  10: '2.5rem',    // 40px
  11: '2.75rem',   // 44px
  12: '3rem',      // 48px
  14: '3.5rem',    // 56px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  28: '7rem',      // 112px
  32: '8rem',      // 128px
}

export const borderRadius = {
  none: '0px',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
}

export const shadows = {
  // Subtle, elegant shadows
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.35)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: '0 0 #0000',
  
  // Premium glow effects
  glow: {
    primary: '0 0 20px rgba(59, 130, 246, 0.5)',
    accent: '0 0 20px rgba(234, 179, 8, 0.5)',
    success: '0 0 20px rgba(5, 150, 105, 0.5)',
  }
}

export const animation = {
  // Smooth transitions
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
}

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// Z-index scale for layering
export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
}

// Opacity scale
export const opacity = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  25: '0.25',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  75: '0.75',
  80: '0.8',
  90: '0.9',
  95: '0.95',
  100: '1',
}

// Blur values for backdrop effects
export const blur = {
  none: '0',
  sm: '4px',
  DEFAULT: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '40px',
  '3xl': '64px',
}

// ENHANCED TYPOGRAPHY SYSTEM - iOS-inspired with perfect readability
export const enhancedTypography = {
  // Semantic typography patterns
  patterns: {
    // Page-level typography
    pageTitle: 'text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white',
    pageSubtitle: 'text-lg sm:text-xl font-medium leading-relaxed text-gray-700 dark:text-gray-300',
    
    // Section-level typography  
    sectionTitle: 'text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white',
    sectionSubtitle: 'text-base sm:text-lg font-medium leading-relaxed text-gray-600 dark:text-gray-400',
    
    // Component-level typography
    cardTitle: 'text-xl sm:text-2xl font-semibold leading-snug text-gray-900 dark:text-white',
    cardDescription: 'text-sm sm:text-base leading-relaxed text-gray-600 dark:text-gray-400',
    
    // Content typography
    bodyText: 'text-base leading-relaxed text-gray-700 dark:text-gray-300',
    captionText: 'text-sm leading-normal text-gray-600 dark:text-gray-400',
    labelText: 'text-sm font-medium leading-normal text-gray-700 dark:text-gray-300',
    
    // Interface typography
    buttonText: {
      large: 'text-lg font-semibold leading-none',
      medium: 'text-base font-medium leading-none', 
      small: 'text-sm font-medium leading-none'
    },
    navigationText: 'text-sm font-medium leading-none',
    badgeText: 'text-xs font-semibold leading-none uppercase tracking-wider'
  },
  
  // iOS-inspired font scales
  ios: {
    'caption2': 'text-[11px] leading-[13px] font-normal tracking-[0.05em]',
    'caption1': 'text-xs leading-4 font-normal tracking-[0.025em]',
    'footnote': 'text-[13px] leading-[18px] font-normal tracking-[0.01em]',
    'subheadline': 'text-[15px] leading-5 font-normal',
    'callout': 'text-base leading-[21px] font-normal',
    'body': 'text-[17px] leading-[22px] font-normal',
    'headline': 'text-[17px] leading-[22px] font-semibold tracking-[-0.01em]',
    'title3': 'text-xl leading-[25px] font-normal tracking-[-0.015em]',
    'title2': 'text-[22px] leading-7 font-normal tracking-[-0.02em]',
    'title1': 'text-[28px] leading-[34px] font-normal tracking-[-0.025em]',
    'largeTitle': 'text-[34px] leading-[41px] font-normal tracking-[-0.03em]'
  }
}

// ENHANCED SPACING SYSTEM - 8pt grid with semantic names
export const enhancedSpacing = {
  // Semantic spacing patterns
  patterns: {
    // Card spacing
    cardPadding: {
      small: 'p-4',
      medium: 'p-6', 
      large: 'p-8'
    },
    cardGap: {
      small: 'space-y-4',
      medium: 'space-y-6',
      large: 'space-y-8'
    },
    
    // Form spacing
    formFieldset: 'space-y-6',
    formField: 'space-y-2',
    formInputPadding: 'px-4 py-3',
    formButtonGroup: 'space-x-3',
    
    // Layout spacing
    containerPadding: {
      mobile: 'px-4',
      tablet: 'px-6', 
      desktop: 'px-8',
      wide: 'px-12'
    },
    sectionPadding: {
      small: 'py-8 sm:py-12',
      medium: 'py-12 sm:py-16 lg:py-20',
      large: 'py-16 sm:py-20 lg:py-24'
    },
    
    // Navigation spacing
    navPadding: 'px-4 py-3',
    navGap: 'space-y-1',
    navItemPadding: 'px-3 py-2',
    
    // Modal spacing
    modalPadding: 'p-6',
    modalHeaderPadding: 'px-6 pt-6 pb-4',
    modalFooterPadding: 'px-6 pb-6 pt-4'
  },
  
  // Component-specific spacing
  components: {
    button: {
      padding: {
        small: 'px-3 py-1.5',
        medium: 'px-4 py-2.5',
        large: 'px-6 py-3'
      },
      gap: 'space-x-2'
    },
    
    alert: {
      padding: 'p-4',
      gap: 'space-x-3'
    },
    
    table: {
      cellPadding: 'px-6 py-4',
      headerPadding: 'px-6 py-3'
    },
    
    list: {
      padding: 'py-2',
      itemPadding: 'px-4 py-2',
      gap: 'space-y-1'
    }
  }
}

// LAYOUT SYSTEM - Common layout patterns
export const layoutPatterns = {
  // Container patterns
  containers: {
    page: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    content: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
    narrow: 'max-w-2xl mx-auto px-4 sm:px-6 lg:px-8',
    wide: 'max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8'
  },
  
  // Flex patterns
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between', 
    start: 'flex items-center justify-start',
    end: 'flex items-center justify-end',
    colCenter: 'flex flex-col items-center justify-center',
    colStart: 'flex flex-col items-start justify-start'
  },
  
  // Grid patterns
  grid: {
    autoFit: {
      small: 'grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]',
      medium: 'grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]',
      large: 'grid grid-cols-[repeat(auto-fit,minmax(24rem,1fr))]'
    },
    responsive: {
      '1-2': 'grid grid-cols-1 sm:grid-cols-2',
      '1-2-3': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      '1-2-4': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      '2-3-4': 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
    }
  },
  
  // Stack patterns (vertical spacing)
  stack: {
    tight: 'space-y-2',
    normal: 'space-y-4',
    relaxed: 'space-y-6',
    loose: 'space-y-8',
    extraLoose: 'space-y-12'
  },
  
  // Inline patterns (horizontal spacing)
  inline: {
    tight: 'space-x-2',
    normal: 'space-x-4', 
    relaxed: 'space-x-6',
    loose: 'space-x-8'
  }
}

// COMPONENT STYLE GENERATORS - Ready-to-use component patterns
export const componentStyles = {
  // Card styles
  card: {
    default: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700',
    interactive: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer',
    glass: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50'
  },
  
  // Button styles
  button: {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow-md transition-all',
    secondary: 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 hover:border-gray-400 transition-all',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all'
  },
  
  // Input styles
  input: {
    default: 'w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all',
    error: 'w-full px-4 py-3 border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all',
    success: 'w-full px-4 py-3 border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all'
  },
  
  // Badge styles
  badge: {
    primary: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800',
    secondary: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800',
    success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
    warning: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800',
    error: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'
  },
  
  // Alert styles  
  alert: {
    info: 'bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4',
    success: 'bg-green-50 border border-green-200 text-green-800 rounded-md p-4',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4',
    error: 'bg-red-50 border border-red-200 text-red-800 rounded-md p-4'
  }
}

// UTILITY FUNCTIONS for dynamic token access
export function getTypographyPattern(pattern: string): string {
  return enhancedTypography.patterns[pattern as keyof typeof enhancedTypography.patterns] || ''
}

export function getSpacingPattern(category: string, variant: string): string {
  const categoryPatterns = enhancedSpacing.patterns[category as keyof typeof enhancedSpacing.patterns]
  if (typeof categoryPatterns === 'object') {
    return (categoryPatterns as any)[variant] || ''
  }
  return ''
}

export function getLayoutPattern(category: string, variant: string): string {
  const categoryPatterns = layoutPatterns[category as keyof typeof layoutPatterns] 
  if (typeof categoryPatterns === 'object') {
    return (categoryPatterns as any)[variant] || ''
  }
  return ''
}

export function getComponentStyle(component: string, variant: string): string {
  const componentVariants = componentStyles[component as keyof typeof componentStyles]
  if (typeof componentVariants === 'object') {
    return (componentVariants as any)[variant] || ''
  }
  return ''
}