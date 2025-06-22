'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  CheckIcon,
  StarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  PlayIcon,
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

const pricing = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'Perfect for new barbers getting started',
    features: [
      'Automated weekly payouts',
      'Basic commission tracking',
      'Appointment management',
      'Email notifications',
      'Client history tracking',
      'Mobile app access',
      'Standard support'
    ],
    buttonText: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For established barbers maximizing earnings',
    features: [
      'Everything in Starter',
      'Instant payouts (30 minutes)',
      'Advanced analytics & insights',
      'Time-based rate variations',
      'VIP client pricing',
      'Multi-location support',
      'Auto rate escalation',
      'Priority support'
    ],
    buttonText: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Shop Owner',
    price: '$99',
    period: '/month',
    description: 'Complete solution for shop owners',
    features: [
      'Everything in Professional',
      'Unlimited barber accounts',
      'Shop revenue analytics',
      'Payment splitting system',
      'Staff performance tracking',
      'Custom compensation plans',
      'SMS notifications',
      'Dedicated account manager'
    ],
    buttonText: 'Schedule Demo',
    popular: false,
  },
]

const testimonials = [
  {
    name: 'Marcus Johnson',
    title: 'Master Barber, Atlanta',
    quote: 'The automated payouts changed my life. I focus on cutting hair while 6FB handles my money. My income went up 40% in 6 months.',
    rating: 5,
  },
  {
    name: 'Sarah Mitchell',
    title: 'Shop Owner, Denver',
    quote: 'Managing 8 barbers was chaos. Now payment splits are automatic, everyone gets paid on time, and I have analytics showing exactly where we stand.',
    rating: 5,
  },
  {
    name: 'David Rodriguez',
    title: 'Celebrity Barber, Los Angeles',
    quote: 'The VIP pricing and peak hour rates are genius. I charge more for premium slots automatically. Best investment I\'ve made in my career.',
    rating: 5,
  },
]

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [showDemo, setShowDemo] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, just show success message
    alert('Thanks! We\'ll send you early access when available.')
    setEmail('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium">
            🚀 Experience the full 6FB Platform now - no sign up required!{' '}
            <Link href="/app" className="underline font-semibold hover:text-violet-100">
              Try Live Demo →
            </Link>
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="premium-card-modern sticky top-0 z-50 border-0 border-b border-gray-200/50 backdrop-blur-xl bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur opacity-75"></div>
                <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 p-2 rounded-xl">
                  <CurrencyDollarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <span className="ml-3 text-2xl font-bold text-gradient-violet">6FB Payouts</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/app" 
                className="text-violet-600 hover:text-violet-700 font-semibold transition-colors"
              >
                Live Demo
              </Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Sign In
              </Link>
              <Link 
                href="#pricing" 
                className="premium-button hover-lift"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        {isMounted && (
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-25 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-fuchsia-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>
        )}

        <div className="max-w-7xl mx-auto text-center relative">
          {/* Trust Badge */}
          <div className="inline-flex items-center bg-white/90 backdrop-blur-sm border border-violet-200/50 rounded-full px-6 py-3 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-500 mr-2" />
            <span className="text-sm font-medium text-gray-700">Trusted by 1,200+ barbers nationwide</span>
            <div className="ml-2 w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
            The Complete Platform for
            <br />
            <span className="text-gradient-violet relative">
              Six-Figure Barbers.
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full opacity-30"></div>
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            Automate payouts, track earnings, and manage appointments with the most trusted platform in the industry. 
            <span className="text-emerald-600 font-semibold">Join the barbers earning $100K+</span>
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <Link 
              href="/app"
              className="premium-button text-lg px-10 py-4 hover-lift bg-gradient-to-r from-violet-600 to-purple-600"
            >
              <PlayIcon className="mr-2 h-5 w-5" />
              Try Full Demo Now
            </Link>
            <Link 
              href="#pricing"
              className="premium-button-secondary text-lg px-10 py-4 hover-lift"
            >
              Start Free Trial
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="premium-card-modern p-6 hover-lift hover-glow-purple text-center">
              <div className="text-3xl font-bold text-gradient-success mb-2 count-up">$2.5M+</div>
              <div className="text-sm text-gray-600 font-medium">Paid Out Monthly</div>
              <div className="mt-2 w-8 h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mx-auto"></div>
            </div>
            <div className="premium-card-modern p-6 hover-lift hover-glow-purple text-center">
              <div className="text-3xl font-bold text-gradient-violet mb-2 count-up">45K+</div>
              <div className="text-sm text-gray-600 font-medium">Appointments Tracked</div>
              <div className="mt-2 w-8 h-1 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full mx-auto"></div>
            </div>
            <div className="premium-card-modern p-6 hover-lift hover-glow-purple text-center">
              <div className="text-3xl font-bold text-gradient-success mb-2 count-up">98%</div>
              <div className="text-sm text-gray-600 font-medium">On-Time Payouts</div>
              <div className="mt-2 w-8 h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mx-auto"></div>
            </div>
            <div className="premium-card-modern p-6 hover-lift hover-glow-purple text-center">
              <div className="text-3xl font-bold text-gradient-violet mb-2 count-up">30 sec</div>
              <div className="text-sm text-gray-600 font-medium">Instant Transfers</div>
              <div className="mt-2 w-8 h-1 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full mx-auto"></div>
            </div>
          </div>

          {/* Demo Video Placeholder */}
          {showDemo && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="max-w-5xl w-full premium-card p-8 relative">
                <button 
                  onClick={() => setShowDemo(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl flex items-center justify-center text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
                  <div className="text-center relative z-10">
                    <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 mx-auto mb-6 w-fit">
                      <PlayIcon className="h-16 w-16 text-white" />
                    </div>
                    <p className="text-2xl font-bold mb-2">Demo: Automated Payout System</p>
                    <p className="text-blue-200 mb-6">See how barbers save 5+ hours per week and increase earnings by 40%</p>
                    <Link 
                      href="/app"
                      className="premium-button-success hover-lift"
                    >
                      Try Live Demo →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
              ⚡ Powerful Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Built for Barbers Who 
              <span className="text-gradient"> Mean Business</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Every feature is designed to help you save time, make more money, and build the six-figure career you deserve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.name} 
                className="premium-card-modern p-8 hover-lift hover-glow-purple group relative overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-400/10 to-purple-400/10 rounded-bl-full transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-500"></div>
                
                <div className="relative">
                  <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-4 w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-violet-600 transition-colors">
                    {feature.name}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <div className="mt-4 w-12 h-1 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-violet-900 to-purple-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold px-6 py-3 rounded-full mb-6 hover:bg-white/15 transition-all duration-300">
              <span className="mr-2">⭐</span> Trusted Nationwide
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Join 1,200+ Successful Barbers
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              See why top barbers across the country trust 6FB Payouts to manage their business and earnings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="glass-card-enhanced p-8 hover-lift group hover-glow">
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-white/90 mb-6 text-lg leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center">
                  <div className="user-avatar-large mr-4">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-violet-200 text-sm">{testimonial.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Success Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center glass-card-enhanced p-6 hover-lift">
              <div className="text-4xl font-bold text-white mb-2">$2.5M+</div>
              <div className="text-violet-200 font-medium">Paid Out Monthly</div>
              <div className="mt-3 w-10 h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mx-auto"></div>
            </div>
            <div className="text-center glass-card-enhanced p-6 hover-lift">
              <div className="text-4xl font-bold text-white mb-2">45K+</div>
              <div className="text-violet-200 font-medium">Appointments Tracked</div>
              <div className="mt-3 w-10 h-1 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full mx-auto"></div>
            </div>
            <div className="text-center glass-card-enhanced p-6 hover-lift">
              <div className="text-4xl font-bold text-white mb-2">98%</div>
              <div className="text-violet-200 font-medium">On-Time Payouts</div>
              <div className="mt-3 w-10 h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full mx-auto"></div>
            </div>
            <div className="text-center glass-card-enhanced p-6 hover-lift">
              <div className="text-4xl font-bold text-white mb-2">30 sec</div>
              <div className="text-violet-200 font-medium">Instant Transfers</div>
              <div className="mt-3 w-10 h-1 bg-gradient-to-r from-violet-400 to-purple-500 rounded-full mx-auto"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600">
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricing.map((plan) => (
              <div 
                key={plan.name} 
                className={`bg-white rounded-lg shadow-lg p-8 relative ${
                  plan.popular ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 ml-1">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mt-1 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-center block transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600">
              Questions? <Link href="#contact" className="text-blue-600 hover:underline">Contact our sales team</Link>
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple Setup, Powerful Results
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes and see immediate impact on your business
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your Account</h3>
              <p className="text-gray-600">Sign up and connect your bank account with Stripe Express in under 5 minutes</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Set Your Rates</h3>
              <p className="text-gray-600">Choose your compensation model and customize rates for different services and clients</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Earning</h3>
              <p className="text-gray-600">Track appointments, see real-time earnings, and get paid automatically on your schedule</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Build Your Six-Figure Career?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join 1,200+ barbers using our platform to transform their business and income.
          </p>
          
          <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto">
            <div className="flex">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-4 py-3 rounded-l-lg border-0 focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="submit"
                className="bg-white text-blue-600 px-6 py-3 rounded-r-lg font-semibold hover:bg-gray-50"
              >
                Get Started
              </button>
            </div>
          </form>
          
          <p className="text-blue-100 text-sm mt-4">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-400" />
                <span className="ml-2 text-xl font-bold text-white">6FB Payouts</span>
              </div>
              <p className="text-gray-400">
                Automated payout solutions for modern barbers.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/app" className="hover:text-white">Live Demo</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
                <li><Link href="#" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms</Link></li>
                <li><Link href="#" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 6FB Payouts. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}