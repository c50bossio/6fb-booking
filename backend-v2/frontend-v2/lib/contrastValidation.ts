/**
 * WCAG Contrast Validation Utilities
 * 
 * Helps ensure all text meets accessibility contrast standards
 * and prevents dark mode contrast issues.
 */

interface ColorPair {
  background: string
  text: string
  context?: string
}

interface ContrastResult {
  ratio: number
  passesAA: boolean
  passesAAA: boolean
  recommendation?: string
}

/**
 * Converts hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Calculates relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculates contrast ratio between two colors
 */
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  if (!rgb1 || !rgb2) return 0
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  const lightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (lightest + 0.05) / (darkest + 0.05)
}

/**
 * Validates a color pair against WCAG standards
 */
export function validateContrast(
  backgroundColor: string,
  textColor: string,
  context?: string
): ContrastResult {
  const ratio = getContrastRatio(backgroundColor, textColor)
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,     // WCAG AA standard
    passesAAA: ratio >= 7,      // WCAG AAA standard
    recommendation: ratio < 4.5 
      ? `Contrast ratio ${ratio.toFixed(2)} is too low. Minimum 4.5 required for WCAG AA compliance.`
      : undefined
  }
}

/**
 * Pre-defined safe color combinations for dark mode
 */
export const SAFE_DARK_MODE_PAIRS: Record<string, ColorPair> = {
  // Text colors
  primaryText: {
    background: 'dark:bg-zinc-900',
    text: 'dark:text-white',
    context: 'Primary text on dark background'
  },
  secondaryText: {
    background: 'dark:bg-zinc-900', 
    text: 'dark:text-gray-300',
    context: 'Secondary text on dark background'
  },
  mutedText: {
    background: 'dark:bg-zinc-900',
    text: 'dark:text-gray-400', 
    context: 'Muted text on dark background'
  },
  
  // Card backgrounds
  cardDefault: {
    background: 'dark:bg-zinc-800',
    text: 'dark:text-white',
    context: 'Default card with primary text'
  },
  cardSecondary: {
    background: 'dark:bg-zinc-800',
    text: 'dark:text-gray-300',
    context: 'Default card with secondary text'
  },
  
  // Status colors
  success: {
    background: 'dark:bg-green-900/30',
    text: 'dark:text-green-300',
    context: 'Success state'
  },
  warning: {
    background: 'dark:bg-yellow-900/30',
    text: 'dark:text-yellow-300',
    context: 'Warning state'
  },
  error: {
    background: 'dark:bg-red-900/30',
    text: 'dark:text-red-300',
    context: 'Error state'
  },
  info: {
    background: 'dark:bg-blue-900/30',
    text: 'dark:text-blue-300',
    context: 'Info state'
  }
}

/**
 * Component-specific validation helpers
 */
export const ContrastValidators = {
  /**
   * Validates analytics cards that commonly have contrast issues
   */
  analyticsCard: (bgColor: string, textColor: string) => {
    const result = validateContrast(bgColor, textColor, 'Analytics Card')
    
    if (!result.passesAA) {
      console.warn(`Analytics card contrast issue: ${result.recommendation}`)
      console.warn('Consider using SAFE_DARK_MODE_PAIRS.cardDefault or cardSecondary')
    }
    
    return result
  },

  /**
   * Validates progress/metric displays
   */
  progressDisplay: (bgColor: string, textColor: string) => {
    const result = validateContrast(bgColor, textColor, 'Progress Display')
    
    if (!result.passesAA) {
      console.warn(`Progress display contrast issue: ${result.recommendation}`)
      console.warn('Use dark:bg-gray-700 with dark:text-white for progress bars')
    }
    
    return result
  },

  /**
   * Validates action item cards
   */
  actionItem: (bgColor: string, textColor: string) => {
    const result = validateContrast(bgColor, textColor, 'Action Item')
    
    if (!result.passesAA) {
      console.warn(`Action item contrast issue: ${result.recommendation}`)
      console.warn('Use dark:bg-gray-800 with dark:text-white for action items')
    }
    
    return result
  }
}

/**
 * Development helper: Audit components for contrast issues
 */
export function auditComponentContrast(componentName: string, colorPairs: ColorPair[]) {
  console.group(`🎨 Contrast Audit: ${componentName}`)
  
  let allPassed = true
  
  colorPairs.forEach((pair, index) => {
    const result = validateContrast(pair.background, pair.text, pair.context)
    
    if (result.passesAA) {
      console.log(`✅ Pair ${index + 1}: ${result.ratio} (${pair.context || 'No context'})`)
    } else {
      console.error(`❌ Pair ${index + 1}: ${result.ratio} - ${result.recommendation}`)
      allPassed = false
    }
  })
  
  console.log(allPassed ? '🎉 All color pairs pass WCAG AA standards!' : '⚠️  Some color pairs need attention')
  console.groupEnd()
  
  return allPassed
}

/**
 * Quick reference for developers
 */
export const DARK_MODE_BEST_PRACTICES = {
  backgrounds: {
    page: 'dark:bg-zinc-900',
    card: 'dark:bg-zinc-800', 
    elevated: 'dark:bg-zinc-700',
    input: 'dark:bg-zinc-800'
  },
  text: {
    primary: 'dark:text-white',
    secondary: 'dark:text-gray-300',
    muted: 'dark:text-gray-400',
    placeholder: 'dark:text-gray-500'
  },
  borders: {
    default: 'dark:border-gray-600',
    subtle: 'dark:border-gray-700',
    emphasis: 'dark:border-gray-500'
  },
  states: {
    success: 'dark:bg-green-900/30 dark:text-green-300',
    warning: 'dark:bg-yellow-900/30 dark:text-yellow-300',
    error: 'dark:bg-red-900/30 dark:text-red-300',
    info: 'dark:bg-blue-900/30 dark:text-blue-300'
  }
}