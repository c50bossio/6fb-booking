/**
 * Premium Calendar Visual Design System
 * Comprehensive theming system for BookedBarber calendar
 * Supports both light and dark modes with accessibility compliance
 */

export type ServiceType = 'haircut' | 'beard' | 'color' | 'treatment' | 'combo' | 'consultation' | 'wash';
export type BarberSymbol = string; // Emoji symbols for barbers

// Service color mappings with comprehensive styling
export const SERVICE_COLORS = {
  haircut: {
    name: 'Haircut',
    color: '#3B82F6', // Blue
    lightColor: '#DBEAFE',
    darkColor: '#1E40AF',
    accentColor: '#60A5FA',
    icon: '✂️',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-blue-600',
    gradientLight: 'from-blue-50 to-blue-100',
    gradientDark: 'from-blue-800 to-blue-900',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-900',
    textColorDark: 'text-blue-100',
    hoverColor: 'hover:bg-blue-50',
    hoverColorDark: 'hover:bg-blue-900/20',
    glowColor: 'shadow-blue-500/20'
  },
  beard: {
    name: 'Beard Trim',
    color: '#059669', // Emerald 600 - WCAG AA compliant green
    lightColor: '#D1FAE5',
    darkColor: '#047857',
    accentColor: '#34D399',
    icon: '🧔',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-emerald-600',
    gradientLight: 'from-emerald-50 to-emerald-100',
    gradientDark: 'from-emerald-800 to-emerald-900',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-900',
    textColorDark: 'text-emerald-100',
    hoverColor: 'hover:bg-emerald-50',
    hoverColorDark: 'hover:bg-emerald-900/20',
    glowColor: 'shadow-emerald-500/20'
  },
  color: {
    name: 'Hair Color',
    color: '#D97706', // Amber 600 - WCAG AA compliant orange
    lightColor: '#FEF3C7',
    darkColor: '#92400E',
    accentColor: '#FBBF24',
    icon: '🎨',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-amber-600',
    gradientLight: 'from-amber-50 to-amber-100',
    gradientDark: 'from-amber-800 to-amber-900',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-900',
    textColorDark: 'text-amber-100',
    hoverColor: 'hover:bg-amber-50',
    hoverColorDark: 'hover:bg-amber-900/20',
    glowColor: 'shadow-amber-500/20'
  },
  treatment: {
    name: 'Hair Treatment',
    color: '#8B5CF6', // Purple
    lightColor: '#EDE9FE',
    darkColor: '#7C3AED',
    accentColor: '#A78BFA',
    icon: '💆',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-purple-600',
    gradientLight: 'from-purple-50 to-purple-100',
    gradientDark: 'from-purple-800 to-purple-900',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-900',
    textColorDark: 'text-purple-100',
    hoverColor: 'hover:bg-purple-50',
    hoverColorDark: 'hover:bg-purple-900/20',
    glowColor: 'shadow-purple-500/20'
  },
  combo: {
    name: 'Combo Service',
    color: '#EC4899', // Pink
    lightColor: '#FCE7F3',
    darkColor: '#BE185D',
    accentColor: '#F472B6',
    icon: '💎',
    gradientFrom: 'from-pink-500',
    gradientTo: 'to-pink-600',
    gradientLight: 'from-pink-50 to-pink-100',
    gradientDark: 'from-pink-800 to-pink-900',
    borderColor: 'border-pink-300',
    textColor: 'text-pink-900',
    textColorDark: 'text-pink-100',
    hoverColor: 'hover:bg-pink-50',
    hoverColorDark: 'hover:bg-pink-900/20',
    glowColor: 'shadow-pink-500/20'
  },
  consultation: {
    name: 'Consultation',
    color: '#0891B2', // Cyan 600 - WCAG AA compliant cyan
    lightColor: '#CFFAFE',
    darkColor: '#0891B2',
    accentColor: '#22D3EE',
    icon: '💬',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-cyan-600',
    gradientLight: 'from-cyan-50 to-cyan-100',
    gradientDark: 'from-cyan-800 to-cyan-900',
    borderColor: 'border-cyan-300',
    textColor: 'text-cyan-900',
    textColorDark: 'text-cyan-100',
    hoverColor: 'hover:bg-cyan-50',
    hoverColorDark: 'hover:bg-cyan-900/20',
    glowColor: 'shadow-cyan-500/20'
  },
  wash: {
    name: 'Hair Wash',
    color: '#6366F1', // Indigo
    lightColor: '#E0E7FF',
    darkColor: '#4338CA',
    accentColor: '#818CF8',
    icon: '🚿',
    gradientFrom: 'from-indigo-500',
    gradientTo: 'to-indigo-600',
    gradientLight: 'from-indigo-50 to-indigo-100',
    gradientDark: 'from-indigo-800 to-indigo-900',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-900',
    textColorDark: 'text-indigo-100',
    hoverColor: 'hover:bg-indigo-50',
    hoverColorDark: 'hover:bg-indigo-900/20',
    glowColor: 'shadow-indigo-500/20'
  }
} as const;

// Barber symbol system with meaningful emojis
export const BARBER_SYMBOLS = [
  '🔷', // Diamond blue
  '🔶', // Diamond orange
  '🟢', // Green circle
  '🟣', // Purple circle
  '🔴', // Red circle
  '🟡', // Yellow circle
  '⚫', // Black circle
  '⚪', // White circle
  '🟠', // Orange circle
  '🟤', // Brown circle
  '🟦', // Blue square
  '🟨', // Yellow square
  '🟩', // Green square
  '🟪', // Purple square
  '🟫', // Brown square
  '⭐', // Star
  '💎', // Diamond
  '⚡', // Lightning
  '🌟', // Glowing star
  '🎯'  // Target
] as const;

