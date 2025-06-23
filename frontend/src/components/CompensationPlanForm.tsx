'use client'

import { useState } from 'react'
import CompensationCalculator from './CompensationCalculator'
import {
  PlusIcon,
  MinusIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ChartBarIcon,
  ShoppingBagIcon,
  AcademicCapIcon,
  ClockIcon,
  StarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  DocumentDuplicateIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

interface ServiceCommission {
  name: string
  rate: number
  newClientBonus?: number
  premiumRate?: number
}

interface Tier {
  min: number
  max: number | null
  rate: number
}

interface Milestone {
  target: number
  bonus: number
}

interface TimeSlot {
  day: string
  start: string
  end: string
  rateAdjustment: number
}

interface LoyaltyTier {
  name: string
  minVisits: number
  rateAdjustment: number
}

interface TenureRule {
  months: number
  rateIncrease: number
}

interface CompensationPlanFormProps {
  barberId?: number
  existingPlan?: any
  onSubmit: (plan: any) => void
  onCancel: () => void
}

const COMPENSATION_TEMPLATES = {
  'starter': {
    name: 'Starter Plan - New Barber',
    compensation_type: 'commission_only',
    commission_structure: {
      services: {
        haircut: { rate: 50, new_client_bonus: 5 },
        beard_trim: { rate: 50 },
        color_service: { rate: 40 },
        chemical_treatment: { rate: 40 }
      },
      products: { default: 10, premium: 15, promotional: 5 }
    },
    performance_bonuses: {
      revenue_milestones: [
        { target: 5000, bonus: 250 },
        { target: 8000, bonus: 500 }
      ],
      new_clients: { per_client: 15, monthly_cap: 300 },
      client_retention: { rate: 80, bonus: 100 },
      review_rating: { min_rating: 4.5, bonus: 50 }
    },
    deductions: {
      product_usage: { type: 'percentage', value: 3 },
      processing_fees: { type: 'percentage', value: 2.9 },
      marketing_contribution: { type: 'fixed', value: 25 },
      supply_fee: { type: 'fixed', value: 15 },
      no_show_penalty: { type: 'fixed', value: 10 }
    },
    special_conditions: {
      apprentice_period: { months: 3, reduced_rate: 40 }
    }
  },
  'experienced': {
    name: 'Experienced Barber Plan',
    compensation_type: 'commission_only',
    commission_structure: {
      services: {
        haircut: { rate: 60, new_client_bonus: 10 },
        beard_trim: { rate: 65 },
        color_service: { rate: 55, premium_rate: 60 },
        chemical_treatment: { rate: 50 }
      },
      products: { default: 15, premium: 20, promotional: 10 }
    },
    performance_bonuses: {
      revenue_milestones: [
        { target: 10000, bonus: 500 },
        { target: 15000, bonus: 1000 },
        { target: 20000, bonus: 1500 }
      ],
      new_clients: { per_client: 25, monthly_cap: 500 },
      client_retention: { rate: 80, bonus: 200 },
      review_rating: { min_rating: 4.5, bonus: 100 }
    },
    deductions: {
      product_usage: { type: 'percentage', value: 5 },
      processing_fees: { type: 'percentage', value: 2.9 },
      marketing_contribution: { type: 'fixed', value: 50 },
      supply_fee: { type: 'fixed', value: 25 },
      no_show_penalty: { type: 'fixed', value: 15 }
    },
    special_conditions: {
      weekend_premium: { saturday: 5, sunday: 10 },
      holiday_premium: 15
    }
  },
  'master': {
    name: 'Master Barber Elite',
    compensation_type: 'sliding_scale',
    commission_structure: {
      services: {
        haircut: { rate: 70, new_client_bonus: 15 },
        beard_trim: { rate: 75 },
        color_service: { rate: 65, premium_rate: 70 },
        chemical_treatment: { rate: 60 },
        specialty_service: { rate: 80 }
      },
      products: { default: 20, premium: 25, promotional: 15 },
      tiers: [
        { min: 0, max: 8000, rate: 60 },
        { min: 8001, max: 15000, rate: 70 },
        { min: 15001, max: null, rate: 80 }
      ]
    },
    performance_bonuses: {
      revenue_milestones: [
        { target: 15000, bonus: 1000 },
        { target: 25000, bonus: 2000 },
        { target: 35000, bonus: 3000 }
      ],
      new_clients: { per_client: 35, monthly_cap: 700 },
      client_retention: { rate: 85, bonus: 300 },
      review_rating: { min_rating: 4.7, bonus: 200 }
    },
    deductions: {
      product_usage: { type: 'percentage', value: 7 },
      processing_fees: { type: 'percentage', value: 2.9 },
      marketing_contribution: { type: 'fixed', value: 75 },
      supply_fee: { type: 'fixed', value: 35 },
      no_show_penalty: { type: 'fixed', value: 25 }
    },
    special_conditions: {
      master_barber_bonus: { years_experience: 5, bonus_rate: 10 },
      weekend_premium: { saturday: 10, sunday: 15 },
      holiday_premium: 20
    }
  },
  'booth_rental': {
    name: 'Traditional Booth Rental',
    compensation_type: 'booth_rent_only',
    booth_rent_amount: 1500,
    booth_rent_frequency: 'monthly',
    includes_utilities: true,
    includes_products: false,
    includes_marketing: true,
    performance_bonuses: {
      revenue_milestones: [],
      new_clients: { per_client: 0, monthly_cap: 0 },
      client_retention: { rate: 0, bonus: 0 },
      review_rating: { min_rating: 0, bonus: 0 }
    },
    deductions: {
      product_usage: { type: 'percentage', value: 0 },
      processing_fees: { type: 'percentage', value: 2.9 },
      marketing_contribution: { type: 'fixed', value: 0 },
      supply_fee: { type: 'fixed', value: 0 },
      no_show_penalty: { type: 'fixed', value: 0 }
    }
  },
  'hybrid_modern': {
    name: 'Modern Hybrid Plan',
    compensation_type: 'hybrid',
    booth_rent_amount: 800,
    booth_rent_frequency: 'monthly',
    includes_utilities: true,
    includes_products: true,
    includes_marketing: true,
    commission_structure: {
      services: {
        haircut: { rate: 40, new_client_bonus: 5 },
        beard_trim: { rate: 45 },
        color_service: { rate: 35, premium_rate: 40 },
        chemical_treatment: { rate: 35 }
      },
      products: { default: 10, premium: 15, promotional: 5 }
    },
    performance_bonuses: {
      revenue_milestones: [
        { target: 12000, bonus: 600 },
        { target: 18000, bonus: 1200 }
      ],
      new_clients: { per_client: 20, monthly_cap: 400 },
      client_retention: { rate: 80, bonus: 150 },
      review_rating: { min_rating: 4.5, bonus: 75 }
    },
    deductions: {
      product_usage: { type: 'percentage', value: 0 },
      processing_fees: { type: 'percentage', value: 2.9 },
      marketing_contribution: { type: 'fixed', value: 0 },
      supply_fee: { type: 'fixed', value: 0 },
      no_show_penalty: { type: 'fixed', value: 10 }
    },
    special_conditions: {
      weekend_premium: { saturday: 5, sunday: 10 },
      holiday_premium: 15
    }
  }
}

export default function CompensationPlanForm({ barberId, existingPlan, onSubmit, onCancel }: CompensationPlanFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [planName, setPlanName] = useState(existingPlan?.plan_name || '')
  const [compensationType, setCompensationType] = useState(existingPlan?.compensation_type || 'commission_only')

  // Base compensation
  const [baseSalary, setBaseSalary] = useState(existingPlan?.base_salary || 0)
  const [salaryFrequency, setSalaryFrequency] = useState(existingPlan?.salary_frequency || 'biweekly')

  // Booth rent
  const [boothRentAmount, setBoothRentAmount] = useState(existingPlan?.booth_rent_amount || 1500)
  const [boothRentFrequency, setBoothRentFrequency] = useState(existingPlan?.booth_rent_frequency || 'monthly')
  const [includesUtilities, setIncludesUtilities] = useState(existingPlan?.includes_utilities ?? true)
  const [includesProducts, setIncludesProducts] = useState(existingPlan?.includes_products ?? false)
  const [includesMarketing, setIncludesMarketing] = useState(existingPlan?.includes_marketing ?? true)

  // Commission structure
  const defaultServices: ServiceCommission[] = existingPlan?.commission_structure?.services ?
    Object.entries(existingPlan.commission_structure.services).map(([name, data]: [string, any]) => ({
      name,
      rate: data.rate,
      newClientBonus: data.new_client_bonus,
      premiumRate: data.premium_rate
    })) : [
      { name: 'Haircut', rate: 60, newClientBonus: 10 },
      { name: 'Beard Trim', rate: 70 },
      { name: 'Color Service', rate: 50, premiumRate: 55 },
      { name: 'Chemical Treatment', rate: 45 }
    ]

  const [serviceCommissions, setServiceCommissions] = useState<ServiceCommission[]>(defaultServices)
  const [productCommission, setProductCommission] = useState(existingPlan?.commission_structure?.products?.default || 15)
  const [premiumProductCommission, setPremiumProductCommission] = useState(existingPlan?.commission_structure?.products?.premium || 20)

  // Tiered commission
  const defaultTiers: Tier[] = existingPlan?.commission_structure?.tiers || [
    { min: 0, max: 5000, rate: 50 },
    { min: 5001, max: 10000, rate: 60 },
    { min: 10001, max: null, rate: 70 }
  ]
  const [commissionTiers, setCommissionTiers] = useState<Tier[]>(defaultTiers)

  // Performance bonuses
  const defaultMilestones: Milestone[] = existingPlan?.performance_bonuses?.revenue_milestones || [
    { target: 10000, bonus: 500 },
    { target: 15000, bonus: 1000 }
  ]
  const [revenueMilestones, setRevenueMilestones] = useState<Milestone[]>(defaultMilestones)
  const [newClientBonus, setNewClientBonus] = useState(existingPlan?.performance_bonuses?.new_clients?.per_client || 25)
  const [retentionBonus, setRetentionBonus] = useState(existingPlan?.performance_bonuses?.client_retention?.bonus || 200)
  const [reviewBonus, setReviewBonus] = useState(existingPlan?.performance_bonuses?.review_rating?.bonus || 100)

  // Deductions
  const [productUsageFee, setProductUsageFee] = useState(existingPlan?.deductions?.product_usage?.value || 5)
  const [processingFee, setProcessingFee] = useState(existingPlan?.deductions?.processing_fees?.value || 2.9)
  const [marketingContribution, setMarketingContribution] = useState(existingPlan?.deductions?.marketing_contribution?.value || 50)
  const [supplyFee, setSupplyFee] = useState(existingPlan?.deductions?.supply_fee?.value || 25)
  const [noShowPenalty, setNoShowPenalty] = useState(existingPlan?.deductions?.no_show_penalty?.value || 15)

  // Special conditions
  const [hasApprenticePeriod, setHasApprenticePeriod] = useState(!!existingPlan?.special_conditions?.apprentice_period)
  const [apprenticeMonths, setApprenticeMonths] = useState(existingPlan?.special_conditions?.apprentice_period?.months || 6)
  const [apprenticeRate, setApprenticeRate] = useState(existingPlan?.special_conditions?.apprentice_period?.reduced_rate || 40)
  const [weekendPremium, setWeekendPremium] = useState(existingPlan?.special_conditions?.weekend_premium?.saturday || 5)
  const [holidayPremium, setHolidayPremium] = useState(existingPlan?.special_conditions?.holiday_premium || 15)

  // Time-based variations
  const [enablePeakHours, setEnablePeakHours] = useState(existingPlan?.time_based_rates?.peak_hours?.enabled || false)
  const [peakHours, setPeakHours] = useState<TimeSlot[]>(existingPlan?.time_based_rates?.peak_hours?.hours || [
    { day: 'weekday', start: '17:00', end: '20:00', rateAdjustment: 5 },
    { day: 'saturday', start: '10:00', end: '16:00', rateAdjustment: 10 }
  ])
  const [enableOffPeak, setEnableOffPeak] = useState(existingPlan?.time_based_rates?.off_peak_discount?.enabled || false)
  const [offPeakHours, setOffPeakHours] = useState<TimeSlot[]>(existingPlan?.time_based_rates?.off_peak_discount?.hours || [
    { day: 'weekday', start: '09:00', end: '12:00', rateAdjustment: -5 }
  ])
  const [lastMinuteHours, setLastMinuteHours] = useState(existingPlan?.time_based_rates?.last_minute_booking?.hours_before || 2)
  const [lastMinuteRate, setLastMinuteRate] = useState(existingPlan?.time_based_rates?.last_minute_booking?.rate_adjustment || 15)
  const [advanceBookingDays, setAdvanceBookingDays] = useState(existingPlan?.time_based_rates?.advance_booking?.days_ahead || 7)
  const [advanceBookingDiscount, setAdvanceBookingDiscount] = useState(existingPlan?.time_based_rates?.advance_booking?.rate_adjustment || -5)

  // Client-type based rates
  const [newClientRate, setNewClientRate] = useState(existingPlan?.client_type_rates?.new_client?.rate_adjustment || 10)
  const [newClientVisits, setNewClientVisits] = useState(existingPlan?.client_type_rates?.new_client?.first_visits || 3)
  const [vipMinVisits, setVipMinVisits] = useState(existingPlan?.client_type_rates?.vip_client?.min_visits || 20)
  const [vipMinSpend, setVipMinSpend] = useState(existingPlan?.client_type_rates?.vip_client?.min_spend || 1000)
  const [vipRateAdjustment, setVipRateAdjustment] = useState(existingPlan?.client_type_rates?.vip_client?.rate_adjustment || 15)
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>(existingPlan?.client_type_rates?.loyalty_tiers || [
    { name: 'Bronze', minVisits: 5, rateAdjustment: 0 },
    { name: 'Silver', minVisits: 10, rateAdjustment: 5 },
    { name: 'Gold', minVisits: 20, rateAdjustment: 10 },
    { name: 'Platinum', minVisits: 50, rateAdjustment: 15 }
  ])

  // Automatic escalation
  const [enableTenureEscalation, setEnableTenureEscalation] = useState(!!existingPlan?.escalation_rules?.tenure_based)
  const [tenureRules, setTenureRules] = useState<TenureRule[]>(existingPlan?.escalation_rules?.tenure_based || [
    { months: 6, rateIncrease: 5 },
    { months: 12, rateIncrease: 10 },
    { months: 24, rateIncrease: 15 }
  ])
  const [performanceThreshold, setPerformanceThreshold] = useState(existingPlan?.escalation_rules?.performance_based?.revenue_threshold || 15000)
  const [performanceMonths, setPerformanceMonths] = useState(existingPlan?.escalation_rules?.performance_based?.months_consecutive || 3)
  const [performanceIncrease, setPerformanceIncrease] = useState(existingPlan?.escalation_rules?.performance_based?.rate_increase || 5)

  // Automated payout settings
  const [enableAutoPayout, setEnableAutoPayout] = useState(existingPlan?.payout_settings?.enabled || false)
  const [payoutMethod, setPayoutMethod] = useState(existingPlan?.payout_settings?.method || 'stripe_instant')
  const [payoutFrequency, setPayoutFrequency] = useState(existingPlan?.payout_settings?.frequency || 'weekly')
  const [payoutDayOfWeek, setPayoutDayOfWeek] = useState(existingPlan?.payout_settings?.day_of_week || 5) // Friday
  const [payoutDayOfMonth, setPayoutDayOfMonth] = useState(existingPlan?.payout_settings?.day_of_month || 15)
  const [payoutTime, setPayoutTime] = useState(existingPlan?.payout_settings?.time || '17:00')
  const [minimumPayout, setMinimumPayout] = useState(existingPlan?.payout_settings?.minimum_payout || 50)
  const [holdDays, setHoldDays] = useState(existingPlan?.payout_settings?.hold_days || 2)
  const [autoDeductFees, setAutoDeductFees] = useState(existingPlan?.payout_settings?.auto_deduct_fees ?? true)
  const [sendPayoutNotification, setSendPayoutNotification] = useState(existingPlan?.payout_settings?.notification_settings?.send_payout_notification ?? true)
  const [sendSummaryReport, setSendSummaryReport] = useState(existingPlan?.payout_settings?.notification_settings?.send_summary_report ?? true)

  const applyTemplate = (templateKey: string) => {
    const template = COMPENSATION_TEMPLATES[templateKey as keyof typeof COMPENSATION_TEMPLATES]
    if (!template) return

    setPlanName(template.name)
    setCompensationType(template.compensation_type)

    // Apply base compensation settings
    if (template.base_salary !== undefined) setBaseSalary(template.base_salary)
    if (template.salary_frequency) setSalaryFrequency(template.salary_frequency)

    // Apply booth rent settings
    if (template.booth_rent_amount !== undefined) setBoothRentAmount(template.booth_rent_amount)
    if (template.booth_rent_frequency) setBoothRentFrequency(template.booth_rent_frequency)
    if (template.includes_utilities !== undefined) setIncludesUtilities(template.includes_utilities)
    if (template.includes_products !== undefined) setIncludesProducts(template.includes_products)
    if (template.includes_marketing !== undefined) setIncludesMarketing(template.includes_marketing)

    // Apply commission structure
    if (template.commission_structure) {
      if (template.commission_structure.services) {
        const services = Object.entries(template.commission_structure.services).map(([name, data]: [string, any]) => ({
          name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          rate: data.rate,
          newClientBonus: data.new_client_bonus,
          premiumRate: data.premium_rate
        }))
        setServiceCommissions(services)
      }
      if (template.commission_structure.products) {
        setProductCommission(template.commission_structure.products.default || 15)
        setPremiumProductCommission(template.commission_structure.products.premium || 20)
      }
      if (template.commission_structure.tiers) {
        setCommissionTiers(template.commission_structure.tiers)
      }
    }

    // Apply performance bonuses
    if (template.performance_bonuses) {
      if (template.performance_bonuses.revenue_milestones) {
        setRevenueMilestones(template.performance_bonuses.revenue_milestones)
      }
      if (template.performance_bonuses.new_clients) {
        setNewClientBonus(template.performance_bonuses.new_clients.per_client)
      }
      if (template.performance_bonuses.client_retention) {
        setRetentionBonus(template.performance_bonuses.client_retention.bonus)
      }
      if (template.performance_bonuses.review_rating) {
        setReviewBonus(template.performance_bonuses.review_rating.bonus)
      }
    }

    // Apply deductions
    if (template.deductions) {
      setProductUsageFee(template.deductions.product_usage?.value || 0)
      setProcessingFee(template.deductions.processing_fees?.value || 2.9)
      setMarketingContribution(template.deductions.marketing_contribution?.value || 0)
      setSupplyFee(template.deductions.supply_fee?.value || 0)
      setNoShowPenalty(template.deductions.no_show_penalty?.value || 0)
    }

    // Apply special conditions
    if (template.special_conditions) {
      if (template.special_conditions.apprentice_period) {
        setHasApprenticePeriod(true)
        setApprenticeMonths(template.special_conditions.apprentice_period.months)
        setApprenticeRate(template.special_conditions.apprentice_period.reduced_rate)
      } else {
        setHasApprenticePeriod(false)
      }
      if (template.special_conditions.weekend_premium) {
        setWeekendPremium(template.special_conditions.weekend_premium.saturday)
      }
      if (template.special_conditions.holiday_premium !== undefined) {
        setHolidayPremium(template.special_conditions.holiday_premium)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const plan = {
      plan_name: planName,
      compensation_type: compensationType,
      base_salary: compensationType.includes('salary') ? baseSalary : null,
      salary_frequency: compensationType.includes('salary') ? salaryFrequency : null,
      booth_rent_amount: compensationType.includes('booth_rent') || compensationType === 'hybrid' ? boothRentAmount : null,
      booth_rent_frequency: compensationType.includes('booth_rent') || compensationType === 'hybrid' ? boothRentFrequency : null,
      includes_utilities: includesUtilities,
      includes_products: includesProducts,
      includes_marketing: includesMarketing,
      commission_structure: compensationType !== 'booth_rent_only' ? {
        services: serviceCommissions.reduce((acc, service) => {
          acc[service.name.toLowerCase().replace(/\s+/g, '_')] = {
            rate: service.rate,
            ...(service.newClientBonus && { new_client_bonus: service.newClientBonus }),
            ...(service.premiumRate && { premium_rate: service.premiumRate })
          }
          return acc
        }, {} as any),
        products: {
          default: productCommission,
          premium: premiumProductCommission,
          promotional: 10
        },
        ...(compensationType === 'sliding_scale' && { tiers: commissionTiers })
      } : null,
      performance_bonuses: {
        revenue_milestones: revenueMilestones,
        new_clients: { per_client: newClientBonus, monthly_cap: 500 },
        client_retention: { rate: 80, bonus: retentionBonus },
        review_rating: { min_rating: 4.5, bonus: reviewBonus }
      },
      deductions: {
        product_usage: { type: 'percentage', value: productUsageFee },
        processing_fees: { type: 'percentage', value: processingFee },
        marketing_contribution: { type: 'fixed', value: marketingContribution },
        supply_fee: { type: 'fixed', value: supplyFee },
        no_show_penalty: { type: 'fixed', value: noShowPenalty }
      },
      special_conditions: {
        ...(hasApprenticePeriod && {
          apprentice_period: { months: apprenticeMonths, reduced_rate: apprenticeRate }
        }),
        weekend_premium: { saturday: weekendPremium, sunday: weekendPremium * 1.5 },
        holiday_premium: holidayPremium
      },
      time_based_rates: {
        peak_hours: {
          enabled: enablePeakHours,
          hours: peakHours.map(h => ({
            day: h.day,
            start: h.start,
            end: h.end,
            rate_adjustment: h.rateAdjustment
          }))
        },
        off_peak_discount: {
          enabled: enableOffPeak,
          hours: offPeakHours.map(h => ({
            day: h.day,
            start: h.start,
            end: h.end,
            rate_adjustment: h.rateAdjustment
          }))
        },
        last_minute_booking: {
          hours_before: lastMinuteHours,
          rate_adjustment: lastMinuteRate
        },
        advance_booking: {
          days_ahead: advanceBookingDays,
          rate_adjustment: advanceBookingDiscount
        }
      },
      client_type_rates: {
        new_client: {
          rate_adjustment: newClientRate,
          first_visits: newClientVisits
        },
        vip_client: {
          min_visits: vipMinVisits,
          min_spend: vipMinSpend,
          rate_adjustment: vipRateAdjustment
        },
        loyalty_tiers: loyaltyTiers.map(tier => ({
          name: tier.name,
          min_visits: tier.minVisits,
          rate_adjustment: tier.rateAdjustment
        }))
      },
      escalation_rules: {
        ...(enableTenureEscalation && {
          tenure_based: tenureRules.map(rule => ({
            months: rule.months,
            rate_increase: rule.rateIncrease
          }))
        }),
        performance_based: {
          revenue_threshold: performanceThreshold,
          months_consecutive: performanceMonths,
          rate_increase: performanceIncrease
        }
      },
      payout_settings: enableAutoPayout ? {
        enabled: true,
        method: payoutMethod,
        frequency: payoutFrequency,
        day_of_week: payoutDayOfWeek,
        day_of_month: payoutDayOfMonth,
        time: payoutTime,
        minimum_payout: minimumPayout,
        hold_days: holdDays,
        auto_deduct_fees: autoDeductFees,
        notification_settings: {
          send_payout_notification: sendPayoutNotification,
          send_summary_report: sendSummaryReport,
          send_failure_alerts: true
        }
      } : { enabled: false }
    }

    onSubmit(plan)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Template Selection */}
      <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <DocumentDuplicateIcon className="h-5 w-5 mr-2 text-teal-500" />
          Quick Start Templates
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Choose a template to quickly set up a compensation plan, then customize as needed.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedTemplate('starter')
              applyTemplate('starter')
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedTemplate === 'starter'
                ? 'border-teal-500 bg-teal-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <h4 className="font-medium text-white mb-1">Starter Plan</h4>
            <p className="text-xs text-gray-400">New barbers, 50% commission base</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTemplate('experienced')
              applyTemplate('experienced')
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedTemplate === 'experienced'
                ? 'border-teal-500 bg-teal-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <h4 className="font-medium text-white mb-1">Experienced Barber</h4>
            <p className="text-xs text-gray-400">60% commission, performance bonuses</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTemplate('master')
              applyTemplate('master')
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedTemplate === 'master'
                ? 'border-teal-500 bg-teal-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <h4 className="font-medium text-white mb-1">Master Barber Elite</h4>
            <p className="text-xs text-gray-400">Sliding scale 60-80%, top bonuses</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTemplate('booth_rental')
              applyTemplate('booth_rental')
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedTemplate === 'booth_rental'
                ? 'border-teal-500 bg-teal-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <h4 className="font-medium text-white mb-1">Traditional Booth</h4>
            <p className="text-xs text-gray-400">$1,500/mo booth rent only</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTemplate('hybrid_modern')
              applyTemplate('hybrid_modern')
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedTemplate === 'hybrid_modern'
                ? 'border-teal-500 bg-teal-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <h4 className="font-medium text-white mb-1">Modern Hybrid</h4>
            <p className="text-xs text-gray-400">$800 rent + 40% commission</p>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTemplate('')
              // Reset to default values
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedTemplate === ''
                ? 'border-teal-500 bg-teal-500/20'
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
            }`}
          >
            <h4 className="font-medium text-white mb-1">Custom Plan</h4>
            <p className="text-xs text-gray-400">Build from scratch</p>
          </button>
        </div>
      </div>

      {/* Live Calculator Preview */}
      <CompensationCalculator
        compensationType={compensationType}
        baseSalary={baseSalary}
        salaryFrequency={salaryFrequency}
        boothRentAmount={boothRentAmount}
        boothRentFrequency={boothRentFrequency}
        commissionStructure={compensationType !== 'booth_rent_only' ? {
          services: serviceCommissions.reduce((acc, service) => {
            acc[service.name.toLowerCase().replace(/\s+/g, '_')] = {
              rate: service.rate,
              ...(service.newClientBonus && { new_client_bonus: service.newClientBonus }),
              ...(service.premiumRate && { premium_rate: service.premiumRate })
            }
            return acc
          }, {} as any),
          products: {
            default: productCommission,
            premium: premiumProductCommission,
            promotional: 10
          },
          ...(compensationType === 'sliding_scale' && { tiers: commissionTiers })
        } : null}
        performanceBonuses={{
          revenue_milestones: revenueMilestones,
          new_clients: { per_client: newClientBonus, monthly_cap: 500 },
          client_retention: { rate: 80, bonus: retentionBonus },
          review_rating: { min_rating: 4.5, bonus: reviewBonus }
        }}
        deductions={{
          product_usage: { type: 'percentage', value: productUsageFee },
          processing_fees: { type: 'percentage', value: processingFee },
          marketing_contribution: { type: 'fixed', value: marketingContribution },
          supply_fee: { type: 'fixed', value: supplyFee },
          no_show_penalty: { type: 'fixed', value: noShowPenalty }
        }}
        specialConditions={{
          ...(hasApprenticePeriod && {
            apprentice_period: { months: apprenticeMonths, reduced_rate: apprenticeRate }
          }),
          weekend_premium: { saturday: weekendPremium, sunday: weekendPremium * 1.5 },
          holiday_premium: holidayPremium
        }}
      />

      {/* Plan Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Plan Name
        </label>
        <input
          type="text"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          required
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
          placeholder="e.g., Standard Commission Plan, Master Barber Package"
        />
      </div>

      {/* Compensation Type */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Compensation Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { value: 'commission_only', label: 'Commission Only', icon: ChartBarIcon },
            { value: 'booth_rent_only', label: 'Booth Rent Only', icon: HomeIcon },
            { value: 'hybrid', label: 'Hybrid (Both)', icon: CurrencyDollarIcon },
            { value: 'salary', label: 'Salary', icon: CalendarIcon },
            { value: 'salary_plus_commission', label: 'Salary + Commission', icon: PlusIcon },
            { value: 'sliding_scale', label: 'Sliding Scale', icon: ChartBarIcon }
          ].map((type) => (
            <label key={type.value} className="relative">
              <input
                type="radio"
                name="compensation_type"
                value={type.value}
                checked={compensationType === type.value}
                onChange={(e) => setCompensationType(e.target.value)}
                className="sr-only peer"
              />
              <div className="p-4 bg-gray-700 border-2 border-gray-600 rounded-lg cursor-pointer peer-checked:border-teal-500 peer-checked:bg-teal-500/10 transition-all">
                <type.icon className="h-5 w-5 text-teal-500 mb-2" />
                <p className="font-medium text-white text-sm">{type.label}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Salary Settings */}
      {(compensationType === 'salary' || compensationType === 'salary_plus_commission') && (
        <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2 text-teal-500" />
            Salary Settings
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Base Salary Amount
              </label>
              <input
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(parseFloat(e.target.value))}
                min="0"
                step="100"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Frequency
              </label>
              <select
                value={salaryFrequency}
                onChange={(e) => setSalaryFrequency(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Booth Rent Settings */}
      {(compensationType === 'booth_rent_only' || compensationType === 'hybrid') && (
        <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <HomeIcon className="h-5 w-5 mr-2 text-teal-500" />
            Booth Rent Settings
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rent Amount
              </label>
              <input
                type="number"
                value={boothRentAmount}
                onChange={(e) => setBoothRentAmount(parseFloat(e.target.value))}
                min="0"
                step="50"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Frequency
              </label>
              <select
                value={boothRentFrequency}
                onChange={(e) => setBoothRentFrequency(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includesUtilities}
                onChange={(e) => setIncludesUtilities(e.target.checked)}
                className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-sm text-gray-300">Includes utilities</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includesProducts}
                onChange={(e) => setIncludesProducts(e.target.checked)}
                className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-sm text-gray-300">Includes product usage</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includesMarketing}
                onChange={(e) => setIncludesMarketing(e.target.checked)}
                className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-sm text-gray-300">Includes marketing</span>
            </label>
          </div>
        </div>
      )}

      {/* Commission Settings */}
      {compensationType !== 'booth_rent_only' && (
        <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-teal-500" />
            Commission Structure
          </h3>

          {/* Commission Clarity Info */}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mb-6">
            <p className="text-sm text-teal-400 font-medium mb-2">💰 Commission = Barbershop Revenue</p>
            <p className="text-xs text-gray-400">
              All commission percentages below represent <strong>your barbershop's share</strong> of revenue.
              The barber receives the remaining percentage. Example: 60% commission means your shop keeps $60 and the barber gets $40 from a $100 service.
            </p>
          </div>

          {/* Service Commissions */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Service Commissions</h4>
            <div className="space-y-3">
              {serviceCommissions.map((service, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) => {
                      const updated = [...serviceCommissions]
                      updated[index].name = e.target.value
                      setServiceCommissions(updated)
                    }}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="Service name"
                  />
                  <input
                    type="number"
                    value={service.rate}
                    onChange={(e) => {
                      const updated = [...serviceCommissions]
                      updated[index].rate = parseFloat(e.target.value)
                      setServiceCommissions(updated)
                    }}
                    min="0"
                    max="100"
                    className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="%"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                  <button
                    type="button"
                    onClick={() => setServiceCommissions(serviceCommissions.filter((_, i) => i !== index))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <MinusIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setServiceCommissions([...serviceCommissions, { name: '', rate: 50 }])}
                className="flex items-center text-teal-500 hover:text-teal-400 text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Service
              </button>
            </div>
          </div>

          {/* Product Commissions */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Product Commissions</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Standard Products</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={productCommission}
                    onChange={(e) => setProductCommission(parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Premium Products</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={premiumProductCommission}
                    onChange={(e) => setPremiumProductCommission(parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sliding Scale Tiers */}
          {compensationType === 'sliding_scale' && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Commission Tiers</h4>
              <div className="space-y-3">
                {commissionTiers.map((tier, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="number"
                      value={tier.min}
                      onChange={(e) => {
                        const updated = [...commissionTiers]
                        updated[index].min = parseFloat(e.target.value)
                        setCommissionTiers(updated)
                      }}
                      min="0"
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                      placeholder="Min $"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      value={tier.max || ''}
                      onChange={(e) => {
                        const updated = [...commissionTiers]
                        updated[index].max = e.target.value ? parseFloat(e.target.value) : null
                        setCommissionTiers(updated)
                      }}
                      min="0"
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                      placeholder="Max $"
                    />
                    <input
                      type="number"
                      value={tier.rate}
                      onChange={(e) => {
                        const updated = [...commissionTiers]
                        updated[index].rate = parseFloat(e.target.value)
                        setCommissionTiers(updated)
                      }}
                      min="0"
                      max="100"
                      className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                      placeholder="%"
                    />
                    <span className="text-gray-400 text-sm">%</span>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => setCommissionTiers(commissionTiers.filter((_, i) => i !== index))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <MinusIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const lastTier = commissionTiers[commissionTiers.length - 1]
                    setCommissionTiers([...commissionTiers, {
                      min: lastTier.max || 0,
                      max: null,
                      rate: lastTier.rate + 5
                    }])
                  }}
                  className="flex items-center text-teal-500 hover:text-teal-400 text-sm"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Tier
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Bonuses */}
      <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <StarIcon className="h-5 w-5 mr-2 text-teal-500" />
          Performance Bonuses
        </h3>

        {/* Revenue Milestones */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Revenue Milestones</h4>
          <div className="space-y-3">
            {revenueMilestones.map((milestone, index) => (
              <div key={index} className="flex items-center space-x-3">
                <span className="text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={milestone.target}
                  onChange={(e) => {
                    const updated = [...revenueMilestones]
                    updated[index].target = parseFloat(e.target.value)
                    setRevenueMilestones(updated)
                  }}
                  min="0"
                  step="1000"
                  className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="Target"
                />
                <span className="text-gray-400 text-sm">=</span>
                <span className="text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={milestone.bonus}
                  onChange={(e) => {
                    const updated = [...revenueMilestones]
                    updated[index].bonus = parseFloat(e.target.value)
                    setRevenueMilestones(updated)
                  }}
                  min="0"
                  step="50"
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="Bonus"
                />
                <button
                  type="button"
                  onClick={() => setRevenueMilestones(revenueMilestones.filter((_, i) => i !== index))}
                  className="text-red-400 hover:text-red-300"
                >
                  <MinusIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRevenueMilestones([...revenueMilestones, { target: 0, bonus: 0 }])}
              className="flex items-center text-purple-400 hover:text-purple-300 text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Milestone
            </button>
          </div>
        </div>

        {/* Other Bonuses */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Client Bonus ($)
            </label>
            <input
              type="number"
              value={newClientBonus}
              onChange={(e) => setNewClientBonus(parseFloat(e.target.value))}
              min="0"
              step="5"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Client Retention Bonus ($)
            </label>
            <input
              type="number"
              value={retentionBonus}
              onChange={(e) => setRetentionBonus(parseFloat(e.target.value))}
              min="0"
              step="25"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Deductions & Fees */}
      <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-400" />
          Deductions & Fees
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product Usage Fee (%)
            </label>
            <input
              type="number"
              value={productUsageFee}
              onChange={(e) => setProductUsageFee(parseFloat(e.target.value))}
              min="0"
              max="100"
              step="0.5"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Processing Fee (%)
            </label>
            <input
              type="number"
              value={processingFee}
              onChange={(e) => setProcessingFee(parseFloat(e.target.value))}
              min="0"
              max="10"
              step="0.1"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Marketing Contribution ($)
            </label>
            <input
              type="number"
              value={marketingContribution}
              onChange={(e) => setMarketingContribution(parseFloat(e.target.value))}
              min="0"
              step="10"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              No-Show Penalty ($)
            </label>
            <input
              type="number"
              value={noShowPenalty}
              onChange={(e) => setNoShowPenalty(parseFloat(e.target.value))}
              min="0"
              step="5"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Special Conditions */}
      <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <AcademicCapIcon className="h-5 w-5 mr-2 text-teal-500" />
          Special Conditions
        </h3>

        {/* Apprentice Period */}
        <div>
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={hasApprenticePeriod}
              onChange={(e) => setHasApprenticePeriod(e.target.checked)}
              className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500 mr-2"
            />
            <span className="text-sm text-gray-300">Include apprentice period</span>
          </label>
          {hasApprenticePeriod && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duration (months)</label>
                <input
                  type="number"
                  value={apprenticeMonths}
                  onChange={(e) => setApprenticeMonths(parseInt(e.target.value))}
                  min="1"
                  max="24"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reduced Rate (%)</label>
                <input
                  type="number"
                  value={apprenticeRate}
                  onChange={(e) => setApprenticeRate(parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Weekend & Holiday Premiums */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Weekend Premium (%)
            </label>
            <input
              type="number"
              value={weekendPremium}
              onChange={(e) => setWeekendPremium(parseFloat(e.target.value))}
              min="0"
              max="50"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Holiday Premium (%)
            </label>
            <input
              type="number"
              value={holidayPremium}
              onChange={(e) => setHolidayPremium(parseFloat(e.target.value))}
              min="0"
              max="100"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Time-Based Rate Variations */}
      <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ClockIcon className="h-5 w-5 mr-2 text-teal-500" />
          Time-Based Rate Variations
        </h3>

        {/* Peak Hours */}
        <div>
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={enablePeakHours}
              onChange={(e) => setEnablePeakHours(e.target.checked)}
              className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500 mr-2"
            />
            <span className="text-sm text-gray-300">Enable peak hour premiums</span>
          </label>
          {enablePeakHours && (
            <div className="ml-6 space-y-3">
              {peakHours.map((slot, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <select
                    value={slot.day}
                    onChange={(e) => {
                      const updated = [...peakHours]
                      updated[index].day = e.target.value
                      setPeakHours(updated)
                    }}
                    className="w-28 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    <option value="weekday">Weekdays</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                  <input
                    type="time"
                    value={slot.start}
                    onChange={(e) => {
                      const updated = [...peakHours]
                      updated[index].start = e.target.value
                      setPeakHours(updated)
                    }}
                    className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={slot.end}
                    onChange={(e) => {
                      const updated = [...peakHours]
                      updated[index].end = e.target.value
                      setPeakHours(updated)
                    }}
                    className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                  <input
                    type="number"
                    value={slot.rateAdjustment}
                    onChange={(e) => {
                      const updated = [...peakHours]
                      updated[index].rateAdjustment = parseFloat(e.target.value)
                      setPeakHours(updated)
                    }}
                    className="w-16 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                    placeholder="%"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                  <button
                    type="button"
                    onClick={() => setPeakHours(peakHours.filter((_, i) => i !== index))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <MinusIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPeakHours([...peakHours, { day: 'weekday', start: '09:00', end: '17:00', rateAdjustment: 5 }])}
                className="flex items-center text-teal-500 hover:text-teal-400 text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Peak Hour Slot
              </button>
            </div>
          )}
        </div>

        {/* Last Minute & Advance Booking */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Last Minute Booking</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Hours Before</label>
                <input
                  type="number"
                  value={lastMinuteHours}
                  onChange={(e) => setLastMinuteHours(parseInt(e.target.value))}
                  min="1"
                  max="24"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rate Premium (%)</label>
                <input
                  type="number"
                  value={lastMinuteRate}
                  onChange={(e) => setLastMinuteRate(parseFloat(e.target.value))}
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3">Advance Booking</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Days Ahead</label>
                <input
                  type="number"
                  value={advanceBookingDays}
                  onChange={(e) => setAdvanceBookingDays(parseInt(e.target.value))}
                  min="1"
                  max="30"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Discount (%)</label>
                <input
                  type="number"
                  value={Math.abs(advanceBookingDiscount)}
                  onChange={(e) => setAdvanceBookingDiscount(-Math.abs(parseFloat(e.target.value)))}
                  min="0"
                  max="20"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client-Type Based Rates */}
      <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <UserGroupIcon className="h-5 w-5 mr-2 text-teal-500" />
          Client-Type Based Rates
        </h3>

        {/* New Client Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">New Client Premium</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rate Premium (%)</label>
              <input
                type="number"
                value={newClientRate}
                onChange={(e) => setNewClientRate(parseFloat(e.target.value))}
                min="0"
                max="50"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">First X Visits</label>
              <input
                type="number"
                value={newClientVisits}
                onChange={(e) => setNewClientVisits(parseInt(e.target.value))}
                min="1"
                max="10"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* VIP Client Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">VIP Client Benefits</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Visits</label>
              <input
                type="number"
                value={vipMinVisits}
                onChange={(e) => setVipMinVisits(parseInt(e.target.value))}
                min="1"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Spend ($)</label>
              <input
                type="number"
                value={vipMinSpend}
                onChange={(e) => setVipMinSpend(parseFloat(e.target.value))}
                min="0"
                step="100"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rate Premium (%)</label>
              <input
                type="number"
                value={vipRateAdjustment}
                onChange={(e) => setVipRateAdjustment(parseFloat(e.target.value))}
                min="0"
                max="50"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Loyalty Tiers */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Loyalty Program Tiers</h4>
          <div className="space-y-3">
            {loyaltyTiers.map((tier, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => {
                    const updated = [...loyaltyTiers]
                    updated[index].name = e.target.value
                    setLoyaltyTiers(updated)
                  }}
                  className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="Tier name"
                />
                <input
                  type="number"
                  value={tier.minVisits}
                  onChange={(e) => {
                    const updated = [...loyaltyTiers]
                    updated[index].minVisits = parseInt(e.target.value)
                    setLoyaltyTiers(updated)
                  }}
                  min="0"
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  placeholder="Min visits"
                />
                <span className="text-gray-400 text-sm">visits =</span>
                <input
                  type="number"
                  value={tier.rateAdjustment}
                  onChange={(e) => {
                    const updated = [...loyaltyTiers]
                    updated[index].rateAdjustment = parseFloat(e.target.value)
                    setLoyaltyTiers(updated)
                  }}
                  min="0"
                  max="50"
                  className="w-16 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                />
                <span className="text-gray-400 text-sm">% premium</span>
                <button
                  type="button"
                  onClick={() => setLoyaltyTiers(loyaltyTiers.filter((_, i) => i !== index))}
                  className="text-red-400 hover:text-red-300"
                >
                  <MinusIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLoyaltyTiers([...loyaltyTiers, { name: '', minVisits: 0, rateAdjustment: 0 }])}
              className="flex items-center text-purple-400 hover:text-purple-300 text-sm"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Loyalty Tier
            </button>
          </div>
        </div>
      </div>

      {/* Automatic Rate Escalation */}
      <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUpIcon className="h-5 w-5 mr-2 text-teal-500" />
          Automatic Rate Escalation
        </h3>

        {/* Tenure-Based Escalation */}
        <div>
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={enableTenureEscalation}
              onChange={(e) => setEnableTenureEscalation(e.target.checked)}
              className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500 mr-2"
            />
            <span className="text-sm text-gray-300">Enable tenure-based rate increases</span>
          </label>
          {enableTenureEscalation && (
            <div className="ml-6 space-y-3">
              {tenureRules.map((rule, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span className="text-gray-400 text-sm">After</span>
                  <input
                    type="number"
                    value={rule.months}
                    onChange={(e) => {
                      const updated = [...tenureRules]
                      updated[index].months = parseInt(e.target.value)
                      setTenureRules(updated)
                    }}
                    min="1"
                    className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-gray-400 text-sm">months =</span>
                  <input
                    type="number"
                    value={rule.rateIncrease}
                    onChange={(e) => {
                      const updated = [...tenureRules]
                      updated[index].rateIncrease = parseFloat(e.target.value)
                      setTenureRules(updated)
                    }}
                    min="0"
                    max="50"
                    className="w-16 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-gray-400 text-sm">% increase</span>
                  <button
                    type="button"
                    onClick={() => setTenureRules(tenureRules.filter((_, i) => i !== index))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <MinusIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTenureRules([...tenureRules, { months: 0, rateIncrease: 0 }])}
                className="flex items-center text-teal-500 hover:text-teal-400 text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Tenure Milestone
              </button>
            </div>
          )}
        </div>

        {/* Performance-Based Escalation */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Performance-Based Escalation</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Revenue Threshold ($)</label>
              <input
                type="number"
                value={performanceThreshold}
                onChange={(e) => setPerformanceThreshold(parseFloat(e.target.value))}
                min="0"
                step="1000"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Consecutive Months</label>
              <input
                type="number"
                value={performanceMonths}
                onChange={(e) => setPerformanceMonths(parseInt(e.target.value))}
                min="1"
                max="12"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Rate Increase (%)</label>
              <input
                type="number"
                value={performanceIncrease}
                onChange={(e) => setPerformanceIncrease(parseFloat(e.target.value))}
                min="0"
                max="50"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Automated Payout Settings */}
      <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <BanknotesIcon className="h-5 w-5 mr-2 text-teal-500" />
          Automated Payout Settings
        </h3>

        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={enableAutoPayout}
            onChange={(e) => setEnableAutoPayout(e.target.checked)}
            className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500 mr-2"
          />
          <span className="text-sm text-gray-300">Enable automated payouts</span>
        </label>

        {enableAutoPayout && (
          <div className="space-y-4">
            {/* Payout Method & Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="stripe_instant">Stripe Instant (1% fee)</option>
                  <option value="stripe_standard">Stripe Standard (2-5 days)</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payout Frequency
                </label>
                <select
                  value={payoutFrequency}
                  onChange={(e) => setPayoutFrequency(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Payout Schedule */}
            <div className="grid grid-cols-2 gap-4">
              {payoutFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payout Day
                  </label>
                  <select
                    value={payoutDayOfWeek}
                    onChange={(e) => setPayoutDayOfWeek(parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                  </select>
                </div>
              )}
              {(payoutFrequency === 'monthly' || payoutFrequency === 'biweekly') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    value={payoutDayOfMonth}
                    onChange={(e) => setPayoutDayOfMonth(parseInt(e.target.value))}
                    min="1"
                    max="28"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payout Time
                </label>
                <input
                  type="time"
                  value={payoutTime}
                  onChange={(e) => setPayoutTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Payout Rules */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Payout Amount ($)
                </label>
                <input
                  type="number"
                  value={minimumPayout}
                  onChange={(e) => setMinimumPayout(parseFloat(e.target.value))}
                  min="0"
                  step="10"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hold Period (days)
                </label>
                <input
                  type="number"
                  value={holdDays}
                  onChange={(e) => setHoldDays(parseInt(e.target.value))}
                  min="0"
                  max="30"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Notification Settings */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3">Notifications</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoDeductFees}
                    onChange={(e) => setAutoDeductFees(e.target.checked)}
                    className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500 mr-2"
                  />
                  <span className="text-sm text-gray-300">Automatically deduct processing fees</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sendPayoutNotification}
                    onChange={(e) => setSendPayoutNotification(e.target.checked)}
                    className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500 mr-2"
                  />
                  <span className="text-sm text-gray-300">Send payout notifications to barber</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sendSummaryReport}
                    onChange={(e) => setSendSummaryReport(e.target.checked)}
                    className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500 mr-2"
                  />
                  <span className="text-sm text-gray-300">Include earnings summary report</span>
                </label>
              </div>
            </div>

            {/* Payout Preview */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-sm text-teal-400 font-medium mb-2">💸 Next Payout Schedule</p>
              <p className="text-xs text-gray-400">
                {payoutFrequency === 'daily' && 'Payouts will be processed daily'}
                {payoutFrequency === 'weekly' && `Payouts will be processed every ${['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][payoutDayOfWeek]}`}
                {payoutFrequency === 'biweekly' && `Payouts will be processed on the 1st and ${payoutDayOfMonth}th of each month`}
                {payoutFrequency === 'monthly' && `Payouts will be processed on the ${payoutDayOfMonth}th of each month`}
                {` at ${payoutTime}. `}
                {holdDays > 0 && `Funds will be held for ${holdDays} days before payout. `}
                {minimumPayout > 0 && `Minimum payout amount is $${minimumPayout}.`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
        >
          {existingPlan ? 'Update Plan' : 'Create Plan'}
        </button>
      </div>
    </form>
  )
}
