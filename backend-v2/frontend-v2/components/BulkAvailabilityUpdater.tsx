'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getBarberAvailability,
  bulkUpdateAvailability,
  copyWeeklyAvailability,
  type BarberAvailability,
  type BarberAvailabilityCreate
} from '@/lib/api'
import { LoadingSkeleton, ErrorDisplay } from '@/components/ui/LoadingSystem'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface BulkAvailabilityUpdaterProps {
  barberId: number
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

interface WeeklyTemplate {
  name: string
  availability: Record<number, { start: string; end: string }[]>
}

const PRESET_TEMPLATES: WeeklyTemplate[] = [
  {
    name: 'Standard Business Hours',
    availability: {
      1: [{ start: '09:00', end: '17:00' }], // Monday
      2: [{ start: '09:00', end: '17:00' }], // Tuesday
      3: [{ start: '09:00', end: '17:00' }], // Wednesday
      4: [{ start: '09:00', end: '17:00' }], // Thursday
      5: [{ start: '09:00', end: '17:00' }], // Friday
    }
  },
  {
    name: 'Extended Hours',
    availability: {
      1: [{ start: '08:00', end: '18:00' }], // Monday
      2: [{ start: '08:00', end: '18:00' }], // Tuesday
      3: [{ start: '08:00', end: '18:00' }], // Wednesday
      4: [{ start: '08:00', end: '18:00' }], // Thursday
      5: [{ start: '08:00', end: '18:00' }], // Friday
      6: [{ start: '09:00', end: '15:00' }], // Saturday
    }
  },
  {
    name: 'Weekend Focus',
    availability: {
      4: [{ start: '10:00', end: '16:00' }], // Thursday
      5: [{ start: '10:00', end: '16:00' }], // Friday
      6: [{ start: '08:00', end: '18:00' }], // Saturday
      0: [{ start: '10:00', end: '16:00' }], // Sunday
    }
  },
  {
    name: 'Split Schedule',
    availability: {
      1: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], // Monday
      2: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], // Tuesday
      3: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], // Wednesday
      4: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], // Thursday
      5: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }], // Friday
    }
  }
]

