'use client'

import React, { createContext, useContext, useReducer, ReactNode } from 'react'

// Six Figure Barber Methodology - Core data types
export interface SixFigureGoals {
  target_annual_revenue: number
  target_client_base_size: number
  current_monthly_revenue?: number
  main_challenges: string[]
  success_definition: string
  timeline_months: number
}

export interface ServicePortfolio {
  signature_cuts: {
    enabled: boolean
    price_range: { min: number; max: number }
    description?: string
  }
  beard_services: {
    enabled: boolean
    price_range: { min: number; max: number }
    description?: string
  }
  grooming_packages: {
    enabled: boolean
    price_range: { min: number; max: number }
    description?: string
  }
  special_occasion: {
    enabled: boolean
    price_range: { min: number; max: number }
    description?: string
  }
  memberships: {
    enabled: boolean
    price_range: { min: number; max: number }
    description?: string
  }
  custom_services: Array<{
    name: string
    category: string
    price_range: { min: number; max: number }
    description?: string
  }>
}

export interface PricingStrategy {
  positioning: 'premium' | 'mid_tier' | 'competitive'
  value_based_pricing: boolean
  dynamic_pricing: boolean
  package_discounts: boolean
  loyalty_pricing: boolean
  average_service_price: number
  target_revenue_per_client: number
  pricing_philosophy: string
}

export interface BusinessConfiguration {
  business_hours: {
    [key: string]: { start: string; end: string; enabled: boolean }
  }
  availability_preferences: {
    min_lead_time_hours: number
    max_advance_days: number
    same_day_booking: boolean
    premium_time_slots: string[]
  }
  client_communication: {
    automated_reminders: boolean
    follow_up_messages: boolean
    birthday_messages: boolean
    review_requests: boolean
  }
}

export interface ClientTierSystem {
  enabled: boolean
  tiers: Array<{
    name: string
    criteria: string
    benefits: string[]
    pricing_modifier: number
  }>
}

export interface MarketingSetup {
  referral_program: {
    enabled: boolean
    reward_type: 'discount' | 'credit' | 'service'
    reward_amount: number
  }
  social_media_presence: {
    platforms: string[]
    content_strategy: string
  }
  local_marketing: {
    google_my_business: boolean
    community_involvement: boolean
  }
}

export interface WizardState {
  current_step: number
  completed_steps: number[]
  goals: SixFigureGoals | null
  service_portfolio: ServicePortfolio | null
  pricing_strategy: PricingStrategy | null
  business_config: BusinessConfiguration | null
  client_tiers: ClientTierSystem | null
  marketing_setup: MarketingSetup | null
  user_profile_updates: Record<string, any>
  is_complete: boolean
  can_skip_to_step: (step: number) => boolean
}

type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'COMPLETE_STEP'; step: number }
  | { type: 'SET_GOALS'; goals: SixFigureGoals }
  | { type: 'SET_SERVICE_PORTFOLIO'; portfolio: ServicePortfolio }
  | { type: 'SET_PRICING_STRATEGY'; strategy: PricingStrategy }
  | { type: 'SET_BUSINESS_CONFIG'; config: BusinessConfiguration }
  | { type: 'SET_CLIENT_TIERS'; tiers: ClientTierSystem }
  | { type: 'SET_MARKETING_SETUP'; marketing: MarketingSetup }
  | { type: 'UPDATE_PROFILE_CHANGES'; changes: Record<string, any> }
  | { type: 'RESET_WIZARD' }
  | { type: 'COMPLETE_WIZARD' }

const initialState: WizardState = {
  current_step: 0,
  completed_steps: [],
  goals: null,
  service_portfolio: null,
  pricing_strategy: null,
  business_config: null,
  client_tiers: null,
  marketing_setup: null,
  user_profile_updates: {},
  is_complete: false,
  can_skip_to_step: (step: number) => false
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        current_step: action.step
      }

    case 'COMPLETE_STEP':
      const newCompletedSteps = [...state.completed_steps]
      if (!newCompletedSteps.includes(action.step)) {
        newCompletedSteps.push(action.step)
      }
      
      return {
        ...state,
        completed_steps: newCompletedSteps,
        can_skip_to_step: (step: number) => {
          // Allow skipping to any completed step or the next sequential step
          return newCompletedSteps.includes(step) || step <= Math.max(...newCompletedSteps) + 1
        }
      }

    case 'SET_GOALS':
      return {
        ...state,
        goals: action.goals,
        user_profile_updates: {
          ...state.user_profile_updates,
          six_figure_goals: action.goals
        }
      }

    case 'SET_SERVICE_PORTFOLIO':
      return {
        ...state,
        service_portfolio: action.portfolio,
        user_profile_updates: {
          ...state.user_profile_updates,
          service_portfolio: action.portfolio
        }
      }

    case 'SET_PRICING_STRATEGY':
      return {
        ...state,
        pricing_strategy: action.strategy,
        user_profile_updates: {
          ...state.user_profile_updates,
          pricing_strategy: action.strategy
        }
      }

    case 'SET_BUSINESS_CONFIG':
      return {
        ...state,
        business_config: action.config,
        user_profile_updates: {
          ...state.user_profile_updates,
          business_config: action.config
        }
      }

    case 'SET_CLIENT_TIERS':
      return {
        ...state,
        client_tiers: action.tiers,
        user_profile_updates: {
          ...state.user_profile_updates,
          client_tiers: action.tiers
        }
      }

    case 'SET_MARKETING_SETUP':
      return {
        ...state,
        marketing_setup: action.marketing,
        user_profile_updates: {
          ...state.user_profile_updates,
          marketing_setup: action.marketing
        }
      }

    case 'UPDATE_PROFILE_CHANGES':
      return {
        ...state,
        user_profile_updates: {
          ...state.user_profile_updates,
          ...action.changes
        }
      }

    case 'COMPLETE_WIZARD':
      return {
        ...state,
        is_complete: true,
        user_profile_updates: {
          ...state.user_profile_updates,
          onboarding_completed: true,
          six_figure_wizard_completed: true,
          six_figure_wizard_completed_at: new Date().toISOString()
        }
      }

    case 'RESET_WIZARD':
      return initialState

    default:
      return state
  }
}

