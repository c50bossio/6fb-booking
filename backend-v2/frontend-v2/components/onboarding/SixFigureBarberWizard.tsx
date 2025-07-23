'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Circle, Star, Target, DollarSign, Clock, Users, TrendingUp, ArrowLeft, ArrowRight, X } from 'lucide-react'
import { SixFigureWizardProvider, useSixFigureWizard } from './SixFigureWizardContext'
import { WelcomeStep } from './steps/WelcomeStep'
import { GoalSettingStep } from './steps/GoalSettingStep'
import { ServicePortfolioStep } from './steps/ServicePortfolioStep'
import { PricingStrategyStep } from './steps/PricingStrategyStep'
import { BusinessConfigurationStep } from './steps/BusinessConfigurationStep'
import { ClientTierStep } from './steps/ClientTierStep'
import { MarketingSetupStep } from './steps/MarketingSetupStep'
import { CompletionStep } from './steps/CompletionStep'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/use-toast'

// Six Figure Barber Wizard Steps Configuration
const WIZARD_STEPS = [
  {
    id: 0,
    title: 'Welcome to Six Figure Success',
    subtitle: 'Your journey to premium barbering excellence',
    icon: Star,
    description: 'Learn about the Six Figure Barber methodology and get started',
    estimatedTime: '2 minutes'
  },
  {
    id: 1,
    title: 'Set Your Goals',
    subtitle: 'Define your path to six figures',
    icon: Target,
    description: 'Establish your revenue targets and success metrics',
    estimatedTime: '5 minutes'
  },
  {
    id: 2,
    title: 'Service Portfolio',
    subtitle: 'Build your signature offerings',
    icon: DollarSign,
    description: 'Create premium services aligned with Six Figure methodology',
    estimatedTime: '8 minutes'
  },
  {
    id: 3,
    title: 'Pricing Strategy',
    subtitle: 'Value-based pricing mastery',
    icon: TrendingUp,
    description: 'Implement premium positioning and strategic pricing',
    estimatedTime: '6 minutes'
  },
  {
    id: 4,
    title: 'Business Configuration',
    subtitle: 'Optimize your operations',
    icon: Clock,
    description: 'Set up availability and communication preferences',
    estimatedTime: '5 minutes'
  },
  {
    id: 5,
    title: 'Client Tier System',
    subtitle: 'Premium client management',
    icon: Users,
    description: 'Create VIP experiences and loyalty programs',
    estimatedTime: '4 minutes'
  },
  {
    id: 6,
    title: 'Marketing Foundation',
    subtitle: 'Build your referral engine',
    icon: TrendingUp,
    description: 'Establish systems for client acquisition and retention',
    estimatedTime: '6 minutes'
  },
  {
    id: 7,
    title: 'Launch Your Success',
    subtitle: 'Your Six Figure journey begins',
    icon: CheckCircle,
    description: 'Review your configuration and start achieving results',
    estimatedTime: '3 minutes'
  }
]

interface SixFigureBarberWizardProps {
  onClose?: () => void
  onComplete?: () => void
}

