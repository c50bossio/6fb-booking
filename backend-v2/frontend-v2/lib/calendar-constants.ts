/**
 * Calendar Constants - Premium Enhancement Foundation
 * Core constants for BookedBarber premium calendar features
 * Lightweight, performant, and type-safe constant definitions
 */

// Core service type definitions
export const SERVICE_TYPES = {
  HAIRCUT: 'haircut',
  BEARD: 'beard',
  COLOR: 'color',
  TREATMENT: 'treatment',
  COMBO: 'combo',
  CONSULTATION: 'consultation',
  WASH: 'wash'
} as const;

export type ServiceType = typeof SERVICE_TYPES[keyof typeof SERVICE_TYPES];

// Service configuration with visual styling
export interface ServiceConfig {
  readonly name: string;
  readonly color: string;
  readonly lightColor: string;
  readonly darkColor: string;
  readonly icon: string;
  readonly gradient: {
    readonly from: string;
    readonly to: string;
    readonly light: string;
    readonly dark: string;
  };
  readonly border: string;
  readonly text: {
    readonly light: string;
    readonly dark: string;
  };
  readonly hover: {
    readonly light: string;
    readonly dark: string;
  };
  readonly glow: string;
}

// Service styling definitions
export const SERVICE_STYLES: Record<ServiceType, ServiceConfig> = {
  [SERVICE_TYPES.HAIRCUT]: {
    name: 'Haircut',
    color: '#3B82F6',
    lightColor: '#DBEAFE',
    darkColor: '#1E40AF',
    icon: '✂️',
    gradient: {
      from: 'from-blue-500',
      to: 'to-blue-600',
      light: 'from-blue-50 to-blue-100',
      dark: 'from-blue-800 to-blue-900'
    },
    border: 'border-blue-300',
    text: {
      light: 'text-blue-900',
      dark: 'text-blue-100'
    },
    hover: {
      light: 'hover:bg-blue-50',
      dark: 'hover:bg-blue-900/20'
    },
    glow: 'shadow-blue-500/20'
  },
  [SERVICE_TYPES.BEARD]: {
    name: 'Beard Trim',
    color: '#059669', // Emerald 600 - WCAG AA compliant
    lightColor: '#D1FAE5',
    darkColor: '#047857',
    icon: '🧔',
    gradient: {
      from: 'from-emerald-500',
      to: 'to-emerald-600',
      light: 'from-emerald-50 to-emerald-100',
      dark: 'from-emerald-800 to-emerald-900'
    },
    border: 'border-emerald-300',
    text: {
      light: 'text-emerald-900',
      dark: 'text-emerald-100'
    },
    hover: {
      light: 'hover:bg-emerald-50',
      dark: 'hover:bg-emerald-900/20'
    },
    glow: 'shadow-emerald-500/20'
  },
  [SERVICE_TYPES.COLOR]: {
    name: 'Hair Color',
    color: '#D97706', // Amber 600 - WCAG AA compliant
    lightColor: '#FEF3C7',
    darkColor: '#92400E',
    icon: '🎨',
    gradient: {
      from: 'from-amber-500',
      to: 'to-amber-600',
      light: 'from-amber-50 to-amber-100',
      dark: 'from-amber-800 to-amber-900'
    },
    border: 'border-amber-300',
    text: {
      light: 'text-amber-900',
      dark: 'text-amber-100'
    },
    hover: {
      light: 'hover:bg-amber-50',
      dark: 'hover:bg-amber-900/20'
    },
    glow: 'shadow-amber-500/20'
  },
  [SERVICE_TYPES.TREATMENT]: {
    name: 'Hair Treatment',
    color: '#8B5CF6',
    lightColor: '#EDE9FE',
    darkColor: '#7C3AED',
    icon: '💆',
    gradient: {
      from: 'from-purple-500',
      to: 'to-purple-600',
      light: 'from-purple-50 to-purple-100',
      dark: 'from-purple-800 to-purple-900'
    },
    border: 'border-purple-300',
    text: {
      light: 'text-purple-900',
      dark: 'text-purple-100'
    },
    hover: {
      light: 'hover:bg-purple-50',
      dark: 'hover:bg-purple-900/20'
    },
    glow: 'shadow-purple-500/20'
  },
  [SERVICE_TYPES.COMBO]: {
    name: 'Combo Service',
    color: '#EC4899',
    lightColor: '#FCE7F3',
    darkColor: '#BE185D',
    icon: '💎',
    gradient: {
      from: 'from-pink-500',
      to: 'to-pink-600',
      light: 'from-pink-50 to-pink-100',
      dark: 'from-pink-800 to-pink-900'
    },
    border: 'border-pink-300',
    text: {
      light: 'text-pink-900',
      dark: 'text-pink-100'
    },
    hover: {
      light: 'hover:bg-pink-50',
      dark: 'hover:bg-pink-900/20'
    },
    glow: 'shadow-pink-500/20'
  },
  [SERVICE_TYPES.CONSULTATION]: {
    name: 'Consultation',
    color: '#0891B2', // Cyan 600 - WCAG AA compliant
    lightColor: '#CFFAFE',
    darkColor: '#0891B2',
    icon: '💬',
    gradient: {
      from: 'from-cyan-500',
      to: 'to-cyan-600',
      light: 'from-cyan-50 to-cyan-100',
      dark: 'from-cyan-800 to-cyan-900'
    },
    border: 'border-cyan-300',
    text: {
      light: 'text-cyan-900',
      dark: 'text-cyan-100'
    },
    hover: {
      light: 'hover:bg-cyan-50',
      dark: 'hover:bg-cyan-900/20'
    },
    glow: 'shadow-cyan-500/20'
  },
  [SERVICE_TYPES.WASH]: {
    name: 'Hair Wash',
    color: '#6366F1',
    lightColor: '#E0E7FF',
    darkColor: '#4338CA',
    icon: '🚿',
    gradient: {
      from: 'from-indigo-500',
      to: 'to-indigo-600',
      light: 'from-indigo-50 to-indigo-100',
      dark: 'from-indigo-800 to-indigo-900'
    },
    border: 'border-indigo-300',
    text: {
      light: 'text-indigo-900',
      dark: 'text-indigo-100'
    },
    hover: {
      light: 'hover:bg-indigo-50',
      dark: 'hover:bg-indigo-900/20'
    },
    glow: 'shadow-indigo-500/20'
  }
} as const;

