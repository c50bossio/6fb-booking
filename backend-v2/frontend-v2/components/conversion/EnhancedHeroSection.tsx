'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AuthHeroCTAs } from '@/components/ui/AuthCTAs'
import { LogoFull } from '@/components/ui/Logo'
import { 
  CheckIcon, 
  SparklesIcon, 
  TrophyIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { useConversionTracking, ConversionEventType } from '@/components/tracking/ConversionTracker'

interface EnhancedHeroSectionProps {
  variant?: 'default' | 'urgency' | 'social_proof' | 'value_focused'
  className?: string
}

interface CountUpProps {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
}

function CountUp({ target, duration = 2000, prefix = '', suffix = '' }: CountUpProps) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number
    let animationFrame: number
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(target * easeOut))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }
    
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [target, duration])
  
  return <span>{prefix}{count.toLocaleString()}{suffix}</span>
}

function RealTimeIndicator() {
  const [currentCount, setCurrentCount] = useState(847)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    // Simulate real-time signups
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 30 seconds
        setCurrentCount(prev => {
          const newCount = prev + Math.floor(Math.random() * 3) + 1
          setIsVisible(true)
          setTimeout(() => setIsVisible(false), 3000)
          return newCount
        })
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className={`transition-all duration-500 ${isVisible ? 'opacity-100 scale-105' : 'opacity-70 scale-100'}`}>
      <div className="inline-flex items-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 rounded-full text-sm font-semibold">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
        {currentCount} barbers joined this week
      </div>
    </div>
  )
}

function UrgencyBanner() {
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 47, seconds: 32 })
  
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
              hours = 23
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
  
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-center space-x-2 text-red-800 dark:text-red-300">
        <ClockIcon className="w-5 h-5" />
        <span className="font-semibold">Limited Time: Free $297 Six Figure Blueprint expires in</span>
        <div className="font-mono font-bold">
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
      </div>
    </div>
  )
}

function TrustIndicators() {
  return (
    <div className="flex items-center justify-center space-x-8 text-sm text-gray-600 dark:text-gray-400 mt-6">
      <div className="flex items-center">
        <ShieldCheckIcon className="w-5 h-5 text-green-500 mr-2" />
        SSL Secured
      </div>
      <div className="flex items-center">
        <CheckIcon className="w-5 h-5 text-green-500 mr-2" />
        30-Day Guarantee
      </div>
      <div className="flex items-center">
        <TrophyIcon className="w-5 h-5 text-green-500 mr-2" />
        <CountUp target={12847} suffix=" Success Stories" />
      </div>
    </div>
  )
}

export function EnhancedHeroSection({ variant = 'default', className = '' }: EnhancedHeroSectionProps) {
  const { track } = useConversionTracking()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    // Track hero variant view
    track(ConversionEventType.SELECT_CONTENT, {
      content_type: 'hero_variant',
      content_name: variant,
      value: 1
    })
  }, [variant, track])
  
  if (!mounted) {
    return <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800" />
  }
  
  return (
    <section className={`relative overflow-hidden bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 min-h-screen flex items-center ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 w-full">
        <div className="text-center space-y-8">
          {/* Urgency Banner for urgency variant */}
          {variant === 'urgency' && <UrgencyBanner />}
          
          {/* Logo and Brand */}
          <div className="mx-auto">
            <h1 className="text-6xl md:text-8xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
              BOOKEDBARBER
            </h1>
            <div className="w-32 h-1 bg-primary-600 mx-auto mb-8"></div>
          </div>
          
          {/* Main Headline - Different variants */}
          {variant === 'default' && (
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              Go From <span className="text-red-500">Broke Barber</span> to
              <span className="text-primary-600 dark:text-primary-400 block mt-2">Six Figure Business Owner</span>
            </h2>
          )}
          
          {variant === 'urgency' && (
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              <span className="text-red-500">STOP Being Broke!</span>
              <span className="text-primary-600 dark:text-primary-400 block mt-2">Build Your $10K/Month Empire NOW</span>
            </h2>
          )}
          
          {variant === 'social_proof' && (
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              Join <span className="text-primary-600 dark:text-primary-400"><CountUp target={12847} /></span> Barbers Making
              <span className="text-green-600 dark:text-green-400 block mt-2">$10K+ Per Month</span>
            </h2>
          )}
          
          {variant === 'value_focused' && (
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              <span className="text-primary-600 dark:text-primary-400">Own Your Chair.</span>
              <span className="text-primary-600 dark:text-primary-400 block mt-2">Own Your Brand.</span>
              <span className="text-gray-900 dark:text-white block mt-2">Own Your Future.</span>
            </h2>
          )}
          
          {/* Subheadline with metrics */}
          <div className="space-y-4">
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto">
              {variant === 'urgency' && "Every day you wait, competitors steal your clients. Start building your automated booking empire TODAY."}
              {variant === 'social_proof' && "Join thousands of barbers using our proven system to build predictable $10K+/month businesses."}
              {variant === 'value_focused' && "Transform your barbershop into a premium business that works without you. The Six Figure Barber way."}
              {variant === 'default' && "Stop trading time for money. Build a predictable $10K+/month barbershop business that works without you."}
            </p>
            
            {/* Key Results */}
            <div className="flex items-center justify-center space-x-8 text-primary-600 dark:text-primary-400 font-semibold">
              <div className="flex items-center">
                <CurrencyDollarIcon className="w-6 h-6 mr-2" />
                <span className="text-lg">Average 47% Revenue Increase</span>
              </div>
              <div className="hidden md:flex items-center">
                <SparklesIcon className="w-6 h-6 mr-2" />
                <span className="text-lg">90-Day Results Guaranteed</span>
              </div>
            </div>
          </div>
          
          {/* Real-time social proof for social_proof variant */}
          {variant === 'social_proof' && (
            <div className="pt-4">
              <RealTimeIndicator />
            </div>
          )}
          
          {/* CTA Section */}
          <div className="pt-8 space-y-6">
            <AuthHeroCTAs />
            
            {/* Secondary value prop */}
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No credit card required • Setup in 2 minutes • Cancel anytime
              </p>
              
              {/* Enhanced trust indicators */}
              <TrustIndicators />
              
              {/* Specific benefits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
                <div className="flex items-center justify-center md:justify-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Reduce no-shows by 80%</span>
                </div>
                <div className="flex items-center justify-center md:justify-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Instant payment collection</span>
                </div>
                <div className="flex items-center justify-center md:justify-start">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Automated client marketing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced decorative elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-0 -translate-x-1/2 w-64 h-64 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
    </section>
  )
}

export default EnhancedHeroSection