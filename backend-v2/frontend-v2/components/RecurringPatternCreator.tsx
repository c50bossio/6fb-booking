'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Calendar } from '@/components/ui/Calendar'
import { LoadingButton, ErrorDisplay } from '@/components/LoadingStates'
import { 
  createRecurringPattern, 
  previewPatternOccurrences,
  getServices,
  getBarbers,
  type RecurringPatternCreate,
  type PatternPreview
} from '@/lib/recurringApi'
import { formatDateForAPI } from '@/lib/timezone'

interface RecurringPatternCreatorProps {
  onPatternCreated: () => void
  onCancel: () => void
}

const PATTERN_TYPES = [
  { value: 'daily', label: 'Daily', description: 'Every day at the same time' },
  { value: 'weekly', label: 'Weekly', description: 'Same day(s) every week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Same day(s) every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Same date every month' },
]

const WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

const DURATIONS = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
]

export default function RecurringPatternCreator({ onPatternCreated, onCancel }: RecurringPatternCreatorProps) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PatternPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Check for pre-filled data from booking flow
  const bookingTemplate = typeof window !== 'undefined' 
    ? sessionStorage.getItem('recurringBookingTemplate')
    : null
  const templateData = bookingTemplate ? JSON.parse(bookingTemplate) : null

  // Form state - with defaults from template if available
  const [patternType, setPatternType] = useState('weekly')
  const [selectedDays, setSelectedDays] = useState<number[]>(
    templateData?.day_of_week !== undefined ? [templateData.day_of_week] : []
  )
  const [dayOfMonth, setDayOfMonth] = useState(
    templateData?.date ? new Date(templateData.date).getDate() : 1
  )
  const [preferredTime, setPreferredTime] = useState(
    templateData?.time || '09:00'
  )
  const [duration, setDuration] = useState(30)
  const [startDate, setStartDate] = useState<Date | null>(
    templateData?.date ? new Date(templateData.date) : null
  )
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [occurrences, setOccurrences] = useState<number | null>(null)
  const [barberId, setBarberId] = useState<number | null>(null)
  const [serviceId, setServiceId] = useState<number | null>(
    templateData?.service_id ? parseInt(templateData.service_id) : null
  )

  // Data for dropdowns
  const [services, setServices] = useState<any[]>([])
  const [barbers, setBarbers] = useState<any[]>([])

  // Fetch services and barbers
  useEffect(() => {
    async function fetchData() {
      try {
        const [servicesData, barbersData] = await Promise.all([
          getServices(),
          getBarbers()
        ])
        setServices(servicesData)
        setBarbers(barbersData)
      } catch (err) {
        console.error('Failed to fetch data:', err)
      }
    }
    fetchData()
    
    // Clear template data on unmount
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('recurringBookingTemplate')
      }
    }
  }, [])

  const toggleWeekday = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    )
  }

  const handleNext = async () => {
    if (step === 1) {
      // Validate pattern configuration
      if (patternType === 'weekly' || patternType === 'biweekly') {
        if (selectedDays.length === 0) {
          setError('Please select at least one day of the week')
          return
        }
      }
      setError(null)
      setStep(2)
    } else if (step === 2) {
      // Validate service and barber selection
      if (!serviceId || !barberId) {
        setError('Please select both a service and a barber')
        return
      }
      setError(null)
      setStep(3)
    } else if (step === 3) {
      // Validate dates
      if (!startDate) {
        setError('Please select a start date')
        return
      }
      setError(null)
      // Generate preview
      await generatePreview()
      setStep(4)
    }
  }

  const handleBack = () => {
    setError(null)
    setStep(step - 1)
  }

  const generatePreview = async () => {
    try {
      setLoadingPreview(true)
      const pattern: RecurringPatternCreate = {
        pattern_type: patternType,
        preferred_time: preferredTime,
        duration_minutes: duration,
        start_date: startDate ? formatDateForAPI(startDate) : '',
        end_date: endDate ? formatDateForAPI(endDate) : null,
        occurrences: occurrences,
        days_of_week: (patternType === 'weekly' || patternType === 'biweekly') ? selectedDays : null,
        day_of_month: patternType === 'monthly' ? dayOfMonth : null,
        week_of_month: null,
        barber_id: barberId!,
        service_id: serviceId!
      }

      // For preview, we'll create a temporary pattern ID
      const previewData = await previewPatternOccurrences(pattern)
      setPreview(previewData)
    } catch (err) {
      console.error('Failed to generate preview:', err)
      setError('Failed to generate preview. Please try again.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      const pattern: RecurringPatternCreate = {
        pattern_type: patternType,
        preferred_time: preferredTime,
        duration_minutes: duration,
        start_date: startDate ? formatDateForAPI(startDate) : '',
        end_date: endDate ? formatDateForAPI(endDate) : null,
        occurrences: occurrences,
        days_of_week: (patternType === 'weekly' || patternType === 'biweekly') ? selectedDays : null,
        day_of_month: patternType === 'monthly' ? dayOfMonth : null,
        week_of_month: null,
        barber_id: barberId!,
        service_id: serviceId!
      }

      await createRecurringPattern(pattern)
      onPatternCreated()
    } catch (err: any) {
      console.error('Failed to create pattern:', err)
      setError(err.message || 'Failed to create recurring pattern. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Choose Pattern Type</h3>
              <div className="grid gap-3">
                {PATTERN_TYPES.map(type => (
                  <label
                    key={type.value}
                    className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                      patternType === type.value
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="patternType"
                      value={type.value}
                      checked={patternType === type.value}
                      onChange={(e) => setPatternType(e.target.value)}
                      className="mt-0.5 mr-3"
                    />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-gray-600">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Day selection for weekly/biweekly */}
            {(patternType === 'weekly' || patternType === 'biweekly') && (
              <div>
                <h4 className="font-medium mb-3">Select Days</h4>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        selectedDays.includes(day.value)
                          ? 'bg-teal-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day of month for monthly */}
            {patternType === 'monthly' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Day of Month
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value))}
                  className="w-24"
                />
              </div>
            )}

            {/* Time selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Preferred Time
              </label>
              <Input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-40"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration
              </label>
              <Select
                value={duration.toString()}
                onChange={(value) => {
                  if (value && !Array.isArray(value)) {
                    setDuration(parseInt(value))
                  }
                }}
                options={DURATIONS.map(d => ({
                  value: d.value.toString(),
                  label: d.label
                }))}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4">Select Service & Barber</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Service
              </label>
              <Select
                value={serviceId?.toString() || ''}
                onChange={(value) => {
                  if (value && !Array.isArray(value)) {
                    setServiceId(parseInt(value))
                  }
                }}
                options={[
                  { value: '', label: 'Select a service' },
                  ...services.map(service => ({
                    value: service.id.toString(),
                    label: `${service.name} - $${service.price}`
                  }))
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Barber
              </label>
              <Select
                value={barberId?.toString() || ''}
                onChange={(value) => {
                  if (value && !Array.isArray(value)) {
                    setBarberId(parseInt(value))
                  }
                }}
                options={[
                  { value: '', label: 'Select a barber' },
                  ...barbers.map(barber => ({
                    value: barber.id.toString(),
                    label: barber.name
                  }))
                ]}
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4">Set Duration</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <Calendar
                selected={startDate}
                onSelect={setStartDate}
              />
            </div>

            <div>
              <h4 className="font-medium mb-3">End Condition</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="endCondition"
                    checked={!endDate && !occurrences}
                    onChange={() => {
                      setEndDate(null)
                      setOccurrences(null)
                    }}
                    className="mr-2"
                  />
                  <span>No end date (ongoing)</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="endCondition"
                    checked={endDate !== null}
                    onChange={() => setOccurrences(null)}
                    className="mr-2"
                  />
                  <span>End by date</span>
                </label>
                {endDate !== null && (
                  <div className="ml-6">
                    <Calendar
                      selected={endDate}
                      onSelect={setEndDate}
                    />
                  </div>
                )}
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="endCondition"
                    checked={occurrences !== null}
                    onChange={() => {
                      setEndDate(null)
                      setOccurrences(10)
                    }}
                    className="mr-2"
                  />
                  <span>After specific occurrences</span>
                </label>
                {occurrences !== null && (
                  <div className="ml-6">
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={occurrences}
                      onChange={(e) => setOccurrences(parseInt(e.target.value))}
                      className="w-24"
                    />
                    <span className="ml-2 text-sm text-gray-600">appointments</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium mb-4">Review & Confirm</h3>
            
            {loadingPreview ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Generating preview...</p>
              </div>
            ) : preview ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Pattern Summary</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Type:</dt>
                      <dd className="font-medium">{patternType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Service:</dt>
                      <dd className="font-medium">
                        {services.find(s => s.id === serviceId)?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Barber:</dt>
                      <dd className="font-medium">
                        {barbers.find(b => b.id === barberId)?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Time:</dt>
                      <dd className="font-medium">{preferredTime}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Duration:</dt>
                      <dd className="font-medium">{duration} minutes</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="font-medium mb-2">
                    Next {Math.min(preview.occurrences.length, 5)} Occurrences
                  </h4>
                  <div className="space-y-2">
                    {preview.occurrences.slice(0, 5).map((occ, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg"
                      >
                        <div className="text-sm">
                          <div className="font-medium">{occ.date}</div>
                          <div className="text-gray-600">{occ.time}</div>
                        </div>
                        {occ.hasConflict && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            Conflict
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {preview.occurrences.length > 5 && (
                    <p className="text-sm text-gray-600 mt-2">
                      ...and {preview.occurrences.length - 5} more appointments
                    </p>
                  )}
                </div>

                {preview.conflicts > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> {preview.conflicts} appointments have scheduling conflicts
                      and will need to be rescheduled after creation.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Recurring Appointment</h2>
          <div className="text-sm text-gray-600">
            Step {step} of 4
          </div>
        </div>
        {templateData && step === 1 && (
          <div className="mt-2 text-sm text-teal-600 bg-teal-50 px-3 py-2 rounded-lg">
            Pre-filled from your booking selection
          </div>
        )}
        <div className="mt-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${
                  s <= step ? 'bg-teal-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => setError(null)}
          />
        )}

        {renderStep()}

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={step === 1 ? onCancel : handleBack}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 4 ? (
            <Button onClick={handleNext}>
              Next
            </Button>
          ) : (
            <LoadingButton
              loading={submitting}
              onClick={handleSubmit}
            >
              Create Recurring Pattern
            </LoadingButton>
          )}
        </div>
      </CardContent>
    </Card>
  )
}