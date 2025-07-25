'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  TrophyIcon, 
  BoltIcon, 
  StarIcon, 
  ShieldCheckIcon,
  SparklesIcon,
  PlayIcon,
  ArrowRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useConversionTracking } from '@/components/tracking/ConversionTracker'

export interface EnhancedHeroSectionProps {
  variant?: 'default' | 'urgency' | 'social_proof' | 'value_focused'
  children?: React.ReactNode
}

export function EnhancedHeroSection({ variant = 'default' }: EnhancedHeroSectionProps) {
  const { track } = useConversionTracking()

  const variants = {
    default: {
      badge: {
        icon: SparklesIcon,
        text: 'Six Figure Barber Methodology',
        gradient: 'from-blue-600 to-purple-600'
      },
      headline: {
        main: 'Own the Chair.',
        accent: 'Own the Brand.',
        subtitle: 'The complete business management platform designed for barbers who want to build six-figure businesses with the proven Six Figure Barber methodology.'
      },
      cta: {
        primary: 'Start Free Trial',
        secondary: 'Watch Demo'
      }
    },
    urgency: {
      badge: {
        icon: BoltIcon,
        text: 'Limited Time: 50% Off First 3 Months',
        gradient: 'from-red-500 to-orange-500'
      },
      headline: {
        main: 'Stop Losing Money',
        accent: 'Start Earning More.',
        subtitle: 'Join 15,000+ barbers who increased their revenue by $2,847/month with our proven system. Limited-time offer ends soon.'
      },
      cta: {
        primary: 'Claim Discount Now',
        secondary: 'See Success Stories'
      }
    },
    social_proof: {
      badge: {
        icon: TrophyIcon,
        text: '15,000+ Successful Barbers',
        gradient: 'from-green-500 to-emerald-500'
      },
      headline: {
        main: 'Join the Elite.',
        accent: 'Earn Six Figures.',
        subtitle: 'Trusted by 15,000+ barbers who have processed $127M+ in revenue. See why top barbers choose BookedBarber for their business growth.'
      },
      cta: {
        primary: 'Join Elite Barbers',
        secondary: 'View Success Stories'
      }
    },
    value_focused: {
      badge: {
        icon: ShieldCheckIcon,
        text: 'ROI Guaranteed or Money Back',
        gradient: 'from-purple-500 to-blue-500'
      },
      headline: {
        main: 'Increase Revenue',
        accent: 'Guaranteed.',
        subtitle: 'Our customers see an average $2,847 monthly revenue increase. If you don\'t see results in 90 days, we\'ll refund your money.'
      },
      cta: {
        primary: 'Start Risk-Free',
        secondary: 'See Guarantee'
      }
    }
  }

  const currentVariant = variants[variant]

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Premium Background with Gradient and Texture */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
      <div className="absolute inset-0 dark:hidden" style={{
        backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23000000\" fill-opacity=\"0.02\"%3E%3Cpath d=\"M50 0l50 50-50 50L0 50z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
      }} />
      <div className="absolute inset-0 hidden dark:block" style={{
        backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.03\"%3E%3Cpath d=\"M50 0l50 50-50 50L0 50z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
      }} />
      
      {/* Subtle Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5 animate-pulse" style={{
        animation: 'gradient 12s ease-in-out infinite',
        backgroundSize: '200% 200%'
      }} />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Premium Methodology Badge */}
          <div className="inline-flex items-center mb-8">
            <div className={`bg-gradient-to-r ${currentVariant.badge.gradient} bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl px-8 py-4 shadow-2xl hover:scale-105 transition-all duration-300`}>
              <currentVariant.badge.icon className="w-6 h-6 text-white mr-3" />
              <span className="text-white font-bold text-base tracking-wide">
                {currentVariant.badge.text}
              </span>
            </div>
          </div>
          
          {/* Enhanced Headline with 2025 Typography */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight mb-8">
            <span className="block bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-white bg-clip-text text-transparent">
              {currentVariant.headline.main}
            </span>
            <span className={`block bg-gradient-to-r ${currentVariant.badge.gradient} bg-clip-text text-transparent mt-2`}>
              {currentVariant.headline.accent}
            </span>
          </h1>
          
          {/* Enhanced Subtitle */}
          <p className="text-xl md:text-2xl lg:text-3xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed mb-12">
            {currentVariant.headline.subtitle}
          </p>
          
          {/* Enhanced CTA Section - Removed duplicate "Start Free Trial" button */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <Button 
              variant="outline"
              size="lg"
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-2 border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 text-slate-700 dark:text-slate-200 font-semibold text-lg px-8 py-6 rounded-2xl hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all duration-300"
              onClick={() => track('hero_cta_secondary', { variant, cta: currentVariant.cta.secondary })}
            >
              <PlayIcon className="w-6 h-6 mr-3" />
              {currentVariant.cta.secondary}
            </Button>
          </div>
          
          {/* Enhanced Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-6 sm:space-y-0 sm:space-x-12">
            {/* Trust Indicators */}
            {[
              {
                icon: TrophyIcon,
                metric: '15,000+',
                label: 'Active Barbers',
                gradient: 'from-blue-500 to-indigo-600'
              },
              {
                icon: BoltIcon,
                metric: '$127M+',
                label: 'Revenue Processed',
                gradient: 'from-green-500 to-emerald-600'
              },
              {
                icon: StarIcon,
                metric: '4.9/5',
                label: 'Customer Rating',
                gradient: 'from-yellow-400 to-orange-500'
              }
            ].map((item, index) => (
              <div key={index} className="flex items-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-slate-200/60 dark:border-gray-700/60 rounded-2xl px-6 py-4 hover:scale-105 transition-all duration-300">
                <div className={`w-12 h-12 bg-gradient-to-r ${item.gradient} rounded-xl flex items-center justify-center mr-4`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {item.metric}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {item.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Custom CSS for Gradient Animation */}
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </section>
  )
}