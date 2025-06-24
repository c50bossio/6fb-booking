/**
 * Compensation API - Managing compensation plans for barbers
 */

import apiClient from './client'
import type { ApiResponse, PaginatedResponse } from './client'

// === DEMO MODE CONFIGURATION ===
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// === TYPE DEFINITIONS ===

export interface CompensationPlan {
  id: number
  name: string
  description?: string
  payment_type: 'commission' | 'booth_rent' | 'hybrid'
  
  // Commission settings
  commission_rate?: number // Percentage for service revenue
  product_commission_rate?: number // Percentage for product sales
  
  // Booth rent settings
  booth_rent_amount?: number
  booth_rent_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  
  // Tip handling
  tip_handling?: 'barber_keeps_all' | 'split_tips' | 'pool_tips'
  tip_split_percentage?: number // If tips are split
  
  // Advanced settings
  minimum_guarantee?: number // Minimum earnings guarantee
  tiered_rates?: TieredRate[] // Different rates based on revenue
  bonus_structure?: BonusStructure[]
  deductions?: Deduction[]
  
  // Status and metadata
  is_active: boolean
  is_default?: boolean
  effective_date?: string
  expiry_date?: string
  created_at: string
  updated_at: string
  created_by?: number
  notes?: string
}

export interface TieredRate {
  id?: number
  min_revenue: number
  max_revenue?: number
  commission_rate: number
  description?: string
}

export interface BonusStructure {
  id?: number
  type: 'revenue' | 'appointments' | 'retail' | 'reviews' | 'retention'
  target: number
  bonus_amount?: number
  bonus_percentage?: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  description?: string
}

export interface Deduction {
  id?: number
  type: 'supplies' | 'insurance' | 'marketing' | 'other'
  amount?: number
  percentage?: number
  frequency: 'per_service' | 'daily' | 'weekly' | 'monthly'
  description?: string
}

export interface BarberCompensation {
  id: number
  barber_id: number
  barber_name: string
  plan_id: number
  plan_name: string
  effective_date: string
  end_date?: string
  is_active: boolean
  override_settings?: Partial<CompensationPlan>
  created_at: string
  updated_at: string
}

export interface CompensationCalculation {
  barber_id: number
  barber_name: string
  plan_name: string
  period_start: string
  period_end: string
  
  // Revenue breakdown
  service_revenue: number
  product_revenue: number
  tips_collected: number
  total_revenue: number
  
  // Calculations
  service_commission: number
  product_commission: number
  tips_earned: number
  booth_rent_due?: number
  bonuses_earned: number
  deductions_total: number
  
  // Final amounts
  gross_earnings: number
  net_earnings: number
  shop_earnings: number
  
  // Details
  bonus_details?: Array<{
    type: string
    description: string
    amount: number
  }>
  deduction_details?: Array<{
    type: string
    description: string
    amount: number
  }>
}

export interface CompensationFilter {
  is_active?: boolean
  payment_type?: 'commission' | 'booth_rent' | 'hybrid'
  search?: string
}

export interface CompensationAssignment {
  barber_id: number
  plan_id: number
  effective_date?: string
  override_settings?: Partial<CompensationPlan>
  notes?: string
}

// === MOCK DATA FOR DEMO MODE ===

