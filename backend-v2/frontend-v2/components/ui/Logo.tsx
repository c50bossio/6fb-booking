'use client'

import React from 'react'
import Link from 'next/link'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'auto' | 'color' | 'mono' | 'color-bg'
  href?: string | null
  className?: string
  showTagline?: boolean
}

const sizeClasses = {
  xs: 'text-lg',
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl'
}

export function Logo({ 
  size = 'md', 
  variant = 'auto',
  href = '/dashboard',
  className = '',
  showTagline = false
}: LogoProps) {
  
  const logoContent = (
    <div className={`flex items-center ${className}`}>
      <div className={`font-bold text-gray-900 ${sizeClasses[size]}`}>
        BookedBarber
      </div>
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