'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MultiStepRegistration, RegistrationData } from '@/components/registration'
import { registerComplete, CompleteRegistrationData } from '@/lib/api'
import { applyServiceTemplate } from '@/lib/api/service-templates'
import Link from 'next/link'
import { LogoFull } from '@/components/ui/Logo'
import { ArrowLeftIcon, SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { SocialLoginGroup } from '@/components/auth/SocialLoginButton'
import { useToast } from '@/hooks/use-toast'
import { getBusinessContextError, formatErrorForToast } from '@/lib/error-messages'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Debug: Log when component mounts
  React.useEffect(() => {
    console.log('[RegisterPage] Component mounted successfully')
    console.log('[RegisterPage] handleComplete function exists:', !!handleComplete)
    console.log('[RegisterPage] handleCancel function exists:', !!handleCancel)
  }, [])

  const handleComplete = async (data: RegistrationData) => {
    setLoading(true)
    setError('')

    try {
      // Map the registration data to the complete registration API format
      const registrationPayload: CompleteRegistrationData = {
        firstName: data.accountInfo.firstName,
        lastName: data.accountInfo.lastName,
        email: data.accountInfo.email,
        password: data.accountInfo.password,
        user_type: (data.businessType || 'individual') === 'individual' ? 'barber' : 'barbershop',
        businessName: data.businessInfo.businessName,
        businessType: (() => {
          const type = data.businessType || 'individual'
          // Map 'solo' to 'individual' for API compatibility
          return type === 'solo' ? 'individual' : type
        })() as 'enterprise' | 'individual' | 'studio' | 'salon',
        address: {
          street: data.businessInfo.address.street,
          city: data.businessInfo.address.city,
          state: data.businessInfo.address.state,
          zipCode: data.businessInfo.address.zipCode
        },
        phone: data.businessInfo.phone,
        website: data.businessInfo.website,
        chairCount: data.businessInfo.chairCount,
        barberCount: data.businessInfo.barberCount,
        description: data.businessInfo.description,
        pricingInfo: data.pricingInfo ? {
          chairs: data.pricingInfo.chairs,
          monthlyTotal: data.pricingInfo.monthlyTotal,
          tier: data.pricingInfo.tier
        } : undefined,
        consent: {
          terms: data.accountInfo.consent.terms,
          privacy: data.accountInfo.consent.privacy,
          marketing: data.accountInfo.consent.marketing,
          testData: data.accountInfo.consent.testData
        }
      }

      // Call the complete registration API
      await registerComplete(registrationPayload)

      // Apply service templates if any were selected
      if (data.serviceTemplates && data.serviceTemplates.length > 0) {
        try {
          console.log('[RegisterPage] Applying service templates:', data.serviceTemplates)
          
          // Apply each template
          for (const template of data.serviceTemplates) {
            await applyServiceTemplate({
              template_id: template.id,
              custom_price: template.suggested_base_price,
              custom_description: template.description || '',
              apply_business_rules: true,
              apply_pricing_rules: true
            })
          }
          
          console.log('[RegisterPage] Service templates applied successfully')
        } catch (templateError) {
          console.error('[RegisterPage] Error applying service templates:', templateError)
          // Don't fail registration if template application fails
          // Templates can be applied later from the dashboard
        }
      }

      // Redirect to check-email page
      router.push(`/check-email?email=${encodeURIComponent(data.accountInfo.email)}`)
    } catch (err: any) {
      // Generate enhanced error message for registration
      const enhancedError = getBusinessContextError('registration', err, {
        userType: (data.businessType || 'individual') === 'individual' ? 'barber' : 'barbershop',
        feature: 'account_creation'
      })
      
      // Set user-friendly error message
      setError(enhancedError.message + '. ' + enhancedError.explanation)
      
      // Also show toast with enhanced error
      toast(formatErrorForToast(enhancedError))
      
      console.error('Registration failed:', err)
      console.error('Enhanced registration error:', enhancedError)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/')
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">

      {/* Header */}
      <header className="relative z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-3 group">
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
              <LogoFull variant="auto" size="md" noLink={true} />
            </Link>
            
            <div className="flex items-center space-x-6">
              <span className="hidden sm:flex items-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?
              </span>
              <Link
                href="/login"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-2 bg-primary-100 dark:bg-primary-900/20 rounded-full">
            <SparklesIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          
          <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">
            Start Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400">Six Figure</span> Journey
          </h1>
          
          <p className="text-lg text-accent-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join thousands of barbers building their empire with BookedBarber's all-in-one platform
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 pt-4">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Cancel anytime</span>
            </div>
          </div>

          {/* Social Proof - Success Metrics */}
          <div className="pt-6">
            <div className="flex flex-wrap justify-center items-center gap-8 text-center">
              <div className="flex flex-col items-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">2,500+</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active Barbers</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">$1.2M+</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Revenue Generated</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">150k+</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Appointments Booked</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Notification */}
      {error && (
        <div className="fixed top-20 right-4 z-50 max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Registration Error</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl transform scale-100 transition-all">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 dark:border-primary-800"></div>
                <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary-600 dark:border-t-primary-400"></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-gray-900 dark:text-white">Creating your account...</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">This will just take a moment</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registration Form Container */}
      <div className="relative z-10">
        {/* Social Login Options */}
        <div className="max-w-md mx-auto px-4 pb-8">
          <SocialLoginGroup 
            onError={(error) => {
              // Generate enhanced error message for social registration
              const enhancedError = getBusinessContextError('social_registration', error, {
                userType: 'client',
                feature: 'social_authentication'
              })
              
              // Show enhanced error message
              toast(formatErrorForToast(enhancedError))
            }}
          />
        </div>

        <MultiStepRegistration
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>

      {/* Customer Testimonials */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="text-center mb-12">
          <h2 className="text-ios-title1 font-semibold text-accent-800 dark:text-gray-100 tracking-tight mb-4">
            Trusted by Barbers Nationwide
          </h2>
          <p className="text-accent-600 dark:text-gray-300">
            See what other barbers are saying about BookedBarber
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Testimonial 1 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="flex text-yellow-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              </div>
            </div>
            <blockquote className="text-gray-700 dark:text-gray-300 mb-4">
              "BookedBarber completely transformed my business. I went from struggling to fill my chair to being booked solid 3 weeks out. The automated reminders alone cut my no-shows by 80%."
            </blockquote>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                MJ
              </div>
              <div className="ml-3">
                <p className="font-semibold text-gray-900 dark:text-white">Marcus Johnson</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Solo Barber, Atlanta</p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="flex text-yellow-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              </div>
            </div>
            <blockquote className="text-gray-700 dark:text-gray-300 mb-4">
              "Running 4 locations was a nightmare before BookedBarber. Now I can see everything from one dashboard, manage my staff schedules, and track performance across all shops. Revenue is up 40%."
            </blockquote>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-sm">
                CR
              </div>
              <div className="ml-3">
                <p className="font-semibold text-gray-900 dark:text-white">Carlos Rodriguez</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Shop Owner, Miami</p>
              </div>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="flex text-yellow-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              </div>
            </div>
            <blockquote className="text-gray-700 dark:text-gray-300 mb-4">
              "The analytics are incredible. I can see exactly which services are most profitable, when my peak hours are, and how to optimize my pricing. Made my first six figures this year!"
            </blockquote>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                AW
              </div>
              <div className="ml-3">
                <p className="font-semibold text-gray-900 dark:text-white">Angela Williams</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Independent Barber, Houston</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}