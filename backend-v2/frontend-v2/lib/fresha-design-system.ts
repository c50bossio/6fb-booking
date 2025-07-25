/**
 * Fresha-Inspired Design System for BookedBarber V2
 * Re-exports from premium-design-system with Fresha naming convention
 */

import {
  PremiumColors,
  PremiumTypography,
  PremiumSpacing,
  PremiumBorderRadius,
  PremiumShadows,
  PremiumAnimations,
  PremiumCalendar,
  getServiceColor,
  getStatusColor,
  getClientTierColor,
  createPremiumStyles
} from './premium-design-system'

// Re-export with Fresha naming convention
export const FreshaColors = PremiumColors
export const FreshaTypography = PremiumTypography
export const FreshaSpacing = PremiumSpacing
export const FreshaBorderRadius = PremiumBorderRadius
export const FreshaShadows = PremiumShadows
export const FreshaAnimations = PremiumAnimations
export const FreshaCalendar = PremiumCalendar

// Re-export utility functions
export {
  getServiceColor,
  getStatusColor,
  getClientTierColor,
  createPremiumStyles
}

// Default export
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
    createPremiumStyles
  }
}