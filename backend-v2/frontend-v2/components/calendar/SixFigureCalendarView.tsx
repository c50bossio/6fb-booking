'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import UnifiedCalendar from '../UnifiedCalendar'
import RevenueCalendarOverlay from './RevenueCalendarOverlay'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  ChartBarIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import type { CalendarView } from '@/types/calendar'

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

interface SixFigureCalendarViewProps {
  // Standard calendar props
  view: CalendarView
  onViewChange?: (view: CalendarView) => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
  appointments: Appointment[]
  barbers?: any[]
  clients?: any[]
  selectedBarberId?: number | 'all'
  onBarberSelect?: (barberId: number | 'all') => void
  onAppointmentClick?: (appointment: Appointment) => void
  onClientClick?: (client: any) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => void
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void

  // Six Figure Barber specific props
  revenueTargets?: {
    daily_target: number
    weekly_target: number
    monthly_target: number
    annual_target: number
  }
  showRevenueOverlay?: boolean
  onUpsellSuggestion?: (opportunity: any) => void
  className?: string
}

// Default Six Figure Barber targets (can be customized per user)
const DEFAULT_REVENUE_TARGETS = {
  daily_target: 274, // $100k annual / 365 days
  weekly_target: 1923, // $100k annual / 52 weeks
  monthly_target: 8333, // $100k annual / 12 months
  annual_target: 100000
}

// Six Figure Barber service value tiers for styling
const SERVICE_VALUE_TIERS = {
  PLATINUM: { min: 120, color: '#9333EA', bgColor: '#F3E8FF', borderColor: '#9333EA' },
  GOLD: { min: 85, color: '#F59E0B', bgColor: '#FFFBEB', borderColor: '#F59E0B' },
  SILVER: { min: 45, color: '#6B7280', bgColor: '#F9FAFB', borderColor: '#6B7280' },
  BRONZE: { min: 0, color: '#EA580C', bgColor: '#FFF7ED', borderColor: '#EA580C' }
}

const CLIENT_TIER_INDICATORS = {
  platinum: { emoji: '👑', color: '#9333EA', bg: '#F3E8FF' },
  gold: { emoji: '🏆', color: '#F59E0B', bg: '#FFFBEB' },
  silver: { emoji: '🥈', color: '#6B7280', bg: '#F9FAFB' },
  bronze: { emoji: '🥉', color: '#EA580C', bg: '#FFF7ED' }
}

