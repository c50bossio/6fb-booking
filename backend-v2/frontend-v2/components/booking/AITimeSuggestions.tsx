'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Sparkles, Clock, Star, TrendingUp, ChevronRight, Info } from 'lucide-react'
import { 
  aiTimeSuggestions, 
  formatTimeSlotSuggestion, 
  getConfidenceColor,
  getPreferenceIcon,
  type TimeSlot 
} from '@/lib/ai-time-suggestions'
import { getMyBookings, type BookingResponse } from '@/lib/api'
import { formatTimeWithTimezone } from '@/lib/timezone'
import { useResponsive } from '@/hooks/useResponsive'

interface AITimeSuggestionsProps {
  selectedDate: Date
  selectedService: string
  existingAppointments?: BookingResponse[]
  onTimeSelect: (time: string) => void
  isLoading?: boolean
}

export default function AITimeSuggestions({
  selectedDate,
  selectedService,
  existingAppointments = [],
  onTimeSelect,
  isLoading = false
}: AITimeSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [clientHistory, setClientHistory] = useState<BookingResponse[]>([])
  const [expanded, setExpanded] = useState(false)
  const { isMobile } = useResponsive()

  // Fetch client history for better suggestions
  useEffect(() => {
    async function fetchClientHistory() {
      try {
        const response = await getMyBookings()
        setClientHistory(response.bookings || [])
      } catch (error) {
        console.log('No client history available - using default suggestions')
      }
    }
    fetchClientHistory()
  }, [])

  // Generate AI suggestions when date/service changes
  useEffect(() => {
    async function generateSuggestions() {
      setLoading(true)
      try {
        // Create client profile from history
        const clientProfile = clientHistory.length > 0 ? {
          id: 0, // Will be populated from actual user data
          name: 'Client',
          previousAppointments: clientHistory,
          loyalty: clientHistory.length > 10 ? 'vip' as const : 
                   clientHistory.length > 3 ? 'regular' as const : 'new' as const,
          noShowRate: 0, // Could calculate from history
          preferredTimes: extractPreferredTimes(clientHistory)
        } : undefined

        const suggestedSlots = await aiTimeSuggestions.generateTimeSuggestions(
          selectedDate,
          selectedService,
          clientProfile,
          existingAppointments,
          getServiceDuration(selectedService)
        )

        setSuggestions(suggestedSlots)
      } catch (error) {
        console.error('Failed to generate AI suggestions:', error)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }

    if (selectedDate && selectedService) {
      generateSuggestions()
    }
  }, [selectedDate, selectedService, existingAppointments, clientHistory])

  // Extract preferred times from booking history
  function extractPreferredTimes(bookings: BookingResponse[]): string[] {
    const timeFrequency = new Map<string, number>()
    
    bookings.forEach(booking => {
      const time = format(new Date(booking.start_time), 'HH:mm')
      timeFrequency.set(time, (timeFrequency.get(time) || 0) + 1)
    })

    return Array.from(timeFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([time]) => time)
  }

  // Get service duration (would ideally come from service data)
  function getServiceDuration(service: string): number {
    const durations: Record<string, number> = {
      'Haircut': 30,
      'Shave': 20,
      'Haircut & Shave': 45,
      'Consultation': 15,
      'Color': 90,
      'Treatment': 60
    }
    return durations[service] || 30
  }

  if (loading || isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary-600 animate-pulse" />
            <span className="text-gray-600">Analyzing best times for you...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  const displayedSuggestions = expanded || isMobile ? suggestions : suggestions.slice(0, 3)

  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              AI-Suggested Times
            </h3>
          </div>
          {!isMobile && suggestions.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-primary-600"
            >
              {expanded ? 'Show Less' : `Show All (${suggestions.length})`}
              <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </Button>
          )}
        </div>

        {/* Suggestions Grid/List */}
        <div className={`${
          isMobile 
            ? 'space-y-3' 
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
        }`}>
          {displayedSuggestions.map((slot, index) => (
            <div
              key={`${slot.time}-${index}`}
              className={`
                relative overflow-hidden rounded-lg border-2 transition-all cursor-pointer
                ${slot.preference === 'high' 
                  ? 'border-green-200 bg-green-50 hover:border-green-400' 
                  : slot.preference === 'medium'
                  ? 'border-blue-200 bg-blue-50 hover:border-blue-400'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-400'
                }
                hover:shadow-md transform hover:scale-[1.02]
              `}
              onClick={() => onTimeSelect(slot.time)}
            >
              {/* Mobile Layout */}
              {isMobile ? (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="font-semibold text-lg">
                        {formatTimeWithTimezone(slot.time, false)}
                      </span>
                    </div>
                    <span className="text-2xl">{getPreferenceIcon(slot.preference)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          slot.confidence >= 0.8 ? 'bg-green-500' :
                          slot.confidence >= 0.6 ? 'bg-blue-500' :
                          slot.confidence >= 0.4 ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`}
                        style={{ width: `${slot.confidence * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${getConfidenceColor(slot.confidence)}`}>
                      {Math.round(slot.confidence * 100)}%
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 line-clamp-2">{slot.reason}</p>
                </div>
              ) : (
                /* Desktop Layout */
                <div className="p-4">
                  {/* Preference badge */}
                  {slot.preference === 'high' && (
                    <Badge 
                      variant="success" 
                      className="absolute top-2 right-2 text-xs"
                    >
                      Best Match
                    </Badge>
                  )}
                  
                  {/* Time and icon */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-600" />
                      <span className="font-semibold text-xl">
                        {formatTimeWithTimezone(slot.time, false)}
                      </span>
                    </div>
                    <span className="text-2xl">{getPreferenceIcon(slot.preference)}</span>
                  </div>
                  
                  {/* Confidence indicator */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Match Score</span>
                      <span className={`text-sm font-medium ${getConfidenceColor(slot.confidence)}`}>
                        {Math.round(slot.confidence * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          slot.confidence >= 0.8 ? 'bg-green-500' :
                          slot.confidence >= 0.6 ? 'bg-blue-500' :
                          slot.confidence >= 0.4 ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`}
                        style={{ width: `${slot.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Reason */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {slot.reason}
                  </p>
                  
                  {/* Select button */}
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    className="mt-3"
                    onClick={(e) => {
                      e.stopPropagation()
                      onTimeSelect(slot.time)
                    }}
                  >
                    Select This Time
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile: Show more button */}
        {isMobile && suggestions.length > displayedSuggestions.length && (
          <Button
            variant="outline"
            fullWidth
            className="mt-4"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : `Show ${suggestions.length - 3} More Suggestions`}
          </Button>
        )}

        {/* Info note */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
            These suggestions are based on your booking patterns, barber availability, and optimal scheduling. 
            Times with higher scores are more likely to work well for you.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}