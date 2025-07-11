'use client'

import Link from 'next/link'
import { AccessibleButton } from '@/lib/accessibility-helpers'

export default function LandingPage() {
  const features = [
    {
      title: 'Smart Calendar Management',
      description: 'Intuitive scheduling with day, week, and month views. Never double-book again.',
      icon: '📅'
    },
    {
      title: 'Client Management',
      description: 'Track client preferences, appointment history, and build lasting relationships.',
      icon: '👥'
    },
    {
      title: 'Business Analytics',
      description: 'Understand your revenue, peak hours, and client patterns with detailed insights.',
      icon: '📊'
    },
    {
      title: 'Payment Processing',
      description: 'Secure payments with Stripe integration. Accept cards, track revenue.',
      icon: '💳'
    },
    {
      title: 'Marketing Tools',
      description: 'Email campaigns, SMS reminders, and review management in one place.',
      icon: '📢'
    },
    {
      title: 'Mobile Optimized',
      description: 'Perfect experience on desktop, tablet, and mobile. Work from anywhere.',
      icon: '📱'
    }
  ]

  const plans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for individual barbers',
      features: [
        'Up to 100 appointments/month',
        'Basic calendar management',
        'Client contact management',
        'Email support'
      ]
    },
    {
      name: 'Professional',
      price: '$59',
      period: '/month',
      description: 'For growing barbershops',
      features: [
        'Unlimited appointments',
        'Advanced analytics',
        'Marketing automation',
        'SMS notifications',
        'Priority support'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$99',
      period: '/month',
      description: 'For multi-location businesses',
      features: [
        'Multiple locations',
        'Staff management',
        'Custom integrations',
        'White-label options',
        'Dedicated support'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                BookedBarber
              </h1>
              <span className="ml-2 text-sm text-gray-500 font-medium">V2</span>
            </div>
            <nav className="flex items-center space-x-4">
              <Link 
                href="/book"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Book Demo
              </Link>
              <Link 
                href="/accessibility-demo"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Try Accessibility
              </Link>
              <AccessibleButton
                variant="primary"
                className="ml-4"
              >
                Get Started
              </AccessibleButton>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-gray-900 to-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Own the Chair.
            <br />
            <span className="text-yellow-400">Own the Brand.</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            The complete booking and business management platform designed specifically for barbers. 
            From scheduling to payments, analytics to marketing - everything you need to build a six-figure barbering business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <AccessibleButton
              variant="primary"
              size="lg"
              className="bg-yellow-400 text-black hover:bg-yellow-300"
            >
              Start Free Trial
            </AccessibleButton>
            <Link href="/book">
              <AccessibleButton
                variant="secondary"
                size="lg"
                className="text-white border-white hover:bg-white hover:text-black"
              >
                Book a Demo
              </AccessibleButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built specifically for barbers, by people who understand the business. 
              No generic booking software - this is made for your success.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
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

      {/* Accessibility Highlight */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Accessibility First
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Built with WCAG 2.1 AA compliance from the ground up. Everyone can use BookedBarber, 
            regardless of their abilities.
          </p>
          <Link href="/accessibility-demo">
            <AccessibleButton
              variant="primary"
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Try Our Accessibility Demo
            </AccessibleButton>
          </Link>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your business. Upgrade or downgrade anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-lg border-2 p-8 relative ${
                  plan.popular ? 'border-yellow-400 shadow-xl' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <span className="text-green-500 mr-3">✓</span>
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <AccessibleButton
                  variant={plan.popular ? "primary" : "secondary"}
                  className="w-full"
                >
                  Get Started
                </AccessibleButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Join thousands of barbers who've already elevated their business with BookedBarber. 
            Start your free trial today - no credit card required.
          </p>
          <AccessibleButton
            variant="primary"
            size="lg"
            className="bg-yellow-400 text-black hover:bg-yellow-300"
          >
            Start Your Free Trial
          </AccessibleButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">BookedBarber</h3>
            <p className="text-gray-400 mb-6">Own the Chair. Own the Brand.</p>
            <div className="flex justify-center space-x-6">
              <Link href="/book" className="text-gray-400 hover:text-white">
                Book Demo
              </Link>
              <Link href="/accessibility-demo" className="text-gray-400 hover:text-white">
                Accessibility Demo
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}