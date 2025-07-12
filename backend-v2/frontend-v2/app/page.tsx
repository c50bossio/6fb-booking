'use client'

import Link from 'next/link'
import { AccessibleButton } from '@/lib/accessibility-helpers'
import { LogoFull } from '@/components/ui/Logo'
import { 
  CalendarDaysIcon, 
  ChartBarIcon, 
  UserGroupIcon,
  BellIcon,
  CreditCardIcon,
  ArrowPathIcon,
  CheckIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { FooterCTAs } from '@/components/ui/CTASystem'
import { AuthHeaderCTAs, AuthHeroCTAs } from '@/components/ui/AuthCTAs'

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional')

  const features = [
    {
      icon: CalendarDaysIcon,
      title: 'Smart Calendar Management',
      description: 'Intuitive scheduling with day, week, and month views. Never double-book again.'
    },
    {
      icon: BellIcon,
      title: 'Automated Client Communications',
      description: 'SMS and email reminders that reduce no-shows by up to 80%.'
    },
    {
      icon: ChartBarIcon,
      title: 'Revenue Analytics & Insights',
      description: 'Track your growth with Six Figure Barber methodology metrics.'
    },
    {
      icon: ArrowPathIcon,
      title: 'Recurring Appointments',
      description: 'Set it and forget it. Perfect for your regular clients.'
    },
    {
      icon: CreditCardIcon,
      title: 'Integrated Payment Processing',
      description: 'Accept payments and manage payouts with Stripe integration.'
    },
    {
      icon: UserGroupIcon,
      title: 'Multi-Location Support',
      description: 'Manage multiple shops and barbers from one dashboard.'
    }
  ]

  const testimonials = [
    {
      quote: "BookedBarber increased my monthly revenue by 40% in just 3 months. The analytics showed me exactly where I was losing money.",
      author: "Marcus Johnson",
      role: "Owner, Downtown Barbershop",
      rating: 5
    },
    {
      quote: "The recurring appointments feature is a game-changer. My regular clients love it and I save hours every week.",
      author: "David Chen",
      role: "Master Barber",
      rating: 5
    },
    {
      quote: "Finally, a booking system that understands barbers. The Six Figure methodology built-in makes all the difference.",
      author: "Tyrell Washington",
      role: "Shop Owner",
      rating: 5
    }
  ]

  const plans = {
    starter: {
      name: 'Starter',
      price: 29,
      description: 'Perfect for independent barbers',
      features: [
        'Up to 100 appointments/month',
        'Basic calendar management',
        'Email reminders',
        'Client management',
        'Basic analytics'
      ]
    },
    professional: {
      name: 'Professional',
      price: 59,
      description: 'For growing barbershops',
      features: [
        'Unlimited appointments',
        'Advanced calendar features',
        'SMS & email reminders',
        'Recurring appointments',
        'Revenue analytics',
        'Payment processing',
        'Google Calendar sync',
        'Priority support'
      ],
      popular: true
    },
    enterprise: {
      name: 'Enterprise',
      price: 'Custom',
      description: 'Multi-location businesses',
      features: [
        'Everything in Professional',
        'Multi-location management',
        'Advanced analytics',
        'Custom integrations',
        'Dedicated account manager',
        'Onboarding & training',
        'SLA guarantee'
      ]
    }
  }

  return (
    <main className="bg-white">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <LogoFull variant="auto" size="md" href="/" />
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Pricing
              </a>
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Features
              </a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                Testimonials
              </a>
            </nav>
            <AuthHeaderCTAs />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center space-y-8">
            <div className="mx-auto flex flex-col items-center">
              <LogoFull 
                variant="color" 
                size="xl" 
                href={null}
                className="mb-4"
              />
              <div className="w-32 h-1 bg-teal-400 mx-auto mb-8"></div>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900">
              The #1 Booking Platform for
              <span className="text-teal-600"> Six Figure Barbers</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Turn your chair into a thriving business with our all-in-one booking and management platform. 
              Built on proven Six Figure Barber methodology.
            </p>

            <div className="pt-8">
              <AuthHeroCTAs />
            </div>

            <p className="text-sm text-gray-500">
              No credit card required • Setup in 2 minutes • Cancel anytime
            </p>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Scale Your Business
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features designed specifically for barbers and barbershop owners
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Thousands of Barbers
            </h2>
            <p className="text-xl text-gray-600">
              See why barbers love BookedBarber
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl">
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-teal-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-gray-900 mb-4 italic">
                  "{testimonial.quote}"
                </blockquote>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-gray-600 text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your business. Start free, upgrade when you're ready.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {Object.entries(plans).map(([key, plan]) => (
              <div 
                key={key}
                className={`bg-white rounded-xl p-8 ${('popular' in plan && plan.popular) ? 'ring-2 ring-teal-400 relative' : 'border border-gray-200'}`}
              >
                {('popular' in plan && plan.popular) && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-teal-400 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    {typeof plan.price === 'number' ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                        <span className="text-gray-600">/month</span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    )}
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register">
                  <AccessibleButton
                    variant={('popular' in plan && plan.popular) ? "primary" : "secondary"}
                    className="w-full"
                  >
                    Get Started
                  </AccessibleButton>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to 6X Your Revenue?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Join thousands of barbers who've transformed their business with BookedBarber. 
            Start your journey to six figures today.
          </p>
          <div className="flex justify-center">
            <Link href="/register">
              <AccessibleButton
                variant="primary"
                size="lg"
                className="bg-teal-500 text-white hover:bg-teal-600"
              >
                Start Free Trial
              </AccessibleButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <LogoFull href="/" className="justify-center text-white mb-4" />
            <p className="text-gray-400 mb-6">Own the Chair. Own the Brand.</p>
            <div className="flex justify-center space-x-6">
              <Link href="/book" className="text-gray-400 hover:text-white">
                Book Demo
              </Link>
              <Link href="/accessibility-demo" className="text-gray-400 hover:text-white">
                Accessibility Demo
              </Link>
              <Link href="#pricing" className="text-gray-400 hover:text-white">
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}