'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  StarIcon,
  PlayIcon,
  CheckIcon,
  UserPlusIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

/**
 * Centralized CTA (Call-to-Action) System
 * 
 * This component provides a single source of truth for all CTAs across the application.
 * It enforces consistency and prevents duplicate/conflicting buttons.
 * 
 * IMPORTANT: This is the ONLY place where CTA configurations should be defined.
 * Do not create hardcoded CTAs elsewhere in the application.
 */

// ==================== CTA CONFIGURATION ====================
// This is the single source of truth for all CTAs

export interface CTAConfig {
  id: string
  label: string
  href: string
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'glass'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  elevated?: boolean
  icon?: React.ComponentType<{ className?: string }>
  description?: string
  analytics?: string
  enabled: boolean
  priority: number // Lower number = higher priority
}

const CTA_CONFIGS: Record<string, CTAConfig> = {
  // Primary registration CTA
  register: {
    id: 'register',
    label: '14 Day Free Trial - Sign Up Now',
    href: '/register',
    variant: 'primary',
    size: 'lg',
    elevated: true,
    description: 'Start your 14-day free trial and build your six-figure barber business',
    analytics: 'register_primary',
    enabled: true,
    priority: 1
  },
  
  // Secondary login CTA
  login: {
    id: 'login',
    label: 'Login',
    href: '/login',
    variant: 'outline',
    size: 'md',
    description: 'Sign in to your existing account',
    analytics: 'login_secondary',
    enabled: true,
    priority: 2
  },
  
  // Logout CTA (for authenticated users)
  logout: {
    id: 'logout',
    label: 'Logout',
    href: '#', // Will be handled by onClick
    variant: 'ghost',
    size: 'md',
    icon: ArrowRightOnRectangleIcon,
    description: 'Sign out of your account',
    analytics: 'logout_action',
    enabled: true,
    priority: 1
  },
  
  // Demo CTA (DISABLED - as per consolidation plan)
  demo: {
    id: 'demo',
    label: 'Try Live Demo',
    href: '/demo',
    variant: 'secondary',
    icon: PlayIcon,
    description: 'Experience the platform without signing up',
    analytics: 'demo_try',
    enabled: false, // DISABLED to prevent confusion
    priority: 99
  },
  
  // Alternative trial CTA (DISABLED - duplicate of register)
  trial_alt: {
    id: 'trial_alt',
    label: 'Start 14-Day Free Trial',
    href: '/register',
    variant: 'outline',
    description: 'Alternative trial CTA',
    analytics: 'trial_alt',
    enabled: false, // DISABLED - use 'register' instead
    priority: 99
  }
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validates that a CTA ID exists and is enabled
 */
export function validateCTA(ctaId: string): boolean {
  const config = CTA_CONFIGS[ctaId]
  return config && config.enabled
}

/**
 * Gets all enabled CTAs sorted by priority
 */
export function getEnabledCTAs(): CTAConfig[] {
  return Object.values(CTA_CONFIGS)
    .filter(cta => cta.enabled)
    .sort((a, b) => a.priority - b.priority)
}

/**
 * Gets CTA configuration by ID
 */
export function getCTAConfig(ctaId: string): CTAConfig | null {
  const config = CTA_CONFIGS[ctaId]
  return config && config.enabled ? config : null
}

// ==================== ROUTE VALIDATION ====================

/**
 * Validates that all CTA routes exist
 * Call this during build to catch broken links
 */
export function validateCTARoutes(): string[] {
  const errors: string[] = []
  
  Object.values(CTA_CONFIGS).forEach(cta => {
    if (cta.enabled) {
      // Check for obviously broken routes
      if (cta.href.includes('/auth/signup')) {
        errors.push(`CTA '${cta.id}' links to non-existent route: ${cta.href}`)
      }
      if (cta.href === '/demo' && cta.enabled) {
        errors.push(`CTA '${cta.id}' links to disabled demo route: ${cta.href}`)
      }
    }
  })
  
  return errors
}

// ==================== COMPONENT INTERFACES ====================

export interface CTAButtonProps {
  ctaId: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showIcon?: boolean
  children?: React.ReactNode // Override label if needed
  onLogout?: () => Promise<void> // For logout button functionality
}

export interface CTAGroupProps {
  ctaIds: string[]
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'tight' | 'normal' | 'loose'
  className?: string
  onLogout?: () => Promise<void> // For logout button functionality
}

// ==================== CORE COMPONENTS ====================

/**
 * Single CTA Button Component
 * 
 * Usage: <CTAButton ctaId="register" />
 */
export function CTAButton({ 
  ctaId, 
  size, 
  className = '', 
  showIcon = true,
  children,
  onLogout
}: CTAButtonProps) {
  const config = getCTAConfig(ctaId)
  
  if (!config) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`CTA '${ctaId}' is not enabled or does not exist`)
      return (
        <div className="p-2 bg-red-100 text-red-700 rounded text-sm">
          Error: CTA '{ctaId}' not found
        </div>
      )
    }
    return null
  }
  
  const IconComponent = config.icon
  const effectiveSize = size || config.size || 'md'
  
  // Helper function to render label with bold text support
  const renderLabel = (label: string) => {
    // Check if label contains **bold** markdown
    if (label.includes('**')) {
      const parts = label.split('**')
      return (
        <>
          {parts.map((part, index) => 
            index % 2 === 1 ? <strong key={index}>{part}</strong> : part
          )}
        </>
      )
    }
    return label
  }
  
  // Handle logout button specially
  if (ctaId === 'logout') {
    return (
      <Button 
        variant={config.variant} 
        size={effectiveSize}
        elevated={config.elevated}
        className={`${className} group`}
        data-analytics={config.analytics}
        leftIcon={showIcon && IconComponent ? <IconComponent /> : undefined}
        onClick={onLogout}
      >
        {children || renderLabel(config.label)}
      </Button>
    )
  }
  
  // Regular CTA buttons with links
  return (
    <Link href={config.href}>
      <Button 
        variant={config.variant} 
        size={effectiveSize}
        elevated={config.elevated}
        className={`${className} group`}
        data-analytics={config.analytics}
        leftIcon={showIcon && IconComponent ? <IconComponent /> : undefined}
      >
        {children || renderLabel(config.label)}
      </Button>
    </Link>
  )
}

