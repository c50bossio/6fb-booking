'use client'

import React from 'react'
import { AccessibleButton } from '@/lib/accessibility-helpers'

interface CTAButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  href?: string
}

export function CTAButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '',
  onClick,
  href
}: CTAButtonProps) {
  return (
    <AccessibleButton
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
    >
      {children}
    </AccessibleButton>
  )
}

interface CTAGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function CTAGroup({ 
  children, 
  className = '',
  orientation = 'horizontal'
}: CTAGroupProps) {
  const orientationClasses = orientation === 'horizontal' 
    ? 'flex flex-row gap-4' 
    : 'flex flex-col gap-3'

  return (
    <div className={`${orientationClasses} ${className}`}>
      {children}
    </div>
  )
}

// Footer CTAs component
export function FooterCTAs({ className = '' }: { className?: string }) {
  return (
    <div className={`text-center py-8 ${className}`}>
      <CTAGroup>
        <CTAButton variant="primary" size="lg">
          Start Free Trial
        </CTAButton>
        <CTAButton variant="secondary" size="lg">
          Book Demo
        </CTAButton>
      </CTAGroup>
    </div>
  )
}

// Debug panel for CTA testing (simplified)
export function CTADebugPanel() {
  return null // Hidden in production
}