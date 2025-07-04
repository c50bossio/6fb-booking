'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
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
    buttonText: 'Start Free Trial',
    popular: false,
  },
]

const testimonials = [
  {
    name: 'Marcus Johnson',
    title: 'Master Barber, Atlanta',
    quote: 'The automated payouts changed my life. I focus on cutting hair while Booked Barber handles my money. My income went up 40% in 6 months.',
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

// Premium Animated Trial Button Component
function PremiumTrialButton() {
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-100, 100], [30, -30])
  const rotateY = useTransform(x, [-100, 100], [-30, 30])

  const handleMouse = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set(event.clientX - centerX)
    y.set(event.clientY - centerY)
  }

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouse}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        x.set(0)
        y.set(0)
      }}
      whileTap={{ scale: 0.95 }}
      className="perspective-1000"
    >
      <Link href="/signup">
        <motion.div
          className="demo-button text-lg px-10 py-4 relative overflow-hidden group cursor-pointer"
          initial={{ scale: 1 }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 20px 40px rgba(20, 184, 166, 0.4)",
          }}
          whileTap={{ scale: 0.98 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 17
          }}
          onTapStart={() => setIsClicked(true)}
          onTap={() => setTimeout(() => setIsClicked(false), 150)}
        >
          {/* Gradient Background with Animation */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600"
            animate={{
              backgroundPosition: isHovered ? ["0% 50%", "100% 50%", "0% 50%"] : "0% 50%"
            }}
            transition={{
              duration: 2,
              repeat: isHovered ? Infinity : 0,
              ease: "linear"
            }}
            style={{
              backgroundSize: "200% 200%"
            }}
          />

          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: isHovered ? "100%" : "-100%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{ transform: "skewX(-20deg)" }}
          />

          {/* Ripple Effect on Click */}
          {isClicked && (
            <motion.div
              className="absolute inset-0 bg-white/20 rounded-xl"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          )}

          {/* Button Content */}
          <div className="relative z-10 flex items-center justify-center text-black font-semibold">
            <motion.div
              animate={{
                rotate: isHovered ? 360 : 0,
                scale: isHovered ? 1.1 : 1
              }}
              transition={{
                duration: 0.5,
                ease: "easeInOut"
              }}
              className="mr-2"
            >
              <ArrowRightIcon className="h-5 w-5" />
            </motion.div>

            <motion.span
              animate={{
                y: isHovered ? [-1, 1, -1] : 0
              }}
              transition={{
                duration: 0.5,
                repeat: isHovered ? Infinity : 0,
                ease: "easeInOut"
              }}
            >
              Start Free Trial
            </motion.span>
          </div>

          {/* Glow Effect */}
          <motion.div
            className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-xl blur opacity-30"
            animate={{
              opacity: isHovered ? [0.3, 0.6, 0.3] : 0.3
            }}
            transition={{
              duration: 1.5,
              repeat: isHovered ? Infinity : 0,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </Link>
    </motion.div>
  )
}

export default function LandingPage() {
  const [email, setEmail] = useState('')
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
    <>
      <div className="min-h-screen bg-gray-50">
      {/* Free Trial Banner */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium">
            🎉 Start your 30-day free trial today - no credit card required!{' '}
            <Link href="/signup" className="underline font-semibold hover:text-slate-300">
              Get Started Free →
            </Link>
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 backdrop-blur-xl bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl blur opacity-75"></div>
                <div className="relative bg-gradient-to-r from-slate-600 to-slate-700 p-2 rounded-xl">
                  <CurrencyDollarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <span className="ml-3 text-2xl font-bold text-slate-900">Booked Barber</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="header-nav-link transition-colors" style={{color: '#111827', fontWeight: '600', opacity: 1}}>
                Sign In
              </Link>
              <Link
                href="/signup"
                className="premium-button hover-lift"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-white">

        <div className="max-w-7xl mx-auto text-center relative">
          {/* Trust Badge */}
          <div className="inline-flex items-center bg-white border border-slate-300 rounded-full px-6 py-3 mb-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <ShieldCheckIcon className="h-4 w-4 text-emerald-600 mr-2" />
            <span className="text-sm font-bold text-gray-900">Trusted by 1,200+ barbers nationwide</span>
            <div className="ml-2 w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
            The Complete Platform for
            <br />
            <span className="text-teal-600 relative">
              Six-Figure Barbers.
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full opacity-30"></div>
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-12 max-w-4xl mx-auto leading-relaxed text-gray-700">
            Automate payouts, track earnings, and manage appointments with the most trusted platform in the industry.
            <span className="font-bold text-gray-900"> Start your 30-day free trial today - no credit card required.</span>
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <PremiumTrialButton />
            <Link
              href="/login"
              className="bg-white border-2 border-gray-300 text-gray-700 font-semibold text-lg px-10 py-4 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 inline-flex items-center shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Sign In
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <div className="text-3xl font-bold text-slate-700 mb-2">$2.5M+</div>
              <div className="text-sm font-semibold text-gray-700">Paid Out Monthly</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <div className="text-3xl font-bold text-slate-700 mb-2">45K+</div>
              <div className="text-sm font-semibold text-gray-700">Appointments Tracked</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <div className="text-3xl font-bold text-slate-700 mb-2">98%</div>
              <div className="text-sm font-semibold text-gray-700">On-Time Payouts</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-center">
              <div className="text-3xl font-bold text-slate-700 mb-2">30 sec</div>
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
            <p className="text-xl max-w-3xl mx-auto leading-relaxed features-description" style={{color: '#111827', fontWeight: '500'}}>
              Every feature is designed to help you save time, make more money, and build the six-figure career you deserve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
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

                <p className="feature-description" style={{color: '#111827', fontWeight: '500', opacity: 1}}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
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
            <p className="text-xl text-white max-w-3xl mx-auto leading-relaxed">
              See why top barbers across the country trust Booked Barber to manage their business and earnings.
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
                <blockquote className="text-white mb-6 text-lg leading-relaxed font-medium">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center">
                  <div className="user-avatar-large mr-4">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-slate-100 text-sm font-semibold">{testimonial.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Success Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center glass-card-enhanced p-6 hover-lift">
              <div className="text-4xl font-bold mb-2 text-white">$2.5M+</div>
              <div className="font-medium text-white">Paid Out Monthly</div>
              <div className="mt-3 w-10 h-1 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full mx-auto"></div>
            </div>
            <div className="text-center glass-card-enhanced p-6 hover-lift">
              <div className="text-4xl font-bold mb-2 text-white">45K+</div>
              <div className="font-medium text-white">Appointments Tracked</div>
              <div className="mt-3 w-10 h-1 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full mx-auto"></div>
            </div>
            <div className="text-center glass-card-enhanced p-6 hover-lift">
              <div className="text-4xl font-bold mb-2 text-white">98%</div>
              <div className="font-medium text-white">On-Time Payouts</div>
              <div className="mt-3 w-10 h-1 bg-gradient-to-r from-teal-500 to-teal-600 rounded-full mx-auto"></div>
            </div>
            <div className="text-center glass-card-enhanced p-6 hover-lift">
              <div className="text-4xl font-bold mb-2 text-white">30 sec</div>
              <div className="font-medium text-white">Instant Transfers</div>
              <div className="mt-3 w-10 h-1 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full mx-auto"></div>
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
            <p className="text-xl pricing-description" style={{color: '#000000', fontWeight: '500'}}>
              Start with a 30-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-lg shadow-lg p-8 relative ${
                  plan.popular ? 'ring-2 ring-slate-600' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="mb-4 plan-description" style={{color: '#000000', fontWeight: '500'}}>{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="ml-1 plan-period" style={{color: '#111827', fontWeight: '600'}}>{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-1 mr-3 flex-shrink-0" />
                      <span className="feature-item" style={{color: '#111827', fontWeight: '500', opacity: 1}}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-center block transition-colors ${
                    plan.popular
                      ? 'bg-slate-700 text-white hover:bg-slate-800'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="contact-text" style={{color: '#111827', fontWeight: '500'}}>
              Questions? <Link href="#contact" className="header-nav-link hover:underline" style={{color: '#000000', fontWeight: '600'}}>Contact our sales team</Link>
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
            <p className="text-xl max-w-2xl mx-auto how-it-works-description" style={{color: '#111827', fontWeight: '500'}}>
              Get started in minutes and see immediate impact on your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-slate-700 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Your Account</h3>
              <p className="step-description" style={{color: '#111827', fontWeight: '500', opacity: 1}}>Sign up and connect your bank account with Stripe Express in under 5 minutes</p>
            </div>
            <div className="text-center">
              <div className="bg-slate-700 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Set Your Rates</h3>
              <p className="step-description" style={{color: '#111827', fontWeight: '500', opacity: 1}}>Choose your compensation model and customize rates for different services and clients</p>
            </div>
            <div className="text-center">
              <div className="bg-slate-700 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Earning</h3>
              <p className="step-description" style={{color: '#111827', fontWeight: '500', opacity: 1}}>Track appointments, see real-time earnings, and get paid automatically on your schedule</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Build Your Six-Figure Career?
          </h2>
          <p className="text-xl text-white mb-8">
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
                className="flex-1 px-4 py-3 rounded-l-lg border-0 focus:ring-2 focus:ring-slate-400"
              />
              <button
                type="submit"
                className="bg-white text-slate-700 px-6 py-3 rounded-r-lg font-semibold hover:bg-gray-50"
              >
                Get Started
              </button>
            </div>
          </form>

          <p className="text-slate-200 text-sm mt-4 font-medium">
            30-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <CurrencyDollarIcon className="h-6 w-6 text-teal-500" />
                <span className="ml-2 text-xl font-bold text-white">Booked Barber</span>
              </div>
              <p className="brand-tagline" style={{color: '#D1D5DB', fontWeight: '500'}}>
                Automated payout solutions for modern barbers.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="footer-link transition-colors" style={{color: '#E5E7EB', fontWeight: '500'}}>Features</Link></li>
                <li><Link href="#pricing" className="footer-link transition-colors" style={{color: '#E5E7EB', fontWeight: '500'}}>Pricing</Link></li>
                <li><Link href="/signup" className="footer-link transition-colors" style={{color: '#E5E7EB', fontWeight: '500'}}>Start Free Trial</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="footer-link transition-colors" style={{color: '#E5E7EB', fontWeight: '500'}}>About</Link></li>
                <li><Link href="/contact" className="footer-link transition-colors" style={{color: '#E5E7EB', fontWeight: '500'}}>Contact</Link></li>
                <li><Link href="/support" className="footer-link transition-colors" style={{color: '#E5E7EB', fontWeight: '500'}}>Support</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="footer-link transition-colors" style={{color: '#E5E7EB', fontWeight: '500'}}>Privacy</Link></li>
                <li><Link href="/terms" className="footer-link transition-colors" style={{color: '#E5E7EB', fontWeight: '500'}}>Terms</Link></li>
                <li><Link href="/security" className="footer-link transition-colors" style={{color: '#E5E7EB', fontWeight: '500'}}>Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="footer-copyright" style={{color: '#D1D5DB', fontWeight: '500'}}>&copy; 2024 Booked Barber. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </>
  )
}
