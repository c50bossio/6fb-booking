'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { format, addMinutes, subMinutes, isSameHour, parseISO, startOfDay, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ClockIcon,
  SparklesIcon,
  StopIcon,
  PlayIcon,
  PauseIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

// Smart scheduling types
interface SchedulingRule {
  id: string
  name: string
  enabled: boolean
  value: number
  description: string
  type: 'buffer' | 'break' | 'optimization'
}

interface SmartSlot {
  start_time: Date
  end_time: Date
  barber_id: number
  confidence: number
  buffer_before: number
  buffer_after: number
  suggested_break: boolean
  optimization_score: number
  reasoning: string[]
}

interface SmartSchedulingPanelProps {
  selectedDate: Date
  appointments: any[]
  barbers: any[]
  onSlotSelect: (slot: SmartSlot) => void
  onRuleUpdate: (rules: SchedulingRule[]) => void
  className?: string
}

const defaultSchedulingRules: SchedulingRule[] = [
  {
    id: 'service-buffer',
    name: 'Service Buffer Time',
    enabled: true,
    value: 10,
    description: 'Buffer time between appointments for cleanup and preparation',
    type: 'buffer'
  },
  {
    id: 'lunch-break',
    name: 'Lunch Break Detection',
    enabled: true,
    value: 60,
    description: 'Automatically suggest lunch breaks for sessions longer than 4 hours',
    type: 'break'
  },
  {
    id: 'client-prep-time',
    name: 'Client Prep Buffer',
    enabled: true,
    value: 5,
    description: 'Extra time for client consultation and setup',
    type: 'buffer'
  },
  {
    id: 'peak-hour-optimization',
    name: 'Peak Hour Optimization',
    enabled: true,
    value: 80,
    description: 'Prioritize high-revenue services during peak hours',
    type: 'optimization'
  },
  {
    id: 'back-to-back-limit',
    name: 'Back-to-Back Limit',
    enabled: true,
    value: 3,
    description: 'Maximum consecutive appointments before suggesting a break',
    type: 'optimization'
  },
  {
    id: 'end-day-buffer',
    name: 'End of Day Buffer',
    enabled: true,
    value: 15,
    description: 'Extra time at end of day for cleanup and closing',
    type: 'buffer'
  }
]

