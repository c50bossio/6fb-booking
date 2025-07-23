/**
 * Billing API client for chair-based subscription management.
 * 
 * This module provides type-safe API calls for the billing system,
 * including price calculation, subscription management, and payment processing.
 */

import { fetchAPI } from './api'

// Billing Types
export interface BillingPlanTier {
  chairs_from: number
  chairs_to: number | null
  price_per_chair_monthly: number
  price_per_chair_yearly: number
}

export interface BillingPlanFeatures {
  max_chairs: number
  multi_location: boolean
  advanced_analytics: boolean
  api_access: boolean
  priority_support: boolean
  custom_branding: boolean
  staff_management: boolean
  inventory_management: boolean
  marketing_automation: boolean
}

export interface BillingPlan {
  name: string
  base_features: BillingPlanFeatures
  pricing_tiers: BillingPlanTier[]
  trial_days: number
  yearly_discount_percent: number
}

export interface PriceCalculation {
  chairs_count: number
  monthly_total: number
  yearly_total: number
  yearly_savings: number
  applicable_tier: BillingPlanTier
  included_features: BillingPlanFeatures
}

export interface BillingContact {
  name: string
  email: string
  phone?: string
  street_address: string
  city: string
  state: string
  zip_code: string
  country?: string
}

export interface Subscription {
  id: string
  organization_id: number
  stripe_subscription_id?: string
  stripe_customer_id?: string
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  chairs_count: number
  billing_cycle: 'monthly' | 'yearly'
  billing_plan: string
  current_period_start: string
  current_period_end: string
  current_period_total: number
  trial_start?: string
  trial_end?: string
  trial_days_remaining?: number
  cancel_at_period_end: boolean
  canceled_at?: string
  payment_method_last4?: string
  payment_method_brand?: string
  next_billing_date?: string
  billing_contact?: BillingContact
  enabled_features: BillingPlanFeatures
  created_at: string
  updated_at: string
}

export interface CreateSubscriptionRequest {
  organization_id: number
  chairs_count: number
  billing_cycle: 'monthly' | 'yearly'
  payment_method_id: string
  billing_contact: BillingContact
  promo_code?: string
}

export interface UpdateSubscriptionRequest {
  chairs_count?: number
  billing_cycle?: 'monthly' | 'yearly'
  payment_method_id?: string
  billing_contact?: BillingContact
}

export interface CancelSubscriptionRequest {
  organization_id: number
  reason?: string
  feedback?: string
  immediate?: boolean
}

export interface CancelSubscriptionResponse {
  message: string
  cancellation_date: string
  refund_amount?: number
}

export interface PaymentHistoryItem {
  id: string
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed'
  description: string
  created_at: string
  invoice_url?: string
}

export interface TrialStatus {
  is_trial_active: boolean
  trial_started_at?: string
  trial_expires_at?: string
  trial_days_remaining: number
  features_available: BillingPlanFeatures
  requires_payment_method: boolean
}

// Billing API Functions

/**
 * Get available billing plans with chair-based pricing tiers
 */
export async function getBillingPlans(): Promise<BillingPlan[]> {
  return fetchAPI<BillingPlan[]>('/api/v2/billing/plans')
}

/**
 * Calculate pricing based on chair count and billing cycle
 */
export async function calculatePrice(
  chairsCount: number,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): Promise<PriceCalculation> {
  return fetchAPI<PriceCalculation>('/api/v2/billing/calculate-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chairs_count: chairsCount,
      billing_cycle: billingCycle
    })
  })
}

/**
 * Get current subscription details for the authenticated user's organization
 */
export async function getCurrentSubscription(): Promise<Subscription> {
  return fetchAPI<Subscription>('/api/v2/billing/current-subscription')
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  request: CreateSubscriptionRequest
): Promise<Subscription> {
  return fetchAPI<Subscription>('/api/v2/billing/create-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
}

/**
 * Update an existing subscription
 */
export async function updateSubscription(
  request: UpdateSubscriptionRequest
): Promise<Subscription> {
  return fetchAPI<Subscription>('/api/v2/billing/update-subscription', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  request: CancelSubscriptionRequest
): Promise<CancelSubscriptionResponse> {
  return fetchAPI<CancelSubscriptionResponse>('/api/v2/billing/cancel-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
}

/**
 * Get payment history for an organization
 */
export async function getPaymentHistory(
  organizationId?: number
): Promise<PaymentHistoryItem[]> {
  const url = organizationId 
    ? `/api/v2/billing/payment-history?organization_id=${organizationId}`
    : '/api/v2/billing/payment-history'
  return fetchAPI<PaymentHistoryItem[]>(url)
}

/**
 * Get trial status for the current user
 */
export async function getTrialStatus(): Promise<TrialStatus> {
  return fetchAPI<TrialStatus>('/api/v2/billing/trial-status')
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const subscription = await getCurrentSubscription()
    return subscription.status === 'active' || subscription.status === 'trialing'
  } catch (error) {
    return false
  }
}

/**
 * Convert trial to paid subscription
 */
export async function convertTrialToPaid(
  organizationId: number,
  paymentMethodId: string
): Promise<Subscription> {
  return fetchAPI<Subscription>('/api/v2/billing/convert-trial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organization_id: organizationId,
      payment_method_id: paymentMethodId
    })
  })
}

// Helper functions for pricing display

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Get pricing tier for a given chair count
 */
export function getPricingTier(chairCount: number): { pricePerChair: number; tierName: string } {
  if (chairCount === 1) return { pricePerChair: 19, tierName: 'Solo Barber' }
  if (chairCount <= 3) return { pricePerChair: 17, tierName: 'Small Shop' }
  if (chairCount <= 5) return { pricePerChair: 15, tierName: 'Growing Shop' }
  if (chairCount <= 9) return { pricePerChair: 13, tierName: 'Established Shop' }
  if (chairCount <= 14) return { pricePerChair: 11, tierName: 'Large Shop' }
  return { pricePerChair: 9, tierName: 'Enterprise' }
}

/**
 * Calculate monthly price based on chair count
 */
export function calculateMonthlyPrice(chairCount: number): number {
  const { pricePerChair } = getPricingTier(chairCount)
  return pricePerChair * chairCount
}

/**
 * Calculate yearly price with discount
 */
export function calculateYearlyPrice(chairCount: number, discountPercent: number = 20): number {
  const monthlyPrice = calculateMonthlyPrice(chairCount)
  const yearlyPrice = monthlyPrice * 12
  const discount = yearlyPrice * (discountPercent / 100)
  return yearlyPrice - discount
}