'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowRightIcon, 
  XMarkIcon, 
  SparklesIcon, 
  CurrencyDollarIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useConversionTracking, ConversionEventType } from '@/components/tracking/ConversionTracker'

interface EnhancedMobileCTAProps {
  variant?: 'standard' | 'urgency' | 'value' | 'minimal'
  showOnScroll?: boolean
  scrollThreshold?: number
  className?: string
  onDismiss?: () => void
}

interface MobileCTAState {
  isVisible: boolean
  isDismissed: boolean
  scrollProgress: number
}

function CountdownTimer({ compact = true }: { compact?: boolean }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 47, seconds: 32 })
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { hours, minutes, seconds } = prev
        
        seconds--
        if (seconds < 0) {
          seconds = 59
          minutes--
          if (minutes < 0) {
            minutes = 59
            hours--
            if (hours < 0) {
              hours = 2
              minutes = 59
              seconds = 59
            }
          }
        }
        
        return { hours, minutes, seconds }
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  if (compact) {
    return (
      <span className="font-mono text-xs font-bold text-red-300">
        {timeLeft.hours}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    )
  }
  
  return (
    <div className="flex items-center space-x-1 text-xs">
      <ClockIcon className="w-3 h-3 text-red-300" />
      <span className="font-mono font-bold text-red-300">
        {timeLeft.hours}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  )
}

function ScrollProgress({ progress }: { progress: number }) {
  return (
    <div className="absolute top-0 left-0 right-0 h-1 bg-black/10">
      <div 
        className="h-full bg-primary-400 transition-all duration-300 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  )
}

export function EnhancedMobileCTA({
  variant = 'standard',
  showOnScroll = true,
  scrollThreshold = 0.3,
  className = '',
  onDismiss
}: EnhancedMobileCTAProps) {
  const [state, setState] = useState<MobileCTAState>({
    isVisible: false,
    isDismissed: false,
    scrollProgress: 0
  })
  
  const { track } = useConversionTracking()
  
  useEffect(() => {
    if (!showOnScroll) {
      setState(prev => ({ ...prev, isVisible: true }))
      return
    }
    
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // Calculate scroll progress (0-100)
      const scrollProgress = (scrollY / (documentHeight - windowHeight)) * 100
      
      // Show CTA after scrollThreshold
      const shouldShow = scrollY > windowHeight * scrollThreshold
      
      setState(prev => ({
        ...prev,
        isVisible: shouldShow && !prev.isDismissed,
        scrollProgress: Math.min(scrollProgress, 100)
      }))
      
      // Track when CTA first becomes visible
      if (shouldShow && !state.isVisible && !state.isDismissed) {
        track(ConversionEventType.SELECT_CONTENT, {
          content_type: 'mobile_cta',
          content_name: `${variant}_triggered`,
          value: Math.round(scrollProgress)
        })
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showOnScroll, scrollThreshold, variant, track, state.isVisible, state.isDismissed])
  
  const handleDismiss = () => {
    setState(prev => ({ ...prev, isVisible: false, isDismissed: true }))
    track(ConversionEventType.SELECT_CONTENT, {
      content_type: 'mobile_cta',
      content_name: `${variant}_dismissed`,
      value: 1
    })
    onDismiss?.()
  }
  
  const handleCTAClick = () => {
    track(ConversionEventType.GENERATE_LEAD, {
      content_type: 'mobile_cta',
      content_name: `${variant}_click`,
      value: 1
    })
  }
  
  if (!state.isVisible || state.isDismissed) {
    return null
  }
  
  // Standard variant
  if (variant === 'standard') {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-primary-600 text-white shadow-2xl transition-transform duration-300 md:hidden ${
        state.isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}>
        <ScrollProgress progress={state.scrollProgress} />
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <div className="font-semibold text-sm">Start Your Six Figure Journey</div>
              <div className="text-xs text-primary-200">Free blueprint • No credit card</div>
            </div>
            <div className="flex items-center space-x-2">
              <Link 
                href="/register" 
                onClick={handleCTAClick}
                className="bg-white text-primary-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center"
              >
                Start Free
                <ArrowRightIcon className="w-4 h-4 ml-1" />
              </Link>
              <button
                onClick={handleDismiss}
                className="text-primary-200 hover:text-white p-1"
                aria-label="Dismiss"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Urgency variant
  if (variant === 'urgency') {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-2xl transition-transform duration-300 md:hidden ${
        state.isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}>
        <ScrollProgress progress={state.scrollProgress} />
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-3">
              <div className="flex items-center mb-1">
                <SparklesIcon className="w-4 h-4 mr-1 text-yellow-300" />
                <span className="font-bold text-xs">LIMITED TIME</span>
              </div>
              <div className="text-xs text-red-100">
                Free $297 blueprint expires in <CountdownTimer />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link 
                href="/register" 
                onClick={handleCTAClick}
                className="bg-white text-red-600 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors shadow-lg animate-pulse"
              >
                Claim Now!
              </Link>
              <button
                onClick={handleDismiss}
                className="text-red-200 hover:text-white p-1"
                aria-label="Dismiss"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Value variant
  if (variant === 'value') {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-green-600 to-green-700 text-white shadow-2xl transition-transform duration-300 md:hidden ${
        state.isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}>
        <ScrollProgress progress={state.scrollProgress} />
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-3">
              <div className="flex items-center mb-1">
                <CurrencyDollarIcon className="w-4 h-4 mr-1 text-green-200" />
                <span className="font-semibold text-sm">Avg $2,847/mo Increase</span>
              </div>
              <div className="flex items-center text-xs text-green-100">
                <CheckIcon className="w-3 h-3 mr-1" />
                <span>80% fewer no-shows guaranteed</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link 
                href="/register" 
                onClick={handleCTAClick}
                className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center"
              >
                Get Results
                <ArrowRightIcon className="w-4 h-4 ml-1" />
              </Link>
              <button
                onClick={handleDismiss}
                className="text-green-200 hover:text-white p-1"
                aria-label="Dismiss"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Minimal variant
  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-primary-600 text-white rounded-full shadow-2xl transition-all duration-300 md:hidden ${
      state.isVisible ? 'translate-y-0 scale-100' : 'translate-y-full scale-0'
    } ${className}`}>
      <div className="relative">
        <Link 
          href="/register" 
          onClick={handleCTAClick}
          className="flex items-center px-6 py-3 font-semibold text-sm hover:bg-primary-700 transition-colors rounded-full"
        >
          Start Free
          <ArrowRightIcon className="w-4 h-4 ml-2" />
        </Link>
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full p-1 hover:bg-gray-700 transition-colors"
          aria-label="Dismiss"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// Hook for managing multiple mobile CTAs
export function useMobileCTAState() {
  const [activeCTA, setActiveCTA] = useState<string | null>(null)
  const [dismissedCTAs, setDismissedCTAs] = useState<Set<string>>(new Set())
  
  const showCTA = (ctaId: string) => {
    if (!dismissedCTAs.has(ctaId)) {
      setActiveCTA(ctaId)
    }
  }
  
  const dismissCTA = (ctaId: string) => {
    setDismissedCTAs(prev => new Set([...prev, ctaId]))
    if (activeCTA === ctaId) {
      setActiveCTA(null)
    }
  }
  
  const resetCTAs = () => {
    setDismissedCTAs(new Set())
    setActiveCTA(null)
  }
  
  return {
    activeCTA,
    showCTA,
    dismissCTA,
    resetCTAs,
    isDismissed: (ctaId: string) => dismissedCTAs.has(ctaId)
  }
}

export default EnhancedMobileCTA