'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  SparklesIcon, 
  ClockIcon, 
  CheckIcon,
  ArrowRightIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { useConversionTracking, ConversionEventType } from '@/components/tracking/ConversionTracker'

interface EnhancedCTASectionProps {
  variant?: 'urgency' | 'value' | 'social_proof' | 'risk_reversal'
  className?: string
  size?: 'compact' | 'standard' | 'hero'
}

interface CountdownTimerProps {
  initialHours?: number
  initialMinutes?: number
  initialSeconds?: number
}

function CountdownTimer({ initialHours = 23, initialMinutes = 47, initialSeconds = 32 }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ 
    hours: initialHours, 
    minutes: initialMinutes, 
    seconds: initialSeconds 
  })
  
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
              // Reset to 24 hours when it reaches 0
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
    <div className="flex items-center justify-center space-x-2">
      <ClockIcon className="w-5 h-5 text-red-500" />
      <span className="font-mono font-bold text-xl text-red-600 dark:text-red-400">
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  )
}

function LiveSignupIndicator() {
  const [recentSignups, setRecentSignups] = useState(23)
  const [isAnimating, setIsAnimating] = useState(false)
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 30 seconds
        setIsAnimating(true)
        setRecentSignups(prev => prev + Math.floor(Math.random() * 3) + 1)
        setTimeout(() => setIsAnimating(false), 2000)
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className={`transition-all duration-500 ${isAnimating ? 'scale-105' : 'scale-100'}`}>
      <div className="inline-flex items-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 rounded-full">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
        <span className="font-semibold">{recentSignups} joined today</span>
      </div>
    </div>
  )
}

