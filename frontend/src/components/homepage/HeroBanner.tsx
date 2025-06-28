import Link from 'next/link'
import {
  ShieldCheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

// Types for the component props
interface StatCardProps {
  value: string
  label: string
}

interface CTAButtonProps {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  className?: string
}

// Simple CTA Button component
function CTAButton({ href, children, variant = 'primary', className = '' }: CTAButtonProps) {
  const baseClasses = "font-semibold text-lg px-10 py-4 rounded-xl transition-all duration-300 inline-flex items-center shadow-lg hover:shadow-xl hover:-translate-y-1"

  const variantClasses = variant === 'primary'
    ? "bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-white hover:from-teal-600 hover:via-cyan-600 hover:to-teal-700"
    : "bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"

  return (
    <Link
      href={href}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {children}
    </Link>
  )
}

// Stat Card component
function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
      <div className="text-3xl font-bold text-slate-700 mb-2">{value}</div>
      <div className="text-sm font-semibold text-gray-700">{label}</div>
    </div>
  )
}

// Trust Badge component
function TrustBadge() {
  return (
    <div className="inline-flex items-center bg-white border border-slate-300 rounded-full px-6 py-3 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
      <ShieldCheckIcon className="h-4 w-4 text-emerald-600 mr-2" />
      <span className="text-sm font-bold text-gray-900">Trusted by 1,200+ barbers nationwide</span>
      <div className="ml-2 w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
    </div>
  )
}

// Main HeroBanner component
export default function HeroBanner() {
  // Social proof stats data
  const stats = [
    { value: '$2.5M+', label: 'Paid Out Monthly' },
    { value: '45K+', label: 'Appointments Tracked' },
    { value: '98%', label: 'On-Time Payouts' },
    { value: '30 sec', label: 'Instant Transfers' }
  ]

  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto text-center relative">

        {/* Trust Badge */}
        <TrustBadge />

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
          The Complete Platform for
          <br />
          <span className="text-teal-600 relative">
            Six-Figure Barbers.
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full opacity-30"></div>
          </span>
        </h1>

        {/* Subtitle and Description */}
        <p className="text-xl md:text-2xl mb-12 max-w-4xl mx-auto leading-relaxed text-gray-700">
          Automate payouts, track earnings, and manage appointments with the most trusted platform in the industry.
          <span className="font-bold text-gray-900"> Start your 30-day free trial today - no credit card required.</span>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
          <CTAButton href="/signup" variant="primary">
            <ArrowRightIcon className="mr-2 h-5 w-5" />
            Start Free Trial
          </CTAButton>

          <CTAButton href="/login" variant="secondary">
            Sign In
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </CTAButton>
        </div>

        {/* Social Proof Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              value={stat.value}
              label={stat.label}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
