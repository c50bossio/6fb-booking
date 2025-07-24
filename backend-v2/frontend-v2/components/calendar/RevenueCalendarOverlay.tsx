'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSignIcon, 
  TrendingUpIcon, 
  ClockIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AlertCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface Appointment {
  id: number
  service_name: string
  service_price: number
  start_time: string
  end_time: string
  client_name: string
  client_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
  status: string
  commission_rate?: number
}

interface RevenueTargets {
  daily_target: number
  weekly_target: number
  monthly_target: number
  annual_target: number
}

interface UpsellOpportunity {
  appointment_id: number
  client_name: string
  current_service: string
  suggested_service: string
  revenue_increase: number
  probability: number
  reasoning: string
}

interface RevenueCalendarOverlayProps {
  appointments: Appointment[]
  currentDate: Date
  revenueTargets: RevenueTargets
  onUpsellSuggestion?: (opportunity: UpsellOpportunity) => void
  onRevenueOptimization?: (suggestions: any[]) => void
  view: 'day' | 'week' | 'month'
  className?: string
}

// Six Figure Barber service value tiers
const SERVICE_VALUE_TIERS = {
  PLATINUM: { min: 120, color: 'bg-purple-100 border-purple-500 text-purple-900', label: 'Platinum' },
  GOLD: { min: 85, color: 'bg-yellow-100 border-yellow-500 text-yellow-900', label: 'Gold' },
  SILVER: { min: 45, color: 'bg-gray-100 border-gray-500 text-gray-700', label: 'Silver' },
  BRONZE: { min: 0, color: 'bg-orange-100 border-orange-500 text-orange-700', label: 'Bronze' }
}

const CLIENT_TIER_COLORS = {
  platinum: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-500' },
  gold: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-500' },
  silver: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-500' },
  bronze: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-500' }
}

