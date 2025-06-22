'use client'

import { useState, useEffect } from 'react'
import {
  CalculatorIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  TrophyIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

interface CalculatorProps {
  compensationType: string
  baseSalary?: number
  salaryFrequency?: string
  boothRentAmount?: number
  boothRentFrequency?: string
  commissionStructure?: any
  performanceBonuses?: any
  deductions?: any
  specialConditions?: any
}

export default function CompensationCalculator({
  compensationType,
  baseSalary,
  salaryFrequency,
  boothRentAmount,
  boothRentFrequency,
  commissionStructure,
  performanceBonuses,
  deductions,
  specialConditions
}: CalculatorProps) {
  const [monthlyRevenue, setMonthlyRevenue] = useState(12000)
  const [newClients, setNewClients] = useState(10)
  const [productSales, setProductSales] = useState(500)
  const [clientRetentionRate, setClientRetentionRate] = useState(85)
  const [averageRating, setAverageRating] = useState(4.8)

  const [earnings, setEarnings] = useState({
    baseCompensation: 0,
    commissionEarnings: 0,
    performanceBonuses: 0,
    totalDeductions: 0,
    netEarnings: 0,
    takeHomePercentage: 0
  })

  useEffect(() => {
    calculateEarnings()
  }, [monthlyRevenue, newClients, productSales, clientRetentionRate, averageRating])

  const calculateEarnings = () => {
    let baseCompensation = 0
    let commissionEarnings = 0
    let bonuses = 0
    let totalDeductions = 0

    // Base compensation (salary or booth rent)
    if (compensationType === 'salary' || compensationType === 'salary_plus_commission') {
      baseCompensation = baseSalary || 0
      if (salaryFrequency === 'biweekly') baseCompensation = (baseCompensation * 26) / 12
      else if (salaryFrequency === 'weekly') baseCompensation = (baseCompensation * 52) / 12
    }

    if (compensationType === 'booth_rent_only' || compensationType === 'hybrid') {
      const rentAmount = boothRentAmount || 0
      if (boothRentFrequency === 'daily') baseCompensation = -(rentAmount * 22) // 22 working days
      else if (boothRentFrequency === 'weekly') baseCompensation = -(rentAmount * 4.33)
      else if (boothRentFrequency === 'biweekly') baseCompensation = -(rentAmount * 2.17)
      else baseCompensation = -rentAmount // monthly
    }

    // Commission earnings
    if (compensationType !== 'booth_rent_only' && compensationType !== 'salary' && commissionStructure) {
      // For sliding scale, find the appropriate tier
      if (compensationType === 'sliding_scale' && commissionStructure.tiers) {
        const tier = commissionStructure.tiers.find((t: any) =>
          monthlyRevenue >= t.min && (t.max === null || monthlyRevenue <= t.max)
        )
        const rate = tier ? tier.rate : 50
        commissionEarnings = (monthlyRevenue * rate) / 100
      } else {
        // Simple average of service commissions
        const serviceRates = commissionStructure.services ?
          Object.values(commissionStructure.services).map((s: any) => s.rate) : [50]
        const avgRate = serviceRates.reduce((a: number, b: number) => a + b, 0) / serviceRates.length
        commissionEarnings = (monthlyRevenue * avgRate) / 100
      }

      // Product commission
      if (productSales > 0 && commissionStructure.products) {
        const productRate = commissionStructure.products.default || 15
        commissionEarnings += (productSales * productRate) / 100
      }
    }

    // Performance bonuses
    if (performanceBonuses) {
      // Revenue milestones
      if (performanceBonuses.revenue_milestones) {
        const milestone = performanceBonuses.revenue_milestones
          .filter((m: any) => monthlyRevenue >= m.target)
          .sort((a: any, b: any) => b.target - a.target)[0]
        if (milestone) bonuses += milestone.bonus
      }

      // New client bonus
      if (performanceBonuses.new_clients && newClients > 0) {
        const bonus = Math.min(
          newClients * performanceBonuses.new_clients.per_client,
          performanceBonuses.new_clients.monthly_cap || 500
        )
        bonuses += bonus
      }

      // Retention bonus
      if (performanceBonuses.client_retention &&
          clientRetentionRate >= (performanceBonuses.client_retention.rate || 80)) {
        bonuses += performanceBonuses.client_retention.bonus || 0
      }

      // Review rating bonus
      if (performanceBonuses.review_rating &&
          averageRating >= (performanceBonuses.review_rating.min_rating || 4.5)) {
        bonuses += performanceBonuses.review_rating.bonus || 0
      }
    }

    // Deductions
    if (deductions && commissionEarnings > 0) {
      // Percentage-based deductions
      if (deductions.product_usage?.type === 'percentage') {
        totalDeductions += (commissionEarnings * deductions.product_usage.value) / 100
      }
      if (deductions.processing_fees?.type === 'percentage') {
        totalDeductions += (commissionEarnings * deductions.processing_fees.value) / 100
      }

      // Fixed deductions
      if (deductions.marketing_contribution?.type === 'fixed') {
        totalDeductions += deductions.marketing_contribution.value || 0
      }
      if (deductions.supply_fee?.type === 'fixed') {
        totalDeductions += deductions.supply_fee.value || 0
      }
    }

    // Calculate net earnings
    const grossEarnings = baseCompensation + commissionEarnings + bonuses
    const netEarnings = grossEarnings - totalDeductions
    const takeHomePercentage = monthlyRevenue > 0 ? (netEarnings / monthlyRevenue) * 100 : 0

    setEarnings({
      baseCompensation,
      commissionEarnings,
      performanceBonuses: bonuses,
      totalDeductions,
      netEarnings,
      takeHomePercentage
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <CalculatorIcon className="h-5 w-5 mr-2 text-purple-400" />
        Earnings Calculator Preview
      </h3>

      {/* Input Controls */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Monthly Revenue</label>
          <input
            type="number"
            value={monthlyRevenue}
            onChange={(e) => setMonthlyRevenue(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            step="1000"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">New Clients</label>
          <input
            type="number"
            value={newClients}
            onChange={(e) => setNewClients(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Product Sales</label>
          <input
            type="number"
            value={productSales}
            onChange={(e) => setProductSales(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            step="50"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Client Retention %</label>
          <input
            type="number"
            value={clientRetentionRate}
            onChange={(e) => setClientRetentionRate(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            min="0"
            max="100"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Average Rating</label>
          <input
            type="number"
            value={averageRating}
            onChange={(e) => setAverageRating(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            min="1"
            max="5"
            step="0.1"
          />
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-700">
          <span className="text-sm text-gray-400">
            {compensationType === 'booth_rent_only' || compensationType === 'hybrid' ? 'Booth Rent' : 'Base Compensation'}
          </span>
          <span className={`text-sm font-medium ${earnings.baseCompensation < 0 ? 'text-red-400' : 'text-white'}`}>
            {formatCurrency(earnings.baseCompensation)}
          </span>
        </div>

        {compensationType !== 'booth_rent_only' && compensationType !== 'salary' && (
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-sm text-gray-400">Commission Earnings</span>
            <span className="text-sm font-medium text-green-400">
              +{formatCurrency(earnings.commissionEarnings)}
            </span>
          </div>
        )}

        {earnings.performanceBonuses > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-sm text-gray-400">Performance Bonuses</span>
            <span className="text-sm font-medium text-green-400">
              +{formatCurrency(earnings.performanceBonuses)}
            </span>
          </div>
        )}

        {earnings.totalDeductions > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-sm text-gray-400">Deductions & Fees</span>
            <span className="text-sm font-medium text-red-400">
              -{formatCurrency(earnings.totalDeductions)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center py-3 bg-purple-500/10 px-3 rounded-lg">
          <span className="text-base font-medium text-white">Net Monthly Earnings</span>
          <div className="text-right">
            <div className="text-xl font-semibold text-purple-400">
              {formatCurrency(earnings.netEarnings)}
            </div>
            <div className="text-xs text-gray-400">
              {earnings.takeHomePercentage.toFixed(1)}% of revenue
            </div>
          </div>
        </div>
      </div>

      {/* Annual Projection */}
      <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Projected Annual Income</span>
          <span className="text-lg font-medium text-white">
            {formatCurrency(earnings.netEarnings * 12)}
          </span>
        </div>
      </div>
    </div>
  )
}