export default function SixFigureCalendarView({
  view,
  onViewChange,
  currentDate = new Date(),
  onDateChange,
  appointments = [],
  barbers = [],
  clients = [],
  selectedBarberId = 'all',
  onBarberSelect,
  onAppointmentClick,
  onClientClick,
  onTimeSlotClick,
  onAppointmentUpdate,
  isLoading = false,
  error = null,
  onRefresh,
  revenueTargets = DEFAULT_REVENUE_TARGETS,
  showRevenueOverlay = true,
  onUpsellSuggestion,
  className = ""
}: SixFigureCalendarViewProps) {
  const [revenueOverlayVisible, setRevenueOverlayVisible] = useState(showRevenueOverlay)
  const [calendarLayout, setCalendarLayout] = useState<'standard' | 'revenue-focused'>('revenue-focused')

  // Enhanced appointments with revenue intelligence
  const enhancedAppointments = useMemo(() => {
    return appointments.map(apt => {
      const price = apt.service_price || 0
      let valueTier = SERVICE_VALUE_TIERS.BRONZE
      
      if (price >= SERVICE_VALUE_TIERS.PLATINUM.min) {
        valueTier = SERVICE_VALUE_TIERS.PLATINUM
      } else if (price >= SERVICE_VALUE_TIERS.GOLD.min) {
        valueTier = SERVICE_VALUE_TIERS.GOLD
      } else if (price >= SERVICE_VALUE_TIERS.SILVER.min) {
        valueTier = SERVICE_VALUE_TIERS.SILVER
      }

      // Calculate commission based on service price and rate
      const commission = price * ((apt.commission_rate || 50) / 100)

      return {
        ...apt,
        valueTier,
        commission,
        // Add visual styling for Six Figure Barber methodology
        revenueClassification: {
          tier: valueTier,
          isHighValue: price >= 85, // Six Figure Barber premium threshold
          commissionEarned: commission,
          clientTier: apt.client_tier || 'bronze'
        }
      }
    })
  }, [appointments])

  // Custom appointment renderer with revenue intelligence
  const renderRevenueEnhancedAppointment = useCallback((appointment: any) => {
    const { revenueClassification } = appointment
    const clientTierInfo = CLIENT_TIER_INDICATORS[revenueClassification.clientTier as keyof typeof CLIENT_TIER_INDICATORS]

    return (
      <div 
        className={`appointment-enhanced relative rounded-lg p-3 border-l-4 cursor-pointer transition-all hover:shadow-md`}
        style={{
          backgroundColor: revenueClassification.tier.bgColor,
          borderLeftColor: revenueClassification.tier.borderColor
        }}
        onClick={() => onAppointmentClick?.(appointment)}
      >
        {/* Client Tier Indicator */}
        <div className="absolute top-1 right-1">
          <span className="text-xs" title={`${revenueClassification.clientTier} client`}>
            {clientTierInfo.emoji}
          </span>
        </div>

        {/* Service Information */}
        <div className="pr-6">
          <h4 className="font-medium text-sm text-gray-900 truncate">
            {appointment.client_name}
          </h4>
          <p className="text-xs text-gray-600 truncate">
            {appointment.service_name}
          </p>
          
          {/* Revenue Information */}
          <div className="flex items-center justify-between mt-2">
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ 
                color: revenueClassification.tier.color,
                borderColor: revenueClassification.tier.color
              }}
            >
              ${appointment.service_price}
            </Badge>
            {revenueClassification.isHighValue && (
              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                Premium
              </Badge>
            )}
          </div>

          {/* Commission Information */}
          <div className="mt-1">
            <p className="text-xs text-gray-500">
              Commission: ${revenueClassification.commissionEarned.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Six Figure Barber Value Indicator */}
        {revenueClassification.isHighValue && (
          <div className="absolute bottom-1 right-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="High-value service" />
          </div>
        )}
      </div>
    )
  }, [onAppointmentClick])

  // Handle upsell suggestions
  const handleUpsellSuggestion = useCallback((opportunity: any) => {
    if (onUpsellSuggestion) {
      onUpsellSuggestion(opportunity)
    } else {
      // Default behavior: show alert with suggestion
      alert(`Upsell Opportunity: Suggest ${opportunity.suggested_service} to ${opportunity.client_name} for +$${opportunity.revenue_increase} revenue`)
    }
  }, [onUpsellSuggestion])

  // Calculate daily metrics for header display
  const dailyMetrics = useMemo(() => {
    const todayAppointments = enhancedAppointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === currentDate.toDateString()
    })

    const totalRevenue = todayAppointments.reduce((sum, apt) => sum + (apt.service_price || 0), 0)
    const totalCommission = todayAppointments.reduce((sum, apt) => sum + apt.commission, 0)
    const highValueCount = todayAppointments.filter(apt => apt.revenueClassification.isHighValue).length

    return {
      totalRevenue,
      totalCommission,
      appointmentCount: todayAppointments.length,
      highValueCount,
      progressToTarget: (totalRevenue / revenueTargets.daily_target) * 100
    }
  }, [enhancedAppointments, currentDate, revenueTargets])

  return (
    <div className={`six-figure-calendar-view ${className}`}>
      {/* Enhanced Header with Revenue Metrics */}
      <Card className="mb-4 border-l-4 border-primary-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Six Figure Barber Calendar
                </h2>
              </div>
              
              {/* Quick Metrics */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold text-green-600">${dailyMetrics.totalRevenue.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">Today</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-blue-600">{dailyMetrics.appointmentCount}</p>
                  <p className="text-xs text-gray-500">Appointments</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-purple-600">{dailyMetrics.highValueCount}</p>
                  <p className="text-xs text-gray-500">Premium</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarLayout(calendarLayout === 'standard' ? 'revenue-focused' : 'standard')}
              >
                <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
                {calendarLayout === 'standard' ? 'Revenue View' : 'Standard View'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevenueOverlayVisible(!revenueOverlayVisible)}
              >
                {revenueOverlayVisible ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                <span className="ml-1">Analytics</span>
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Daily Target Progress</span>
              <span>{dailyMetrics.progressToTarget.toFixed(1)}% (${revenueTargets.daily_target})</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  dailyMetrics.progressToTarget >= 100 ? 'bg-green-500' : 
                  dailyMetrics.progressToTarget >= 75 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(dailyMetrics.progressToTarget, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Calendar Layout */}
      <div className={`grid gap-4 ${revenueOverlayVisible ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Calendar Component */}
        <div className={`${revenueOverlayVisible ? 'lg:col-span-2' : 'col-span-1'}`}>
          <Card>
            <CardContent className="p-0">
              <UnifiedCalendar
                view={view}
                onViewChange={onViewChange}
                currentDate={currentDate}
                onDateChange={onDateChange}
                appointments={calendarLayout === 'revenue-focused' ? enhancedAppointments : appointments}
                barbers={barbers}
                clients={clients}
                selectedBarberId={selectedBarberId}
                onBarberSelect={onBarberSelect}
                onAppointmentClick={onAppointmentClick}
                onClientClick={onClientClick}
                onTimeSlotClick={onTimeSlotClick}
                onAppointmentUpdate={onAppointmentUpdate}
                isLoading={isLoading}
                error={error}
                onRefresh={onRefresh}
                className="six-figure-enhanced-calendar"
              />
            </CardContent>
          </Card>
        </div>

        {/* Revenue Analytics Overlay */}
        {revenueOverlayVisible && (
          <div className="lg:col-span-1">
            <RevenueCalendarOverlay
              appointments={enhancedAppointments}
              currentDate={currentDate}
              revenueTargets={revenueTargets}
              onUpsellSuggestion={handleUpsellSuggestion}
              view={view}
              className="sticky top-4"
            />
          </div>
        )}
      </div>

      {/* Six Figure Barber Methodology Footer */}
      <Card className="mt-4 border-t-4 border-primary-500">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">6FB Method</Badge>
              <span className="text-gray-600">
                Premium positioning • Value-based pricing • Client relationships
              </span>
            </div>
            <div className="text-gray-500 text-xs">
              Path to ${revenueTargets.annual_target.toLocaleString()} annually
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Styles for Enhanced Appointments */}
      <style jsx>{`
        .six-figure-enhanced-calendar .appointment-enhanced:hover {
          transform: translateY(-1px);
        }
        
        .six-figure-enhanced-calendar .appointment-enhanced.high-value {
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
        }
        
        .six-figure-enhanced-calendar .unified-calendar-appointment {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  )
}