/**
 * CTA Group Component
 * 
 * Usage: <CTAGroup ctaIds={['register', 'login']} />
 */
export function CTAGroup({ 
  ctaIds, 
  orientation = 'horizontal', 
  spacing = 'normal',
  className = '',
  onLogout
}: CTAGroupProps) {
  const validCTAs = ctaIds
    .map(id => getCTAConfig(id))
    .filter(Boolean) as CTAConfig[]
  
  if (validCTAs.length === 0) {
    return null
  }
  
  const spacingClasses = {
    tight: orientation === 'horizontal' ? 'gap-2' : 'gap-1',
    normal: orientation === 'horizontal' ? 'gap-4' : 'gap-2',
    loose: orientation === 'horizontal' ? 'gap-6' : 'gap-4'
  }
  
  const orientationClasses = orientation === 'horizontal' 
    ? 'flex flex-col sm:flex-row justify-center'
    : 'flex flex-col'
  
  return (
    <div className={`${orientationClasses} ${spacingClasses[spacing]} ${className}`}>
      {validCTAs.map(cta => (
        <CTAButton 
          key={cta.id} 
          ctaId={cta.id}
          showIcon={true}
          onLogout={onLogout}
        />
      ))}
    </div>
  )
}

// ==================== SPECIALIZED COMPONENTS ====================

/**
 * Header CTAs - Optimized for navigation
 * Authentication-aware: shows login/register for guests, logout for authenticated users
 */
export function HeaderCTAs({ className = '' }: { className?: string }) {
  return (
    <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
      <CTAButton ctaId="login" size="md" showIcon={false} />
      <CTAButton ctaId="register" size="md" showIcon={true} />
    </nav>
  )
}

/**
 * Authentication-Aware Header CTAs
 * Shows different CTAs based on authentication state
 */
export function AuthHeaderCTAs({ className = '' }: { className?: string }) {
  // This will be imported and used by pages that need auth-aware CTAs
  return (
    <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
      {/* This component will be enhanced with auth state checking */}
      <CTAButton ctaId="login" size="md" showIcon={false} />
      <CTAButton ctaId="register" size="md" showIcon={true} />
    </nav>
  )
}

/**
 * Hero CTAs - Primary call-to-action section
 */
export function HeroCTAs({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <CTAButton ctaId="register" size="xl" showIcon={true} />
    </div>
  )
}

/**
 * Footer CTAs - Secondary actions
 */
export function FooterCTAs({ className = '' }: { className?: string }) {
  return (
    <CTAGroup 
      ctaIds={['register', 'login']} 
      orientation="vertical"
      spacing="tight"
      className={className}
    />
  )
}

// ==================== DEVELOPMENT UTILITIES ====================

/**
 * CTA Debug Panel - Shows all CTAs for development
 * Only renders in development mode
 */
export function CTADebugPanel() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  const enabledCTAs = getEnabledCTAs()
  const routeErrors = validateCTARoutes()
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">CTA Debug Panel</h3>
      
      <div className="mb-2">
        <strong>Enabled CTAs:</strong>
        <ul className="ml-2">
          {enabledCTAs.map(cta => (
            <li key={cta.id} className="text-green-400">
              {cta.id}: {cta.label} → {cta.href}
            </li>
          ))}
        </ul>
      </div>
      
      {routeErrors.length > 0 && (
        <div>
          <strong className="text-red-400">Route Errors:</strong>
          <ul className="ml-2">
            {routeErrors.map((error, i) => (
              <li key={i} className="text-red-400">{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ==================== ANALYTICS INTEGRATION ====================

/**
 * Track CTA click event
 */
export function trackCTAClick(ctaId: string, additionalData?: Record<string, any>) {
  const config = getCTAConfig(ctaId)
  if (!config) return
  
  // Integration with analytics service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'cta_click', {
      cta_id: ctaId,
      cta_label: config.label,
      cta_destination: config.href,
      ...additionalData
    })
  }
  
  // Console log for development
  if (process.env.NODE_ENV === 'development') {
    console.log('CTA Click:', { ctaId, config, additionalData })
  }
}

// ==================== EXPORTS ====================

export default {
  CTAButton,
  CTAGroup,
  HeaderCTAs,
  HeroCTAs,
  FooterCTAs,
  validateCTA,
  getEnabledCTAs,
  getCTAConfig,
  validateCTARoutes,
  trackCTAClick,
  CTADebugPanel
}