const MOCK_COMPENSATION_PLANS: CompensationPlan[] = [
  {
    id: 1,
    name: "Standard Commission",
    description: "Standard 70/30 commission split for experienced barbers",
    payment_type: "commission",
    commission_rate: 30,
    product_commission_rate: 15,
    tip_handling: "barber_keeps_all",
    is_active: true,
    is_default: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Premium Booth Rental",
    description: "Weekly booth rental for established barbers with clientele",
    payment_type: "booth_rent",
    booth_rent_amount: 300,
    booth_rent_frequency: "weekly",
    tip_handling: "barber_keeps_all",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    name: "Hybrid Plan",
    description: "Combination of booth rent and commission for flexibility",
    payment_type: "hybrid",
    commission_rate: 15,
    product_commission_rate: 10,
    booth_rent_amount: 150,
    booth_rent_frequency: "weekly",
    tip_handling: "barber_keeps_all",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    name: "New Barber Program",
    description: "Graduated commission rates for new barbers",
    payment_type: "commission",
    commission_rate: 40,
    product_commission_rate: 20,
    tip_handling: "barber_keeps_all",
    minimum_guarantee: 500,
    tiered_rates: [
      { min_revenue: 0, max_revenue: 2000, commission_rate: 40, description: "First 3 months" },
      { min_revenue: 2000, max_revenue: 5000, commission_rate: 35, description: "Months 4-6" },
      { min_revenue: 5000, commission_rate: 30, description: "After 6 months" }
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    name: "Elite Performance Plan",
    description: "Performance-based compensation with bonuses",
    payment_type: "commission",
    commission_rate: 25,
    product_commission_rate: 15,
    tip_handling: "barber_keeps_all",
    bonus_structure: [
      {
        type: "revenue",
        target: 10000,
        bonus_amount: 500,
        frequency: "monthly",
        description: "Monthly revenue bonus"
      },
      {
        type: "retention",
        target: 80,
        bonus_percentage: 5,
        frequency: "quarterly",
        description: "Client retention bonus"
      }
    ],
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
]

const MOCK_BARBER_COMPENSATIONS: BarberCompensation[] = [
  {
    id: 1,
    barber_id: 1,
    barber_name: "Marcus Johnson",
    plan_id: 1,
    plan_name: "Standard Commission",
    effective_date: "2024-01-01T00:00:00Z",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    barber_id: 2,
    barber_name: "David Chen",
    plan_id: 2,
    plan_name: "Premium Booth Rental",
    effective_date: "2024-01-01T00:00:00Z",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    barber_id: 3,
    barber_name: "James Wilson",
    plan_id: 3,
    plan_name: "Hybrid Plan",
    effective_date: "2024-01-01T00:00:00Z",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
]

// === COMPENSATION API ===

export const compensationService = {
  /**
   * Get all compensation plans
   */
  async getPlans(filter?: CompensationFilter): Promise<ApiResponse<CompensationPlan[]>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock compensation plans')
      let plans = [...MOCK_COMPENSATION_PLANS]
      
      if (filter) {
        if (filter.is_active !== undefined) {
          plans = plans.filter(p => p.is_active === filter.is_active)
        }
        if (filter.payment_type) {
          plans = plans.filter(p => p.payment_type === filter.payment_type)
        }
        if (filter.search) {
          const search = filter.search.toLowerCase()
          plans = plans.filter(p => 
            p.name.toLowerCase().includes(search) ||
            p.description?.toLowerCase().includes(search)
          )
        }
      }
      
      return { data: plans }
    }

    const params = new URLSearchParams()
    if (filter?.is_active !== undefined) params.append('is_active', String(filter.is_active))
    if (filter?.payment_type) params.append('payment_type', filter.payment_type)
    if (filter?.search) params.append('search', filter.search)

    const response = await apiClient.get<CompensationPlan[]>(`/compensation-plans?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get a single compensation plan
   */
  async getPlan(planId: number): Promise<ApiResponse<CompensationPlan>> {
    if (DEMO_MODE) {
      const plan = MOCK_COMPENSATION_PLANS.find(p => p.id === planId)
      if (!plan) {
        throw new Error('Compensation plan not found')
      }
      return { data: plan }
    }

    const response = await apiClient.get<CompensationPlan>(`/compensation-plans/${planId}`)
    return { data: response.data }
  },

  /**
   * Create a new compensation plan
   */
  async createPlan(plan: Omit<CompensationPlan, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<CompensationPlan>> {
    if (DEMO_MODE) {
      const newPlan: CompensationPlan = {
        ...plan,
        id: MOCK_COMPENSATION_PLANS.length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      MOCK_COMPENSATION_PLANS.push(newPlan)
      return { data: newPlan }
    }

    const response = await apiClient.post<CompensationPlan>('/compensation-plans', plan)
    return { data: response.data }
  },

  /**
   * Update a compensation plan
   */
  async updatePlan(planId: number, updates: Partial<CompensationPlan>): Promise<ApiResponse<CompensationPlan>> {
    if (DEMO_MODE) {
      const index = MOCK_COMPENSATION_PLANS.findIndex(p => p.id === planId)
      if (index === -1) {
        throw new Error('Compensation plan not found')
      }
      MOCK_COMPENSATION_PLANS[index] = {
        ...MOCK_COMPENSATION_PLANS[index],
        ...updates,
        updated_at: new Date().toISOString()
      }
      return { data: MOCK_COMPENSATION_PLANS[index] }
    }

    const response = await apiClient.put<CompensationPlan>(`/compensation-plans/${planId}`, updates)
    return { data: response.data }
  },

  /**
   * Delete a compensation plan
   */
  async deletePlan(planId: number): Promise<ApiResponse<void>> {
    if (DEMO_MODE) {
      const index = MOCK_COMPENSATION_PLANS.findIndex(p => p.id === planId)
      if (index !== -1) {
        MOCK_COMPENSATION_PLANS.splice(index, 1)
      }
      return { data: undefined }
    }

    await apiClient.delete(`/compensation-plans/${planId}`)
    return { data: undefined }
  },

  /**
   * Get barber compensation assignments
   */
  async getBarberCompensations(barberId?: number): Promise<ApiResponse<BarberCompensation[]>> {
    if (DEMO_MODE) {
      let compensations = [...MOCK_BARBER_COMPENSATIONS]
      if (barberId) {
        compensations = compensations.filter(c => c.barber_id === barberId)
      }
      return { data: compensations }
    }

    const params = barberId ? `?barber_id=${barberId}` : ''
    const response = await apiClient.get<BarberCompensation[]>(`/barber-compensations${params}`)
    return { data: response.data }
  },

  /**
   * Assign compensation plan to barber
   */
  async assignPlanToBarber(assignment: CompensationAssignment): Promise<ApiResponse<BarberCompensation>> {
    if (DEMO_MODE) {
      const plan = MOCK_COMPENSATION_PLANS.find(p => p.id === assignment.plan_id)
      if (!plan) {
        throw new Error('Compensation plan not found')
      }
      
      const newAssignment: BarberCompensation = {
        id: MOCK_BARBER_COMPENSATIONS.length + 1,
        barber_id: assignment.barber_id,
        barber_name: `Barber ${assignment.barber_id}`,
        plan_id: assignment.plan_id,
        plan_name: plan.name,
        effective_date: assignment.effective_date || new Date().toISOString(),
        is_active: true,
        override_settings: assignment.override_settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      MOCK_BARBER_COMPENSATIONS.push(newAssignment)
      return { data: newAssignment }
    }

    const response = await apiClient.post<BarberCompensation>('/barber-compensations', assignment)
    return { data: response.data }
  },

  /**
   * Calculate compensation for a barber
   */
  async calculateCompensation(
    barberId: number,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<CompensationCalculation>> {
    if (DEMO_MODE) {
      // Mock calculation based on barber's assigned plan
      const assignment = MOCK_BARBER_COMPENSATIONS.find(c => c.barber_id === barberId && c.is_active)
      const plan = assignment ? MOCK_COMPENSATION_PLANS.find(p => p.id === assignment.plan_id) : null
      
      const mockCalculation: CompensationCalculation = {
        barber_id: barberId,
        barber_name: assignment?.barber_name || `Barber ${barberId}`,
        plan_name: plan?.name || 'No Plan Assigned',
        period_start: startDate,
        period_end: endDate,
        service_revenue: 5000,
        product_revenue: 500,
        tips_collected: 300,
        total_revenue: 5800,
        service_commission: plan?.commission_rate ? (5000 * plan.commission_rate / 100) : 0,
        product_commission: plan?.product_commission_rate ? (500 * plan.product_commission_rate / 100) : 0,
        tips_earned: 300,
        booth_rent_due: plan?.booth_rent_amount,
        bonuses_earned: 100,
        deductions_total: 50,
        gross_earnings: 0,
        net_earnings: 0,
        shop_earnings: 0,
        bonus_details: [
          { type: 'revenue', description: 'Monthly revenue bonus', amount: 100 }
        ],
        deduction_details: [
          { type: 'supplies', description: 'Product supplies', amount: 50 }
        ]
      }
      
      // Calculate final amounts
      if (plan?.payment_type === 'commission') {
        mockCalculation.gross_earnings = 
          (5000 * (100 - (plan.commission_rate || 0)) / 100) +
          (500 * (100 - (plan.product_commission_rate || 0)) / 100) +
          300 + 100
        mockCalculation.shop_earnings = mockCalculation.service_commission + mockCalculation.product_commission
      } else if (plan?.payment_type === 'booth_rent') {
        mockCalculation.gross_earnings = 5800 + 100
        mockCalculation.shop_earnings = plan.booth_rent_amount || 0
      } else if (plan?.payment_type === 'hybrid') {
        mockCalculation.gross_earnings = 
          (5000 * (100 - (plan.commission_rate || 0)) / 100) +
          (500 * (100 - (plan.product_commission_rate || 0)) / 100) +
          300 + 100
        mockCalculation.shop_earnings = 
          mockCalculation.service_commission + 
          mockCalculation.product_commission + 
          (plan.booth_rent_amount || 0)
      }
      
      mockCalculation.net_earnings = mockCalculation.gross_earnings - mockCalculation.deductions_total - (mockCalculation.booth_rent_due || 0)
      
      return { data: mockCalculation }
    }

    const params = new URLSearchParams({
      barber_id: String(barberId),
      start_date: startDate,
      end_date: endDate
    })
    const response = await apiClient.get<CompensationCalculation>(`/compensation/calculate?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Preview compensation calculation
   */
  async previewCompensation(
    planId: number,
    revenue: {
      service_revenue: number
      product_revenue: number
      tips: number
    }
  ): Promise<ApiResponse<Partial<CompensationCalculation>>> {
    if (DEMO_MODE) {
      const plan = MOCK_COMPENSATION_PLANS.find(p => p.id === planId)
      if (!plan) {
        throw new Error('Compensation plan not found')
      }
      
      const preview: Partial<CompensationCalculation> = {
        plan_name: plan.name,
        service_revenue: revenue.service_revenue,
        product_revenue: revenue.product_revenue,
        tips_collected: revenue.tips,
        total_revenue: revenue.service_revenue + revenue.product_revenue + revenue.tips,
        service_commission: plan.commission_rate ? (revenue.service_revenue * plan.commission_rate / 100) : 0,
        product_commission: plan.product_commission_rate ? (revenue.product_revenue * plan.product_commission_rate / 100) : 0,
        tips_earned: revenue.tips,
        booth_rent_due: plan.booth_rent_amount
      }
      
      // Calculate earnings based on plan type
      if (plan.payment_type === 'commission') {
        preview.gross_earnings = 
          (revenue.service_revenue * (100 - (plan.commission_rate || 0)) / 100) +
          (revenue.product_revenue * (100 - (plan.product_commission_rate || 0)) / 100) +
          revenue.tips
        preview.shop_earnings = (preview.service_commission || 0) + (preview.product_commission || 0)
      } else if (plan.payment_type === 'booth_rent') {
        preview.gross_earnings = revenue.service_revenue + revenue.product_revenue + revenue.tips
        preview.shop_earnings = plan.booth_rent_amount || 0
      } else if (plan.payment_type === 'hybrid') {
        preview.gross_earnings = 
          (revenue.service_revenue * (100 - (plan.commission_rate || 0)) / 100) +
          (revenue.product_revenue * (100 - (plan.product_commission_rate || 0)) / 100) +
          revenue.tips
        preview.shop_earnings = 
          (preview.service_commission || 0) + 
          (preview.product_commission || 0) + 
          (plan.booth_rent_amount || 0)
      }
      
      preview.net_earnings = (preview.gross_earnings || 0) - (plan.booth_rent_amount || 0)
      
      return { data: preview }
    }

    const response = await apiClient.post<Partial<CompensationCalculation>>('/compensation/preview', {
      plan_id: planId,
      ...revenue
    })
    return { data: response.data }
  },

  // === UTILITY METHODS ===

  /**
   * Get payment type label
   */
  getPaymentTypeLabel(type: string): string {
    switch (type) {
      case 'commission': return 'Commission'
      case 'booth_rent': return 'Booth Rent'
      case 'hybrid': return 'Hybrid'
      default: return type
    }
  },

  /**
   * Get payment type color
   */
  getPaymentTypeColor(type: string): string {
    switch (type) {
      case 'commission': return 'bg-blue-100 text-blue-800'
      case 'booth_rent': return 'bg-purple-100 text-purple-800'
      case 'hybrid': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  },

  /**
   * Format frequency
   */
  formatFrequency(frequency: string): string {
    switch (frequency) {
      case 'daily': return 'Daily'
      case 'weekly': return 'Weekly'
      case 'biweekly': return 'Bi-weekly'
      case 'monthly': return 'Monthly'
      case 'quarterly': return 'Quarterly'
      case 'yearly': return 'Yearly'
      default: return frequency
    }
  },

  /**
   * Get tip handling label
   */
  getTipHandlingLabel(handling: string): string {
    switch (handling) {
      case 'barber_keeps_all': return 'Barber keeps 100%'
      case 'split_tips': return 'Split with shop'
      case 'pool_tips': return 'Pooled tips'
      default: return handling
    }
  }
}