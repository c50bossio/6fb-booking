'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  SparklesIcon,
  HeartIcon,
  TrophyIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'

interface Appointment {
  id: number
  client_name: string
  client_id?: number
  service_name: string
  service_price: number
  start_time: string
  client_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
  customer_type?: 'new' | 'returning' | 'vip' | 'at_risk'
  status: string
}

interface BookingRecommendation {
  id: string
  type: 'optimal_timing' | 'service_upgrade' | 'client_pairing' | 'follow_up_booking' | 'referral_booking'
  priority: 'high' | 'medium' | 'low'
  client_id?: number
  client_name?: string
  recommended_service: string
  recommended_price: number
  recommended_time: string
  reasoning: string
  six_fb_principle: string
  expected_revenue_impact: number
  confidence: number
  action_button_text: string
  deadline?: string
}

interface SmartBookingRecommendationsProps {
  appointments: Appointment[]
  currentDate: Date
  view: 'day' | 'week' | 'month'
  onBookingRecommendationApply?: (recommendation: BookingRecommendation) => void
  className?: string
}

// Six Figure Barber optimal booking patterns
const OPTIMAL_BOOKING_PATTERNS = {
  vip_hours: [9, 10, 11, 17, 18, 19], // Premium client hours
  new_client_hours: [14, 15, 16], // Afternoon for careful attention
  follow_up_windows: {
    first_visit: 14, // 2 weeks after first visit
    regular_client: 28, // 4 weeks for regular clients
    vip_client: 21 // 3 weeks for VIP clients
  },
  service_progression: {
    bronze: ['Basic Cut', 'Professional Cut'],
    silver: ['Premium Cut', 'Cut & Style'],
    gold: ['Executive Package', 'Premium Styling'],
    platinum: ['VIP Experience', 'Signature Service']
  }
}