export default function RevenueCalendarOverlay({
  appointments,
  currentDate,
  revenueTargets,
  onUpsellSuggestion,
  onRevenueOptimization,
  view,
  className = ""
}: RevenueCalendarOverlayProps) {
  const [showUpsellSuggestions, setShowUpsellSuggestions] = useState(false)

  // Calculate daily revenue and progress
  const dailyMetrics = useMemo(() => {
    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === currentDate.toDateString()
    })

    const totalRevenue = todayAppointments.reduce((sum, apt) => sum + (apt.service_price || 0), 0)
    const totalCommission = todayAppointments.reduce((sum, apt) => {
      const commission = (apt.service_price || 0) * ((apt.commission_rate || 50) / 100)
      return sum + commission
    }, 0)

    const progress = (totalRevenue / revenueTargets.daily_target) * 100
    const commissionProgress = (totalCommission / (revenueTargets.daily_target * 0.6)) * 100 // Assuming 60% avg commission

    return {
      totalRevenue,
      totalCommission,
      progress: Math.min(progress, 100),
      commissionProgress: Math.min(commissionProgress, 100),
      appointmentCount: todayAppointments.length,
      averageTicket: todayAppointments.length > 0 ? totalRevenue / todayAppointments.length : 0
    }
  }, [appointments, currentDate, revenueTargets])

  // Categorize appointments by service value
  const appointmentsByValue = useMemo(() => {
    return appointments.map(apt => {
      const price = apt.service_price || 0
      let tier = SERVICE_VALUE_TIERS.BRONZE
      
      if (price >= SERVICE_VALUE_TIERS.PLATINUM.min) {
        tier = SERVICE_VALUE_TIERS.PLATINUM
      } else if (price >= SERVICE_VALUE_TIERS.GOLD.min) {
        tier = SERVICE_VALUE_TIERS.GOLD
      } else if (price >= SERVICE_VALUE_TIERS.SILVER.min) {
        tier = SERVICE_VALUE_TIERS.SILVER
      }

      return {
        ...apt,
        valueTier: tier
      }
    })
  }, [appointments])

  // Generate upselling opportunities
  const upsellOpportunities = useMemo(() => {
    const opportunities: UpsellOpportunity[] = []
    
    appointments.forEach(apt => {
      if (apt.service_price < 85 && apt.status === 'confirmed') {
        // Basic haircut -> Premium styling
        if (apt.service_name.toLowerCase().includes('haircut') && apt.service_price < 50) {
          opportunities.push({
            appointment_id: apt.id,
            client_name: apt.client_name,
            current_service: apt.service_name,
            suggested_service: 'Premium Haircut & Styling',
            revenue_increase: 35,
            probability: 0.7,
            reasoning: 'Client has regular booking pattern, good candidate for premium upgrade'
          })
        }
        
        // Add beard trim to haircut
        if (apt.service_name.toLowerCase().includes('haircut') && !apt.service_name.toLowerCase().includes('beard')) {
          opportunities.push({
            appointment_id: apt.id,
            client_name: apt.client_name,
            current_service: apt.service_name,
            suggested_service: apt.service_name + ' + Beard Trim',
            revenue_increase: 25,
            probability: 0.8,
            reasoning: 'High-conversion add-on service, minimal time investment'
          })
        }
      }
    })

    return opportunities.slice(0, 3) // Top 3 opportunities
  }, [appointments])

  // Get service value tier styling
  const getServiceValueStyling = useCallback((price: number) => {
    if (price >= SERVICE_VALUE_TIERS.PLATINUM.min) return SERVICE_VALUE_TIERS.PLATINUM
    if (price >= SERVICE_VALUE_TIERS.GOLD.min) return SERVICE_VALUE_TIERS.GOLD
    if (price >= SERVICE_VALUE_TIERS.SILVER.min) return SERVICE_VALUE_TIERS.SILVER
    return SERVICE_VALUE_TIERS.BRONZE
  }, [])

  // Get client tier styling
  const getClientTierStyling = useCallback((tier?: string) => {
    return CLIENT_TIER_COLORS[tier as keyof typeof CLIENT_TIER_COLORS] || CLIENT_TIER_COLORS.bronze
  }, [])

  // Calculate peak hour performance
  const peakHourAnalysis = useMemo(() => {
    const hourlyRevenue: { [hour: number]: number } = {}
    
    appointments.forEach(apt => {
      const hour = new Date(apt.start_time).getHours()
      hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + (apt.service_price || 0)
    })

    const sortedHours = Object.entries(hourlyRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)

    return sortedHours.map(([hour, revenue]) => ({
      hour: parseInt(hour),
      revenue,
      period: parseInt(hour) < 12 ? 'AM' : 'PM',
      displayHour: parseInt(hour) === 0 ? 12 : parseInt(hour) > 12 ? parseInt(hour) - 12 : parseInt(hour)
    }))
  }, [appointments])

  return (
    <div className={`revenue-calendar-overlay space-y-4 ${className}`}>
      {/* Daily Revenue Progress Header */}
      <Card className="border-l-4 border-primary-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSignIcon className="w-5 h-5 text-primary-600" />
              Daily Revenue Progress
            </CardTitle>
            <Badge variant={dailyMetrics.progress >= 100 ? "success" : dailyMetrics.progress >= 75 ? "warning" : "secondary"}>
              {dailyMetrics.progress.toFixed(1)}% of Target
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                ${dailyMetrics.totalRevenue.toFixed(0)}
              </p>
              <p className="text-xs text-gray-600">Today's Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                ${dailyMetrics.totalCommission.toFixed(0)}
              </p>
              <p className="text-xs text-gray-600">Commission Earned</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {dailyMetrics.appointmentCount}
              </p>
              <p className="text-xs text-gray-600">Appointments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                ${dailyMetrics.averageTicket.toFixed(0)}
              </p>
              <p className="text-xs text-gray-600">Avg Ticket</p>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Revenue Target</span>
                <span>${revenueTargets.daily_target.toFixed(0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    dailyMetrics.progress >= 100 ? 'bg-green-500' : 
                    dailyMetrics.progress >= 75 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${dailyMetrics.progress}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Commission Progress</span>
                <span>${(revenueTargets.daily_target * 0.6).toFixed(0)} target</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${dailyMetrics.commissionProgress}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Value Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <StarIcon className="w-5 h-5 text-yellow-500" />
            Service Value Mix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(SERVICE_VALUE_TIERS).map(([key, tier]) => {
              const count = appointmentsByValue.filter(apt => 
                apt.service_price >= tier.min && 
                (key === 'PLATINUM' || apt.service_price < SERVICE_VALUE_TIERS[Object.keys(SERVICE_VALUE_TIERS)[Object.keys(SERVICE_VALUE_TIERS).indexOf(key) - 1] as keyof typeof SERVICE_VALUE_TIERS]?.min || Infinity)
              ).length
              
              const revenue = appointmentsByValue
                .filter(apt => 
                  apt.service_price >= tier.min && 
                  (key === 'PLATINUM' || apt.service_price < SERVICE_VALUE_TIERS[Object.keys(SERVICE_VALUE_TIERS)[Object.keys(SERVICE_VALUE_TIERS).indexOf(key) - 1] as keyof typeof SERVICE_VALUE_TIERS]?.min || Infinity)
                )
                .reduce((sum, apt) => sum + (apt.service_price || 0), 0)

              return (
                <div key={key} className={`p-3 rounded-lg border-2 ${tier.color}`}>
                  <div className="text-center">
                    <p className="font-bold text-lg">{count}</p>
                    <p className="text-xs font-medium">{tier.label}</p>
                    <p className="text-xs">${revenue.toFixed(0)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Peak Hour Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-blue-500" />
            Peak Revenue Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {peakHourAnalysis.map((peak, index) => (
              <div key={peak.hour} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    #{index + 1}
                  </Badge>
                  <span className="font-medium">
                    {peak.displayHour}:00 {peak.period}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">${peak.revenue.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upselling Opportunities */}
      {upsellOpportunities.length > 0 && (
        <Card className="border-l-4 border-orange-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUpIcon className="w-5 h-5 text-orange-500" />
                Revenue Opportunities
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpsellSuggestions(!showUpsellSuggestions)}
              >
                {showUpsellSuggestions ? 'Hide' : 'Show'} Suggestions
              </Button>
            </div>
          </CardHeader>
          {showUpsellSuggestions && (
            <CardContent>
              <div className="space-y-3">
                {upsellOpportunities.map((opportunity, index) => (
                  <div key={opportunity.appointment_id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {opportunity.client_name}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {opportunity.current_service} → {opportunity.suggested_service}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800">
                          +${opportunity.revenue_increase}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round(opportunity.probability * 100)}% likely
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mb-2">
                      {opportunity.reasoning}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpsellSuggestion?.(opportunity)}
                      className="text-xs"
                    >
                      Apply Suggestion
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  💡 Potential Additional Revenue: ${upsellOpportunities.reduce((sum, opp) => sum + opp.revenue_increase, 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Six Figure Barber Method: Focus on value-added services to increase client lifetime value
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 6FB Methodology Coaching */}
      <Card className="border-l-4 border-purple-500">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-purple-500" />
            Six Figure Barber Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dailyMetrics.progress >= 100 ? (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  🎯 Excellent! You've hit your daily target. This consistency is key to six-figure success.
                </p>
                <p className="text-xs text-green-600 mt-1">
                  6FB Principle: Consistent daily execution compounds into extraordinary annual results.
                </p>
              </div>
            ) : dailyMetrics.averageTicket >= 85 ? (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">
                  💰 Strong average ticket value! Premium pricing is working for your brand.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  6FB Principle: Value-based pricing attracts quality clients who appreciate your expertise.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800 font-medium">
                  📈 Focus on premium service positioning to increase your average ticket value.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  6FB Principle: Your expertise deserves premium pricing. Confidence in your value creates client confidence.
                </p>
              </div>
            )}

            {peakHourAnalysis.length > 0 && (
              <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
                <strong>Peak Performance:</strong> Your best hour is {peakHourAnalysis[0].displayHour}:00 {peakHourAnalysis[0].period} 
                with ${peakHourAnalysis[0].revenue} revenue. Consider premium pricing during peak hours.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}