function RiskReversalBadges() {
  const badges = [
    { icon: CheckIcon, text: "30-Day Money Back Guarantee" },
    { icon: CheckIcon, text: "No Setup Fees" },
    { icon: CheckIcon, text: "Cancel Anytime" },
    { icon: CheckIcon, text: "Free Migration Support" }
  ]
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {badges.map((badge, index) => (
        <div key={index} className="flex items-center text-sm text-green-600 dark:text-green-400">
          <badge.icon className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  )
}

function ValueProposition() {
  const benefits = [
    { icon: CurrencyDollarIcon, text: "Average $2,847/month increase", color: "text-green-500" },
    { icon: TrophyIcon, text: "80% reduction in no-shows", color: "text-blue-500" },
    { icon: UserGroupIcon, text: "67% client retention boost", color: "text-purple-500" }
  ]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      {benefits.map((benefit, index) => (
        <div key={index} className="flex items-center justify-center md:justify-start">
          <benefit.icon className={`w-5 h-5 mr-2 ${benefit.color}`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {benefit.text}
          </span>
        </div>
      ))}
    </div>
  )
}

export function EnhancedCTASection({ 
  variant = 'urgency', 
  className = '', 
  size = 'standard' 
}: EnhancedCTASectionProps) {
  const { track } = useConversionTracking()
  const [buttonHover, setButtonHover] = useState(false)
  
  const handleCTAClick = (ctaType: string) => {
    track(ConversionEventType.GENERATE_LEAD, {
      content_type: 'cta_section',
      content_name: variant,
      content_id: ctaType,
      value: 1
    })
  }
  
  const getSizeClasses = () => {
    switch (size) {
      case 'compact':
        return 'py-12'
      case 'hero':
        return 'py-24 lg:py-32'
      default:
        return 'py-20'
    }
  }
  
  const getButtonSize = () => {
    switch (size) {
      case 'compact':
        return 'lg'
      case 'hero':
        return 'xl'
      default:
        return 'lg'
    }
  }
  
  // Urgency Variant
  if (variant === 'urgency') {
    return (
      <section className={`${getSizeClasses()} bg-gradient-to-r from-red-600 to-red-800 dark:from-red-700 dark:to-red-900 relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block bg-red-700 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-pulse">
            ⚡ LIMITED TIME OFFER
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Don't Stay Broke Another Day
          </h2>
          
          <p className="text-xl text-red-100 mb-6">
            Every hour you wait, competitors steal your clients and money.
            <span className="block mt-2 font-semibold">
              Start building your $10K/month empire RIGHT NOW.
            </span>
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
            <div className="text-white mb-4 font-semibold">
              Free $297 Six Figure Blueprint expires in:
            </div>
            <CountdownTimer />
          </div>
          
          <Link 
            href="/register"
            onClick={() => handleCTAClick('urgency_primary')}
          >
            <Button 
              size={getButtonSize()}
              className="bg-white text-red-600 hover:bg-gray-100 font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
              onMouseEnter={() => setButtonHover(true)}
              onMouseLeave={() => setButtonHover(false)}
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Claim My Free Blueprint Now
              <ArrowRightIcon className={`w-5 h-5 ml-2 transition-transform ${buttonHover ? 'translate-x-1' : ''}`} />
            </Button>
          </Link>
          
          <div className="mt-6 text-red-200 text-sm">
            ⏰ Only 847 spots left • 23 people signed up in the last hour
          </div>
        </div>
      </section>
    )
  }
  
  // Value Variant
  if (variant === 'value') {
    return (
      <section className={`${getSizeClasses()} bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 ${className}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <TrophyIcon className="w-4 h-4 mr-2" />
            Proven Six Figure System
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Transform Your Barbershop Into a
            <span className="text-primary-600 dark:text-primary-400 block mt-2">
              Premium Revenue Machine
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of barbers using our proven system to build predictable, 
            scalable businesses that generate $10K+ per month.
          </p>
          
          <ValueProposition />
          
          <div className="mt-8">
            <Link 
              href="/register"
              onClick={() => handleCTAClick('value_primary')}
            >
              <Button 
                size={getButtonSize()}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg"
              >
                Start Building My Empire
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          
          <div className="mt-6 text-gray-500 dark:text-gray-400 text-sm">
            No credit card required • Setup in 2 minutes • Cancel anytime
          </div>
        </div>
      </section>
    )
  }
  
  // Social Proof Variant
  if (variant === 'social_proof') {
    return (
      <section className={`${getSizeClasses()} bg-white dark:bg-gray-900 ${className}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-green-50 dark:bg-green-900/20 p-8 rounded-xl mb-8">
            <div className="text-2xl font-bold text-green-800 dark:text-green-200 mb-4">
              🔥 Join 12,847+ Successful Barbers
            </div>
            <p className="text-lg text-green-600 dark:text-green-400 mb-6">
              Our community has generated over $47M in revenue using the Six Figure Barber system
            </p>
            <LiveSignupIndicator />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Don't Get Left Behind
          </h2>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            While you're thinking about it, your competitors are already building their empires.
            Join the movement that's transforming the barbering industry.
          </p>
          
          <div className="-mx-4 lg:mx-0">
            <Link 
              href="/register"
              onClick={() => handleCTAClick('social_proof_primary')}
            >
              <Button 
                size={getButtonSize()}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg w-full sm:w-auto"
              >
                Join the Six Figure Movement
                <UserGroupIcon className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          
          <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
            <span>✅ Free 30-day trial</span>
            <span>✅ No setup fees</span>
            <span>✅ Cancel anytime</span>
          </div>
        </div>
      </section>
    )
  }
  
  // Risk Reversal Variant (default)
  return (
    <section className={`${getSizeClasses()} bg-gray-50 dark:bg-gray-800 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-semibold mb-6">
          <CheckIcon className="w-4 h-4 mr-2" />
          100% Risk-Free Trial
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
          Try BookedBarber Completely Risk-Free
        </h2>
        
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          We're so confident you'll love the results, we guarantee it. 
          If you don't see an increase in revenue within 30 days, we'll refund every penny.
        </p>
        
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm mb-8">
          <div className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            What You Get With Zero Risk:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="flex items-start">
              <CheckIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">30-day money-back guarantee</span>
            </div>
            <div className="flex items-start">
              <CheckIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">Free setup and onboarding</span>
            </div>
            <div className="flex items-start">
              <CheckIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">Cancel anytime, no questions asked</span>
            </div>
            <div className="flex items-start">
              <CheckIcon className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">24/7 priority support</span>
            </div>
          </div>
        </div>
        
        <Link 
          href="/register"
          onClick={() => handleCTAClick('risk_reversal_primary')}
        >
          <Button 
            size={getButtonSize()}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg"
          >
            Start My Risk-Free Trial
            <CheckIcon className="w-5 h-5 ml-2" />
          </Button>
        </Link>
        
        <RiskReversalBadges />
      </div>
    </section>
  )
}

export default EnhancedCTASection