// Barber identification symbols
export const BARBER_SYMBOLS = [
  '🔷', '🔶', '🟢', '🟣', '🔴', '🟡', '⚫', '⚪', '🟠', '🟤',
  '🟦', '🟨', '🟩', '🟪', '🟫', '⭐', '💎', '⚡', '🌟', '🎯',
  '🏆', '🎪', '🎭', '🎨', '🎯', '🎲', '🎮', '🎸', '🎹', '🎺'
] as const;

export type BarberSymbol = typeof BARBER_SYMBOLS[number];

// Premium visual styling constants
export const PREMIUM_EFFECTS = {
  // Glassmorphism effects
  glass: {
    light: 'bg-white/10 backdrop-blur-sm border border-white/20',
    dark: 'bg-black/10 backdrop-blur-sm border border-white/10'
  },
  
  // Gradient backgrounds
  gradients: {
    subtle: {
      light: 'bg-gradient-to-br from-white to-gray-50',
      dark: 'bg-gradient-to-br from-gray-900 to-gray-800'
    },
    mesh: {
      light: 'bg-gradient-to-r from-blue-100 via-purple-50 to-pink-100',
      dark: 'bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-pink-900/20'
    },
    radial: {
      light: 'bg-radial-gradient-to-br from-blue-50 to-purple-50',
      dark: 'bg-radial-gradient-to-br from-blue-900/30 to-purple-900/30'
    }
  },
  
  // Shadow variations
  shadows: {
    soft: 'shadow-lg shadow-gray-200/50',
    medium: 'shadow-xl shadow-gray-300/40',
    strong: 'shadow-2xl shadow-gray-400/30',
    glow: 'shadow-2xl shadow-primary-500/20',
    floating: 'shadow-2xl shadow-black/10'
  },
  
  // Animation classes
  animations: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scaleIn: 'animate-scale-in',
    pulse: 'animate-pulse-gentle',
    float: 'animate-float',
    shimmer: 'animate-shimmer'
  }
} as const;

// Grid layout constants
export const GRID_LAYOUT = {
  // Time slot dimensions
  timeSlot: {
    height: 'h-12',
    minHeight: 'min-h-12',
    width: 'w-full',
    padding: 'p-2',
    margin: 'm-0.5'
  },
  
  // Calendar grid structure
  calendar: {
    container: 'grid grid-cols-7 gap-1',
    cell: 'aspect-square border border-gray-200',
    header: 'grid grid-cols-7 gap-1 mb-2',
    body: 'grid grid-cols-7 gap-1'
  },
  
  // Responsive breakpoints
  responsive: {
    mobile: 'grid-cols-1 md:grid-cols-7',
    tablet: 'grid-cols-3 lg:grid-cols-7',
    desktop: 'grid-cols-7'
  }
} as const;

