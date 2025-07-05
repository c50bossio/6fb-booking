/**
 * Premium Calendar Theme System
 * 
 * Extends the existing Tailwind design system with sophisticated
 * calendar-specific styling, animations, and interactions.
 * 
 * This builds on the existing iOS-inspired design tokens while adding
 * premium visual treatments for calendar components.
 */

export interface PremiumTheme {
  name: string
  calendar: {
    background: string
    surface: string
    elevated: string
    glass: string
  }
  appointments: {
    gradient: string
    hover: string
    shadow: string
    glow: string
  }
  timeSlots: {
    available: string
    busy: string
    hovered: string
    selected: string
  }
  navigation: {
    button: string
    buttonHover: string
    indicator: string
  }
  animations: {
    transition: string
    hover: string
    press: string
  }
}

export const premiumThemes: Record<string, PremiumTheme> = {
  // Sophisticated dark theme with depth
  platinum: {
    name: 'Platinum',
    calendar: {
      background: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
      surface: 'bg-white/5 backdrop-blur-xl border border-white/10',
      elevated: 'bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl',
      glass: 'bg-white/[0.08] backdrop-blur-3xl border border-white/20 shadow-glass'
    },
    appointments: {
      gradient: 'bg-gradient-to-r from-primary-400/90 to-primary-600/90',
      hover: 'hover:from-primary-300/95 hover:to-primary-500/95 hover:shadow-glow-primary',
      shadow: 'shadow-lg hover:shadow-xl',
      glow: 'hover:shadow-glow-primary-strong'
    },
    timeSlots: {
      available: 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary-400/50',
      busy: 'bg-red-500/20 border border-red-400/30',
      hovered: 'bg-primary-500/20 border border-primary-400/50 shadow-lg',
      selected: 'bg-primary-500/30 border border-primary-400 shadow-glow-primary'
    },
    navigation: {
      button: 'bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-xl',
      buttonHover: 'hover:shadow-lg hover:scale-105 active:scale-95',
      indicator: 'bg-primary-400 shadow-glow-primary-subtle'
    },
    animations: {
      transition: 'transition-all duration-300 ease-ios',
      hover: 'transform hover:scale-[1.02] hover:-translate-y-0.5',
      press: 'active:scale-[0.98] active:translate-y-0'
    }
  },

  // Premium light theme with warmth
  pearl: {
    name: 'Pearl',
    calendar: {
      background: 'bg-gradient-to-br from-white via-gray-50 to-white',
      surface: 'bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-premium-soft',
      elevated: 'bg-white/95 backdrop-blur-2xl border border-gray-200/80 shadow-premium',
      glass: 'bg-white/60 backdrop-blur-3xl border border-gray-200/40 shadow-glass-light'
    },
    appointments: {
      gradient: 'bg-gradient-to-r from-primary-500 to-primary-600',
      hover: 'hover:from-primary-400 hover:to-primary-500 hover:shadow-premium-colored',
      shadow: 'shadow-ios hover:shadow-premium',
      glow: 'hover:shadow-premium-colored'
    },
    timeSlots: {
      available: 'bg-gray-50/80 hover:bg-primary-50/80 border border-gray-200/60 hover:border-primary-300/60',
      busy: 'bg-red-50/80 border border-red-200/60',
      hovered: 'bg-primary-100/80 border border-primary-300/80 shadow-ios-md',
      selected: 'bg-primary-200/80 border border-primary-400 shadow-premium-colored'
    },
    navigation: {
      button: 'bg-white/80 hover:bg-white/95 border border-gray-200/60 backdrop-blur-xl shadow-ios',
      buttonHover: 'hover:shadow-ios-lg hover:scale-105 active:scale-95',
      indicator: 'bg-primary-500 shadow-premium-colored'
    },
    animations: {
      transition: 'transition-all duration-300 ease-ios',
      hover: 'transform hover:scale-[1.02] hover:-translate-y-0.5',
      press: 'active:scale-[0.98] active:translate-y-0'
    }
  },

  // Aurora-inspired theme with gradients
  aurora: {
    name: 'Aurora',
    calendar: {
      background: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
      surface: 'bg-white/5 backdrop-blur-xl border border-white/10',
      elevated: 'bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20',
      glass: 'bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-3xl border border-white/20'
    },
    appointments: {
      gradient: 'bg-gradient-to-r from-cyan-400/90 via-blue-500/90 to-purple-600/90',
      hover: 'hover:from-cyan-300/95 hover:via-blue-400/95 hover:to-purple-500/95',
      shadow: 'shadow-lg hover:shadow-2xl',
      glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]'
    },
    timeSlots: {
      available: 'bg-white/5 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 border border-white/10',
      busy: 'bg-red-500/20 border border-red-400/30',
      hovered: 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-purple-400/50',
      selected: 'bg-gradient-to-r from-cyan-500/40 to-purple-500/40 border border-purple-400'
    },
    navigation: {
      button: 'bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20 backdrop-blur-xl',
      buttonHover: 'hover:shadow-lg hover:scale-105 active:scale-95',
      indicator: 'bg-gradient-to-r from-cyan-400 to-purple-500'
    },
    animations: {
      transition: 'transition-all duration-500 ease-ios-spring',
      hover: 'transform hover:scale-[1.03] hover:-translate-y-1',
      press: 'active:scale-[0.97] active:translate-y-0'
    }
  }
}

