'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, updateOnboardingStatus, type User } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  Circle, 
  Rocket, 
  Building2, 
  Users, 
  Calendar, 
  CreditCard,
  Settings,
  ArrowRight,
  Sparkles,
  BookOpen,
  PlayCircle
} from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  completed: boolean
  optional?: boolean
}

export default function WelcomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [skipping, setSkipping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUserData() {
      try {
        const userData = await getProfile()
        setUser(userData)
        
        // Load completed steps from user's onboarding status
        if (userData.onboarding_status?.completed_steps) {
          setCompletedSteps(userData.onboarding_status.completed_steps)
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your business hours, services, and contact info',
      icon: Building2,
      href: '/settings/business',
      completed: completedSteps.includes('profile')
    },
    {
      id: 'staff',
      title: 'Add Your Team',
      description: 'Invite barbers and staff members to your organization',
      icon: Users,
      href: '/settings/team',
      completed: completedSteps.includes('staff'),
      optional: user?.unified_role === 'INDIVIDUAL_BARBER'
    },
    {
      id: 'services',
      title: 'Set Up Services',
      description: 'Create your service menu with pricing and duration',
      icon: Settings,
      href: '/settings/services',
      completed: completedSteps.includes('services')
    },
    {
      id: 'calendar',
      title: 'Connect Your Calendar',
      description: 'Sync with Google Calendar for seamless scheduling',
      icon: Calendar,
      href: '/settings/integrations',
      completed: completedSteps.includes('calendar'),
      optional: true
    },
    {
      id: 'payment',
      title: 'Set Up Payments',
      description: 'Connect Stripe to accept online payments',
      icon: CreditCard,
      href: '/settings/payments',
      completed: completedSteps.includes('payment')
    }
  ]

  const requiredSteps = onboardingSteps.filter(step => !step.optional)
  const completedRequiredSteps = requiredSteps.filter(step => step.completed).length
  const progress = (completedRequiredSteps / requiredSteps.length) * 100

  const handleStepComplete = async (stepId: string) => {
    const newCompletedSteps = [...completedSteps, stepId]
    setCompletedSteps(newCompletedSteps)
    
    // Update onboarding status in backend
    try {
      await updateOnboardingStatus({
        completed_steps: newCompletedSteps,
        current_step: currentStep + 1
      })
    } catch (error) {
      console.error('Failed to update onboarding status:', error)
    }
  }

  const handleSkipOnboarding = async () => {
    try {
      setSkipping(true)
      setError(null)
      
      await updateOnboardingStatus({
        completed: true,
        skipped: true
      })
      
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to skip onboarding:', error)
      setError('Failed to skip onboarding. Please try again or contact support if the problem persists.')
    } finally {
      setSkipping(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            <div className="grid gap-4 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Welcome to BookedBarber, {user?.first_name}! 
                  <Sparkles className="inline-block h-6 w-6 ml-2 text-yellow-500" />
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Let&apos;s get your barbershop set up in just a few minutes
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleSkipOnboarding}
              variant="outline"
              size="sm"
              disabled={skipping}
            >
              {skipping ? 'Skipping...' : 'Skip for now'}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
              <CardContent className="py-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full">
                    <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
                    <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                  </div>
                  <Button
                    onClick={() => setError(null)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Setup Progress
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {completedRequiredSteps} of {requiredSteps.length} steps
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Onboarding Steps */}
        <div className="grid gap-4 mb-8">
          {onboardingSteps.map((step, index) => (
            <Card 
              key={step.id} 
              className={`transition-all ${
                step.completed 
                  ? 'opacity-75 border-green-200 dark:border-green-800' 
                  : 'hover:shadow-lg cursor-pointer'
              }`}
              onClick={() => !step.completed && router.push(step.href)}
            >
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${
                      step.completed 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <step.icon className={`h-6 w-6 ${
                        step.completed 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {step.title}
                        </h3>
                        {step.optional && (
                          <Badge variant="outline" className="text-xs">
                            Optional
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {step.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <>
                        <Circle className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Start Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="py-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Getting Started Guide
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Learn the basics of BookedBarber
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Read Guide
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="py-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <PlayCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Video Tutorials
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Watch step-by-step tutorials
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Watch Videos
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="py-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Join Community
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Connect with other barbers
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Join Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completion Message */}
        {progress === 100 && (
          <Card className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardContent className="py-6">
              <div className="text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />
                <div>
                  <h2 className="text-xl font-bold text-green-800 dark:text-green-200">
                    Congratulations! You&apos;re all set up!
                  </h2>
                  <p className="text-green-700 dark:text-green-300 mt-2">
                    Your barbershop is ready to start taking bookings
                  </p>
                </div>
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="mt-4"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}