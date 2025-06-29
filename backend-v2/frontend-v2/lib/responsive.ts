/**
 * Responsive design utilities for the 6FB Booking Platform
 */

// Breakpoint values matching Tailwind's defaults
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

// Type for breakpoint keys
export type Breakpoint = keyof typeof breakpoints

// Note: useBreakpoint hook has been moved to hooks/useResponsive.ts for proper SSR handling

// Responsive container classes
export const containerClasses = {
  default: 'container mx-auto px-4',
  sm: 'container mx-auto px-4 sm:px-6',
  md: 'container mx-auto px-4 sm:px-6 md:px-8',
  lg: 'container mx-auto px-4 sm:px-6 lg:px-8',
  xl: 'container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12',
  full: 'w-full px-4 sm:px-6 lg:px-8',
  tight: 'max-w-4xl mx-auto px-4 sm:px-6',
  narrow: 'max-w-2xl mx-auto px-4 sm:px-6',
}

// Responsive grid classes
export const gridClasses = {
  cols1: 'grid grid-cols-1',
  cols2: 'grid grid-cols-1 md:grid-cols-2',
  cols3: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  cols4: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  cols6: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
  cols12: 'grid grid-cols-12',
}

// Responsive spacing utilities
export const spacing = {
  section: {
    y: 'py-8 md:py-12 lg:py-16',
    x: 'px-4 sm:px-6 lg:px-8',
    all: 'p-4 sm:p-6 lg:p-8',
  },
  card: {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  },
  stack: {
    sm: 'space-y-2 sm:space-y-3',
    md: 'space-y-3 sm:space-y-4',
    lg: 'space-y-4 sm:space-y-6',
  },
  gap: {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 md:gap-6',
    lg: 'gap-4 sm:gap-6 lg:gap-8',
  },
}

// Responsive typography classes
export const typography = {
  h1: 'text-3xl sm:text-4xl md:text-5xl font-bold',
  h2: 'text-2xl sm:text-3xl md:text-4xl font-bold',
  h3: 'text-xl sm:text-2xl md:text-3xl font-semibold',
  h4: 'text-lg sm:text-xl md:text-2xl font-semibold',
  h5: 'text-base sm:text-lg md:text-xl font-medium',
  h6: 'text-sm sm:text-base md:text-lg font-medium',
  body: 'text-sm sm:text-base',
  bodyLarge: 'text-base sm:text-lg',
  caption: 'text-xs sm:text-sm',
}

// Responsive flex utilities
export const flex = {
  row: 'flex flex-col sm:flex-row',
  rowReverse: 'flex flex-col-reverse sm:flex-row-reverse',
  col: 'flex flex-col',
  center: 'flex items-center justify-center',
  between: 'flex items-center justify-between',
  around: 'flex items-center justify-around',
  start: 'flex items-start',
  end: 'flex items-end',
}

// Responsive visibility utilities
export const visibility = {
  mobileOnly: 'block sm:hidden',
  tabletOnly: 'hidden sm:block md:hidden',
  desktopOnly: 'hidden md:block',
  hideOnMobile: 'hidden sm:block',
  hideOnTablet: 'block md:block sm:hidden',
  hideOnDesktop: 'block md:hidden',
}

// Responsive aspect ratio utilities
export const aspectRatio = {
  square: 'aspect-square',
  video: 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '3/2': 'aspect-[3/2]',
  '16/9': 'aspect-[16/9]',
  '21/9': 'aspect-[21/9]',
}

// Utility function to combine responsive classes
export function cx(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}