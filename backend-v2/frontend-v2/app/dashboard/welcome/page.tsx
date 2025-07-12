'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
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
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [skipping, setSkipping] = useState(false)

  // Mock user data
  const user = {
    first_name: 'Admin',
    name: 'Admin Test User',
    unified_role: 'INDIVIDUAL_BARBER'
  }

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
      optional: true
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
    }
  ]

  const requiredSteps = onboardingSteps.filter(step => !step.optional)
  const completedRequiredSteps = requiredSteps.filter(step => step.completed).length
  const progress = (completedRequiredSteps / requiredSteps.length) * 100

  const handleSkipOnboarding = () => {
    setSkipping(true)
    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
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
                  Welcome to BookedBarber, {user.first_name}! 
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