// Premium styling constants
export const PREMIUM_STYLES = {
  // Background patterns and textures
  backgrounds: {
    glass: 'bg-white/10 backdrop-blur-sm',
    glassDark: 'bg-black/10 backdrop-blur-sm',
    gradient: 'bg-gradient-to-br from-white to-gray-50',
    gradientDark: 'bg-gradient-to-br from-gray-900 to-gray-800',
    mesh: 'bg-gradient-to-r from-blue-100 via-purple-50 to-pink-100',
    meshDark: 'bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20',
    subtle: 'bg-gray-50/50',
    subtleDark: 'bg-gray-800/50'
  },

  // Premium shadows with glowing effects
  shadows: {
    soft: 'shadow-lg shadow-gray-200/50',
    medium: 'shadow-xl shadow-gray-300/40',
    strong: 'shadow-2xl shadow-gray-400/30',
    glow: 'shadow-2xl shadow-primary-500/20',
    colored: 'shadow-lg shadow-current/20',
    floating: 'shadow-2xl shadow-black/10',
    glass: 'shadow-lg shadow-black/5 border border-white/20',
    glassDark: 'shadow-lg shadow-black/20 border border-white/10'
  },

  // Grid and layout styling
  grid: {
    base: 'rounded-xl border border-gray-200/60 bg-white/80 backdrop-blur-sm',
    baseDark: 'rounded-xl border border-gray-700/60 bg-gray-800/80 backdrop-blur-sm',
    cell: 'transition-all duration-200 ease-out hover:bg-gray-50/80 border-r border-b border-gray-100/60',
    cellDark: 'transition-all duration-200 ease-out hover:bg-gray-700/40 border-r border-b border-gray-700/60',
    header: 'bg-gradient-to-r from-gray-50 to-white border-b border-gray-200/80 font-semibold text-gray-700',
    headerDark: 'bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600/80 font-semibold text-gray-200'
  },

  // Animation classes
  animations: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scaleIn: 'animate-scale-in',
    glow: 'animate-glow',
    pulse: 'animate-pulse-gentle',
    float: 'animate-float',
    shimmer: 'animate-shimmer'
  },

  // Border radius variations
  borderRadius: {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    full: 'rounded-full'
  },

  // Typography scaling
  typography: {
    micro: 'text-xs font-medium',
    small: 'text-sm font-medium',
    base: 'text-base font-semibold',
    large: 'text-lg font-semibold',
    heading: 'text-xl font-bold'
  }
} as const;

// Calendar-specific theme constants
export const CALENDAR_THEME = {
  // Time slot states
  timeSlot: {
    available: {
      light: 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:border-green-300 hover:shadow-green-500/20',
      dark: 'bg-green-900/20 border-green-700 text-green-200 hover:bg-green-800/30 hover:border-green-600 hover:shadow-green-500/20'
    },
    booked: {
      light: 'bg-red-50 border-red-200 text-red-800 cursor-not-allowed opacity-60',
      dark: 'bg-red-900/20 border-red-700 text-red-200 cursor-not-allowed opacity-60'
    },
    selected: {
      light: 'bg-blue-100 border-blue-300 text-blue-900 shadow-blue-500/30',
      dark: 'bg-blue-800/30 border-blue-600 text-blue-100 shadow-blue-500/30'
    },
    blocked: {
      light: 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed',
      dark: 'bg-gray-800 border-gray-700 text-gray-400 cursor-not-allowed'
    }
  },

  // Today indicator styles
  today: {
    light: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-purple-500/40',
    dark: 'bg-gradient-to-r from-purple-400 to-purple-500 text-white shadow-purple-400/40'
  },

  // Loading states
  skeleton: {
    light: 'bg-gray-200 animate-pulse',
    dark: 'bg-gray-700 animate-pulse'
  }
} as const;

// Utility functions for theme management
export const getServiceStyle = (service: ServiceType) => {
  return SERVICE_COLORS[service] || SERVICE_COLORS.haircut;
};

export const getBarberSymbol = (barberId: string | number): BarberSymbol => {
  const index = typeof barberId === 'string' 
    ? barberId.charCodeAt(0) % BARBER_SYMBOLS.length
    : barberId % BARBER_SYMBOLS.length;
  return BARBER_SYMBOLS[index];
};

export const getServiceGradient = (service: ServiceType, isDark = false) => {
  const serviceStyle = getServiceStyle(service);
  if (isDark) {
    return `bg-gradient-to-r ${serviceStyle.gradientDark}`;
  }
  return `bg-gradient-to-r ${serviceStyle.gradientFrom} ${serviceStyle.gradientTo}`;
};

export const getServiceIcon = (service: ServiceType): string => {
  return getServiceStyle(service).icon;
};

export const getThemeClasses = (isDark = false) => {
  return {
    background: isDark ? PREMIUM_STYLES.backgrounds.gradientDark : PREMIUM_STYLES.backgrounds.gradient,
    card: isDark ? PREMIUM_STYLES.grid.baseDark : PREMIUM_STYLES.grid.base,
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-600',
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    shadow: isDark ? PREMIUM_STYLES.shadows.glassDark : PREMIUM_STYLES.shadows.glass
  };
};

// Color accessibility helpers
export const getContrastColor = (backgroundColor: string): string => {
  // Simple contrast calculation - in production, use a proper contrast library
  const isLight = backgroundColor.includes('50') || backgroundColor.includes('100') || backgroundColor.includes('200');
  return isLight ? '#1F2937' : '#F9FAFB';
};

// Animation duration constants
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700
} as const;

// Responsive breakpoints for calendar
export const CALENDAR_BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280
} as const;

// Z-index scale for layering
export const Z_INDEX = {
  dropdown: 1000,
  modal: 1050,
  tooltip: 1070,
  toast: 1080
} as const;