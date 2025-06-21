'use client'

import { useState } from 'react'
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
  ExclamationTriangleIcon
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

interface CompensationPlanFormProps {
  barberId?: number
  existingPlan?: any
  onSubmit: (plan: any) => void
  onCancel: () => void
}

export default function CompensationPlanForm({ barberId, existingPlan, onSubmit, onCancel }: CompensationPlanFormProps) {
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
      }
    }
    
    onSubmit(plan)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
              <div className="p-4 bg-gray-700 border-2 border-gray-600 rounded-lg cursor-pointer peer-checked:border-purple-500 peer-checked:bg-purple-500/10 transition-all">
                <type.icon className="h-5 w-5 text-purple-400 mb-2" />
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
            <CalendarIcon className="h-5 w-5 mr-2 text-purple-400" />
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
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Frequency
              </label>
              <select
                value={salaryFrequency}
                onChange={(e) => setSalaryFrequency(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
            <HomeIcon className="h-5 w-5 mr-2 text-purple-400" />
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
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Frequency
              </label>
              <select
                value={boothRentFrequency}
                onChange={(e) => setBoothRentFrequency(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
                className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-300">Includes utilities</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includesProducts}
                onChange={(e) => setIncludesProducts(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-gray-300">Includes product usage</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includesMarketing}
                onChange={(e) => setIncludesMarketing(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
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
            <ChartBarIcon className="h-5 w-5 mr-2 text-purple-400" />
            Commission Structure
          </h3>
          
          {/* Commission Clarity Info */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-300 font-medium mb-2">💰 Commission = Barbershop Revenue</p>
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
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                    className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                className="flex items-center text-purple-400 hover:text-purple-300 text-sm"
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                      className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                      className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                  className="flex items-center text-purple-400 hover:text-purple-300 text-sm"
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
          <StarIcon className="h-5 w-5 mr-2 text-purple-400" />
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
                  className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Special Conditions */}
      <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <AcademicCapIcon className="h-5 w-5 mr-2 text-purple-400" />
          Special Conditions
        </h3>
        
        {/* Apprentice Period */}
        <div>
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={hasApprenticePeriod}
              onChange={(e) => setHasApprenticePeriod(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 mr-2"
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
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
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
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
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          {existingPlan ? 'Update Plan' : 'Create Plan'}
        </button>
      </div>
    </form>
  )
}