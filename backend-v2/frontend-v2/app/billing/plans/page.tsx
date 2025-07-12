'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getTrialStatus, type User, type TrialStatus } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import PricingCalculator from '@/components/ui/PricingCalculator'
import { ArrowLeft, Star, Zap, Check } from 'lucide-react'

// All features included in every plan
const allIncludedFeatures = [
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


export default function PricingPlansPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChairs, setSelectedChairs] = useState(1)
  const [selectedMonthlyTotal, setSelectedMonthlyTotal] = useState(19)

  useEffect(() => {
    async function fetchUserAndTrial() {
      try {
        const userData = await getProfile()
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

        {/* Value Proposition */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-8 mb-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Why Choose BookedBarber?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built by barbers, for barbers. Our platform combines the Six Figure Barber methodology with cutting-edge technology.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  <Star className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">No Setup Fees</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Get started immediately with zero upfront costs</p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">All Features Included</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Every plan includes our complete feature set</p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">14-Day Free Trial</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Try everything risk-free, no credit card required</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Everything You Need to Grow Your Business
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {allIncludedFeatures.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
              </div>
            ))}
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