export default function SmartBookingRecommendations({
  appointments = [],
  currentDate,
  view,
  onBookingRecommendationApply,
  className = ""
}: SmartBookingRecommendationsProps) {
  const { toast } = useToast()
  const [recommendations, setRecommendations] = useState<BookingRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('all')

  // Generate smart booking recommendations based on Six Figure Barber methodology
  const generateRecommendations = useMemo(() => {
    const recs: BookingRecommendation[] = []
    const today = new Date()
    const clientHistory = new Map()

    // Analyze client patterns
    appointments.forEach(apt => {
      const clientKey = apt.client_name
      if (!clientHistory.has(clientKey)) {
        clientHistory.set(clientKey, {
          client_id: apt.client_id,
          client_name: apt.client_name,
          appointments: [],
          total_spent: 0,
          last_visit: null,
          client_tier: apt.client_tier || 'bronze',
          customer_type: apt.customer_type || 'new'
        })
      }
      
      const history = clientHistory.get(clientKey)
      history.appointments.push(apt)
      history.total_spent += apt.service_price || 0
      
      if (!history.last_visit || new Date(apt.start_time) > new Date(history.last_visit)) {
        history.last_visit = apt.start_time
      }
    })

    // Generate recommendations for each client
    clientHistory.forEach((history, clientName) => {
      const daysSinceLastVisit = history.last_visit 
        ? Math.floor((today.getTime() - new Date(history.last_visit).getTime()) / (1000 * 60 * 60 * 24))
        : 0

      // Follow-up booking recommendations
      if (history.appointments.length === 1 && daysSinceLastVisit >= 10 && daysSinceLastVisit <= 20) {
        recs.push({
          id: `followup-${history.client_id}-${Date.now()}`,
          type: 'follow_up_booking',
          priority: 'high',
          client_id: history.client_id,
          client_name: clientName,
          recommended_service: 'Professional Cut & Style',
          recommended_price: 75,
          recommended_time: getOptimalFollowUpTime(history.customer_type),
          reasoning: `Perfect timing for ${clientName}'s second visit to build loyalty`,
          six_fb_principle: "Second visits are crucial for retention. Clients who return within 3 weeks are 80% more likely to become regulars.",
          expected_revenue_impact: 75,
          confidence: 0.85,
          action_button_text: "Schedule Follow-up",
          deadline: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      }

      // Service upgrade recommendations
      if (history.client_tier === 'silver' && history.total_spent >= 150) {
        recs.push({
          id: `upgrade-${history.client_id}-${Date.now()}`,
          type: 'service_upgrade',
          priority: 'medium',
          client_id: history.client_id,
          client_name: clientName,
          recommended_service: 'Gold Premium Package',
          recommended_price: 120,
          recommended_time: getOptimalVIPTime(),
          reasoning: `${clientName} has invested $${history.total_spent.toFixed(0)} - ready for premium experience`,
          six_fb_principle: "Loyal clients appreciate being recognized with premium services. Tier upgrades increase lifetime value.",
          expected_revenue_impact: 45, // Difference from current average
          confidence: 0.75,
          action_button_text: "Offer Upgrade"
        })
      }

      // Re-engagement for at-risk clients
      if (daysSinceLastVisit >= 45 && daysSinceLastVisit <= 90 && history.appointments.length > 1) {
        recs.push({
          id: `reengage-${history.client_id}-${Date.now()}`,
          type: 'follow_up_booking',
          priority: 'high',
          client_id: history.client_id,
          client_name: clientName,
          recommended_service: 'Welcome Back Special',
          recommended_price: 65,
          recommended_time: getOptimalReEngagementTime(),
          reasoning: `${clientName} hasn't visited in ${daysSinceLastVisit} days - proactive re-engagement needed`,
          six_fb_principle: "Proactive retention is more profitable than new client acquisition. Personal outreach shows you care.",
          expected_revenue_impact: 65,
          confidence: 0.60,
          action_button_text: "Re-engage Client",
          deadline: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
        })
      }

      // Referral opportunity recommendations
      if (history.customer_type === 'vip' && history.appointments.length >= 5) {
        recs.push({
          id: `referral-${history.client_id}-${Date.now()}`,
          type: 'referral_booking',
          priority: 'medium',
          client_id: history.client_id,
          client_name: clientName,
          recommended_service: 'Friend Referral Bonus',
          recommended_price: 0, // Bonus for referrer
          recommended_time: getOptimalReferralTime(),
          reasoning: `${clientName} is a loyal VIP client - perfect referral opportunity`,
          six_fb_principle: "Happy VIP clients are your best marketing. Referrals from satisfied clients have 90% conversion rates.",
          expected_revenue_impact: 150, // Expected revenue from referred client
          confidence: 0.70,
          action_button_text: "Request Referral"
        })
      }
    })

    // Optimal timing recommendations for current bookings
    appointments.forEach(apt => {
      const aptHour = new Date(apt.start_time).getHours()
      const isOptimalTime = OPTIMAL_BOOKING_PATTERNS.vip_hours.includes(aptHour)
      
      if (!isOptimalTime && (apt.client_tier === 'gold' || apt.client_tier === 'platinum')) {
        recs.push({
          id: `timing-${apt.id}-${Date.now()}`,
          type: 'optimal_timing',
          priority: 'low',
          client_id: apt.client_id,
          client_name: apt.client_name,
          recommended_service: apt.service_name,
          recommended_price: apt.service_price,
          recommended_time: getOptimalVIPTime(),
          reasoning: `${apt.client_name} would benefit from premium hours (9-11 AM or 5-7 PM)`,
          six_fb_principle: "Premium clients deserve premium time slots. Optimal scheduling enhances their experience.",
          expected_revenue_impact: 0,
          confidence: 0.50,
          action_button_text: "Suggest Reschedule"
        })
      }
    })

    // Sort by priority and confidence
    return recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.confidence - a.confidence
    })
  }, [appointments, currentDate])

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    if (selectedType === 'all') return generateRecommendations
    return generateRecommendations.filter(rec => rec.type === selectedType)
  }, [generateRecommendations, selectedType])

  // Helper functions for optimal timing
  function getOptimalFollowUpTime(): string {
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + 14)
    followUpDate.setHours(15, 0, 0, 0) // 3 PM - good for follow-ups
    return followUpDate.toISOString()
  }

  function getOptimalVIPTime(): string {
    const vipDate = new Date()
    vipDate.setDate(vipDate.getDate() + 7)
    vipDate.setHours(10, 0, 0, 0) // 10 AM - premium hour
    return vipDate.toISOString()
  }

  function getOptimalReEngagementTime(): string {
    const reEngageDate = new Date()
    reEngageDate.setDate(reEngageDate.getDate() + 3)
    reEngageDate.setHours(14, 0, 0, 0) // 2 PM - personal attention time
    return reEngageDate.toISOString()
  }

  function getOptimalReferralTime(): string {
    const referralDate = new Date()
    referralDate.setDate(referralDate.getDate() + 2)
    referralDate.setHours(16, 0, 0, 0) // 4 PM - good for conversations
    return referralDate.toISOString()
  }

  // Handle recommendation application
  const handleApplyRecommendation = async (recommendation: BookingRecommendation) => {
    if (onBookingRecommendationApply) {
      onBookingRecommendationApply(recommendation)
    } else {
      toast({
        title: "Smart Recommendation",
        description: `${recommendation.action_button_text} for ${recommendation.client_name}`,
        variant: "default"
      })
    }
  }

  // Get recommendation icon
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'follow_up_booking': return <CalendarIcon className="w-4 h-4" />
      case 'service_upgrade': return <TrophyIcon className="w-4 h-4" />
      case 'optimal_timing': return <ClockIcon className="w-4 h-4" />
      case 'referral_booking': return <UserGroupIcon className="w-4 h-4" />
      default: return <SparklesIcon className="w-4 h-4" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Format time
  const formatRecommendedTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <Card className={`smart-booking-recommendations ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <SparklesIcon className="w-5 h-5 text-blue-600" />
            Smart Booking Intelligence
            <Badge variant="outline" className="text-xs ml-2">
              {filteredRecommendations.length} recommendations
            </Badge>
          </CardTitle>
          
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="all">All Types</option>
            <option value="follow_up_booking">Follow-ups</option>
            <option value="service_upgrade">Upgrades</option>
            <option value="optimal_timing">Timing</option>
            <option value="referral_booking">Referrals</option>
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredRecommendations.length === 0 ? (
          <Alert>
            <LightBulbIcon className="w-4 h-4" />
            <AlertDescription className="text-sm">
              No smart recommendations available. System continuously analyzes patterns to identify opportunities.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {filteredRecommendations.slice(0, 10).map((recommendation) => (
              <div 
                key={recommendation.id}
                className={`p-4 rounded-lg border ${getPriorityColor(recommendation.priority)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getRecommendationIcon(recommendation.type)}
                    <div className="flex-1">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        {recommendation.client_name && (
                          <span>{recommendation.client_name}</span>
                        )}
                        <ArrowRightIcon className="w-3 h-3" />
                        <span>{recommendation.recommended_service}</span>
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatRecommendedTime(recommendation.recommended_time)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={recommendation.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {recommendation.priority}
                    </Badge>
                    {recommendation.expected_revenue_impact > 0 && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        +${recommendation.expected_revenue_impact}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-3">{recommendation.reasoning}</p>
                
                <Alert className="border-blue-200 bg-blue-50 mb-3">
                  <HeartIcon className="w-4 h-4" />
                  <AlertDescription className="text-xs text-blue-800">
                    <strong>6FB Principle:</strong> {recommendation.six_fb_principle}
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Confidence: {Math.round(recommendation.confidence * 100)}%
                    </span>
                    {recommendation.deadline && (
                      <Badge variant="outline" className="text-xs">
                        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                        {Math.ceil((new Date(recommendation.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                      </Badge>
                    )}
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleApplyRecommendation(recommendation)}
                    className="text-xs h-7"
                  >
                    {recommendation.action_button_text}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Six Figure Barber Intelligence Insight */}
        <Alert className="border-purple-200 bg-purple-50 mt-4">
          <SparklesIcon className="w-4 h-4" />
          <AlertDescription className="text-xs text-purple-800">
            <strong>6FB Intelligence:</strong> Smart recommendations are based on successful patterns from six-figure barbers. Each suggestion is designed to strengthen relationships and maximize lifetime value.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
