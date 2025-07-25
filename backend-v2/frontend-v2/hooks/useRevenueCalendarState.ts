'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

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

interface RevenueMetrics {
  totalRevenue: number
  totalCommission: number
  appointmentCount: number
  averageTicket: number
  progressToTarget: number
  highValueServiceCount: number
  clientTierDistribution: {
    platinum: number
    gold: number
    silver: number
    bronze: number
  }
}

interface PeakHour {
  hour: number
  revenue: number
  appointmentCount: number
  averageTicket: number
}

interface RevenueCalendarState {
  // Targets and metrics
  revenueTargets: RevenueTargets
  dailyMetrics: RevenueMetrics
  weeklyMetrics: RevenueMetrics
  monthlyMetrics: RevenueMetrics
  peakHours: PeakHour[]
  
  // Optimization features
  upsellOpportunities: UpsellOpportunity[]
  revenueOptimizationSuggestions: any[]
  showRevenueOverlay: boolean
  
  // Six Figure Barber coaching
  coachingInsights: string[]
  goalProgress: {
    sixFigureProgress: number
    monthlyProgress: number
    weeklyProgress: number
    dailyProgress: number
  }
  
  // Actions
  updateRevenueTargets: (targets: Partial<RevenueTargets>) => void
  toggleRevenueOverlay: () => void
  applyUpsellSuggestion: (opportunity: UpsellOpportunity) => void
  generateOptimizationSuggestions: () => void
  refreshMetrics: () => void
}

const DEFAULT_REVENUE_TARGETS: RevenueTargets = {
  daily_target: 274, // $100k annual / 365 days
  weekly_target: 1923, // $100k annual / 52 weeks  
  monthly_target: 8333, // $100k annual / 12 months
  annual_target: 100000
}

// Six Figure Barber methodology insights
const SIX_FIGURE_INSIGHTS = [
  "Premium pricing reflects your expertise and attracts quality clients who value your craft.",
  "Consistency in daily revenue targets compounds into extraordinary annual results.",
  "Client relationships are your most valuable asset - they generate referrals and repeat business.",
  "Focus on high-value services during peak hours to maximize your earning potential.",
  "Track your progress daily to maintain momentum toward your six-figure goal.",
  "Upselling is not selling more - it's providing more value to clients who appreciate quality.",
  "Your calendar is your revenue engine - optimize every time slot for maximum impact."
]

