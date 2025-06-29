'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useThemeStyles } from '@/hooks/useTheme'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'auto' | 'color' | 'mono' | 'color-bg'
  href?: string
  className?: string
  showTagline?: boolean
}

const sizeClasses = {
  xs: 'h-6',
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
  xl: 'h-16'
}

const sizePixels = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64
}

export function Logo({ 
  size = 'md', 
  variant = 'auto',
  href = '/dashboard',
  className = '',
  showTagline = false
}: LogoProps) {
  const { isDark } = useThemeStyles()
  
  // Determine which logo to use based on variant and theme
  const getLogoSrc = () => {
    switch (variant) {
      case 'color':
        return '/logos/logo-color.png'
      case 'color-bg':
        return '/logos/logo-color-bg.png'
      case 'mono':
        return isDark ? '/logos/logo-white.png' : '/logos/logo-black.png'
      case 'auto':
      default:
        return isDark ? '/logos/logo-white.png' : '/logos/logo-black.png'
    }
  }
  
  const logoSrc = getLogoSrc()
  const heightPx = sizePixels[size]
  // Aspect ratio of the logo (approximate based on the design)
  const widthPx = showTagline ? heightPx * 6 : heightPx * 5
  
  const logoImage = (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <Image
        src={logoSrc}
        alt="Booked Barber"
        width={widthPx}
        height={heightPx}
        className="h-full w-auto object-contain"
        priority
      />
    </div>
  )
  
  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoImage}
      </Link>
    )
  }
  
  return logoImage
}

// Compact logo for constrained spaces
export function LogoCompact({ 
  size = 'sm',
  variant = 'auto',
  href,
  className = ''
}: Omit<LogoProps, 'showTagline'>) {
  return (
    <Logo 
      size={size}
      variant={variant}
      href={href}
      className={className}
      showTagline={false}
    />
  )
}

// Full logo with tagline for hero sections
export function LogoFull({ 
  size = 'lg',
  variant = 'color',
  href,
  className = ''
}: Omit<LogoProps, 'showTagline'>) {
  return (
    <Logo 
      size={size}
      variant={variant}
      href={href}
      className={className}
      showTagline={true}
    />
  )
}