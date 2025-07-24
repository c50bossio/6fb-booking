'use client'

import React from 'react'

export interface EnhancedMobileCTAProps {
  children?: React.ReactNode
  ctaText?: string
  ctaLink?: string
  show?: boolean
}

export function EnhancedMobileCTA({ children, ctaText, ctaLink, show = true }: EnhancedMobileCTAProps) {
  if (!show) return null
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden z-50">
      {children}
    </div>
  )
}