export function useRevenueCalendarState(
  appointments: any[] = [],
  currentDate: Date = new Date(),
  initialTargets?: Partial<RevenueTargets>
): RevenueCalendarState {
  const { toast } = useToast()
  const [revenueTargets, setRevenueTargets] = useState<RevenueTargets>({
    ...DEFAULT_REVENUE_TARGETS,
    ...initialTargets
  })
  const [showRevenueOverlay, setShowRevenueOverlay] = useState(true)
  const [upsellOpportunities, setUpsellOpportunities] = useState<UpsellOpportunity[]>([])
  const [revenueOptimizationSuggestions, setRevenueOptimizationSuggestions] = useState<any[]>([])

  // Calculate daily metrics
  const dailyMetrics = useMemo((): RevenueMetrics => {
    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === currentDate.toDateString()
    })

    const totalRevenue = todayAppointments.reduce((sum, apt) => sum + (apt.service_price || 0), 0)
    const totalCommission = todayAppointments.reduce((sum, apt) => {
      const commission = (apt.service_price || 0) * ((apt.commission_rate || 50) / 100)
      return sum + commission
    }, 0)

    const appointmentCount = todayAppointments.length
    const averageTicket = appointmentCount > 0 ? totalRevenue / appointmentCount : 0
    const progressToTarget = (totalRevenue / revenueTargets.daily_target) * 100
    const highValueServiceCount = todayAppointments.filter(apt => (apt.service_price || 0) >= 85).length

    // Client tier distribution
    const clientTierDistribution = todayAppointments.reduce((acc, apt) => {
      const tier = apt.client_tier || 'bronze'
      acc[tier as keyof typeof acc] = (acc[tier as keyof typeof acc] || 0) + 1
      return acc
    }, { platinum: 0, gold: 0, silver: 0, bronze: 0 })

    return {
      totalRevenue,
      totalCommission,
      appointmentCount,
      averageTicket,
      progressToTarget,
      highValueServiceCount,
      clientTierDistribution
    }
  }, [appointments, currentDate, revenueTargets.daily_target])

  // Calculate weekly metrics
  const weeklyMetrics = useMemo((): RevenueMetrics => {
    const weekStart = new Date(currentDate)
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const weekAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= weekStart && aptDate < weekEnd
    })

    const totalRevenue = weekAppointments.reduce((sum, apt) => sum + (apt.service_price || 0), 0)
    const totalCommission = weekAppointments.reduce((sum, apt) => {
      const commission = (apt.service_price || 0) * ((apt.commission_rate || 50) / 100)
      return sum + commission
    }, 0)

    const appointmentCount = weekAppointments.length
    const averageTicket = appointmentCount > 0 ? totalRevenue / appointmentCount : 0
    const progressToTarget = (totalRevenue / revenueTargets.weekly_target) * 100
    const highValueServiceCount = weekAppointments.filter(apt => (apt.service_price || 0) >= 85).length

    const clientTierDistribution = weekAppointments.reduce((acc, apt) => {
      const tier = apt.client_tier || 'bronze'
      acc[tier as keyof typeof acc] = (acc[tier as keyof typeof acc] || 0) + 1
      return acc
    }, { platinum: 0, gold: 0, silver: 0, bronze: 0 })

    return {
      totalRevenue,
      totalCommission,
      appointmentCount,
      averageTicket,
      progressToTarget,
      highValueServiceCount,
      clientTierDistribution
    }
  }, [appointments, currentDate, revenueTargets.weekly_target])

  // Calculate monthly metrics
  const monthlyMetrics = useMemo((): RevenueMetrics => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)

    const monthAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= monthStart && aptDate <= monthEnd
    })

    const totalRevenue = monthAppointments.reduce((sum, apt) => sum + (apt.service_price || 0), 0)
    const totalCommission = monthAppointments.reduce((sum, apt) => {
      const commission = (apt.service_price || 0) * ((apt.commission_rate || 50) / 100)
      return sum + commission
    }, 0)

    const appointmentCount = monthAppointments.length
    const averageTicket = appointmentCount > 0 ? totalRevenue / appointmentCount : 0
    const progressToTarget = (totalRevenue / revenueTargets.monthly_target) * 100
    const highValueServiceCount = monthAppointments.filter(apt => (apt.service_price || 0) >= 85).length

    const clientTierDistribution = monthAppointments.reduce((acc, apt) => {
      const tier = apt.client_tier || 'bronze'
      acc[tier as keyof typeof acc] = (acc[tier as keyof typeof acc] || 0) + 1
      return acc
    }, { platinum: 0, gold: 0, silver: 0, bronze: 0 })

    return {
      totalRevenue,
      totalCommission,
      appointmentCount,
      averageTicket,
      progressToTarget,
      highValueServiceCount,
      clientTierDistribution
    }
  }, [appointments, currentDate, revenueTargets.monthly_target])

  // Calculate peak hours
  const peakHours = useMemo((): PeakHour[] => {
    const hourlyData: { [hour: number]: { revenue: number; count: number } } = {}

    appointments.forEach(apt => {
      const hour = new Date(apt.start_time).getHours()
      if (!hourlyData[hour]) {
        hourlyData[hour] = { revenue: 0, count: 0 }
      }
      hourlyData[hour].revenue += apt.service_price || 0
      hourlyData[hour].count += 1
    })

    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        revenue: data.revenue,
        appointmentCount: data.count,
        averageTicket: data.count > 0 ? data.revenue / data.count : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [appointments])

  // Generate upselling opportunities
  const generateUpsellOpportunities = useCallback(() => {
    const opportunities: UpsellOpportunity[] = []

    appointments.forEach(apt => {
      if ((apt.service_price || 0) < 85 && apt.status === 'confirmed') {
        // Basic haircut to premium upgrade
        if (apt.service_name.toLowerCase().includes('haircut') && (apt.service_price || 0) < 50) {
          opportunities.push({
            appointment_id: apt.id,
            client_name: apt.client_name,
            current_service: apt.service_name,
            suggested_service: 'Premium Haircut & Styling',
            revenue_increase: 40,
            probability: 0.7,
            reasoning: 'Client books regularly, excellent candidate for premium service upgrade'
          })
        }

        // Add beard service
        if (apt.service_name.toLowerCase().includes('haircut') && !apt.service_name.toLowerCase().includes('beard')) {
          opportunities.push({
            appointment_id: apt.id,
            client_name: apt.client_name,
            current_service: apt.service_name,
            suggested_service: apt.service_name + ' + Beard Trim & Styling',
            revenue_increase: 30,
            probability: 0.8,
            reasoning: 'Natural service add-on with high conversion rate'
          })
        }

        // Luxury treatment upsell
        if ((apt.service_price || 0) >= 45 && apt.client_tier && ['gold', 'platinum'].includes(apt.client_tier)) {
          opportunities.push({
            appointment_id: apt.id,
            client_name: apt.client_name,
            current_service: apt.service_name,
            suggested_service: apt.service_name + ' + Hot Towel Treatment',
            revenue_increase: 25,
            probability: 0.9,
            reasoning: 'VIP client - highly likely to appreciate premium add-on services'
          })
        }
      }
    })

    setUpsellOpportunities(opportunities.slice(0, 5)) // Top 5 opportunities
  }, [appointments])

  // Generate Six Figure Barber coaching insights
  const coachingInsights = useMemo((): string[] => {
    const insights: string[] = []

    // Revenue-based insights
    if (dailyMetrics.progressToTarget >= 100) {
      insights.push("🎯 Excellent! You've exceeded your daily target. This consistency builds six-figure success.")
    } else if (dailyMetrics.progressToTarget >= 75) {
      insights.push("📈 Strong progress toward your daily target. Focus on premium services to close the gap.")
    } else {
      insights.push("⚡ Opportunity to increase revenue today. Consider upselling or premium service positioning.")
    }

    // Service mix insights
    if (dailyMetrics.averageTicket >= 85) {
      insights.push("💰 Excellent average ticket value! Your premium positioning is working effectively.")
    } else if (dailyMetrics.averageTicket >= 60) {
      insights.push("📊 Good service mix. Look for opportunities to increase value through premium add-ons.")
    } else {
      insights.push("🎯 Focus on higher-value services. Your expertise deserves premium pricing.")
    }

    // Client relationship insights
    const vipClients = dailyMetrics.clientTierDistribution.platinum + dailyMetrics.clientTierDistribution.gold
    if (vipClients > 0) {
      insights.push(`👑 ${vipClients} VIP clients today - these relationships are your foundation for six-figure success.`)
    }

    // Add a random Six Figure Barber principle
    const randomInsight = SIX_FIGURE_INSIGHTS[Math.floor(Math.random() * SIX_FIGURE_INSIGHTS.length)]
    insights.push(`💡 6FB Principle: ${randomInsight}`)

    return insights.slice(0, 4) // Limit to 4 insights
  }, [dailyMetrics])

  // Calculate goal progress
  const goalProgress = useMemo(() => {
    return {
      sixFigureProgress: (monthlyMetrics.totalRevenue * 12) / revenueTargets.annual_target * 100,
      monthlyProgress: monthlyMetrics.progressToTarget,
      weeklyProgress: weeklyMetrics.progressToTarget,
      dailyProgress: dailyMetrics.progressToTarget
    }
  }, [monthlyMetrics, weeklyMetrics, dailyMetrics, revenueTargets])

  // Actions
  const updateRevenueTargets = useCallback((targets: Partial<RevenueTargets>) => {
    setRevenueTargets(prev => ({ ...prev, ...targets }))
    toast({
      title: "Revenue Targets Updated",
      description: "Your Six Figure Barber targets have been updated successfully."
    })
  }, [toast])

  const toggleRevenueOverlay = useCallback(() => {
    setShowRevenueOverlay(prev => !prev)
  }, [])

  const applyUpsellSuggestion = useCallback((opportunity: UpsellOpportunity) => {
    // Remove the applied opportunity
    setUpsellOpportunities(prev => prev.filter(opp => opp.appointment_id !== opportunity.appointment_id))
    
    toast({
      title: "Upsell Applied",
      description: `Suggested ${opportunity.suggested_service} to ${opportunity.client_name}`,
      variant: "default"
    })
  }, [toast])

  const generateOptimizationSuggestions = useCallback(() => {
    const suggestions = []

    // Peak hour optimization
    if (peakHours.length > 0) {
      suggestions.push({
        type: 'peak_hour_optimization',
        title: 'Optimize Peak Hours',
        description: `Your peak hour is ${peakHours[0].hour}:00. Consider premium pricing during this time.`,
        impact: `+$${Math.round(peakHours[0].revenue * 0.1)} potential monthly increase`
      })
    }

    // Service mix optimization
    if (dailyMetrics.averageTicket < 75) {
      suggestions.push({
        type: 'service_mix',
        title: 'Increase Service Value',
        description: 'Focus on higher-value services to reach your six-figure goal faster.',
        impact: `+$${Math.round((75 - dailyMetrics.averageTicket) * dailyMetrics.appointmentCount * 30)} potential monthly increase`
      })
    }

    setRevenueOptimizationSuggestions(suggestions)
  }, [peakHours, dailyMetrics])

  const refreshMetrics = useCallback(() => {
    generateUpsellOpportunities()
    generateOptimizationSuggestions()
  }, [generateUpsellOpportunities, generateOptimizationSuggestions])

  // Auto-generate opportunities and suggestions
  useEffect(() => {
    generateUpsellOpportunities()
    generateOptimizationSuggestions()
  }, [appointments, generateUpsellOpportunities, generateOptimizationSuggestions])

  return {
    revenueTargets,
    dailyMetrics,
    weeklyMetrics,
    monthlyMetrics,
    peakHours,
    upsellOpportunities,
    revenueOptimizationSuggestions,
    showRevenueOverlay,
    coachingInsights,
    goalProgress,
    updateRevenueTargets,
    toggleRevenueOverlay,
    applyUpsellSuggestion,
    generateOptimizationSuggestions,
    refreshMetrics
  }
}