// Premium animation presets
export const premiumAnimations = {
  // Smooth calendar view transitions
  viewTransition: {
    enter: 'animate-in slide-in-from-right-6 fade-in-0 duration-300',
    exit: 'animate-out slide-out-to-left-6 fade-out-0 duration-300'
  },
  
  // Appointment interactions
  appointmentHover: {
    scale: 'hover:scale-105',
    lift: 'hover:-translate-y-1',
    glow: 'hover:shadow-glow-primary',
    duration: 'transition-all duration-200'
  },
  
  // Time slot interactions
  timeSlotSelect: {
    bounce: 'animate-ios-bounce',
    pulse: 'animate-pulse-gentle',
    scale: 'animate-ios-scale'
  },
  
  // Navigation enhancements
  navigationButton: {
    press: 'active:scale-95 active:brightness-95',
    ripple: 'relative overflow-hidden before:absolute before:inset-0 before:rounded-lg before:bg-white/20 before:scale-0 hover:before:scale-100 before:transition-transform before:duration-300',
    float: 'hover:animate-float'
  }
}

// Enhanced interaction states
export const interactionStates = {
  // Hover states with premium effects
  hover: {
    appointment: 'group-hover:shadow-xl group-hover:scale-[1.02] group-hover:-translate-y-0.5',
    timeSlot: 'hover:bg-primary-50/80 hover:border-primary-300/60 hover:shadow-md',
    navButton: 'hover:shadow-lg hover:scale-105 hover:brightness-110'
  },
  
  // Active/pressed states
  active: {
    appointment: 'active:scale-[0.98] active:shadow-md',
    timeSlot: 'active:scale-95 active:brightness-95',
    navButton: 'active:scale-95 active:brightness-90'
  },
  
  // Focus states for accessibility
  focus: {
    appointment: 'focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2',
    timeSlot: 'focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-1',
    navButton: 'focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2'
  }
}

// Responsive design tokens for premium mobile experience
export const responsiveDesign = {
  mobile: {
    appointment: 'text-xs px-2 py-1.5 min-h-[44px] touch-manipulation',
    timeSlot: 'min-h-[48px] text-sm touch-manipulation',
    spacing: 'gap-1 p-2'
  },
  tablet: {
    appointment: 'text-sm px-3 py-2',
    timeSlot: 'min-h-[40px] text-sm',
    spacing: 'gap-2 p-3'
  },
  desktop: {
    appointment: 'text-sm px-3 py-2',
    timeSlot: 'min-h-[36px] text-sm',
    spacing: 'gap-3 p-4'
  }
}

// Theme utilities
export function getTheme(themeName: keyof typeof premiumThemes): PremiumTheme {
  return premiumThemes[themeName] || premiumThemes.pearl
}

export function getThemeClasses(theme: PremiumTheme, component: keyof PremiumTheme['calendar']) {
  return theme.calendar[component]
}

export function getCombinedAnimationClasses(...animations: string[]): string {
  return animations.filter(Boolean).join(' ')
}

// Premium enhancement helpers
export function enhanceAppointmentStyling(baseClasses: string, theme: PremiumTheme): string {
  return `${baseClasses} ${theme.appointments.gradient} ${theme.appointments.hover} ${theme.appointments.shadow} ${theme.animations.transition} ${theme.animations.hover}`
}

export function enhanceTimeSlotStyling(baseClasses: string, theme: PremiumTheme, state: 'available' | 'busy' | 'hovered' | 'selected'): string {
  return `${baseClasses} ${theme.timeSlots[state]} ${theme.animations.transition} ${theme.animations.hover}`
}

export function enhanceNavigationStyling(baseClasses: string, theme: PremiumTheme): string {
  return `${baseClasses} ${theme.navigation.button} ${theme.navigation.buttonHover} ${theme.animations.transition}`
}