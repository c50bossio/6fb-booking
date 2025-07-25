/**
 * Fresha-Inspired Design System for BookedBarber V2
 * Professional color palette and design tokens for premium calendar experience
 */

// Color Palette - Inspired by Fresha's sophisticated aesthetics
export const FreshaColors = {
  // Primary Colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main brand color
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Service-Based Colors (Professional Palette)
  services: {
    haircut: {
      light: '#dbeafe',
      main: '#3b82f6',
      dark: '#1d4ed8',
      text: '#1e3a8a'
    },
    beardTrim: {
      light: '#dcfce7',
      main: '#22c55e',
      dark: '#16a34a',
      text: '#15803d'
    },
    styling: {
      light: '#fed7aa',
      main: '#f97316',
      dark: '#ea580c',
      text: '#c2410c'
    },
    coloring: {
      light: '#e9d5ff',
      main: '#a855f7',
      dark: '#9333ea',
      text: '#7c3aed'
    },
    shave: {
      light: '#fce7f3',
      main: '#ec4899',
      dark: '#db2777',
      text: '#be185d'
    },
    massage: {
      light: '#ccfbf1',
      main: '#14b8a6',
      dark: '#0f766e',
      text: '#0d9488'
    },
    treatment: {
      light: '#fef3c7',
      main: '#f59e0b',
      dark: '#d97706',
      text: '#b45309'
    }
  },
  
  // Status Colors
  status: {
    confirmed: {
      light: '#dcfce7',
      main: '#22c55e',
      dark: '#16a34a'
    },
    pending: {
      light: '#fef3c7',
      main: '#f59e0b',
      dark: '#d97706'
    },
    completed: {
      light: '#f1f5f9',
      main: '#64748b',
      dark: '#475569'
    },
    cancelled: {
      light: '#fee2e2',
      main: '#ef4444',
      dark: '#dc2626'
    },
    noShow: {
      light: '#fef2f2',
      main: '#f87171',
      dark: '#ef4444'
    }
  },
  
  // Client Tier Colors
  clientTier: {
    new: {
      light: '#f8fafc',
      main: '#64748b',
      dark: '#475569',
      accent: '#e2e8f0'
    },
    regular: {
      light: '#eff6ff',
      main: '#3b82f6',
      dark: '#1d4ed8',
      accent: '#bfdbfe'
    },
    vip: {
      light: '#fffbeb',
      main: '#f59e0b',
      dark: '#d97706',
      accent: '#fed7aa'
    },
    platinum: {
      light: '#faf5ff',
      main: '#a855f7',
      dark: '#9333ea',
      accent: '#e9d5ff'
    }
  },
  
  // Neutral Grays (Professional)
  gray: {
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
  
  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    elevated: '#ffffff',
    sidebar: '#f8fafc'
  },
  
  // Border Colors
  border: {
    light: '#e2e8f0',
    main: '#cbd5e1',
    dark: '#94a3b8'
  }
}

// Typography System
export const FreshaTypography = {
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace'
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem' // 30px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75'
  }
}

// Spacing System
export const FreshaSpacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem'      // 96px
}

// Border Radius
export const FreshaBorderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px'
}

// Shadows
export const FreshaShadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  elevated: '0 8px 30px 0 rgb(0 0 0 / 0.12)'
}

// Animation & Transitions
export const FreshaAnimations = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms'
  },
  
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
}

// Calendar-Specific Design Tokens
export const FreshaCalendar = {
  // Time slot dimensions
  timeSlot: {
    height: '3rem',        // 48px - generous height for readability
    hourHeight: '4rem',    // 64px - full hour block
    minWidth: '120px',     // Minimum appointment width
    borderWidth: '1px'
  },
  
  // Staff column dimensions
  staffColumn: {
    minWidth: '200px',
    maxWidth: '280px',
    headerHeight: '80px',  // Space for avatar and name
    avatarSize: '48px'     // Professional avatar size
  },
  
  // Appointment block styling
  appointment: {
    borderRadius: FreshaBorderRadius.md,
    padding: FreshaSpacing[3],
    borderLeftWidth: '4px', // Service indicator
    shadow: FreshaShadows.sm,
    hoverShadow: FreshaShadows.md
  },
  
  // Professional spacing
  grid: {
    gap: FreshaSpacing[1],
    padding: FreshaSpacing[4],
    borderRadius: FreshaBorderRadius.lg
  }
}