// Time-related constants
export const TIME_CONSTANTS = {
  // Slot durations in minutes
  slotDuration: {
    short: 15,
    standard: 30,
    long: 60,
    extended: 90
  },
  
  // Business hours
  businessHours: {
    start: 9,    // 9 AM
    end: 18,     // 6 PM
    lunchStart: 12,  // 12 PM
    lunchEnd: 13     // 1 PM
  },
  
  // Time formatting
  format: {
    time: 'HH:mm',
    datetime: 'yyyy-MM-dd HH:mm',
    date: 'yyyy-MM-dd',
    display: 'MMM d, yyyy'
  }
} as const;

// Calendar states
export const CALENDAR_STATES = {
  // Slot availability states
  slot: {
    available: 'available',
    booked: 'booked',
    blocked: 'blocked',
    selected: 'selected',
    pending: 'pending'
  },
  
  // Loading states
  loading: {
    idle: 'idle',
    loading: 'loading',
    success: 'success',
    error: 'error'
  },
  
  // View modes
  view: {
    month: 'month',
    week: 'week',
    day: 'day',
    agenda: 'agenda'
  }
} as const;

// Performance constants
export const PERFORMANCE = {
  // Animation durations (ms)
  animation: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  
  // Debounce delays (ms)
  debounce: {
    search: 300,
    resize: 150,
    scroll: 100
  },
  
  // Lazy loading
  lazy: {
    threshold: 0.1,
    rootMargin: '50px'
  }
} as const;

// Z-index layering
export const Z_LAYERS = {
  base: 0,
  dropdown: 1000,
  modal: 1050,
  tooltip: 1070,
  toast: 1080,
  overlay: 1090
} as const;

// Accessibility constants
export const A11Y = {
  // ARIA labels
  labels: {
    calendar: 'Calendar',
    timeSlot: 'Time slot',
    appointment: 'Appointment',
    available: 'Available',
    booked: 'Booked',
    selected: 'Selected'
  },
  
  // Keyboard navigation
  keys: {
    enter: 'Enter',
    space: ' ',
    escape: 'Escape',
    arrowUp: 'ArrowUp',
    arrowDown: 'ArrowDown',
    arrowLeft: 'ArrowLeft',
    arrowRight: 'ArrowRight'
  },
  
  // Focus management
  focus: {
    ring: 'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    outline: 'focus:outline-none',
    visible: 'focus-visible:ring-2 focus-visible:ring-primary-500'
  }
} as const;

// Utility functions for constants
export const getServiceConfig = (service: ServiceType): ServiceConfig => {
  return SERVICE_STYLES[service];
};

export const getBarberSymbol = (barberId: string | number): BarberSymbol => {
  const index = typeof barberId === 'string' 
    ? barberId.charCodeAt(0) % BARBER_SYMBOLS.length
    : barberId % BARBER_SYMBOLS.length;
  return BARBER_SYMBOLS[index];
};

export const getServiceIcon = (service: ServiceType): string => {
  return SERVICE_STYLES[service].icon;
};

export const getServiceGradient = (service: ServiceType, isDark = false): string => {
  const config = SERVICE_STYLES[service];
  return isDark 
    ? `bg-gradient-to-r ${config.gradient.dark}`
    : `bg-gradient-to-r ${config.gradient.from} ${config.gradient.to}`;
};

export const getThemeClasses = (isDark = false) => {
  return {
    background: isDark ? PREMIUM_EFFECTS.gradients.subtle.dark : PREMIUM_EFFECTS.gradients.subtle.light,
    glass: isDark ? PREMIUM_EFFECTS.glass.dark : PREMIUM_EFFECTS.glass.light,
    shadow: isDark ? PREMIUM_EFFECTS.shadows.soft : PREMIUM_EFFECTS.shadows.medium,
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-600',
    border: isDark ? 'border-gray-700' : 'border-gray-200'
  };
};

// Export type definitions for external use
export type CalendarState = typeof CALENDAR_STATES.slot[keyof typeof CALENDAR_STATES.slot];
export type CalendarView = typeof CALENDAR_STATES.view[keyof typeof CALENDAR_STATES.view];
export type LoadingState = typeof CALENDAR_STATES.loading[keyof typeof CALENDAR_STATES.loading];