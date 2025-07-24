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
  StarIcon,
  TrophyIcon,
  BoltIcon,
  ShieldCheckIcon,
  SparklesIcon
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
      metric: '80% fewer no-shows',
      color: 'from-blue-500 to-indigo-600',
      benefits: ['Automated SMS/email reminders', 'Real-time availability updates', 'Smart scheduling optimization']
    },
    {
      icon: ChartBarIcon,
      title: 'See Exactly Where Your Money Goes',
      description: 'Built-in Six Figure Barber analytics show you which services make the most profit and which clients are worth keeping.',
      metric: '$2,847 avg monthly increase',
      color: 'from-green-500 to-emerald-600',
      benefits: ['Revenue tracking by service', 'Client lifetime value analysis', 'Profit margin insights']
    },
    {
      icon: CreditCardIcon,
      title: 'Get Paid Faster, Stress Less',
      description: 'Automated payment processing and instant payouts mean you never chase clients for money again. Focus on cutting hair, not collecting cash.',
      metric: '24hr automatic payouts',
      color: 'from-purple-500 to-violet-600',
      benefits: ['Contactless payments', 'Instant card processing', 'Automated payouts']
    },
    {
      icon: ArrowPathIcon,
      title: 'Build Recurring Revenue Like Netflix',
      description: 'Lock in your best clients with automated recurring appointments. Predictable income means predictable growth.',
      metric: '67% client retention boost',
      color: 'from-orange-500 to-red-500',
      benefits: ['Subscription-style bookings', 'Automated rebooking', 'Client loyalty programs']
    },
    {
      icon: BellIcon,
      title: 'Marketing That Actually Works',
      description: 'Automated SMS campaigns and email marketing bring back old clients and attract new ones. No more empty chairs.',
      metric: '34% more bookings',
      color: 'from-teal-500 to-cyan-600',
      benefits: ['Targeted email campaigns', 'SMS marketing automation', 'Social media integration']
    },
    {
      icon: UserGroupIcon,
      title: 'Scale Beyond One Chair',
      description: 'Manage multiple locations and barbers from one dashboard. Build the empire you deserve, not just another job.',
      metric: 'Up to 10 locations',
      color: 'from-pink-500 to-rose-600',
      benefits: ['Multi-location management', 'Staff scheduling tools', 'Centralized reporting']
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
                className="group bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-800 hover:border-transparent hover:scale-105 relative overflow-hidden"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                        {feature.metric}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  {/* Benefits list */}
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <CheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Interactive button */}
                  <div className="mt-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full border-gray-200 hover:border-transparent hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700"
                      onClick={() => track('feature_interest', { feature: feature.title })}
                    >
                      Learn More
                      <SparklesIcon className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Metrics Section */}
      <section className="py-16 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">15,000+</span> Successful Barbers
            </h2>
            <p className="text-xl text-gray-300">
              Barbers using BookedBarber are earning 6-figures and building sustainable businesses
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <TrophyIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">15,000+</div>
              <div className="text-gray-400">Active Barbers</div>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <BoltIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">2.3M+</div>
              <div className="text-gray-400">Appointments Booked</div>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <CreditCardIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">$127M+</div>
              <div className="text-gray-400">Revenue Processed</div>
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">99.9%</div>
              <div className="text-gray-400">Uptime Guarantee</div>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
              <StarIcon className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-yellow-400 font-semibold mr-2">4.9/5</span>
              <span className="text-gray-300">rated by 2,500+ barbers</span>
            </div>
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

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {Object.entries(plans).map(([key, plan]) => (
              <div
                key={key}
                className={`group relative bg-white dark:bg-gray-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 overflow-hidden ${
                  selectedPlan === key 
                    ? 'border-primary-500 ring-4 ring-primary-500/20 transform scale-105' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                } ${'popular' in plan && plan.popular ? 'scale-105 md:scale-110' : ''}`}
                onClick={() => setSelectedPlan(key as any)}
              >
                {/* Popular badge */}
                {'popular' in plan && plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                      ⭐ Most Popular
                    </div>
                  </div>
                )}
                
                {/* Gradient background for popular plan */}
                {'popular' in plan && plan.popular && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 opacity-50" />
                )}
                
                <div className="relative z-10 p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {plan.description}
                    </p>
                    
                    <div className="mb-6">
                      {typeof plan.price === 'number' ? (
                        <div className="flex items-center justify-center">
                          <span className="text-5xl font-bold text-gray-900 dark:text-white">
                            ${plan.price}
                          </span>
                          <div className="ml-2 text-left">
                            <div className="text-gray-600 dark:text-gray-400 text-sm">/month</div>
                            <div className="text-gray-500 dark:text-gray-500 text-xs">billed monthly</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-5xl font-bold text-gray-900 dark:text-white">
                          {plan.price}
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start group-hover:translate-x-1 transition-transform duration-200" style={{ transitionDelay: `${index * 50}ms` }}>
                        <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mt-0.5 mr-3">
                          <CheckIcon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/register" onClick={() => track('pricing_plan_selected', { plan: key })}>
                    <Button 
                      variant={'popular' in plan && plan.popular ? 'default' : 'outline'} 
                      className={`w-full py-3 text-base font-semibold transition-all duration-300 ${
                        'popular' in plan && plan.popular 
                          ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl' 
                          : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-800 dark:hover:to-gray-700'
                      }`}
                    >
                      {'popular' in plan && plan.popular ? '🚀 Start Free Trial' : 'Start Free Trial'}
                    </Button>
                  </Link>
                  
                  {/* Money back guarantee */}
                  <div className="mt-4 text-center">
                    <div className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <ShieldCheckIcon className="w-4 h-4 mr-1" />
                      30-day money-back guarantee
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pricing FAQ */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full px-6 py-3">
              <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-blue-800 dark:text-blue-200 font-medium">All plans include 14-day free trial • No setup fees • Cancel anytime</span>
            </div>
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