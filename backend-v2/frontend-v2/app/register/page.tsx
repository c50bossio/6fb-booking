'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SimpleRegistration } from '@/components/registration/SimpleRegistration'
import { RegistrationData } from '@/components/registration/types'
import { registerComplete, CompleteRegistrationData } from '@/lib/api'
import { applyServiceTemplate } from '@/lib/api/service-templates'
import Link from 'next/link'
import { LogoFull } from '@/components/ui/Logo'
import { ArrowLeftIcon, SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { SocialLoginGroup } from '@/components/auth/SocialLoginButton'
import { useToast } from '@/hooks/use-toast'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Ensure client-side hydration
  useEffect(() => {
    setIsClient(true)
  }, [])
  

  const handleComplete = async (data: RegistrationData) => {
    setLoading(true)
    setError('')

    try {
      // Map the registration data to the complete registration API format
      const registrationPayload: CompleteRegistrationData = {
        firstName: data.name.split(' ')[0] || data.name,
        lastName: data.name.split(' ').slice(1).join(' ') || '',
        email: data.email,
        password: data.password,
        user_type: data.businessType === 'individual' ? 'barber' : 'barbershop',
        businessName: data.businessName || `${data.name.split(' ')[0]}'s Barber Shop`,
        businessType: data.businessType === 'shop' ? 'studio' : (data.businessType || 'individual'),
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: ''
        },
        phone: data.phone || '',
        website: '',
        chairCount: 1,
        barberCount: 1,
        description: '',
        pricingInfo: undefined,
        consent: {
          terms: data.acceptTerms,
          privacy: data.acceptTerms,
          marketing: data.acceptMarketing,
          testData: data.acceptTestData || false
        }
      }

      // Call the complete registration API
      const registrationResponse = await registerComplete(registrationPayload)

      // Apply service template if one was selected
      if (data.serviceTemplate && registrationResponse.user) {
        try {
          console.log('[RegisterPage] Applying service template:', data.serviceTemplate)
          
          // Apply the template
          await applyServiceTemplate({
            templateId: data.serviceTemplate,
            userId: registrationResponse.user.id,
            customizations: {}
          })
          
          console.log('[RegisterPage] Service template applied successfully')
        } catch (templateError) {
          console.error('[RegisterPage] Error applying service template:', templateError)
          // Don't fail registration if template application fails
          // Templates can be applied later from the dashboard
        }
      }

      // Redirect to check-email page
      router.push(`/check-email?email=${encodeURIComponent(data.email)}`)
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }


  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">

      {/* Header */}
      <header className="relative z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-3 group transition-all duration-200 hover:transform hover:scale-105" aria-label="Go back to homepage">
              <div className="p-2 rounded-lg group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-all duration-200">
                <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200" />
              </div>
              <LogoFull variant="auto" size="md" noLink={true} className="h-12 transition-transform duration-200 group-hover:scale-105" />
            </Link>
            
            <div className="flex items-center">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
              >
                <span className="hidden sm:inline mr-2 text-primary-100">Already have an account?</span>
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-2 bg-primary-100 dark:bg-primary-900/20 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800/30 transition-all duration-300 animate-pulse">
            <SparklesIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-400 dark:to-blue-400">The System That Puts Your Chair First!</span>
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Join thousands of barbers building their empire with BookedBarber's all-in-one platform
          </p>



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
        {/* Form Title */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/30 dark:to-blue-900/30 rounded-2xl p-6 shadow-lg border border-primary-200 dark:border-primary-700">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Start your 14 day free trial
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400 font-medium">14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400 font-medium">No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400 font-medium">Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
        {/* Unified Registration Form */}
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            {/* Social Login Section */}
            <div className="mb-6">
              <SocialLoginGroup 
                onError={(error) => {
                  toast({
                    variant: 'destructive',
                    title: 'Social login error',
                    description: error.message
                  })
                }}
              />
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>

            {/* Email Registration Section */}
            <div>
              <SimpleRegistration
                onComplete={handleComplete}
                loading={loading}
                error={error}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Testimonials */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Trusted by Barbers Nationwide
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
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