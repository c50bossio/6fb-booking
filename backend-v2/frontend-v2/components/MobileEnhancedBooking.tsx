'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail,
  DollarSign, 
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Smartphone,
  Save
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import EnhancedOfflineBookingManager, { OfflineBookingForm } from '@/lib/enhanced-offline-booking'

interface MobileEnhancedBookingProps {
  className?: string
  onBookingComplete?: (bookingId: string) => void
  onBookingQueued?: () => void
}

interface NetworkStatus {
  isOnline: boolean
  quality: 'online' | 'poor' | 'offline'
  effectiveType?: string
}

export function MobileEnhancedBooking({ 
  className, 
  onBookingComplete,
  onBookingQueued 
}: MobileEnhancedBookingProps) {
  const [bookingManager] = useState(() => new EnhancedOfflineBookingManager())
  const [currentStep, setCurrentStep] = useState<OfflineBookingForm['step']>('service')
  const [formData, setFormData] = useState<OfflineBookingForm['formData']>({})
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({ 
    isOnline: navigator.onLine, 
    quality: 'online' 
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [sessionId, setSessionId] = useState<string>('')

  const { toast } = useToast()

  // Steps configuration for mobile-first experience
  const steps: Array<{ key: OfflineBookingForm['step']; title: string; icon: React.ReactNode }> = [
    { key: 'service', title: 'Service & Barber', icon: <User className="w-4 h-4" /> },
    { key: 'datetime', title: 'Date & Time', icon: <Calendar className="w-4 h-4" /> },
    { key: 'client', title: 'Your Details', icon: <Phone className="w-4 h-4" /> },
    { key: 'payment', title: 'Payment', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'confirmation', title: 'Confirm', icon: <CheckCircle className="w-4 h-4" /> }
  ]

  const currentStepIndex = steps.findIndex(step => step.key === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  // Initialize booking session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const id = await bookingManager.startBookingSession()
        setSessionId(id)
        
        toast({
          title: "Booking session started",
          description: "Your progress will be automatically saved",
        })
      } catch (error) {
        console.error('Failed to initialize booking session:', error)
        toast({
          title: "Session Error",
          description: "Failed to start booking session. Please refresh and try again.",
          variant: "destructive"
        })
      }
    }

    initializeSession()
  }, [bookingManager, toast])

  // Monitor network status
  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      
      setNetworkStatus({
        isOnline: navigator.onLine,
        quality: !navigator.onLine ? 'offline' : 
                connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g' ? 'poor' : 'online',
        effectiveType: connection?.effectiveType
      })
    }

    updateNetworkStatus()
    
    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
    }
  }, [])

  // Handle form data updates with auto-save
  const updateFormData = useCallback(async (updates: Partial<OfflineBookingForm['formData']>) => {
    const newFormData = { ...formData, ...updates }
    setFormData(newFormData)
    
    setAutoSaveStatus('saving')
    
    try {
      await bookingManager.updateFormData(currentStep, updates)
      setAutoSaveStatus('saved')
      
      // Provide subtle haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(25) // Very short vibration for successful save
      }
    } catch (error) {
      setAutoSaveStatus('error')
      console.error('Auto-save failed:', error)
    }
  }, [bookingManager, currentStep, formData])

  // Navigate between steps
  const goToStep = (step: OfflineBookingForm['step']) => {
    setCurrentStep(step)
  }

  const nextStep = () => {
    const nextIndex = Math.min(currentStepIndex + 1, steps.length - 1)
    setCurrentStep(steps[nextIndex].key)
  }

  const prevStep = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0)
    setCurrentStep(steps[prevIndex].key)
  }

  // Submit booking
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const result = await bookingManager.submitBooking()
      
      if (result.success) {
        if (result.bookingId) {
          toast({
            title: "Booking confirmed!",
            description: "Your appointment has been successfully booked.",
          })
          onBookingComplete?.(result.bookingId)
        } else if (result.queuedForSync) {
          toast({
            title: "Booking saved offline",
            description: "Your booking will be confirmed when connection is restored.",
          })
          onBookingQueued?.()
        }
      }
    } catch (error) {
      toast({
        title: "Booking failed",
        description: "Please check your details and try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render network status indicator
  const NetworkIndicator = () => (
    <div className="flex items-center gap-2 text-sm">
      {networkStatus.quality === 'offline' ? (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <span className="text-red-500">Offline</span>
        </>
      ) : networkStatus.quality === 'poor' ? (
        <>
          <Wifi className="w-4 h-4 text-yellow-500" />
          <span className="text-yellow-500">Slow connection</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-green-500">Online</span>
        </>
      )}
      
      {/* Auto-save indicator */}
      <div className="flex items-center gap-1 ml-2">
        <Save className={`w-3 h-3 ${
          autoSaveStatus === 'saved' ? 'text-green-500' :
          autoSaveStatus === 'saving' ? 'text-blue-500 animate-spin' :
          'text-red-500'
        }`} />
        <span className="text-xs text-gray-500">
          {autoSaveStatus === 'saved' ? 'Saved' :
           autoSaveStatus === 'saving' ? 'Saving...' :
           'Save failed'}
        </span>
      </div>
    </div>
  )

  // Mobile-optimized progress indicator
  const ProgressIndicator = () => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {steps[currentStepIndex]?.title}
        </h3>
        <Badge variant="outline">
          Step {currentStepIndex + 1} of {steps.length}
        </Badge>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      {/* Step indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div
            key={step.key}
            className={`flex flex-col items-center gap-1 ${
              index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <div className={`p-2 rounded-full ${
              index < currentStepIndex ? 'bg-blue-600 text-white' :
              index === currentStepIndex ? 'bg-blue-100 text-blue-600' :
              'bg-gray-100 text-gray-400'
            }`}>
              {step.icon}
            </div>
            <span className="text-xs font-medium hidden sm:block">
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'service':
        return <ServiceSelectionStep formData={formData} onUpdate={updateFormData} />
      case 'datetime':
        return <DateTimeSelectionStep formData={formData} onUpdate={updateFormData} />
      case 'client':
        return <ClientDetailsStep formData={formData} onUpdate={updateFormData} />
      case 'payment':
        return <PaymentStep formData={formData} onUpdate={updateFormData} />
      case 'confirmation':
        return <ConfirmationStep formData={formData} />
      default:
        return null
    }
  }

  return (
    <div className={`max-w-md mx-auto space-y-4 ${className}`}>
      {/* Header with network status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Book Appointment</CardTitle>
            <NetworkIndicator />
          </div>
          <ProgressIndicator />
        </CardHeader>
      </Card>

      {/* Offline mode alert */}
      {networkStatus.quality === 'offline' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You're offline. Your booking will be saved and confirmed when connection returns.
          </AlertDescription>
        </Alert>
      )}

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStepIndex === 0}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        {currentStepIndex === steps.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Booking...' : 'Complete Booking'}
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            className="flex-1"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Mobile-specific touches */}
      <div className="text-center text-sm text-gray-500 pb-4">
        <Smartphone className="w-4 h-4 inline mr-1" />
        Optimized for mobile • Auto-saves your progress
      </div>
    </div>
  )
}