function WizardProgressIndicator() {
  const { state } = useSixFigureWizard()
  const progress = ((state.completed_steps.length + 1) / WIZARD_STEPS.length) * 100
  
  return (
    <div className="w-full space-y-4 mb-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Setup Progress</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="hidden md:flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const isCompleted = state.completed_steps.includes(step.id)
          const isCurrent = state.current_step === step.id
          const isAccessible = state.can_skip_to_step(step.id)
          
          return (
            <div key={step.id} className="flex flex-col items-center space-y-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                ${isCompleted 
                  ? 'bg-green-600 text-white' 
                  : isCurrent 
                    ? 'bg-blue-600 text-white' 
                    : isAccessible
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer'
                      : 'bg-gray-200 text-gray-400'
                }
              `}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="text-xs text-center max-w-16">
                <div className="font-medium text-gray-700 truncate">{step.title.split(' ')[0]}</div>
                <div className="text-gray-500 truncate">{step.estimatedTime}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile Step Indicator */}
      <div className="md:hidden">
        <div className="text-center">
          <Badge variant="secondary">
            Step {state.current_step + 1} of {WIZARD_STEPS.length}
          </Badge>
          <div className="mt-2 space-y-1">
            <div className="font-medium text-gray-900">{WIZARD_STEPS[state.current_step]?.title}</div>
            <div className="text-sm text-gray-600">{WIZARD_STEPS[state.current_step]?.subtitle}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WizardNavigation() {
  const { state, goToPreviousStep, goToNextStep, setCurrentStep, saveProgress } = useSixFigureWizard()
  const [isSaving, setIsSaving] = useState(false)
  
  const canGoBack = state.current_step > 0
  const canGoNext = state.current_step < WIZARD_STEPS.length - 1
  const isLastStep = state.current_step === WIZARD_STEPS.length - 1

  const handleSaveProgress = async () => {
    setIsSaving(true)
    try {
      await saveProgress()
      toast({
        title: "Progress Saved",
        description: "Your Six Figure Barber wizard progress has been saved.",
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save progress. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex justify-between items-center pt-6 border-t border-gray-200">
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          onClick={goToPreviousStep}
          disabled={!canGoBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleSaveProgress}
          disabled={isSaving}
          className="text-blue-600 hover:text-blue-700"
        >
          {isSaving ? 'Saving...' : 'Save Progress'}
        </Button>
      </div>

      <div className="flex items-center space-x-3">
        {!isLastStep && (
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(WIZARD_STEPS.length - 1)}
            className="text-gray-600 hover:text-gray-700"
          >
            Skip to Complete
          </Button>
        )}
        
        <Button
          onClick={goToNextStep}
          disabled={!canGoNext}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
        >
          <span>{isLastStep ? 'Complete Setup' : 'Next Step'}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

function WizardContent() {
  const { state } = useSixFigureWizard()
  const { user } = useAuth()
  
  const renderCurrentStep = () => {
    switch (state.current_step) {
      case 0:
        return <WelcomeStep />
      case 1:
        return <GoalSettingStep />
      case 2:
        return <ServicePortfolioStep />
      case 3:
        return <PricingStrategyStep />
      case 4:
        return <BusinessConfigurationStep />
      case 5:
        return <ClientTierStep />
      case 6:
        return <MarketingSetupStep />
      case 7:
        return <CompletionStep />
      default:
        return <WelcomeStep />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="bg-white shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Star className="w-8 h-8 text-yellow-500" />
              <CardTitle className="text-3xl font-bold text-gray-900">
                Six Figure Barber Setup
              </CardTitle>
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Welcome {user?.first_name || user?.name}, let's configure your BookedBarber platform 
              with the proven Six Figure Barber methodology to maximize your success.
            </p>
            
            {/* Progress Indicator */}
            <WizardProgressIndicator />
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Current Step Content */}
            <div className="min-h-[500px]">
              {renderCurrentStep()}
            </div>
            
            {/* Navigation */}
            <WizardNavigation />
          </CardContent>
        </Card>

        {/* Six Figure Benefits Sidebar (hidden on mobile) */}
        <div className="hidden lg:block fixed right-8 top-1/2 transform -translate-y-1/2 w-64">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg text-blue-900">Six Figure Benefits</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Premium Positioning</div>
                  <div className="text-blue-700">Attract high-value clients</div>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Revenue Optimization</div>
                  <div className="text-blue-700">Maximize earning potential</div>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Client Relationships</div>
                  <div className="text-blue-700">Build lasting loyalty</div>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Business Systems</div>
                  <div className="text-blue-700">Scalable operations</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export function SixFigureBarberWizard({ onClose, onComplete }: SixFigureBarberWizardProps) {
  return (
    <SixFigureWizardProvider>
      <WizardContent />
    </SixFigureWizardProvider>
  )
}