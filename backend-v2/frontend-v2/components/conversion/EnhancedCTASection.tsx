'use client'

import React from 'react'

export interface EnhancedCTASectionProps {
  children?: React.ReactNode
  title?: string
  subtitle?: string
  ctaText?: string
  ctaLink?: string
}

export function EnhancedCTASection({ children, title, subtitle, ctaText, ctaLink }: EnhancedCTASectionProps) {
  return (
    <section className="w-full py-8">
      {title && <h2 className="text-3xl font-bold text-center">{title}</h2>}
      {subtitle && <p className="text-lg text-gray-600 text-center mt-4">{subtitle}</p>}
      {children}
    </section>
  )
}