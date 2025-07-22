'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getTrialStatus, type User, type TrialStatus } from '@/lib/api'
import { Button } from '@/components/ui/button'
import PricingCalculator from '@/components/ui/PricingCalculator'
import { ArrowLeft, Star, Zap, Check } from 'lucide-react'

// Six Figure Barber methodology aligned features
const sixFigureBarberFeatures = [
  'Six Figure Barber methodology integration',
  'Value-based pricing calculator',
  'Client lifetime value tracking',
  'Revenue optimization analytics',
  'Premium service positioning',
  'Client relationship management',
  'Automated follow-up sequences',
  'Business growth coaching'
]

// Core platform features included in every plan
const coreFeatures = [
  'Unlimited bookings',
  'Real-time scheduling',
  'Client management & history', 
  'SMS + Email notifications',
  'Mobile app (iOS & Android)',
  'Payment processing',
  'Calendar integration',
  'Staff management',
  'Custom branding',
  'Marketing tools',
  'Review management',
  'Advanced analytics',
  'Multi-location support',
  '24/7 customer support',
  'API access',
  'Data export tools'
]

// Combine all features
const allIncludedFeatures = [...sixFigureBarberFeatures, ...coreFeatures]


export default function PricingPlansPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChairs, setSelectedChairs] = useState(1)
  const [selectedMonthlyTotal, setSelectedMonthlyTotal] = useState(19)
  const [hasPermissionError, setHasPermissionError] = useState(false)
  const [permissionErrorMessage, setPermissionErrorMessage] = useState('')

  // Permission checker for billing access
  const checkBillingPermission = (userData: User): boolean => {
    // Allow billing access for these roles
    const billingAllowedRoles = [
      'SUPER_ADMIN',
      'PLATFORM_ADMIN', 
      'ENTERPRISE_OWNER',
      'SHOP_OWNER',
      'INDIVIDUAL_BARBER',
      'SHOP_MANAGER'
    ]
    
    return billingAllowedRoles.includes(userData.unified_role || userData.role || '')
  }

  useEffect(() => {
    async function fetchUserAndTrial() {
      try {
        const userData = await getProfile()
        
        // Check if user has permission to access billing
        if (!checkBillingPermission(userData)) {
          setHasPermissionError(true)
          setPermissionErrorMessage(
            `Your role (${userData.unified_role || userData.role || 'CLIENT'}) does not have permission to access billing settings. Contact your shop owner or manager for assistance.`
          )
          setLoading(false)
          return
        }
        
        setUser(userData)
        
        // Get organization-based trial status if user has an organization
        if (userData.primary_organization_id) {
          try {
            const trialData = await getTrialStatus(userData.primary_organization_id)
            setTrialStatus(trialData)
            setSelectedChairs(trialData.chairs_count)
            setSelectedMonthlyTotal(trialData.monthly_cost)
          } catch (trialError) {
            console.warn('Failed to fetch trial status:', trialError)
            // Continue without trial data
          }
        } else if (userData.unified_role !== 'CLIENT') {
          // For non-client users without organizations, show message to create organization
          setPermissionErrorMessage(
            'You need to create or join an organization to access billing plans. Please contact support for assistance.'
          )
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUserAndTrial()
  }, [router])

  const handleChairSelection = (chairs: number, monthlyTotal: number) => {
    setSelectedChairs(chairs)
    setSelectedMonthlyTotal(monthlyTotal)
    
    // Redirect to checkout with selected pricing and organization context
    const params = new URLSearchParams({
      chairs: chairs.toString(),
      total: monthlyTotal.toString()
    })
    
    if (user?.primary_organization_id) {
      params.append('organizationId', user.primary_organization_id.toString())
    }
    
    router.push(`/billing/checkout?${params.toString()}`)
  }

  const getTrialDaysRemaining = () => {
    if (trialStatus?.trial_active) {
      return trialStatus.days_remaining
    }
    return 0
  }

  const isTrialExpiringSoon = () => {
    const daysRemaining = getTrialDaysRemaining()
    return daysRemaining <= 7 && daysRemaining > 0
  }

  const isTrialActive = () => {
    return trialStatus?.trial_active || false
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Permission error UI
  if (hasPermissionError) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
                Access Restricted
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-6">
                {permissionErrorMessage}
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => window.location.href = 'mailto:support@bookedbarber.com'}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Simple, chair-based pricing that scales with your business. No surprises, no hidden fees.
            </p>
            
            {isTrialActive() && (
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                isTrialExpiringSoon() 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
              }`}>
                {getTrialDaysRemaining() > 0 
                  ? `${getTrialDaysRemaining()} days left in your free trial`
                  : 'Your trial has expired'
                }
              </div>
            )}
            
            {trialStatus && !trialStatus.trial_active && trialStatus.subscription_status === 'expired' && (
              <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                Trial expired - Add payment method to reactivate
              </div>
            )}
          </div>
        </div>

        {/* Pricing Calculator */}
        <div className="max-w-4xl mx-auto mb-12">
          <PricingCalculator 
            onSelectChairs={handleChairSelection}
            initialChairs={trialStatus?.chairs_count || selectedChairs}
            showComparison={true}
            className="shadow-lg"
          />
        </div>

        {/* Six Figure Barber Value Proposition */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-8 mb-12 border-2 border-yellow-200 dark:border-yellow-700">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white mb-4">
              <span className="text-2xl font-bold">6FB</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Built on the Six Figure Barber Methodology
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              The only platform designed specifically to implement the proven Six Figure Barber system. 
              Transform your barbering from a traditional trade into a scalable, six-figure business.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div className="text-center space-y-2 bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Value-Based Pricing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Price your services based on value delivered, not time spent</p>
              </div>
              
              <div className="text-center space-y-2 bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Client Relationships</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Build lasting relationships that drive repeat business and referrals</p>
              </div>
              
              <div className="text-center space-y-2 bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Business Systems</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Scalable systems that work without constant oversight</p>
              </div>
              
              <div className="text-center space-y-2 bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
                  <Star className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Premium Positioning</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Position yourself as a premium service provider, not a commodity</p>
              </div>
            </div>
            
            <div className="mt-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">The Six Figure Promise</h3>
              <p className="text-green-100">
                Follow the proven methodology. Use our platform. Build a six-figure barbering business.
                Join over 10,000 barbers who have transformed their careers with this system.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Everything You Need to Build a Six-Figure Business
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Six Figure Barber Features */}
            <div>
              <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mb-4 flex items-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-sm font-bold mr-2">6FB</span>
                Six Figure Barber Methodology
              </h3>
              <div className="space-y-3">
                {sixFigureBarberFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <Check className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Platform Features */}
            <div>
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                Complete Platform Features
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {coreFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature Highlight */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                The Only Platform Built Specifically for Six Figure Barbers
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                While other platforms focus on basic scheduling, BookedBarber implements the complete Six Figure Barber methodology 
                to transform your business from a traditional service into a scalable, profitable enterprise.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Can I change plans later?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately for upgrades and at the next billing cycle for downgrades.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Is there a setup fee?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  No setup fees! All plans include free setup and onboarding assistance.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  We accept all major credit cards through Stripe. Enterprise customers can also pay by bank transfer.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Can I cancel anytime?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Absolutely. Cancel anytime with no penalties. Your plan remains active until the end of your current billing period.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Need a custom plan or have questions?
          </p>
          <Button variant="outline" onClick={() => window.location.href = 'mailto:sales@bookedbarber.com'}>
            Contact Sales
          </Button>
        </div>
      </div>
    </main>
  )
}