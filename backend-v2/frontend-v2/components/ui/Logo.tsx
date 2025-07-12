'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'auto' | 'color' | 'mono' | 'color-bg' | 'white'
  href?: string | null
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

export function Logo({ 
  size = 'md', 
  variant = 'auto',
  href = '/dashboard',
  className = '',
  showTagline = false
}: LogoProps) {
  
  // Determine which logo to use based on variant
  const getLogoSrc = () => {
    switch (variant) {
      case 'white':
        return '/logos/logo-white.png'
      case 'mono':
        return '/logos/logo-black.png'
      case 'color-bg':
        return '/logos/logo-color-bg.png'
      case 'color':
      case 'auto':
      default:
        return '/logos/logo-color.png'
    }
  }

  const logoContent = (
    <div className={`flex items-center ${className}`}>
      <Image
        src={getLogoSrc()}
        alt="BookedBarber"
        width={150}
        height={40}
        className={`${sizeClasses[size]} w-auto`}
        priority
      />
      {showTagline && (
        <span className="ml-2 text-sm text-gray-500 font-medium">
          V2
        </span>
      )}
    </div>
  )

  if (href === null) {
    return logoContent
  }

  return (
    <Link href={href}>
      {logoContent}
    </Link>
  )
}

// Simplified LogoFull component for compatibility
export function LogoFull(props: LogoProps) {
  return <Logo {...props} showTagline />
}