'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSwipeable } from 'react-swipeable'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  ScissorsIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'
import BookingFlow from './BookingFlow'
import type { Service } from '@/lib/api/services'

interface MobileBookingFlowProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (bookingData: any) => void
  selectedDate?: string
  selectedTime?: string
  theme?: 'light' | 'dark'
  services?: Service[]
  barbers?: any[]
  workingHours?: { start: string; end: string }
  timeSlotDuration?: number
}

export default function MobileBookingFlow(props: MobileBookingFlowProps) {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle scroll for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 200)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Swipe handlers for mobile step navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // Move to next step
      const nextButton = document.querySelector('[data-testid="booking-next-button"]') as HTMLButtonElement
      if (nextButton && !nextButton.disabled) {
        nextButton.click()
      }
    },
    onSwipedRight: () => {
      // Move to previous step
      const prevButton = document.querySelector('[data-testid="booking-prev-button"]') as HTMLButtonElement
      if (prevButton && !prevButton.disabled) {
        prevButton.click()
      }
    },
    trackMouse: false,
    trackTouch: true,
    delta: 50
  })

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!isMobile) {
    // For desktop, use the regular booking flow
    return <BookingFlow {...props} />
  }

  return (
    <>
      {/* Mobile-optimized wrapper */}
      <div className="fixed inset-0 z-50 md:hidden" {...swipeHandlers}>
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-[#1A1B23] border-b border-gray-200 dark:border-[#2C2D3A] z-60 shadow-sm">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={props.onClose}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#24252E] transition-colors"
              aria-label="Close booking"
            >
              <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-[#8B92A5]" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Book Appointment</h2>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Mobile Progress Bar */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-[#8B92A5]">Step {currentStep + 1} of 6</span>
              <span className="text-xs text-gray-500 dark:text-[#8B92A5]">{Math.round(((currentStep + 1) / 6) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-[#2C2D3A] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#20D9D2] rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStep + 1) / 6) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Content Area with padding for fixed header */}
        <div className="pt-24 pb-20 h-full overflow-y-auto">
          <BookingFlow
            {...props}
            isOpen={true}
            theme={props.theme}
          />
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1A1B23] border-t border-gray-200 dark:border-[#2C2D3A] z-60 safe-area-inset-bottom">
          <div className="flex items-center justify-between p-4 gap-4">
            <button
              data-testid="booking-prev-button"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                currentStep === 0
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-[#24252E] text-gray-400'
                  : 'bg-gray-100 dark:bg-[#24252E] text-gray-700 dark:text-[#8B92A5] active:scale-95'
              }`}
            >
              <ChevronLeftIcon className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              data-testid="booking-next-button"
              onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-[#20D9D2] text-white text-sm font-medium rounded-lg transition-all active:scale-95"
            >
              <span>{currentStep === 5 ? 'Confirm' : 'Next'}</span>
              {currentStep === 5 ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Back to Top Button */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={scrollToTop}
              className="fixed bottom-24 right-4 p-3 bg-[#20D9D2] text-white rounded-full shadow-lg z-50 active:scale-95"
              aria-label="Back to top"
            >
              <ArrowUpIcon className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop fallback */}
      <div className="hidden md:block">
        <BookingFlow {...props} />
      </div>
    </>
  )
}
