'use client'

import React from 'react'

export interface EnhancedSocialProofProps {
  children?: React.ReactNode
  testimonials?: any[]
  stats?: any[]
}

export function EnhancedSocialProof({ children, testimonials, stats }: EnhancedSocialProofProps) {
  return (
    <section className="w-full py-8">
      {children}
    </section>
  )
}