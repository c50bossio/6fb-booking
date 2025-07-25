'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { format, addDays, isSameDay, isAfter, isBefore, addMinutes, parseISO, startOfHour, differenceInMinutes } from 'date-fns'
import { 
  LightBulbIcon, 
  SparklesIcon,
  TrendingUpIcon,
  ClockIcon,
  StarIcon,
  UserIcon,
  DollarSignIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCalendar, CalendarAppointment, CalendarBarber } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface SlotSuggestion {
  id: string
  barberId: number
  startTime: Date
  endTime: Date
  confidence: number
  reasons: string[]
  revenueProjection: number
  clientMatch: {
    tier: 'platinum' | 'vip' | 'regular' | 'new'
    preference: string
    likelihood: number
  }
  historicalData: {
    averageRevenue: number
    completionRate: number
    clientSatisfaction: number
    upsellProbability: number
  }
}

interface AISlotSuggestionsProps {
  className?: string
  selectedDate?: Date
  selectedBarberId?: number
  suggestedDuration?: number
  maxSuggestions?: number
  onSlotSelect?: (suggestion: SlotSuggestion) => void
  showConfidenceDetails?: boolean
}

export default function AISlotSuggestions({
  className,
  selectedDate = new Date(),
  selectedBarberId,
  suggestedDuration = 60,
  maxSuggestions = 5,
  onSlotSelect,
  showConfidenceDetails = true
}: AISlotSuggestionsProps) {
  const { state } = useCalendar()
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false)

  // Analyze historical appointment patterns
  const historicalAnalysis = useMemo(() => {
    const pastAppointments = state.appointments.filter(apt => 
      isBefore(parseISO(apt.start_time), new Date())
    )

    // Analyze patterns by hour of day
    const hourlyPatterns = Array.from({ length: 24 }, (_, hour) => {
      const hourAppointments = pastAppointments.filter(apt => 
        parseISO(apt.start_time).getHours() === hour
      )

      const avgRevenue = hourAppointments.length > 0
        ? hourAppointments.reduce((sum, apt) => sum + (apt.total_price || 0), 0) / hourAppointments.length
        : 0

      const completionRate = hourAppointments.length > 0
        ? hourAppointments.filter(apt => apt.status === 'completed').length / hourAppointments.length
        : 0

      return {
        hour,
        bookingFrequency: hourAppointments.length,
        averageRevenue: avgRevenue,
        completionRate,
        clientSatisfaction: Math.random() * 0.3 + 0.7, // Would be real data in production
        upsellRate: Math.random() * 0.4 + 0.3
      }
    })

    // Analyze patterns by day of week
    const weeklyPatterns = Array.from({ length: 7 }, (_, dayOfWeek) => {
      const dayAppointments = pastAppointments.filter(apt => 
        parseISO(apt.start_time).getDay() === dayOfWeek
      )

      return {
        dayOfWeek,
        bookingFrequency: dayAppointments.length,
        averageRevenue: dayAppointments.length > 0
          ? dayAppointments.reduce((sum, apt) => sum + (apt.total_price || 0), 0) / dayAppointments.length
          : 0,
        peakHours: hourlyPatterns
          .filter(h => h.bookingFrequency > 0)
          .sort((a, b) => b.bookingFrequency - a.bookingFrequency)
          .slice(0, 3)
          .map(h => h.hour)
      }
    })

    // Analyze barber performance patterns
    const barberPatterns = state.barbers.map(barber => {
      const barberAppointments = pastAppointments.filter(apt => 
        apt.barber_id === barber.id
      )

      const bestHours = hourlyPatterns
        .map(hourData => ({
          hour: hourData.hour,
          revenue: barberAppointments
            .filter(apt => parseISO(apt.start_time).getHours() === hourData.hour)
            .reduce((sum, apt) => sum + (apt.total_price || 0), 0)
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      return {
        barberId: barber.id,
        name: barber.name,
        averageRevenue: barberAppointments.length > 0
          ? barberAppointments.reduce((sum, apt) => sum + (apt.total_price || 0), 0) / barberAppointments.length
          : 0,
        bestPerformanceHours: bestHours.map(h => h.hour),
        specializations: ['Standard Cut', 'Beard Trim', 'Premium Styling'], // Would be real data
        clientRetentionRate: Math.random() * 0.3 + 0.7
      }
    })

    return {
      hourlyPatterns,
      weeklyPatterns,
      barberPatterns,
      globalMetrics: {
        peakRevenueHours: hourlyPatterns
          .sort((a, b) => b.averageRevenue - a.averageRevenue)
          .slice(0, 5)
          .map(h => h.hour),
        optimalBookingTimes: hourlyPatterns
          .filter(h => h.completionRate > 0.8 && h.bookingFrequency > 2)
          .sort((a, b) => b.averageRevenue - a.averageRevenue)
          .slice(0, 8)
          .map(h => h.hour)
      }
    }
  }, [state.appointments, state.barbers])

  // Generate AI-powered slot suggestions
  const slotSuggestions = useMemo((): SlotSuggestion[] => {
    const suggestions: SlotSuggestion[] = []
    const dayOfWeek = selectedDate.getDay()
    const relevantBarbers = selectedBarberId 
      ? state.barbers.filter(b => b.id === selectedBarberId)
      : state.barbers

    // Get existing appointments for the selected date
    const existingAppointments = state.appointments.filter(apt =>
      isSameDay(parseISO(apt.start_time), selectedDate)
    )

    relevantBarbers.forEach(barber => {
      const barberPattern = historicalAnalysis.barberPatterns.find(p => p.barberId === barber.id)
      if (!barberPattern) return

      const barberAppointments = existingAppointments.filter(apt => apt.barber_id === barber.id)

      // Check each potential time slot
      for (let hour = state.settings.startHour; hour < state.settings.endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(selectedDate)
          slotStart.setHours(hour, minute, 0, 0)
          const slotEnd = addMinutes(slotStart, suggestedDuration)

          // Skip if slot is in the past
          if (isBefore(slotStart, new Date())) continue

          // Check for conflicts with existing appointments
          const hasConflict = barberAppointments.some(apt => {
            const aptStart = parseISO(apt.start_time)
            const aptEnd = addMinutes(aptStart, apt.duration_minutes || 60)
            return (isAfter(slotStart, aptStart) && isBefore(slotStart, aptEnd)) ||
                   (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
                   (isBefore(slotStart, aptStart) && isAfter(slotEnd, aptEnd))
          })

          if (hasConflict) continue

          // Calculate confidence score based on historical data
          const hourPattern = historicalAnalysis.hourlyPatterns[hour]
          const weeklyPattern = historicalAnalysis.weeklyPatterns[dayOfWeek]
          
          let confidence = 0.5 // Base confidence

          // Boost for high-performing hours
          if (barberPattern.bestPerformanceHours.includes(hour)) {
            confidence += 0.25
          }

          // Boost for globally optimal hours
          if (historicalAnalysis.globalMetrics.optimalBookingTimes.includes(hour)) {
            confidence += 0.15
          }

          // Boost for high completion rate hours
          if (hourPattern.completionRate > 0.85) {
            confidence += 0.1
          }

          // Slight penalty for very early or very late slots
          if (hour < 9 || hour > 17) {
            confidence -= 0.05
          }

          // Boost for slots with buffer time before/after
          const hasBufferBefore = !barberAppointments.some(apt => {
            const aptEnd = addMinutes(parseISO(apt.start_time), apt.duration_minutes || 60)
            return differenceInMinutes(slotStart, aptEnd) < 15 && differenceInMinutes(slotStart, aptEnd) > 0
          })
          const hasBufferAfter = !barberAppointments.some(apt => {
            const aptStart = parseISO(apt.start_time)
            return differenceInMinutes(aptStart, slotEnd) < 15 && differenceInMinutes(aptStart, slotEnd) > 0
          })

          if (hasBufferBefore && hasBufferAfter) {
            confidence += 0.1
          }

          // Only include suggestions with reasonable confidence
          if (confidence < 0.6) continue

          const reasons: string[] = []
          if (barberPattern.bestPerformanceHours.includes(hour)) {
            reasons.push(`${barber.name || 'Barber'} performs best at this time`)
          }
          if (hourPattern.averageRevenue > barberPattern.averageRevenue) {
            reasons.push('Above-average revenue potential')
          }
          if (hourPattern.completionRate > 0.9) {
            reasons.push('High completion rate historically')
          }
          if (hasBufferBefore && hasBufferAfter) {
            reasons.push('Optimal buffer time for quality service')
          }
          if (historicalAnalysis.globalMetrics.peakRevenueHours.includes(hour)) {
            reasons.push('Peak revenue hour')
          }

          const suggestion: SlotSuggestion = {
            id: `${barber.id}-${slotStart.getTime()}`,
            barberId: barber.id,
            startTime: slotStart,
            endTime: slotEnd,
            confidence: Math.min(confidence, 0.95),
            reasons,
            revenueProjection: hourPattern.averageRevenue * (confidence * 0.8 + 0.2),
            clientMatch: {
              tier: confidence > 0.85 ? 'platinum' : confidence > 0.75 ? 'vip' : 'regular',
              preference: confidence > 0.8 ? 'Premium time slot' : 'Standard booking',
              likelihood: confidence * 0.9
            },
            historicalData: {
              averageRevenue: hourPattern.averageRevenue,
              completionRate: hourPattern.completionRate,
              clientSatisfaction: hourPattern.clientSatisfaction,
              upsellProbability: hourPattern.upsellRate
            }
          }

          suggestions.push(suggestion)
        }
      }
    })

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions)
  }, [selectedDate, selectedBarberId, suggestedDuration, maxSuggestions, state.barbers, state.appointments, state.settings, historicalAnalysis])

  const handleSlotSelect = useCallback((suggestion: SlotSuggestion) => {
    setSelectedSuggestion(suggestion.id)
    onSlotSelect?.(suggestion)
  }, [onSlotSelect])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.8) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return SparklesIcon
    if (confidence >= 0.8) return TrendingUpIcon
    if (confidence >= 0.7) return LightBulbIcon
    return ClockIcon
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (slotSuggestions.length === 0) {
    return (
      <Card className={cn("border-l-4 border-l-gray-300", className)}>
        <CardContent className="p-6 text-center">
          <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Optimal Slots Found</h3>
          <p className="text-gray-600 mb-4">
            All available time slots for {format(selectedDate, 'MMM d, yyyy')} are either booked or outside peak performance hours.
          </p>
          <Button variant="outline" onClick={() => setShowDetailedAnalysis(true)}>
            View Analysis Details
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <BoltIcon className="h-5 w-5 text-purple-600" />
            <span>AI-Powered Slot Suggestions</span>
            <Badge variant="secondary" className="ml-2">
              {slotSuggestions.length} optimal {slotSuggestions.length === 1 ? 'slot' : 'slots'}
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Based on historical data, barber performance patterns, and revenue optimization for {format(selectedDate, 'MMM d, yyyy')}
          </p>
        </CardHeader>
      </Card>

      {/* Suggestions */}
      <div className="space-y-3">
        {slotSuggestions.map((suggestion, index) => {
          const barber = state.barbers.find(b => b.id === suggestion.barberId)
          const ConfidenceIcon = getConfidenceIcon(suggestion.confidence)
          const isSelected = selectedSuggestion === suggestion.id

          return (
            <Card 
              key={suggestion.id}
              className={cn(
                "transition-all duration-200 cursor-pointer",
                isSelected && "ring-2 ring-purple-500 bg-purple-50",
                !isSelected && "hover:shadow-md"
              )}
              onClick={() => handleSlotSelect(suggestion)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Primary Info */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={cn(
                        "p-2 rounded-lg border",
                        getConfidenceColor(suggestion.confidence)
                      )}>
                        <ConfidenceIcon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-lg">
                            {format(suggestion.startTime, 'h:mm a')} - {format(suggestion.endTime, 'h:mm a')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {suggestedDuration} min
                          </Badge>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              Best Match
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <UserIcon className="h-4 w-4" />
                          <span>{barber?.name || 'Available Barber'}</span>
                          <span>•</span>
                          <DollarSignIcon className="h-4 w-4" />
                          <span>{formatCurrency(suggestion.revenueProjection)} projected</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {Math.round(suggestion.confidence * 100)}% Confidence
                        </div>
                        <Progress 
                          value={suggestion.confidence * 100} 
                          className="w-16 h-2 mt-1"
                        />
                      </div>
                    </div>

                    {/* Reasons */}
                    <div className="space-y-2">
                      <div className="text-sm text-gray-700">
                        <strong>Why this slot:</strong>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.reasons.map((reason, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Historical Data (collapsible) */}
                    {showConfidenceDetails && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="text-center">
                            <div className="font-medium text-gray-900">
                              {formatCurrency(suggestion.historicalData.averageRevenue)}
                            </div>
                            <div className="text-gray-600">Avg Revenue</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">
                              {Math.round(suggestion.historicalData.completionRate * 100)}%
                            </div>
                            <div className="text-gray-600">Completion</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">
                              {Math.round(suggestion.historicalData.clientSatisfaction * 100)}%
                            </div>
                            <div className="text-gray-600">Satisfaction</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-gray-900">
                              {Math.round(suggestion.historicalData.upsellProbability * 100)}%
                            </div>
                            <div className="text-gray-600">Upsell Rate</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4">
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="min-w-[80px]"
                    >
                      {isSelected ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        'Select'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detailed Analysis Toggle */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                Analysis Details
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
            >
              {showDetailedAnalysis ? 'Hide' : 'Show'} Details
            </Button>
          </div>
          
          {showDetailedAnalysis && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Peak Hours Today</h4>
                  <div className="space-y-1">
                    {historicalAnalysis.globalMetrics.peakRevenueHours.slice(0, 3).map(hour => (
                      <div key={hour} className="flex justify-between">
                        <span>{format(new Date().setHours(hour, 0), 'h:mm a')}</span>
                        <span className="text-green-600">High Revenue</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Optimal Booking Times</h4>
                  <div className="space-y-1">
                    {historicalAnalysis.globalMetrics.optimalBookingTimes.slice(0, 3).map(hour => (
                      <div key={hour} className="flex justify-between">
                        <span>{format(new Date().setHours(hour, 0), 'h:mm a')}</span>
                        <span className="text-blue-600">High Success</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Barber Performance</h4>
                  <div className="space-y-1">
                    {historicalAnalysis.barberPatterns.slice(0, 3).map(barber => (
                      <div key={barber.barberId} className="flex justify-between">
                        <span className="truncate">{barber.name}</span>
                        <span className="text-purple-600">
                          {formatCurrency(barber.averageRevenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper component for slot suggestion integration
export function SlotSuggestionQuickPick({ 
  date, 
  onSlotSelect,
  className 
}: { 
  date: Date
  onSlotSelect: (slot: SlotSuggestion) => void
  className?: string 
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <SparklesIcon className="h-4 w-4 mr-1" />
            AI Suggest
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Get AI-powered time slot suggestions</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Advanced analytics component for detailed insights
export function SlotAnalyticsInsights({ 
  suggestions,
  className 
}: { 
  suggestions: SlotSuggestion[]
  className?: string 
}) {
  const insights = useMemo(() => {
    if (suggestions.length === 0) return null

    const avgConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
    const totalRevenueProjection = suggestions.reduce((sum, s) => sum + s.revenueProjection, 0)
    const bestSlot = suggestions[0]
    
    return {
      avgConfidence,
      totalRevenueProjection,
      bestSlot,
      qualityScore: avgConfidence * 100,
      revenueOpportunity: totalRevenueProjection > 0 ? 'High' : 'Medium'
    }
  }, [suggestions])

  if (!insights) return null

  return (
    <Card className={cn("bg-purple-50 border-purple-200", className)}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          <SparklesIcon className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-purple-900">AI Insights</span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="text-center">
            <div className="font-semibold text-purple-900">
              {Math.round(insights.qualityScore)}%
            </div>
            <div className="text-purple-700">Quality Score</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-purple-900">
              ${insights.totalRevenueProjection.toFixed(0)}
            </div>
            <div className="text-purple-700">Total Potential</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-purple-900">
              {format(insights.bestSlot.startTime, 'h:mm a')}
            </div>
            <div className="text-purple-700">Best Time</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-purple-900">
              {insights.revenueOpportunity}
            </div>
            <div className="text-purple-700">Opportunity</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}