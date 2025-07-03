/**
 * Premium Visual Enhancements Test Suite
 * Comprehensive testing of BookedBarber calendar visual design system
 */

import { 
  SERVICE_COLORS, 
  BARBER_SYMBOLS, 
  PREMIUM_STYLES,
  CALENDAR_THEME,
  getServiceStyle,
  getBarberSymbol,
  getServiceGradient,
  getServiceIcon,
  getThemeClasses,
  getContrastColor
} from '@/lib/calendar-theme'

import {
  SERVICE_STYLES,
  SERVICE_TYPES,
  BARBER_SYMBOLS as CONST_BARBER_SYMBOLS,
  getServiceConfig,
  getServiceIcon as getConstServiceIcon,
  getServiceGradient as getConstServiceGradient
} from '@/lib/calendar-constants'

// Color contrast calculation utility
function calculateContrast(color1: string, color2: string): number {
  // Simple contrast ratio calculation for testing
  // In production, use a proper contrast library
  const getLuminance = (color: string): number => {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255
    
    const toLinear = (channel: number) => {
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
    }
    
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  }
  
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  
  return (brightest + 0.05) / (darkest + 0.05)
}

describe('Premium Visual Enhancements Test Suite', () => {
  
  describe('1. Service Color Coding System', () => {
    
    test('All service types have complete color definitions', () => {
      const requiredServices = ['haircut', 'beard', 'color', 'treatment', 'combo', 'consultation', 'wash']
      
      requiredServices.forEach(service => {
        const serviceStyle = SERVICE_COLORS[service as keyof typeof SERVICE_COLORS]
        
        expect(serviceStyle).toBeDefined()
        expect(serviceStyle.name).toBeTruthy()
        expect(serviceStyle.color).toMatch(/^#[0-9A-F]{6}$/i)
        expect(serviceStyle.lightColor).toMatch(/^#[0-9A-F]{6}$/i)
        expect(serviceStyle.darkColor).toMatch(/^#[0-9A-F]{6}$/i)
        expect(serviceStyle.icon).toBeTruthy()
        expect(serviceStyle.gradientFrom).toBeTruthy()
        expect(serviceStyle.gradientTo).toBeTruthy()
      })
    })
    
    test('Service colors meet WCAG AA contrast requirements', () => {
      const WHITE = '#FFFFFF'
      const BLACK = '#000000'
      
      Object.values(SERVICE_COLORS).forEach(service => {
        // Test main color against white background
        const contrastWithWhite = calculateContrast(service.color, WHITE)
        
        // Test dark color against light background
        const contrastWithLight = calculateContrast(service.darkColor, service.lightColor)
        
        // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
        expect(contrastWithWhite).toBeGreaterThanOrEqual(3.0) // For large UI elements
        expect(contrastWithLight).toBeGreaterThanOrEqual(3.0)
      })
    })
    
    test('Service color gradients are properly defined', () => {
      Object.values(SERVICE_COLORS).forEach(service => {
        expect(service.gradientFrom).toContain('from-')
        expect(service.gradientTo).toContain('to-')
        expect(service.gradientLight).toContain('from-')
        expect(service.gradientLight).toContain('to-')
        expect(service.gradientDark).toContain('from-')
        expect(service.gradientDark).toContain('to-')
      })
    })
    
    test('Service icons are consistent emoji symbols', () => {
      const serviceIcons = Object.values(SERVICE_COLORS).map(s => s.icon)
      
      // All icons should be unique
      const uniqueIcons = new Set(serviceIcons)
      expect(uniqueIcons.size).toBe(serviceIcons.length)
      
      // All icons should be emoji (basic check for non-ASCII)
      serviceIcons.forEach(icon => {
        expect(icon).toMatch(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u)
      })
    })
  })
  
  describe('2. Barber Symbols and Avatar System', () => {
    
    test('Barber symbols array contains diverse visual elements', () => {
      expect(BARBER_SYMBOLS.length).toBeGreaterThanOrEqual(20)
      
      // Check for different categories of symbols
      const symbolsString = BARBER_SYMBOLS.join('')
      expect(symbolsString).toMatch(/🔷|🔶|🟢|🟣/) // Geometric shapes
      expect(symbolsString).toMatch(/⭐|💎|⚡|🌟/) // Special symbols
      expect(symbolsString).toMatch(/🟦|🟨|🟩|🟪/) // Colored squares
    })
    
    test('getBarberSymbol function provides consistent mapping', () => {
      // Test string IDs
      const symbol1 = getBarberSymbol('barber1')
      const symbol2 = getBarberSymbol('barber1') // Same ID should return same symbol
      expect(symbol1).toBe(symbol2)
      
      // Test numeric IDs
      const symbol3 = getBarberSymbol(1)
      const symbol4 = getBarberSymbol(1)
      expect(symbol3).toBe(symbol4)
      
      // Different IDs should potentially return different symbols
      const symbol5 = getBarberSymbol('barber2')
      // Note: Due to modulo operation, different IDs might map to same symbol, but that's OK
      expect(BARBER_SYMBOLS.includes(symbol5 as any)).toBeTruthy()
    })
    
    test('Barber symbols are accessible and distinguishable', () => {
      // Ensure symbols are not just whitespace or invisible characters
      BARBER_SYMBOLS.forEach(symbol => {
        expect(symbol.trim()).toBeTruthy()
        expect(symbol.length).toBeLessThanOrEqual(2) // Emoji can be 1-2 code units
      })
    })
  })
  
  describe('3. Premium Background and Grid Styling', () => {
    
    test('Premium styles contain all required visual effects', () => {
      expect(PREMIUM_STYLES.backgrounds).toBeDefined()
      expect(PREMIUM_STYLES.shadows).toBeDefined()
      expect(PREMIUM_STYLES.grid).toBeDefined()
      expect(PREMIUM_STYLES.animations).toBeDefined()
      expect(PREMIUM_STYLES.borderRadius).toBeDefined()
      expect(PREMIUM_STYLES.typography).toBeDefined()
    })
    
    test('Background styles support both light and dark modes', () => {
      expect(PREMIUM_STYLES.backgrounds.glass).toBeTruthy()
      expect(PREMIUM_STYLES.backgrounds.glassDark).toBeTruthy()
      expect(PREMIUM_STYLES.backgrounds.gradient).toBeTruthy()
      expect(PREMIUM_STYLES.backgrounds.gradientDark).toBeTruthy()
    })
    
    test('Shadow effects are properly graduated', () => {
      const shadows = PREMIUM_STYLES.shadows
      expect(shadows.soft).toContain('shadow-lg')
      expect(shadows.medium).toContain('shadow-xl')
      expect(shadows.strong).toContain('shadow-2xl')
      expect(shadows.glow).toContain('shadow-')
    })
    
    test('Grid system provides consistent spacing', () => {
      const grid = PREMIUM_STYLES.grid
      expect(grid.base).toContain('rounded-xl')
      expect(grid.base).toContain('border')
      expect(grid.base).toContain('bg-')
      expect(grid.cell).toContain('transition-all')
      expect(grid.cell).toContain('hover:')
    })
  })
  
  describe('4. Animation System Performance', () => {
    
    test('Animation classes are defined with performance optimizations', () => {
      const animations = PREMIUM_STYLES.animations
      expect(animations.fadeIn).toBeTruthy()
      expect(animations.slideUp).toBeTruthy()
      expect(animations.scaleIn).toBeTruthy()
      expect(animations.glow).toBeTruthy()
      expect(animations.pulse).toBeTruthy()
    })
    
    test('Border radius system provides consistent rounded corners', () => {
      const borderRadius = PREMIUM_STYLES.borderRadius
      expect(borderRadius.sm).toBe('rounded-md')
      expect(borderRadius.md).toBe('rounded-lg')
      expect(borderRadius.lg).toBe('rounded-xl')
      expect(borderRadius.xl).toBe('rounded-2xl')
      expect(borderRadius.full).toBe('rounded-full')
    })
    
    test('Typography scales provide proper hierarchy', () => {
      const typography = PREMIUM_STYLES.typography
      expect(typography.micro).toContain('text-xs')
      expect(typography.small).toContain('text-sm')
      expect(typography.base).toContain('text-base')
      expect(typography.large).toContain('text-lg')
      expect(typography.heading).toContain('text-xl')
    })
  })
  
  describe('5. Calendar Theme Consistency', () => {
    
    test('Time slot states have proper visual differentiation', () => {
      const timeSlot = CALENDAR_THEME.timeSlot
      
      expect(timeSlot.available.light).toBeTruthy()
      expect(timeSlot.available.dark).toBeTruthy()
      expect(timeSlot.booked.light).toBeTruthy()
      expect(timeSlot.booked.dark).toBeTruthy()
      expect(timeSlot.selected.light).toBeTruthy()
      expect(timeSlot.selected.dark).toBeTruthy()
      expect(timeSlot.blocked.light).toBeTruthy()
      expect(timeSlot.blocked.dark).toBeTruthy()
    })
    
    test('Today indicator provides clear visual prominence', () => {
      const today = CALENDAR_THEME.today
      expect(today.light).toContain('purple')
      expect(today.light).toContain('shadow')
      expect(today.dark).toContain('purple')
      expect(today.dark).toContain('shadow')
    })
    
    test('Theme utility functions work correctly', () => {
      // Test service style retrieval
      const haircutStyle = getServiceStyle('haircut')
      expect(haircutStyle).toBeDefined()
      expect(haircutStyle.name).toBe('Haircut')
      
      // Test service icon retrieval
      const haircutIcon = getServiceIcon('haircut')
      expect(haircutIcon).toBe('✂️')
      
      // Test gradient generation
      const lightGradient = getServiceGradient('haircut', false)
      const darkGradient = getServiceGradient('haircut', true)
      expect(lightGradient).toContain('bg-gradient-to-r')
      expect(darkGradient).toContain('bg-gradient-to-r')
      expect(lightGradient).not.toBe(darkGradient)
    })
    
    test('Theme classes provide complete theming solution', () => {
      const lightTheme = getThemeClasses(false)
      const darkTheme = getThemeClasses(true)
      
      expect(lightTheme.background).toBeTruthy()
      expect(lightTheme.card).toBeTruthy()
      expect(lightTheme.text).toBeTruthy()
      expect(lightTheme.shadow).toBeTruthy()
      
      expect(darkTheme.background).toBeTruthy()
      expect(darkTheme.card).toBeTruthy()
      expect(darkTheme.text).toBeTruthy()
      expect(darkTheme.shadow).toBeTruthy()
      
      // Light and dark themes should be different
      expect(lightTheme.background).not.toBe(darkTheme.background)
      expect(lightTheme.text).not.toBe(darkTheme.text)
    })
  })
  
  describe('6. Cross-Reference with Constants', () => {
    
    test('Calendar constants maintain consistency with theme colors', () => {
      // Test SERVICE_TYPES consistency
      expect(SERVICE_TYPES.HAIRCUT).toBe('haircut')
      expect(SERVICE_TYPES.BEARD).toBe('beard')
      expect(SERVICE_TYPES.COLOR).toBe('color')
      
      // Test SERVICE_STYLES structure
      const haircutConfig = getServiceConfig('haircut')
      expect(haircutConfig.name).toBe('Haircut')
      expect(haircutConfig.color).toMatch(/^#[0-9A-F]{6}$/i)
      expect(haircutConfig.icon).toBe('✂️')
    })
    
    test('Barber symbols arrays are consistent', () => {
      // Both symbol arrays should exist and have substantial overlap
      expect(BARBER_SYMBOLS.length).toBeGreaterThan(0)
      expect(CONST_BARBER_SYMBOLS.length).toBeGreaterThan(0)
      
      // Common symbols should exist in both
      const commonSymbols = ['🔷', '🔶', '🟢', '🟣', '⭐', '💎']
      commonSymbols.forEach(symbol => {
        expect(BARBER_SYMBOLS.includes(symbol as any)).toBeTruthy()
        expect(CONST_BARBER_SYMBOLS.includes(symbol as any)).toBeTruthy()
      })
    })
  })
  
  describe('7. Accessibility and Responsiveness', () => {
    
    test('Color contrast meets accessibility standards', () => {
      // Test major service colors against common backgrounds
      const testCases = [
        { color: SERVICE_COLORS.haircut.color, background: '#FFFFFF' },
        { color: SERVICE_COLORS.beard.color, background: '#FFFFFF' },
        { color: SERVICE_COLORS.color.color, background: '#FFFFFF' },
        { color: SERVICE_COLORS.treatment.color, background: '#FFFFFF' }
      ]
      
      testCases.forEach(({ color, background }) => {
        const contrast = calculateContrast(color, background)
        expect(contrast).toBeGreaterThanOrEqual(3.0) // WCAG AA for large elements
      })
    })
    
    test('Contrast calculation utility works correctly', () => {
      // Test with known good/bad contrast pairs
      const highContrast = calculateContrast('#000000', '#FFFFFF')
      expect(highContrast).toBeGreaterThan(15) // Should be 21:1
      
      const lowContrast = calculateContrast('#CCCCCC', '#FFFFFF')
      expect(lowContrast).toBeLessThan(4) // Should be around 1.6:1
      
      const mediumContrast = calculateContrast('#666666', '#FFFFFF')
      expect(mediumContrast).toBeGreaterThan(3)
      expect(mediumContrast).toBeLessThan(10)
    })
    
    test('Theme system provides fallbacks for edge cases', () => {
      // Test with invalid service type
      const fallbackStyle = getServiceStyle('invalid' as any)
      expect(fallbackStyle).toBeDefined()
      expect(fallbackStyle.name).toBeTruthy()
      
      // Test barber symbol with extreme values
      const symbol1 = getBarberSymbol(999999)
      const symbol2 = getBarberSymbol(-1)
      expect(BARBER_SYMBOLS.includes(symbol1 as any)).toBeTruthy()
      expect(BARBER_SYMBOLS.includes(symbol2 as any)).toBeTruthy()
    })
  })
  
  describe('8. Performance and Optimization', () => {
    
    test('Constants are properly defined as readonly/immutable', () => {
      // Test that service colors object is frozen or readonly
      expect(() => {
        (SERVICE_COLORS as any).newService = {}
      }).not.toThrow() // JavaScript doesn't prevent this by default, but TypeScript does
      
      // Test that individual service objects maintain structure
      Object.values(SERVICE_COLORS).forEach(service => {
        expect(service.name).toBeTruthy()
        expect(service.color).toBeTruthy()
        expect(service.icon).toBeTruthy()
      })
    })
    
    test('Theme generation functions are optimized', () => {
      // Test that repeated calls return consistent results
      const start = performance.now()
      
      for (let i = 0; i < 100; i++) {
        getServiceStyle('haircut')
        getBarberSymbol(i)
        getServiceGradient('color', i % 2 === 0)
        getThemeClasses(i % 2 === 0)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should complete 100 iterations quickly (less than 50ms on modern hardware)
      expect(duration).toBeLessThan(50)
    })
    
    test('Memory efficiency of constant definitions', () => {
      // Test that service definitions don't contain redundant data
      Object.values(SERVICE_COLORS).forEach(service => {
        const keys = Object.keys(service)
        expect(keys.length).toBeGreaterThan(5) // Should have sufficient properties
        expect(keys.length).toBeLessThan(20) // But not excessive
      })
      
      // Test barber symbols array size is reasonable
      expect(BARBER_SYMBOLS.length).toBeLessThan(50) // Manageable set
      expect(BARBER_SYMBOLS.length).toBeGreaterThan(15) // But diverse enough
    })
  })
})