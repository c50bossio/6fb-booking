'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useThemeStyles } from '@/hooks/useTheme'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'auto' | 'color' | 'mono' | 'color-bg'
  href?: string | null
  className?: string
  showTagline?: boolean
}

const sizeClasses = {
  xs: 'h-8',
  sm: 'h-10',
  md: 'h-13',
  lg: 'h-16',
  xl: 'h-20'
}

const sizePixels = {
  xs: 31,
  sm: 42,
  md: 52,
  lg: 62,
  xl: 83
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
    <div 
      className={`relative ${sizeClasses[size]} ${className} transition-all duration-300 hover:scale-105`}
      style={{
        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.06))',
      }}
    >
      <Image
        src={logoSrc}
        alt="Booked Barber"
        width={widthPx}
        height={heightPx}
        className="h-full object-contain transition-all duration-300"
        style={{ 
          width: 'auto',
          filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))'
        }}
        priority
      />
    </div>
  )
  
  if (href && href !== null) {
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
  className = '',
  noLink = false
}: Omit<LogoProps, 'showTagline'> & { noLink?: boolean }) {
  return (
    <Logo 
      size={size}
      variant={variant}
      href={noLink ? null : href}
      className={className}
      showTagline={true}
    />
  )
}