interface SixFigureWizardContextType {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  // Convenience methods
  setCurrentStep: (step: number) => void
  completeCurrentStep: () => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  setGoals: (goals: SixFigureGoals) => void
  setServicePortfolio: (portfolio: ServicePortfolio) => void
  setPricingStrategy: (strategy: PricingStrategy) => void
  setBusinessConfig: (config: BusinessConfiguration) => void
  setClientTiers: (tiers: ClientTierSystem) => void
  setMarketingSetup: (marketing: MarketingSetup) => void
  saveProgress: () => Promise<void>
  completeWizard: () => Promise<void>
  resetWizard: () => void
}

const SixFigureWizardContext = createContext<SixFigureWizardContextType | undefined>(undefined)

export function SixFigureWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  // Convenience methods
  const setCurrentStep = (step: number) => {
    dispatch({ type: 'SET_STEP', step })
  }

  const completeCurrentStep = () => {
    dispatch({ type: 'COMPLETE_STEP', step: state.current_step })
  }

  const goToNextStep = () => {
    const nextStep = state.current_step + 1
    dispatch({ type: 'COMPLETE_STEP', step: state.current_step })
    dispatch({ type: 'SET_STEP', step: nextStep })
  }

  const goToPreviousStep = () => {
    const previousStep = Math.max(0, state.current_step - 1)
    dispatch({ type: 'SET_STEP', step: previousStep })
  }

  const setGoals = (goals: SixFigureGoals) => {
    dispatch({ type: 'SET_GOALS', goals })
  }

  const setServicePortfolio = (portfolio: ServicePortfolio) => {
    dispatch({ type: 'SET_SERVICE_PORTFOLIO', portfolio })
  }

  const setPricingStrategy = (strategy: PricingStrategy) => {
    dispatch({ type: 'SET_PRICING_STRATEGY', strategy })
  }

  const setBusinessConfig = (config: BusinessConfiguration) => {
    dispatch({ type: 'SET_BUSINESS_CONFIG', config })
  }

  const setClientTiers = (tiers: ClientTierSystem) => {
    dispatch({ type: 'SET_CLIENT_TIERS', tiers })
  }

  const setMarketingSetup = (marketing: MarketingSetup) => {
    dispatch({ type: 'SET_MARKETING_SETUP', marketing })
  }

  const saveProgress = async () => {
    try {
      // Save current wizard progress to backend
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('token')

      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${API_URL}/api/v1/user/six-figure-wizard-progress`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wizard_state: state,
          user_profile_updates: state.user_profile_updates
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save wizard progress: ${response.status}`)
      }

      console.log('Six Figure Barber Wizard progress saved successfully')
    } catch (error) {
      console.error('Failed to save wizard progress:', error)
      throw error
    }
  }

  const completeWizard = async () => {
    dispatch({ type: 'COMPLETE_WIZARD' })
    
    try {
      // Save final configuration and mark wizard as complete
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const token = localStorage.getItem('token')

      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${API_URL}/api/v1/user/complete-six-figure-wizard`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wizard_configuration: state,
          user_profile_updates: state.user_profile_updates
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to complete wizard: ${response.status}`)
      }

      console.log('Six Figure Barber Wizard completed successfully')
    } catch (error) {
      console.error('Failed to complete wizard:', error)
      throw error
    }
  }

  const resetWizard = () => {
    dispatch({ type: 'RESET_WIZARD' })
  }

  const value: SixFigureWizardContextType = {
    state,
    dispatch,
    setCurrentStep,
    completeCurrentStep,
    goToNextStep,
    goToPreviousStep,
    setGoals,
    setServicePortfolio,
    setPricingStrategy,
    setBusinessConfig,
    setClientTiers,
    setMarketingSetup,
    saveProgress,
    completeWizard,
    resetWizard
  }

  return (
    <SixFigureWizardContext.Provider value={value}>
      {children}
    </SixFigureWizardContext.Provider>
  )
}

export function useSixFigureWizard() {
  const context = useContext(SixFigureWizardContext)
  if (context === undefined) {
    throw new Error('useSixFigureWizard must be used within a SixFigureWizardProvider')
  }
  return context
}