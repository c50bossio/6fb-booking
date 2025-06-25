import Link from 'next/link'
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

// This is a server component - no 'use client' directive
export default function ServerLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-slate-700" />
              <span className="ml-3 text-2xl font-bold text-slate-900">Booked Barber</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/app" className="text-gray-700 hover:text-gray-900 font-medium">
                Demo
              </Link>
              <Link href="/login" className="text-gray-700 hover:text-gray-900 font-medium">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            The Complete Platform for
            <br />
            <span className="text-teal-600">Six-Figure Barbers.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Automate payouts, track earnings, and manage appointments with the most trusted platform in the industry.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              href="/app"
              className="bg-slate-700 text-white px-8 py-3 rounded-lg hover:bg-slate-800 font-semibold text-lg flex items-center"
            >
              Try Demo Now
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/signup"
              className="border-2 border-slate-700 text-slate-700 px-8 py-3 rounded-lg hover:bg-slate-50 font-semibold text-lg"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Everything You Need to Succeed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-200 rounded-lg">
              <BanknotesIcon className="h-10 w-10 text-teal-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Automated Payouts</h3>
              <p className="text-gray-600">
                Set it and forget it. Automatic weekly, bi-weekly, or monthly payouts directly to your bank.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <CalendarDaysIcon className="h-10 w-10 text-teal-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">
                Manage appointments, avoid double-booking, and sync with your calendar seamlessly.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <ChartBarIcon className="h-10 w-10 text-teal-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-Time Analytics</h3>
              <p className="text-gray-600">
                Track earnings, performance metrics, and business insights updated instantly.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <UsersIcon className="h-10 w-10 text-teal-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Client Management</h3>
              <p className="text-gray-600">
                Track client history, preferences, and automatically apply VIP rates.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <ClockIcon className="h-10 w-10 text-teal-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Payouts</h3>
              <p className="text-gray-600">
                Need money now? Get paid in 30 minutes with Stripe Express instant transfers.
              </p>
            </div>
            <div className="p-6 border border-gray-200 rounded-lg">
              <ShieldCheckIcon className="h-10 w-10 text-teal-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Bank-Level Security</h3>
              <p className="text-gray-600">
                Your data is protected with 256-bit encryption, 2FA, and SOC 2 compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Pricing */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">$29<span className="text-lg font-normal text-gray-600">/month</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Automated payouts</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Basic analytics</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Client management</span>
                </li>
              </ul>
              <Link href="/signup" className="block text-center bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium">
                Start Free Trial
              </Link>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md border-2 border-slate-700 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-slate-700 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Professional</h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">$49<span className="text-lg font-normal text-gray-600">/month</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Everything in Starter</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Instant payouts</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Multi-location support</span>
                </li>
              </ul>
              <Link href="/signup" className="block text-center bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 font-medium">
                Start Free Trial
              </Link>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Shop Owner</h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">$99<span className="text-lg font-normal text-gray-600">/month</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Everything in Pro</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Unlimited barbers</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-5 w-5 text-teal-600 mt-0.5 mr-2" />
                  <span className="text-gray-600">Revenue analytics</span>
                </li>
              </ul>
              <Link href="/contact" className="block text-center bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Build Your Six-Figure Career?
          </h2>
          <p className="text-xl text-slate-200 mb-8">
            Join 1,200+ barbers transforming their business.
          </p>
          <Link
            href="/signup"
            className="bg-white text-slate-800 px-8 py-3 rounded-lg hover:bg-gray-100 font-semibold text-lg inline-flex items-center"
          >
            Get Started Free
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
          <p className="text-slate-300 text-sm mt-4">
            14-day free trial • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p>&copy; 2024 Booked Barber. All rights reserved.</p>
            <div className="mt-4 space-x-4">
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms</Link>
              <Link href="/contact" className="hover:text-white">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
