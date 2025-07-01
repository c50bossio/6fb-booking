'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useMotionValue, useSpring, useTransform, useInView, useScroll, useAnimation } from 'framer-motion'
import CountUp from 'react-countup'
import {
  CheckIcon,
  StarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  UsersIcon,
  CogIcon,
  BellIcon,
  ChartPieIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'

const features = [
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

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  const statsRef = useRef(null)
  const statsInView = useInView(statsRef, { once: true })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Thanks! We\'ll send you early access when available.')
    setEmail('')
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 backdrop-blur-xl bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">BOOKEDBARBER</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/login" 
                className="inline-block bg-gray-900 border-2 border-gray-900 text-white font-semibold px-6 py-2 rounded-lg hover:bg-gray-800 hover:border-gray-800 transition-all duration-300 relative shadow-md hover:shadow-lg"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-block bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors relative"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-gray-50 to-teal-50 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          {/* Trust Badge */}
          <div className="inline-flex items-center bg-white border border-slate-300 rounded-full px-6 py-3 mb-8 shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-600 mr-2 group-hover:scale-110 transition-transform duration-300" />
            <span className="text-sm font-bold text-gray-900">Trusted by 1,200+ barbers nationwide</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
            <span className="text-teal-600 relative inline-block">
              OWN THE CHAIR.
            </span>
            <br />
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              OWN THE BRAND.
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-16 max-w-4xl mx-auto leading-relaxed text-gray-700">
            Automate payouts, track earnings, and manage appointments with the most trusted platform in the industry.
            <span className="font-bold text-gray-900 bg-yellow-100 px-2 py-1 rounded-md"> Start your 30-day free trial today - no credit card required.</span>
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <Link
              href="/signup"
              className="bg-teal-600 text-white font-semibold text-lg px-10 py-4 rounded-xl hover:bg-teal-700 transition-all duration-300 inline-flex items-center shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Start Free Trial
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="bg-white border-2 border-gray-300 text-gray-700 font-semibold text-lg px-10 py-4 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 inline-flex items-center shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Sign In
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:border-teal-200 transition-all duration-300 text-center group">
              <div className="text-4xl font-bold text-teal-600 mb-3 group-hover:scale-110 transition-transform duration-300">
                {statsInView ? (
                  <>$<CountUp start={0} end={2.5} duration={2.5} decimals={1} />M+</>
                ) : (
                  "$2.5M+"
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700">Paid Out Monthly</div>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:border-teal-200 transition-all duration-300 text-center group">
              <div className="text-4xl font-bold text-teal-600 mb-3 group-hover:scale-110 transition-transform duration-300">
                {statsInView ? (
                  <><CountUp start={0} end={45} duration={2.8} />K+</>
                ) : (
                  "45K+"
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700">Appointments Tracked</div>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:border-teal-200 transition-all duration-300 text-center group">
              <div className="text-4xl font-bold text-teal-600 mb-3 group-hover:scale-110 transition-transform duration-300">
                {statsInView ? (
                  <><CountUp start={85} end={98} duration={3} />%</>
                ) : (
                  "98%"
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700">On-Time Payouts</div>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:border-teal-200 transition-all duration-300 text-center group">
              <div className="text-4xl font-bold text-teal-600 mb-3 group-hover:scale-110 transition-transform duration-300">
                {statsInView ? (
                  <><CountUp start={60} end={30} duration={2.2} /> sec</>
                ) : (
                  "30 sec"
                )}
              </div>
              <div className="text-sm font-semibold text-gray-700">Instant Transfers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
              ⚡ Powerful Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Built for Barbers Who
              <span className="text-gradient"> Mean Business</span>
            </h2>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed text-gray-700">
              Every feature is designed to help you save time, make more money, and build the six-figure career you deserve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-300 group"
              >
                <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg p-3 w-fit mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.name}
                </h3>

                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Build Your Six-Figure Career?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join 1,200+ barbers already automating their success
          </p>
          <Link
            href="/signup"
            className="bg-teal-600 text-white font-semibold text-lg px-10 py-4 rounded-xl hover:bg-teal-700 transition-all duration-300 inline-flex items-center shadow-lg hover:shadow-xl"
          >
            Start Your Free Trial
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
      
      </div>
    </>
  )
}