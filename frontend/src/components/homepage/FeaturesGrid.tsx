'use client'

import React, { memo, useState, useEffect } from 'react'
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  UsersIcon,
  ClockIcon,
  ChartPieIcon,
  BuildingLibraryIcon,
  BellIcon,
  CogIcon,
  UserGroupIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

// TypeScript interfaces
interface Feature {
  name: string
  description: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

interface FeatureCardProps {
  feature: Feature
  index: number
  isLoaded: boolean
}

interface FeaturesGridProps {
  className?: string
}

// Features data (extracted from page.tsx)
const features: Feature[] = [
  {
    name: 'Automated Payouts',
    description: 'Set it and forget it. Automatic weekly, bi-weekly, or monthly payouts directly to your bank account.',
    icon: BanknotesIcon,
  },
  {
    name: 'Smart Compensation Plans',
    description: 'Commission-only, booth rent, hybrid, or salary. Plus time-based rates for peak hours and client-type pricing.',
    icon: CurrencyDollarIcon,
  },
  {
    name: 'Real-Time Dashboard',
    description: 'Track earnings, appointments, and performance metrics updated instantly as you work.',
    icon: ChartBarIcon,
  },
  {
    name: 'Appointment Management',
    description: 'Schedule clients, manage bookings, and sync with your calendar. Never double-book again.',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Client Relationship Tools',
    description: 'Track client history, preferences, and automatically apply VIP rates for your best customers.',
    icon: UsersIcon,
  },
  {
    name: 'Instant Payouts',
    description: 'Need money now? Get paid in 30 minutes with Stripe Express instant transfers.',
    icon: ClockIcon,
  },
  {
    name: 'Revenue Analytics',
    description: 'Deep insights into your business with performance tracking and revenue forecasting.',
    icon: ChartPieIcon,
  },
  {
    name: 'Multi-Shop Support',
    description: 'Work at multiple locations? Manage all shops and income streams in one unified dashboard.',
    icon: BuildingLibraryIcon,
  },
  {
    name: 'Smart Notifications',
    description: 'Email and SMS alerts for payouts, appointments, and important business updates.',
    icon: BellIcon,
  },
  {
    name: 'Auto Rate Escalation',
    description: 'Automatically increase rates based on tenure, performance, or client loyalty milestones.',
    icon: CogIcon,
  },
  {
    name: 'Payment Splitting',
    description: 'Automatic shop/barber revenue splits with customizable percentages and rules.',
    icon: UserGroupIcon,
  },
  {
    name: 'Bank-Level Security',
    description: 'Your data is protected with 256-bit encryption, 2FA, and SOC 2 compliance.',
    icon: ShieldCheckIcon,
  },
]

// Skeleton card component
const SkeletonCard = memo(() => (
  <div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
    <div className="bg-gray-200 rounded-lg w-12 h-12 mb-4"></div>
    <div className="bg-gray-200 rounded h-6 w-3/4 mb-2"></div>
    <div className="space-y-2">
      <div className="bg-gray-200 rounded h-4 w-full"></div>
      <div className="bg-gray-200 rounded h-4 w-5/6"></div>
      <div className="bg-gray-200 rounded h-4 w-4/6"></div>
    </div>
  </div>
))

SkeletonCard.displayName = 'SkeletonCard'

// Feature card component with CSS-only hover animations
const FeatureCard = memo<FeatureCardProps>(({ feature, index, isLoaded }) => {
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (isLoaded) {
      // Staggered animation delay
      const timer = setTimeout(() => {
        setShouldRender(true)
      }, index * 50) // 50ms delay between cards

      return () => clearTimeout(timer)
    }
  }, [isLoaded, index])

  if (!shouldRender) {
    return <SkeletonCard />
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-6 transition-all duration-300 group feature-card"
      style={{
        transform: 'translateY(0)',
        opacity: 1,
        animationDelay: `${index * 50}ms`,
        animationFillMode: 'both',
      }}
    >
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg p-3 w-fit mb-4 feature-icon">
        <feature.icon className="h-6 w-6 text-white" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {feature.name}
      </h3>

      <p className="feature-description" style={{color: '#111827', fontWeight: '500', opacity: 1}}>
        {feature.description}
      </p>
    </div>
  )
})

FeatureCard.displayName = 'FeatureCard'

// Main FeaturesGrid component
const FeaturesGrid = memo<FeaturesGridProps>(({ className = '' }) => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Progressive loading - start rendering content after a short delay
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <section id="features" className={`py-24 bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
            ⚡ Powerful Features
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Built for Barbers Who
            <span className="text-gradient"> Mean Business</span>
          </h2>
          <p className="text-xl max-w-3xl mx-auto leading-relaxed features-description" style={{color: '#111827', fontWeight: '500'}}>
            Every feature is designed to help you save time, make more money, and build the six-figure career you deserve.
          </p>
        </div>

        {/* Features Grid - Responsive layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.name}
              feature={feature}
              index={index}
              isLoaded={isLoaded}
            />
          ))}
        </div>
      </div>

      {/* Embedded CSS for hover animations and performance optimizations */}
      <style jsx>{`
        .feature-card {
          will-change: transform, box-shadow;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .feature-icon {
          transition: transform 0.3s ease;
        }

        .feature-card:hover .feature-icon {
          transform: scale(1.05);
        }

        .text-gradient {
          background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        @media (prefers-reduced-motion: reduce) {
          .feature-card,
          .feature-icon {
            transition: none;
          }

          .feature-card:hover {
            transform: none;
          }

          .feature-card:hover .feature-icon {
            transform: none;
          }
        }

        /* Progressive enhancement for better performance */
        @media (max-width: 768px) {
          .feature-card:hover {
            transform: none;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          }
        }
      `}</style>
    </section>
  )
})

FeaturesGrid.displayName = 'FeaturesGrid'

export default FeaturesGrid
