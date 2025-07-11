'use client'

import React, { useState } from 'react'
import { Zap, X, Plus } from 'lucide-react'
import QuickBookingPanel from './QuickBookingPanel'
import { useResponsive } from '@/hooks/useResponsive'

interface QuickBookingFABProps {
  onBookingComplete?: () => void
}

export default function QuickBookingFAB({ onBookingComplete }: QuickBookingFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { isMobile } = useResponsive()

  // Only show on mobile
  if (!isMobile) {
    return null
  }

  return (
    <>
      {/* FAB Button */}
      <button
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transform transition-all duration-200 ${
          isOpen 
            ? 'bg-gray-700 text-white rotate-45 scale-110' 
            : 'bg-primary-600 text-white hover:bg-primary-700 hover:scale-110'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Zap className="w-6 h-6" />
        )}
      </button>

      {/* Quick Booking Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Bottom Sheet */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[80vh] overflow-hidden transform transition-transform duration-300 ${
              isOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-2rem)]">
              <QuickBookingPanel 
                onBookingComplete={() => {
                  setIsOpen(false)
                  if (onBookingComplete) {
                    onBookingComplete()
                  }
                }}
                className="border-0 shadow-none"
              />
            </div>
          </div>
        </>
      )}

      {/* Secondary FAB for custom booking */}
      {isOpen && (
        <button
          className="fixed bottom-6 right-24 z-40 w-12 h-12 rounded-full bg-gray-600 text-white shadow-lg flex items-center justify-center hover:bg-gray-700 transform transition-all duration-200 scale-100"
          onClick={() => {
            setIsOpen(false)
            window.location.href = '/book'
          }}
        >
          <Plus className="w-5 h-5" />
        </button>
      )}
    </>
  )
}