export default function BulkAvailabilityUpdater({
  barberId,
  onSuccess,
  onError
}: BulkAvailabilityUpdaterProps) {
  const [currentAvailability, setCurrentAvailability] = useState<BarberAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'templates' | 'copy' | 'bulk'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customTemplate, setCustomTemplate] = useState<WeeklyTemplate>({
    name: 'Custom Template',
    availability: {}
  })

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const loadCurrentAvailability = useCallback(async () => {
    try {
      setLoading(true)
      const availability = await getBarberAvailability(barberId)
      setCurrentAvailability(availability)
    } catch (error) {
      console.error('Failed to load availability:', error)
      onError('Failed to load current availability')
    } finally {
      setLoading(false)
    }
  }, [barberId, onError])

  useEffect(() => {
    loadCurrentAvailability()
  }, [loadCurrentAvailability])

  const handleApplyTemplate = async (template: WeeklyTemplate) => {
    try {
      // Validate template has availability
      if (Object.keys(template.availability).length === 0) {
        onError('Template has no availability to apply')
        return
      }
      
      // Validate time slots in template
      for (const [dayOfWeek, timeSlots] of Object.entries(template.availability)) {
        for (const slot of timeSlots) {
          if (slot.start >= slot.end) {
            onError(`Invalid time slot in template: ${slot.start} - ${slot.end}`)
            return
          }
        }
      }
      
      // Create operations to clear existing availability and add new ones
      const operations = []
      
      // Delete all existing availability
      for (const avail of currentAvailability) {
        operations.push({
          action: 'delete' as const,
          availability_id: avail.id
        })
      }
      
      // Add new availability from template
      for (const [dayOfWeek, timeSlots] of Object.entries(template.availability)) {
        for (const slot of timeSlots) {
          operations.push({
            action: 'create' as const,
            availability_data: {
              day_of_week: parseInt(dayOfWeek),
              start_time: slot.start,
              end_time: slot.end
            } as BarberAvailabilityCreate
          })
        }
      }
      
      await bulkUpdateAvailability(barberId, operations)
      onSuccess(`Applied template "${template.name}" successfully`)
      loadCurrentAvailability()
    } catch (error: any) {
      console.error('Error applying template:', error)
      const errorMessage = error?.message || 'Failed to apply template'
      onError(errorMessage)
    }
  }

  const handleCopyWeek = async (sourceWeek: string, targetWeek: string) => {
    try {
      if (sourceWeek === targetWeek) {
        onError('Source and target weeks cannot be the same')
        return
      }
      
      await copyWeeklyAvailability(barberId, sourceWeek, targetWeek)
      onSuccess('Weekly availability copied successfully')
    } catch (error: any) {
      console.error('Error copying week:', error)
      const errorMessage = error?.message || 'Failed to copy weekly availability'
      onError(errorMessage)
    }
  }

  const handleClearAllAvailability = async () => {
    if (currentAvailability.length === 0) {
      onError('No availability to clear')
      return
    }
    
    if (!confirm('Are you sure you want to clear ALL availability? This action cannot be undone.')) {
      return
    }
    
    try {
      const operations = currentAvailability.map(avail => ({
        action: 'delete' as const,
        availability_id: avail.id
      }))
      
      await bulkUpdateAvailability(barberId, operations)
      onSuccess('All availability cleared successfully')
      loadCurrentAvailability()
    } catch (error: any) {
      console.error('Error clearing availability:', error)
      const errorMessage = error?.message || 'Failed to clear availability'
      onError(errorMessage)
    }
  }

  const getCurrentAvailabilityByDay = () => {
    const byDay: Record<number, BarberAvailability[]> = {}
    for (const avail of currentAvailability) {
      if (!byDay[avail.day_of_week]) {
        byDay[avail.day_of_week] = []
      }
      byDay[avail.day_of_week].push(avail)
    }
    return byDay
  }

  const saveCurrentAsTemplate = () => {
    const availabilityByDay = getCurrentAvailabilityByDay()
    const template: WeeklyTemplate = {
      name: 'Current Schedule',
      availability: {}
    }
    
    for (const [dayOfWeek, availability] of Object.entries(availabilityByDay)) {
      template.availability[parseInt(dayOfWeek)] = availability.map(avail => ({
        start: avail.start_time.substring(0, 5),
        end: avail.end_time.substring(0, 5)
      }))
    }
    
    setCustomTemplate(template)
    onSuccess('Current schedule saved as template')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton lines={6} className="h-64" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Availability Operations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'templates', label: 'Templates', icon: '📋' },
              { id: 'copy', label: 'Copy Schedule', icon: '📅' },
              { id: 'bulk', label: 'Bulk Actions', icon: '⚡' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Current Schedule Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Schedule</CardTitle>
                <Button
                  onClick={saveCurrentAsTemplate}
                  variant="secondary"
                  size="sm"
                >
                  Save as Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {currentAvailability.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No availability set. Use a template to get started.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(getCurrentAvailabilityByDay()).map(([dayOfWeek, availability]) => (
                    <div key={dayOfWeek} className="bg-gray-50 rounded-lg p-3">
                      <div className="font-medium text-gray-900 mb-2">
                        {dayNames[parseInt(dayOfWeek)]}
                      </div>
                      <div className="space-y-1">
                        {availability.map((avail, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {avail.start_time.substring(0, 5)} - {avail.end_time.substring(0, 5)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preset Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Apply Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {PRESET_TEMPLATES.map((template) => (
                  <div key={template.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <Button
                        onClick={() => handleApplyTemplate(template)}
                        variant="primary"
                        size="sm"
                      >
                        Apply Template
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                      {dayNames.map((dayName, index) => {
                        const dayAvailability = template.availability[index] || []
                        return (
                          <div key={index} className="bg-gray-50 rounded p-2">
                            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">{dayName.substring(0, 3)}</div>
                            {dayAvailability.length === 0 ? (
                              <div className="text-gray-400">Closed</div>
                            ) : (
                              <div className="space-y-1">
                                {dayAvailability.map((slot, slotIndex) => (
                                  <div key={slotIndex} className="text-gray-600">
                                    {slot.start}-{slot.end}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Copy Schedule Tab */}
      {activeTab === 'copy' && (
        <Card>
          <CardHeader>
            <CardTitle>Copy Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <CopyScheduleForm onCopyWeek={handleCopyWeek} />
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Tab */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Clear All Availability</h4>
                  <p className="text-red-700 text-sm mb-4">
                    This will remove all your regular availability settings. This action cannot be undone.
                  </p>
                  <Button
                    onClick={handleClearAllAvailability}
                    variant="destructive"
                    size="md"
                    disabled={currentAvailability.length === 0}
                  >
                    Clear All Availability
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Schedule Builder */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Schedule Builder</h3>
                <p className="text-gray-600 mb-4">
                  Build custom schedules with advanced options and constraints.
                </p>
                <p className="text-sm text-gray-500">
                  Coming soon in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Copy Schedule Form Component
function CopyScheduleForm({
  onCopyWeek
}: {
  onCopyWeek: (sourceWeek: string, targetWeek: string) => void
}) {
  const [sourceWeek, setSourceWeek] = useState('')
  const [targetWeek, setTargetWeek] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceWeek || !targetWeek) return
    onCopyWeek(sourceWeek, targetWeek)
  }

  const getWeekOptions = () => {
    const options = []
    const today = new Date()
    
    // Past 4 weeks
    for (let i = 4; i >= 1; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - (i * 7))
      const weekStart = getWeekStart(date)
      options.push({
        value: weekStart.toISOString().split('T')[0],
        label: `Week of ${weekStart.toLocaleDateString()} (${i} week${i > 1 ? 's' : ''} ago)`
      })
    }
    
    // Current week
    const currentWeekStart = getWeekStart(today)
    options.push({
      value: currentWeekStart.toISOString().split('T')[0],
      label: `Week of ${currentWeekStart.toLocaleDateString()} (This week)`
    })
    
    // Next 8 weeks
    for (let i = 1; i <= 8; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + (i * 7))
      const weekStart = getWeekStart(date)
      options.push({
        value: weekStart.toISOString().split('T')[0],
        label: `Week of ${weekStart.toLocaleDateString()} (${i} week${i > 1 ? 's' : ''} from now)`
      })
    }
    
    return options
  }

  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-blue-800">How it works</h4>
            <p className="text-blue-700 text-sm mt-1">
              Copy your availability from one week to another. This will replace any existing availability in the target week.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Select
          label="Copy from (Source Week)"
          value={sourceWeek}
          onChange={(value) => setSourceWeek(value as string)}
          options={getWeekOptions()}
          placeholder="Select source week"
        />
        
        <Select
          label="Copy to (Target Week)"
          value={targetWeek}
          onChange={(value) => setTargetWeek(value as string)}
          options={getWeekOptions()}
          placeholder="Select target week"
        />
      </div>

      {sourceWeek && targetWeek && sourceWeek === targetWeek && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-sm">
            ⚠️ Source and target weeks cannot be the same.
          </p>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={!sourceWeek || !targetWeek || sourceWeek === targetWeek}
      >
        Copy Weekly Schedule
      </Button>
    </form>
  )
}