// Utility Functions
export const getServiceColor = (serviceName: string) => {
  const service = serviceName.toLowerCase()
  
  if (service.includes('haircut') || service.includes('cut')) {
    return FreshaColors.services.haircut
  } else if (service.includes('beard') || service.includes('trim')) {
    return FreshaColors.services.beardTrim
  } else if (service.includes('style') || service.includes('styling')) {
    return FreshaColors.services.styling
  } else if (service.includes('color') || service.includes('dye')) {
    return FreshaColors.services.coloring
  } else if (service.includes('shave')) {
    return FreshaColors.services.shave
  } else if (service.includes('massage')) {
    return FreshaColors.services.massage
  } else if (service.includes('treatment')) {
    return FreshaColors.services.treatment
  }
  
  // Default to haircut color
  return FreshaColors.services.haircut
}

export const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase()
  
  switch (statusLower) {
    case 'confirmed':
      return FreshaColors.status.confirmed
    case 'pending':
      return FreshaColors.status.pending
    case 'completed':
      return FreshaColors.status.completed
    case 'cancelled':
      return FreshaColors.status.cancelled
    case 'no_show':
    case 'no-show':
      return FreshaColors.status.noShow
    default:
      return FreshaColors.status.pending
  }
}

export const getClientTierColor = (tier: string) => {
  const tierLower = tier.toLowerCase()
  
  switch (tierLower) {
    case 'new':
      return FreshaColors.clientTier.new
    case 'regular':
      return FreshaColors.clientTier.regular
    case 'vip':
      return FreshaColors.clientTier.vip
    case 'platinum':
      return FreshaColors.clientTier.platinum
    default:
      return FreshaColors.clientTier.regular
  }
}

// CSS-in-JS Helper
export const createFreshaStyles = (theme: 'light' | 'dark' = 'light') => ({
  // Calendar container
  calendarContainer: {
    backgroundColor: FreshaColors.background.primary,
    borderRadius: FreshaBorderRadius.lg,
    boxShadow: FreshaShadows.elevated,
    border: `1px solid ${FreshaColors.border.light}`,
    fontFamily: FreshaTypography.fontFamily.primary,
    overflow: 'hidden'
  },
  
  // Staff header
  staffHeader: {
    backgroundColor: FreshaColors.background.secondary,
    borderBottom: `1px solid ${FreshaColors.border.light}`,
    padding: FreshaSpacing[4],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: FreshaCalendar.staffColumn.headerHeight
  },
  
  // Time axis
  timeAxis: {
    backgroundColor: FreshaColors.background.secondary,
    borderRight: `1px solid ${FreshaColors.border.light}`,
    width: '80px',
    flexShrink: 0
  },
  
  // Appointment block base
  appointmentBlock: {
    borderRadius: FreshaCalendar.appointment.borderRadius,
    padding: FreshaCalendar.appointment.padding,
    boxShadow: FreshaCalendar.appointment.shadow,
    border: `1px solid ${FreshaColors.border.light}`,
    cursor: 'pointer',
    transition: `all ${FreshaAnimations.duration.normal} ${FreshaAnimations.easing.inOut}`,
    
    '&:hover': {
      boxShadow: FreshaCalendar.appointment.hoverShadow,
      transform: 'translateY(-1px)'
    }
  }
})

export default {
  colors: FreshaColors,
  typography: FreshaTypography,
  spacing: FreshaSpacing,
  borderRadius: FreshaBorderRadius,
  shadows: FreshaShadows,
  animations: FreshaAnimations,
  calendar: FreshaCalendar,
  utils: {
    getServiceColor,
    getStatusColor,
    getClientTierColor,
    createFreshaStyles
  }
}