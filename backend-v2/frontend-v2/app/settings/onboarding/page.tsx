'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, resetOnboardingStatus, type User } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  RefreshCw,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href: string
  completed: boolean
  optional?: boolean
}

export default function OnboardingManagementPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
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
        setError('Failed to load onboarding status. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

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
      optional: (user?.unified_role as string) === 'INDIVIDUAL_BARBER'
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
  const progress = requiredSteps.length > 0 ? (completedRequiredSteps / requiredSteps.length) * 100 : 0

  const handleResetOnboarding = async () => {
    try {
      setResetting(true)
      setError(null)
      
      const updatedUser = await resetOnboardingStatus()
      setUser(updatedUser)
      setCompletedSteps([])
      
      // Redirect to welcome page to start fresh
      router.push('/dashboard/welcome')
    } catch (error) {
      console.error('Failed to reset onboarding:', error)
      setError('Failed to reset onboarding. Please try again or contact support if the problem persists.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
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
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Setup & Onboarding
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your account setup process and welcome wizard
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30">
            <CardContent className="py-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="text-red-800 dark:text-red-200 font-medium">Error</p>
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
                <Button
                  onClick={() => setError(null)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 dark:text-red-400"
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Setup Status</span>
            {user?.onboarding_completed ? (
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                ✓ Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                In Progress
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {completedRequiredSteps} of {requiredSteps.length} required steps
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {user?.onboarding_status?.skipped && (
            <div className="flex items-center space-x-2 text-sm text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Setup was previously skipped</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {onboardingSteps.map((step) => (
            <div 
              key={step.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                step.completed 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${
                  step.completed 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  <step.icon className={`h-5 w-5 ${
                    step.completed 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                    {step.optional && (
                      <Badge variant="outline" className="text-xs">
                        Optional
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {step.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(step.href)}
                  className="flex items-center space-x-1"
                >
                  <span>{step.completed ? 'Review' : 'Setup'}</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Restart Setup Wizard
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Reset your onboarding progress and go through the welcome wizard again
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    disabled={resetting}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
                    <span>{resetting ? 'Resetting...' : 'Restart'}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Restart Setup Wizard?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        This will reset your onboarding progress and take you back to the welcome page. 
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Note:</strong> Your existing business settings, services, and data will not be deleted. 
                        Only your onboarding completion status will be reset.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetOnboarding}>
                      Yes, Restart Setup
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Complete Setup Now
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Go to the welcome wizard to finish your setup
                </p>
              </div>
              
              <Button 
                onClick={() => router.push('/dashboard/welcome')}
                className="flex items-center space-x-2"
              >
                <Rocket className="h-4 w-4" />
                <span>Continue Setup</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}