export function SmartSchedulingPanel({
  selectedDate,
  appointments,
  barbers,
  onSlotSelect,
  onRuleUpdate,
  className = ""
}: SmartSchedulingPanelProps) {
  const [rules, setRules] = useState<SchedulingRule[]>(defaultSchedulingRules)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [selectedServiceDuration, setSelectedServiceDuration] = useState(60)
  const [selectedBarberId, setSelectedBarberId] = useState<number | null>(null)

  // Calculate smart time slots based on current rules
  const smartSlots = useMemo(() => {
    const dayStart = startOfDay(selectedDate)
    const dayEnd = addDays(dayStart, 1)
    const slots: SmartSlot[] = []
    
    // Get enabled rules
    const enabledRules = rules.filter(rule => rule.enabled)
    const serviceBuffer = enabledRules.find(r => r.id === 'service-buffer')?.value || 0
    const clientPrepTime = enabledRules.find(r => r.id === 'client-prep-time')?.value || 0
    const backToBackLimit = enabledRules.find(r => r.id === 'back-to-back-limit')?.value || 3
    const lunchBreakEnabled = enabledRules.find(r => r.id === 'lunch-break')?.enabled || false
    const endDayBuffer = enabledRules.find(r => r.id === 'end-day-buffer')?.value || 0

    // Filter appointments for selected date
    const dayAppointments = appointments.filter(apt => 
      format(new Date(apt.start_time), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    )

    // Process each barber
    const targetBarbers = selectedBarberId ? 
      barbers.filter(b => b.id === selectedBarberId) : 
      barbers

    targetBarbers.forEach(barber => {
      const barberAppointments = dayAppointments
        .filter(apt => apt.barber_id === barber.id)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

      // Find available slots between appointments
      let currentTime = new Date(selectedDate)
      currentTime.setHours(9, 0, 0, 0) // Start at 9 AM

      barberAppointments.forEach((appointment, index) => {
        const appointmentStart = new Date(appointment.start_time)
        const appointmentEnd = addMinutes(appointmentStart, appointment.duration_minutes || 60)
        
        // Check if there's time before this appointment
        const availableMinutes = (appointmentStart.getTime() - currentTime.getTime()) / (1000 * 60)
        const requiredTime = selectedServiceDuration + serviceBuffer + clientPrepTime
        
        if (availableMinutes >= requiredTime) {
          // Calculate optimal slot timing
          const bufferStart = Math.max(serviceBuffer, clientPrepTime)
          const slotStart = addMinutes(currentTime, bufferStart)
          const slotEnd = addMinutes(slotStart, selectedServiceDuration)
          
          // Calculate confidence based on various factors
          let confidence = 85 // Base confidence
          let reasoning: string[] = []
          
          // Time of day optimization
          const hour = slotStart.getHours()
          if (hour >= 10 && hour <= 14) { // Peak hours
            confidence += 10
            reasoning.push('Peak hour slot - high client demand')
          }
          if (hour >= 16 && hour <= 18) { // Evening peak
            confidence += 5
            reasoning.push('Evening slot - after-work convenience')
          }
          
          // Buffer adequacy
          if (bufferStart >= 10) {
            confidence += 5
            reasoning.push('Adequate preparation time included')
          }
          
          // Back-to-back check
          const consecutiveCount = getConsecutiveAppointments(barberAppointments, index)
          if (consecutiveCount >= backToBackLimit) {
            confidence -= 15
            reasoning.push('Consider break after consecutive appointments')
          } else {
            reasoning.push('Good spacing between appointments')
          }
          
          // Lunch break detection
          let suggestedBreak = false
          if (lunchBreakEnabled && hour >= 12 && hour <= 14 && consecutiveCount >= 2) {
            suggestedBreak = true
            reasoning.push('Lunch break opportunity detected')
          }

          slots.push({
            start_time: slotStart,
            end_time: slotEnd,
            barber_id: barber.id,
            confidence: Math.min(confidence, 100),
            buffer_before: bufferStart,
            buffer_after: serviceBuffer,
            suggested_break: suggestedBreak,
            optimization_score: calculateOptimizationScore(slotStart, hour, consecutiveCount),
            reasoning
          })
        }
        
        // Update current time to after this appointment
        currentTime = addMinutes(appointmentEnd, serviceBuffer)
      })
      
      // Check for slot after last appointment
      if (barberAppointments.length > 0) {
        const lastAppointment = barberAppointments[barberAppointments.length - 1]
        const lastEnd = addMinutes(new Date(lastAppointment.start_time), lastAppointment.duration_minutes || 60)
        const endOfDay = new Date(selectedDate)
        endOfDay.setHours(18, 0, 0, 0) // End at 6 PM
        
        const availableMinutes = (endOfDay.getTime() - lastEnd.getTime()) / (1000 * 60)
        const requiredTime = selectedServiceDuration + serviceBuffer + endDayBuffer
        
        if (availableMinutes >= requiredTime) {
          const slotStart = addMinutes(lastEnd, serviceBuffer)
          const slotEnd = addMinutes(slotStart, selectedServiceDuration)
          
          slots.push({
            start_time: slotStart,
            end_time: slotEnd,
            barber_id: barber.id,
            confidence: 75, // Lower confidence for end-of-day slots
            buffer_before: serviceBuffer,
            buffer_after: endDayBuffer,
            suggested_break: false,
            optimization_score: 60,
            reasoning: ['End of day slot', 'Includes closing time buffer']
          })
        }
      }
    })

    // Sort by optimization score and confidence
    return slots.sort((a, b) => 
      (b.optimization_score + b.confidence) - (a.optimization_score + a.confidence)
    ).slice(0, 8) // Show top 8 suggestions
  }, [selectedDate, appointments, barbers, rules, selectedServiceDuration, selectedBarberId])

  // Helper functions
  const getConsecutiveAppointments = (appointments: any[], currentIndex: number): number => {
    let count = 0
    for (let i = currentIndex - 1; i >= 0; i--) {
      const current = new Date(appointments[i + 1]?.start_time || 0)
      const previous = addMinutes(new Date(appointments[i].start_time), appointments[i].duration_minutes || 60)
      
      if (current.getTime() - previous.getTime() <= 15 * 60 * 1000) { // Within 15 minutes
        count++
      } else {
        break
      }
    }
    return count
  }

  const calculateOptimizationScore = (slotTime: Date, hour: number, consecutiveCount: number): number => {
    let score = 50 // Base score
    
    // Time of day scoring
    if (hour >= 10 && hour <= 14) score += 30 // Peak hours
    if (hour >= 16 && hour <= 18) score += 20 // Evening peak
    if (hour < 9 || hour > 18) score -= 20 // Off hours
    
    // Spacing scoring
    if (consecutiveCount < 2) score += 15 // Good spacing
    if (consecutiveCount >= 3) score -= 10 // Too many consecutive
    
    return Math.max(0, Math.min(100, score))
  }

  const updateRule = (ruleId: string, updates: Partial<SchedulingRule>) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    )
    setRules(updatedRules)
    onRuleUpdate(updatedRules)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 70) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (confidence >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 85) return CheckCircleIcon
    if (confidence >= 50) return InformationCircleIcon
    return ExclamationTriangleIcon
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <SparklesIcon className="h-5 w-5 mr-2 text-blue-500" />
            Smart Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Duration */}
          <div className="space-y-2">
            <Label>Service Duration (minutes)</Label>
            <Select value={selectedServiceDuration.toString()} onValueChange={(value) => setSelectedServiceDuration(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Barber Selection */}
          <div className="space-y-2">
            <Label>Target Barber (optional)</Label>
            <Select value={selectedBarberId?.toString() || "all"} onValueChange={(value) => setSelectedBarberId(value === "all" ? null : parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Barbers</SelectItem>
                {barbers.map(barber => (
                  <SelectItem key={barber.id} value={barber.id.toString()}>
                    {barber.name || `${barber.first_name} ${barber.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="flex items-center justify-between pt-2">
            <Label>Advanced Settings</Label>
            <Switch
              checked={showAdvancedSettings}
              onCheckedChange={setShowAdvancedSettings}
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Scheduling Rules */}
      {showAdvancedSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
              Scheduling Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rules.map(rule => (
              <div key={rule.id} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) => updateRule(rule.id, { enabled })}
                    />
                    <Label className="font-medium">{rule.name}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{rule.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Badge variant={rule.type === 'buffer' ? 'secondary' : rule.type === 'break' ? 'outline' : 'default'}>
                    {rule.type}
                  </Badge>
                </div>
                
                {rule.enabled && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600 min-w-[60px]">
                        {rule.type === 'buffer' || rule.type === 'break' ? `${rule.value} min` : `${rule.value}%`}
                      </span>
                      <Slider
                        value={[rule.value]}
                        onValueChange={([value]) => updateRule(rule.id, { value })}
                        max={rule.type === 'optimization' ? 100 : 120}
                        min={rule.type === 'optimization' ? 0 : 5}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Smart Time Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <ClockIcon className="h-5 w-5 mr-2" />
            Suggested Time Slots
          </CardTitle>
        </CardHeader>
        <CardContent>
          {smartSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No optimal time slots found for the selected criteria.</p>
              <p className="text-sm mt-1">Try adjusting the service duration or scheduling rules.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {smartSlots.map((slot, index) => {
                const ConfidenceIcon = getConfidenceIcon(slot.confidence)
                const barber = barbers.find(b => b.id === slot.barber_id)
                
                return (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onSlotSelect(slot)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="text-lg font-semibold">
                          {format(slot.start_time, 'h:mm a')} - {format(slot.end_time, 'h:mm a')}
                        </div>
                        <Badge className={`border ${getConfidenceColor(slot.confidence)}`}>
                          <ConfidenceIcon className="h-3 w-3 mr-1" />
                          {slot.confidence}% confidence
                        </Badge>
                        {slot.suggested_break && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            <StopIcon className="h-3 w-3 mr-1" />
                            Break Suggested
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {barber?.name || `Barber ${slot.barber_id}`}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center space-x-4">
                        <span>Buffer: {slot.buffer_before}min before, {slot.buffer_after}min after</span>
                        <span>Score: {slot.optimization_score}/100</span>
                      </div>
                      <div className="text-xs">
                        {slot.reasoning.join(' • ')}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SmartSchedulingPanel