'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogoFull } from '@/components/ui/Logo'
import { 
  CalendarDaysIcon, 
  ChartBarIcon, 
  UserGroupIcon,
  BellIcon,
  CreditCardIcon,
  ArrowPathIcon,
  CheckIcon,
  PlayIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { AuthHeaderCTAs, AuthHeroCTAs } from '@/components/ui/AuthCTAs'
import { useConversionTracking, ConversionEventType } from '@/components/tracking/ConversionTracker'
import { ABTestingWrapper, ABTestDebugPanel } from '@/components/conversion/ABTestingWrapper'
import { EnhancedHeroSection } from '@/components/conversion/EnhancedHeroSection'
import { EnhancedSocialProof } from '@/components/conversion/EnhancedSocialProof'
import { EnhancedCTASection } from '@/components/conversion/EnhancedCTASection'
import { EnhancedMobileCTA } from '@/components/conversion/EnhancedMobileCTA'

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional')
  const { track, trackPageView } = useConversionTracking()
  
  // Track page view on load
  useEffect(() => {
    trackPageView({
      page_title: 'BookedBarber - Six Figure Barber Platform',
      page_path: '/'
    })
  }, [trackPageView])

  const features = [
    {
      icon: CalendarDaysIcon,
      title: 'Never Lose Money to No-Shows Again',
      description: 'Smart booking system with automated reminders reduces no-shows by 80%. Every missed appointment costs you $50-150 in lost revenue.',
      metric: '80% fewer no-shows'
    },
    {
      icon: ChartBarIcon,
      title: 'See Exactly Where Your Money Goes',
      description: 'Built-in Six Figure Barber analytics show you which services make the most profit and which clients are worth keeping.',
      metric: '$2,847 avg monthly increase'
    },
    {
      icon: CreditCardIcon,
      title: 'Get Paid Faster, Stress Less',
      description: 'Automated payment processing and instant payouts mean you never chase clients for money again. Focus on cutting hair, not collecting cash.',
      metric: '24hr automatic payouts'
    },
    {
      icon: ArrowPathIcon,
      title: 'Build Recurring Revenue Like Netflix',
      description: 'Lock in your best clients with automated recurring appointments. Predictable income means predictable growth.',
      metric: '67% client retention boost'
    },
    {
      icon: BellIcon,
      title: 'Marketing That Actually Works',
      description: 'Automated SMS campaigns and email marketing bring back old clients and attract new ones. No more empty chairs.',
      metric: '34% more bookings'
    },
    {
      icon: UserGroupIcon,
      title: 'Scale Beyond One Chair',
      description: 'Manage multiple locations and barbers from one dashboard. Build the empire you deserve, not just another job.',
      metric: 'Up to 10 locations'
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
    <main className="bg-white dark:bg-gray-900 mobile-safe no-overflow-x">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <LogoFull variant="auto" size="md" href="/" />
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/billing/plans" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors">
                Pricing
              </Link>
              <Link href="#features" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors">
                Features
              </Link>
              <Link href="#testimonials" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors">
                Testimonials
              </Link>
            </nav>
            <AuthHeaderCTAs />
          </div>
        </div>
      </header>

      {/* A/B Tested Hero Section */}
      <ABTestingWrapper
        testId="homepage_hero_2025"
        variants={[
          {
            id: 'default',
            name: 'Original Hero',
            weight: 25,
            component: <EnhancedHeroSection variant="default" />
          },
          {
            id: 'urgency',
            name: 'Urgency Focused',
            weight: 25,
            component: <EnhancedHeroSection variant="urgency" />
          },
          {
            id: 'social_proof',
            name: 'Social Proof',
            weight: 25,
            component: <EnhancedHeroSection variant="social_proof" />
          },
          {
            id: 'value_focused',
            name: 'Value Focused',
            weight: 25,
            component: <EnhancedHeroSection variant="value_focused" />
          }
        ]}
        fallbackVariant="default"
      />

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Scale Your Business
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Powerful features designed specifically for barbers and barbershop owners
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-primary-500"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {feature.metric}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Social Proof Section */}
      <ABTestingWrapper
        testId="social_proof_2025"
        variants={[
          {
            id: 'combined',
            name: 'Combined Stats & Testimonials',
            weight: 40,
            component: <EnhancedSocialProof variant="combined" />
          },
          {
            id: 'testimonials_focus',
            name: 'Testimonials Focus',
            weight: 30,
            component: <EnhancedSocialProof variant="testimonials_focus" />
          },
          {
            id: 'stats_focus',
            name: 'Stats Focus',
            weight: 30,
            component: <EnhancedSocialProof variant="stats_focus" />
          }
        ]}
        fallbackVariant="combined"
      />

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Choose the plan that fits your business. Upgrade or downgrade anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {Object.entries(plans).map(([key, plan]) => (
              <div
                key={key}
                className={`relative bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer ${
                  selectedPlan === key ? 'ring-2 ring-primary-500' : ''
                } ${'popular' in plan && plan.popular ? 'scale-105' : ''}`}
                onClick={() => setSelectedPlan(key as any)}
              >
                {'popular' in plan && plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-800 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {plan.description}
                  </p>
                  
                  <div className="mb-6">
                    {typeof plan.price === 'number' ? (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          ${plan.price}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
                      </div>
                    ) : (
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        {plan.price}
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckIcon className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/register">
                    <Button 
                      variant={'popular' in plan && plan.popular ? 'primary' : 'outline'} 
                      className="w-full"
                    >
                      Start Free Trial
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <ABTestingWrapper
        testId="final_cta_2025"
        variants={[
          {
            id: 'urgency',
            name: 'Urgency Focused',
            weight: 30,
            component: <EnhancedCTASection variant="urgency" size="standard" />
          },
          {
            id: 'value',
            name: 'Value Proposition',
            weight: 25,
            component: <EnhancedCTASection variant="value" size="standard" />
          },
          {
            id: 'social_proof',
            name: 'Social Proof',
            weight: 25,
            component: <EnhancedCTASection variant="social_proof" size="standard" />
          },
          {
            id: 'risk_reversal',
            name: 'Risk Reversal',
            weight: 20,
            component: <EnhancedCTASection variant="risk_reversal" size="standard" />
          }
        ]}
        fallbackVariant="urgency"
      />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <LogoFull variant="color" size="md" className="mb-4" href="#" />
              <p className="text-sm">
                The command center for barbers who want to own their chair, own their brand.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register" className="hover:text-white">Free Trial</Link></li>
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/billing/plans" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">FAQs</a></li>
                <li><a href="#" className="hover:text-white">Status</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2025 Booked Barber. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Enhanced Mobile CTA */}
      <ABTestingWrapper
        testId="mobile_cta_2025"
        variants={[
          {
            id: 'standard',
            name: 'Standard Mobile CTA',
            weight: 30,
            component: <EnhancedMobileCTA variant="standard" showOnScroll={true} scrollThreshold={0.3} />
          },
          {
            id: 'urgency',
            name: 'Urgency Mobile CTA',
            weight: 30,
            component: <EnhancedMobileCTA variant="urgency" showOnScroll={true} scrollThreshold={0.3} />
          },
          {
            id: 'value',
            name: 'Value Mobile CTA',
            weight: 25,
            component: <EnhancedMobileCTA variant="value" showOnScroll={true} scrollThreshold={0.3} />
          },
          {
            id: 'minimal',
            name: 'Minimal Mobile CTA',
            weight: 15,
            component: <EnhancedMobileCTA variant="minimal" showOnScroll={true} scrollThreshold={0.4} />
          }
        ]}
        fallbackVariant="standard"
      />
      
      {/* A/B Testing Debug Panel (Development Only) */}
      <ABTestDebugPanel />
      
    </main>
  )
}