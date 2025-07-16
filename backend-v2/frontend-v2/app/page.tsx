'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
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
import { useState } from 'react'
import { FooterCTAs, CTADebugPanel } from '@/components/ui/CTASystem'
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
      quote: "Booked Barber increased my monthly revenue by 40% in just 3 months. The analytics showed me exactly where I was losing money.",
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
    <>
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
      
      <main className="bg-white dark:bg-gray-900 mobile-safe no-overflow-x overflow-x-hidden">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center">
              <LogoFull variant="auto" size="sm" href="/" className="scale-90 sm:scale-110" />
            </div>
            <nav className="hidden md:flex items-center space-x-6 lg:space-x-10">
              <Link href="#pricing" className="text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-all duration-300 ease-out hover:scale-105 px-2 lg:px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Pricing
              </Link>
              <Link href="#features" className="text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-all duration-300 ease-out hover:scale-105 px-2 lg:px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Features
              </Link>
              <Link href="#testimonials" className="text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-all duration-300 ease-out hover:scale-105 px-2 lg:px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                Testimonials
              </Link>
            </nav>
            <div className="flex-shrink-0">
              <AuthHeaderCTAs />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 xl:py-32">
          <div className="text-center space-y-6 sm:space-y-8 lg:space-y-10">
            <div className="flex justify-center items-center mb-6 sm:mb-8 lg:mb-10">
              <LogoFull 
                size="xl"
                variant="auto"
                href={null}
                className="h-16 sm:h-20 md:h-24 lg:h-28 xl:h-32"
              />
            </div>
            
            <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 dark:text-white leading-[1.1] sm:leading-[1.1] max-w-5xl mx-auto px-2">
              The booking platform that puts
              <span className="text-primary-600 dark:text-primary-400 block sm:inline"> your chair first</span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl leading-relaxed text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-medium px-4">
              Turn your chair into a thriving business with our all-in-one booking and management platform. 
              Built on proven Six Figure Barber methodology.
            </p>

            <div className="pt-4 sm:pt-6 lg:pt-8">
              <AuthHeroCTAs />
            </div>

            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4">
              No credit card required • Setup in 2 minutes • Cancel anytime
            </p>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow animation-delay-1000"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-800" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Scale Your Business
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Powerful features designed specifically for barbers and barbershop owners
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/30 transition-all duration-300">
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="testimonials" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Top Barbers Nationwide
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Join thousands of barbers growing their business with Booked Barber
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-gray-50 dark:bg-gray-800 p-6 sm:p-8 rounded-xl hover:shadow-lg hover:-translate-y-2 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 ease-out cursor-pointer group"
              >
                <div className="flex mb-3 sm:mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i} className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 fill-current group-hover:scale-110 transition-transform duration-300" style={{ transitionDelay: `${i * 50}ms` }} />
                  ))}
                </div>
                <blockquote className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4 sm:mb-6 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-300 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                <div>
                  <div className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
                    {testimonial.author}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 sm:mt-16 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-6 sm:space-y-0 sm:space-x-6 lg:space-x-8 text-gray-600 dark:text-gray-400">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">10K+</div>
                <div className="text-xs sm:text-sm">Active Barbers</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-gray-300 dark:bg-gray-700"></div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">500K+</div>
                <div className="text-xs sm:text-sm">Appointments Booked</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-gray-300 dark:bg-gray-700"></div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">$5M+</div>
                <div className="text-xs sm:text-sm">Revenue Processed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50 dark:bg-gray-800" aria-labelledby="pricing-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="pricing-heading" className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Choose the plan that fits your business. Upgrade or downgrade anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {Object.entries(plans).map(([key, plan]) => (
              <div
                key={key}
                className={`relative bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer group ${
                  selectedPlan === key ? 'ring-2 ring-primary-500 shadow-lg' : ''
                } ${'popular' in plan && plan.popular ? 'sm:scale-105' : ''}`}
                onClick={() => setSelectedPlan(key as any)}
              >
                {'popular' in plan && plan.popular && (
                  <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gray-900 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium shadow-sm group-hover:bg-primary-600 transition-colors duration-300">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
                    {plan.name}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                    {plan.description}
                  </p>
                  
                  <div className="mb-6">
                    {typeof plan.price === 'number' ? (
                      <div className="flex items-baseline">
                        <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
                          ${plan.price}
                        </span>
                        <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 ml-2">/month</span>
                      </div>
                    ) : (
                      <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300">
                        {plan.price}
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start transform transition-all duration-300 group-hover:translate-x-1">
                        <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 dark:text-primary-400 mt-0.5 mr-2 sm:mr-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" style={{ transitionDelay: `${index * 50}ms` }} />
                        <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href={key === 'enterprise' ? "mailto:sales@bookedbarber.com?subject=Enterprise Consultation Request" : "/register"}>
                    <Button 
                      variant={key === 'enterprise' ? 'outline' : ('popular' in plan && plan.popular ? 'warning' : 'warning')} 
                      className="w-full group-hover:scale-105 transition-transform duration-300 min-h-[44px] text-sm sm:text-base"
                    >
                      {key === 'enterprise' ? 'Book a Consultation' : 'Start Free Trial'}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 bg-primary-600 dark:bg-primary-700" aria-labelledby="cta-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="cta-heading" className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Grow Your Business?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of successful barbers using Booked Barber to build their six-figure business.
          </p>
          <AuthHeroCTAs />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <LogoFull variant="color" size="md" className="mb-4" href="#" />
              <p className="text-sm leading-relaxed">
                The command center for barbers who want to own their chair, own their brand.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/register" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Free Trial</Link></li>
                <li><Link href="#features" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Features</Link></li>
                <li><Link href="/billing/plans" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Pricing</Link></li>
                <li><Link href="/login" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Login</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/documentation" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Documentation</Link></li>
                <li><Link href="/contact" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">FAQs</Link></li>
                <li><Link href="/status" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Status</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 sm:mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block py-1">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-800 text-center text-xs sm:text-sm">
            <p>&copy; 2025 Booked Barber. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      </main>
    </>
  )
}