'use client'

import React from 'react'

export interface EnhancedHeroSectionProps {
  children?: React.ReactNode
  title?: string
  subtitle?: string
}

export function EnhancedHeroSection({ children, title, subtitle }: EnhancedHeroSectionProps) {
  return (
    <section className="w-full">
      {title && <h1 className="text-4xl font-bold">{title}</h1>}
      {subtitle && <p className="text-xl text-gray-600">{subtitle}</p>}
      {children}
    </section>
  )
}