// Step Components (simplified for brevity)
const ServiceSelectionStep = ({ formData, onUpdate }: any) => (
  <div className="space-y-4">
    <h3 className="font-semibold">Select Service & Barber</h3>
    {/* Service selection UI would go here */}
    <p className="text-sm text-gray-600">Choose your preferred service and barber</p>
  </div>
)

const DateTimeSelectionStep = ({ formData, onUpdate }: any) => (
  <div className="space-y-4">
    <h3 className="font-semibold">Pick Date & Time</h3>
    {/* Date/time selection UI would go here */}
    <p className="text-sm text-gray-600">Select your preferred appointment time</p>
  </div>
)

const ClientDetailsStep = ({ formData, onUpdate }: any) => (
  <div className="space-y-4">
    <h3 className="font-semibold">Your Contact Details</h3>
    <Input 
      placeholder="Full Name" 
      value={formData.clientName || ''}
      onChange={(e) => onUpdate({ clientName: e.target.value })}
    />
    <Input 
      placeholder="Phone Number" 
      type="tel"
      value={formData.clientPhone || ''}
      onChange={(e) => onUpdate({ clientPhone: e.target.value })}
    />
    <Input 
      placeholder="Email (optional)" 
      type="email"
      value={formData.clientEmail || ''}
      onChange={(e) => onUpdate({ clientEmail: e.target.value })}
    />
  </div>
)

const PaymentStep = ({ formData, onUpdate }: any) => (
  <div className="space-y-4">
    <h3 className="font-semibold">Payment Method</h3>
    {/* Payment method selection would go here */}
    <p className="text-sm text-gray-600">Choose how you'd like to pay</p>
  </div>
)

const ConfirmationStep = ({ formData }: any) => (
  <div className="space-y-4">
    <h3 className="font-semibold">Confirm Your Booking</h3>
    {/* Booking summary would go here */}
    <p className="text-sm text-gray-600">Review your appointment details</p>
  </div>
)

export default MobileEnhancedBooking