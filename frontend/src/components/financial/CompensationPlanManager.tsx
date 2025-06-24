'use client'

import React, { useState, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  HomeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalculatorIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { compensationService } from '@/lib/api/compensation'
import type { CompensationPlan, BarberCompensation, CompensationCalculation } from '@/lib/api/compensation'
import { barbersService } from '@/lib/api/barbers'
import type { Barber } from '@/lib/api/client'
import Notification from '@/components/Notification'

// Demo mode flag
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

interface CompensationFormData {
  name: string
  description: string
  payment_type: 'commission' | 'booth_rent' | 'hybrid'
  commission_rate: number
  booth_rent_amount: number
  booth_rent_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  product_commission_rate: number
  tip_handling: 'barber_keeps_all' | 'split_tips' | 'pool_tips'
  tip_split_percentage: number
  minimum_guarantee: number
  is_active: boolean
}

export default function CompensationPlanManager() {
  const [plans, setPlans] = useState<CompensationPlan[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [barberCompensations, setBarberCompensations] = useState<BarberCompensation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CompensationPlan | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<CompensationPlan | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<number | null>(null)
  const [comparePlans, setComparePlans] = useState<CompensationPlan[]>([])
  const [previewCalculation, setPreviewCalculation] = useState<Partial<CompensationCalculation> | null>(null)
  
  // Loading states for individual operations
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingPlan, setIsDeletingPlan] = useState<number | null>(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState<number | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  
  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  } | null>(null)

  const [formData, setFormData] = useState<CompensationFormData>({
    name: '',
    description: '',
    payment_type: 'commission',
    commission_rate: 30,
    booth_rent_amount: 300,
    booth_rent_frequency: 'weekly',
    product_commission_rate: 15,
    tip_handling: 'barber_keeps_all',
    tip_split_percentage: 0,
    minimum_guarantee: 0,
    is_active: true
  })

  const [previewRevenue, setPreviewRevenue] = useState({
    service_revenue: 5000,
    product_revenue: 500,
    tips: 300
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [plansResponse, barbersResponse, compensationsResponse] = await Promise.all([
        compensationService.getPlans(),
        barbersService.getBarbers(),
        compensationService.getBarberCompensations()
      ])

      setPlans(plansResponse.data || [])
      setBarbers(barbersResponse.data || [])
      setBarberCompensations(compensationsResponse.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setPlans([])
      setBarbers([])
      setBarberCompensations([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isSubmitting) return
    
    setIsSubmitting(true)
    try {
      const planData: Omit<CompensationPlan, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name,
        description: formData.description,
        payment_type: formData.payment_type,
        commission_rate: formData.payment_type !== 'booth_rent' ? formData.commission_rate : undefined,
        booth_rent_amount: formData.payment_type !== 'commission' ? formData.booth_rent_amount : undefined,
        booth_rent_frequency: formData.payment_type !== 'commission' ? formData.booth_rent_frequency : undefined,
        product_commission_rate: formData.payment_type !== 'booth_rent' ? formData.product_commission_rate : undefined,
        tip_handling: formData.tip_handling,
        tip_split_percentage: formData.tip_handling === 'split_tips' ? formData.tip_split_percentage : undefined,
        minimum_guarantee: formData.minimum_guarantee > 0 ? formData.minimum_guarantee : undefined,
        is_active: formData.is_active
      }

      if (editingPlan) {
        await compensationService.updatePlan(editingPlan.id, planData)
        setNotification({
          type: 'success',
          title: 'Plan updated successfully',
          message: `${formData.name} has been updated.`
        })
      } else {
        await compensationService.createPlan(planData)
        setNotification({
          type: 'success',
          title: 'Plan created successfully',
          message: `${formData.name} has been created.`
        })
      }

      resetForm()
      fetchData()
    } catch (error: any) {
      console.error('Failed to save plan:', error)
      setNotification({
        type: 'error',
        title: 'Failed to save plan',
        message: error.message || 'Please try again later or contact support.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      payment_type: 'commission',
      commission_rate: 30,
      booth_rent_amount: 300,
      booth_rent_frequency: 'weekly',
      product_commission_rate: 15,
      tip_handling: 'barber_keeps_all',
      tip_split_percentage: 0,
      minimum_guarantee: 0,
      is_active: true
    })
    setShowAddPlan(false)
    setEditingPlan(null)
  }

  const handleEdit = (plan: CompensationPlan) => {
    setFormData({
      name: plan.name,
      description: plan.description || '',
      payment_type: plan.payment_type,
      commission_rate: plan.commission_rate || 30,
      booth_rent_amount: plan.booth_rent_amount || 300,
      booth_rent_frequency: plan.booth_rent_frequency || 'weekly',
      product_commission_rate: plan.product_commission_rate || 15,
      tip_handling: plan.tip_handling || 'barber_keeps_all',
      tip_split_percentage: plan.tip_split_percentage || 0,
      minimum_guarantee: plan.minimum_guarantee || 0,
      is_active: plan.is_active
    })
    setEditingPlan(plan)
    setShowAddPlan(true)
  }

  const handleDelete = async (planId: number, planName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (isDeletingPlan === planId) return
    
    if (!confirm(`Are you sure you want to delete the "${planName}" compensation plan?`)) {
      return
    }

    setIsDeletingPlan(planId)
    try {
      await compensationService.deletePlan(planId)
      setNotification({
        type: 'success',
        title: 'Plan deleted successfully',
        message: `${planName} has been deleted.`
      })
      fetchData()
    } catch (error: any) {
      console.error('Failed to delete plan:', error)
      setNotification({
        type: 'error',
        title: 'Failed to delete plan',
        message: error.message || 'Please try again later or contact support.'
      })
    } finally {
      setIsDeletingPlan(null)
    }
  }

  const togglePlanStatus = async (plan: CompensationPlan, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (isTogglingStatus === plan.id) return
    
    setIsTogglingStatus(plan.id)
    try {
      await compensationService.updatePlan(plan.id, {
        is_active: !plan.is_active
      })
      setNotification({
        type: 'success',
        title: 'Plan status updated',
        message: `${plan.name} is now ${!plan.is_active ? 'active' : 'inactive'}.`
      })
      fetchData()
    } catch (error: any) {
      console.error('Failed to toggle plan status:', error)
      setNotification({
        type: 'error',
        title: 'Failed to update plan status',
        message: error.message || 'Please try again later or contact support.'
      })
    } finally {
      setIsTogglingStatus(null)
    }
  }

  const handleAssignPlan = async () => {
    if (!selectedPlan || !selectedBarber || isAssigning) return

    setIsAssigning(true)
    try {
      await compensationService.assignPlanToBarber({
        barber_id: selectedBarber,
        plan_id: selectedPlan.id,
        effective_date: new Date().toISOString()
      })
      setNotification({
        type: 'success',
        title: 'Plan assigned successfully',
        message: `${selectedPlan.name} has been assigned to the selected barber.`
      })
      setShowAssignModal(false)
      setSelectedPlan(null)
      setSelectedBarber(null)
      fetchData()
    } catch (error: any) {
      console.error('Failed to assign plan:', error)
      setNotification({
        type: 'error',
        title: 'Failed to assign plan',
        message: error.message || 'Please try again later or contact support.'
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handlePreviewCalculation = async () => {
    if (!selectedPlan || isPreviewing) return

    setIsPreviewing(true)
    try {
      const result = await compensationService.previewCompensation(
        selectedPlan.id,
        previewRevenue
      )
      setPreviewCalculation(result.data)
    } catch (error: any) {
      console.error('Failed to preview calculation:', error)
      setNotification({
        type: 'error',
        title: 'Failed to preview calculation',
        message: error.message || 'Please try again later or contact support.'
      })
    } finally {
      setIsPreviewing(false)
    }
  }

  const getAssignedBarbers = (planId: number) => {
    return barberCompensations
      .filter(bc => bc.plan_id === planId && bc.is_active)
      .map(bc => bc.barber_name)
  }

  const togglePlanComparison = (plan: CompensationPlan) => {
    setComparePlans(prev => {
      const isSelected = prev.some(p => p.id === plan.id)
      if (isSelected) {
        return prev.filter(p => p.id !== plan.id)
      } else if (prev.length < 3) {
        return [...prev, plan]
      } else {
        alert('You can compare up to 3 plans at a time')
        return prev
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Compensation Plans</h2>
          <p className="text-sm text-gray-400 mt-1">Manage barber payment structures and commission rates</p>
        </div>
        <div className="flex items-center space-x-3">
          {comparePlans.length > 0 && (
            <button
              onClick={() => setShowCompareModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all flex items-center space-x-2"
            >
              <ChartBarIcon className="h-5 w-5" />
              <span>Compare ({comparePlans.length})</span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingPlan(null)
              setShowAddPlan(true)
            }}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg font-medium hover:from-teal-700 hover:to-teal-800 transition-all flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Plan</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const assignedBarbers = getAssignedBarbers(plan.id)
          const isComparing = comparePlans.some(p => p.id === plan.id)

          return (
            <div
              key={plan.id}
              className={`bg-slate-800 rounded-lg p-6 relative transition-all ${
                isComparing ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {/* Comparison Checkbox */}
              <div className="absolute top-4 right-4">
                <input
                  type="checkbox"
                  checked={isComparing}
                  onChange={() => togglePlanComparison(plan)}
                  className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded"
                  title="Select for comparison"
                />
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white pr-8">{plan.name}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedPlan(plan)
                      setShowPreviewModal(true)
                      handlePreviewCalculation()
                    }}
                    disabled={isPreviewing}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Preview calculations"
                  >
                    <CalculatorIcon className={`h-5 w-5 ${isPreviewing ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleEdit(plan)
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Edit plan"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(plan.id, plan.name, e)}
                    disabled={isDeletingPlan === plan.id}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete plan"
                  >
                    <TrashIcon className={`h-5 w-5 ${isDeletingPlan === plan.id ? 'animate-pulse text-red-500' : ''}`} />
                  </button>
                </div>
              </div>

              {plan.description && (
                <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
              )}

              <div className="space-y-3">
                {/* Payment Type */}
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    {plan.payment_type === 'commission' ? (
                      <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
                    ) : plan.payment_type === 'booth_rent' ? (
                      <HomeIcon className="h-5 w-5 text-blue-400" />
                    ) : (
                      <ArrowTrendingUpIcon className="h-5 w-5 text-purple-400" />
                    )}
                    <span className="text-sm text-gray-300">Type</span>
                  </div>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${compensationService.getPaymentTypeColor(plan.payment_type)}`}>
                    {compensationService.getPaymentTypeLabel(plan.payment_type)}
                  </span>
                </div>

                {/* Commission Rates */}
                {plan.payment_type !== 'booth_rent' && plan.commission_rate && (
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <span className="text-sm text-gray-300">Service Commission</span>
                    <span className="text-sm font-medium text-white">{plan.commission_rate}%</span>
                  </div>
                )}

                {/* Booth Rent */}
                {plan.payment_type !== 'commission' && plan.booth_rent_amount && (
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <span className="text-sm text-gray-300">Booth Rent</span>
                    <span className="text-sm font-medium text-white">
                      ${plan.booth_rent_amount}/{compensationService.formatFrequency(plan.booth_rent_frequency || 'weekly')}
                    </span>
                  </div>
                )}

                {/* Product Commission */}
                {plan.product_commission_rate && (
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <span className="text-sm text-gray-300">Product Commission</span>
                    <span className="text-sm font-medium text-white">{plan.product_commission_rate}%</span>
                  </div>
                )}

                {/* Tip Handling */}
                {plan.tip_handling && (
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <span className="text-sm text-gray-300">Tips</span>
                    <span className="text-sm font-medium text-white">
                      {compensationService.getTipHandlingLabel(plan.tip_handling)}
                    </span>
                  </div>
                )}

                {/* Minimum Guarantee */}
                {plan.minimum_guarantee && (
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <span className="text-sm text-gray-300">Min. Guarantee</span>
                    <span className="text-sm font-medium text-white">${plan.minimum_guarantee}</span>
                  </div>
                )}

                {/* Assigned Barbers */}
                {assignedBarbers.length > 0 && (
                  <div className="p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <UserGroupIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Assigned to:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {assignedBarbers.slice(0, 3).map((name, idx) => (
                        <span key={idx} className="text-xs bg-slate-600 text-white px-2 py-1 rounded">
                          {name}
                        </span>
                      ))}
                      {assignedBarbers.length > 3 && (
                        <span className="text-xs bg-slate-600 text-white px-2 py-1 rounded">
                          +{assignedBarbers.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <button
                    onClick={() => {
                      setSelectedPlan(plan)
                      setShowAssignModal(true)
                    }}
                    className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    Assign to Barber
                  </button>
                  <button
                    onClick={() => togglePlanStatus(plan)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      plan.is_active
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                        : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                    }`}
                  >
                    {plan.is_active ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-4 w-4" />
                        <span>Inactive</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Plan Modal */}
      {showAddPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingPlan ? 'Edit Compensation Plan' : 'Add Compensation Plan'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g., Standard Commission, Premium Booth Rent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    rows={3}
                    placeholder="Describe when this plan should be used..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Payment Type
                  </label>
                  <select
                    value={formData.payment_type}
                    onChange={(e) => setFormData({...formData, payment_type: e.target.value as any})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="commission">Commission Based</option>
                    <option value="booth_rent">Booth Rent</option>
                    <option value="hybrid">Hybrid (Commission + Rent)</option>
                  </select>
                </div>

                {formData.payment_type !== 'booth_rent' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Service Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={formData.commission_rate}
                        onChange={(e) => setFormData({...formData, commission_rate: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Product Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.product_commission_rate}
                        onChange={(e) => setFormData({...formData, product_commission_rate: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                )}

                {formData.payment_type !== 'commission' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Booth Rent Amount ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.booth_rent_amount}
                        onChange={(e) => setFormData({...formData, booth_rent_amount: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Frequency
                      </label>
                      <select
                        value={formData.booth_rent_frequency}
                        onChange={(e) => setFormData({...formData, booth_rent_frequency: e.target.value as any})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Tip Handling
                  </label>
                  <select
                    value={formData.tip_handling}
                    onChange={(e) => setFormData({...formData, tip_handling: e.target.value as any})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="barber_keeps_all">Barber keeps 100% of tips</option>
                    <option value="split_tips">Split tips with shop</option>
                    <option value="pool_tips">Pool tips among team</option>
                  </select>
                </div>

                {formData.tip_handling === 'split_tips' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Shop's Tip Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.tip_split_percentage}
                      onChange={(e) => setFormData({...formData, tip_split_percentage: parseInt(e.target.value) || 0})}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Minimum Earnings Guarantee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minimum_guarantee}
                    onChange={(e) => setFormData({...formData, minimum_guarantee: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    placeholder="0 for no guarantee"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 text-teal-600 bg-slate-700 border-slate-600 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-300">
                    Active (Available for assignment to barbers)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {showAssignModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Assign Compensation Plan</h2>
              <p className="text-sm text-gray-400 mt-1">
                Assign "{selectedPlan.name}" to a barber
              </p>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Select Barber
                  </label>
                  <select
                    value={selectedBarber || ''}
                    onChange={(e) => setSelectedBarber(parseInt(e.target.value))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    required
                  >
                    <option value="">Choose a barber...</option>
                    {barbers.map((barber) => {
                      const currentPlan = barberCompensations.find(
                        bc => bc.barber_id === barber.id && bc.is_active
                      )
                      return (
                        <option key={barber.id} value={barber.id}>
                          {barber.first_name} {barber.last_name}
                          {currentPlan && ` (Current: ${currentPlan.plan_name})`}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="p-4 bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                    <InformationCircleIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Note</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    This will replace any existing compensation plan for the selected barber
                    and take effect immediately.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedPlan(null)
                    setSelectedBarber(null)
                  }}
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignPlan}
                  disabled={!selectedBarber}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison Modal */}
      {showCompareModal && comparePlans.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Compare Compensation Plans</h2>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Feature</th>
                    {comparePlans.map(plan => (
                      <th key={plan.id} className="text-left py-3 px-4 text-sm font-medium text-white">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4 text-sm text-gray-300">Payment Type</td>
                    {comparePlans.map(plan => (
                      <td key={plan.id} className="py-3 px-4">
                        <span className={`text-sm font-medium px-2 py-1 rounded ${compensationService.getPaymentTypeColor(plan.payment_type)}`}>
                          {compensationService.getPaymentTypeLabel(plan.payment_type)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4 text-sm text-gray-300">Service Commission</td>
                    {comparePlans.map(plan => (
                      <td key={plan.id} className="py-3 px-4 text-sm text-white">
                        {plan.commission_rate ? `${plan.commission_rate}%` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4 text-sm text-gray-300">Booth Rent</td>
                    {comparePlans.map(plan => (
                      <td key={plan.id} className="py-3 px-4 text-sm text-white">
                        {plan.booth_rent_amount
                          ? `$${plan.booth_rent_amount}/${compensationService.formatFrequency(plan.booth_rent_frequency || 'weekly')}`
                          : 'N/A'
                        }
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4 text-sm text-gray-300">Product Commission</td>
                    {comparePlans.map(plan => (
                      <td key={plan.id} className="py-3 px-4 text-sm text-white">
                        {plan.product_commission_rate ? `${plan.product_commission_rate}%` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4 text-sm text-gray-300">Tip Handling</td>
                    {comparePlans.map(plan => (
                      <td key={plan.id} className="py-3 px-4 text-sm text-white">
                        {compensationService.getTipHandlingLabel(plan.tip_handling || 'barber_keeps_all')}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-3 px-4 text-sm text-gray-300">Min. Guarantee</td>
                    {comparePlans.map(plan => (
                      <td key={plan.id} className="py-3 px-4 text-sm text-white">
                        {plan.minimum_guarantee ? `$${plan.minimum_guarantee}` : 'None'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-sm text-gray-300">Status</td>
                    {comparePlans.map(plan => (
                      <td key={plan.id} className="py-3 px-4">
                        <span className={`flex items-center space-x-1 text-sm ${
                          plan.is_active ? 'text-green-400' : 'text-gray-400'
                        }`}>
                          {plan.is_active ? (
                            <CheckCircleIcon className="h-4 w-4" />
                          ) : (
                            <XCircleIcon className="h-4 w-4" />
                          )}
                          <span>{plan.is_active ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-slate-700">
              <button
                onClick={() => {
                  setShowCompareModal(false)
                  setComparePlans([])
                }}
                className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Calculation Modal */}
      {showPreviewModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Preview Earnings - {selectedPlan.name}</h2>
                <button
                  onClick={() => {
                    setShowPreviewModal(false)
                    setSelectedPlan(null)
                    setPreviewCalculation(null)
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Enter Revenue Amounts</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Service Revenue</label>
                      <input
                        type="number"
                        value={previewRevenue.service_revenue}
                        onChange={(e) => setPreviewRevenue({
                          ...previewRevenue,
                          service_revenue: parseInt(e.target.value) || 0
                        })}
                        className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Product Revenue</label>
                      <input
                        type="number"
                        value={previewRevenue.product_revenue}
                        onChange={(e) => setPreviewRevenue({
                          ...previewRevenue,
                          product_revenue: parseInt(e.target.value) || 0
                        })}
                        className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tips</label>
                      <input
                        type="number"
                        value={previewRevenue.tips}
                        onChange={(e) => setPreviewRevenue({
                          ...previewRevenue,
                          tips: parseInt(e.target.value) || 0
                        })}
                        className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handlePreviewCalculation}
                    className="mt-3 w-full px-3 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                  >
                    Calculate
                  </button>
                </div>

                {previewCalculation && (
                  <div className="space-y-4">
                    <div className="bg-slate-700 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Revenue Breakdown</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Service Revenue</span>
                          <span className="text-white">${previewCalculation.service_revenue?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Product Revenue</span>
                          <span className="text-white">${previewCalculation.product_revenue?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Tips</span>
                          <span className="text-white">${previewCalculation.tips_collected?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t border-slate-600 pt-2">
                          <span className="text-gray-300">Total Revenue</span>
                          <span className="text-white">${previewCalculation.total_revenue?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-700 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-300 mb-3">Earnings Calculation</h3>
                      <div className="space-y-2">
                        {previewCalculation.service_commission !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Service Commission to Shop</span>
                            <span className="text-red-400">-${previewCalculation.service_commission.toFixed(2)}</span>
                          </div>
                        )}
                        {previewCalculation.product_commission !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Product Commission to Shop</span>
                            <span className="text-red-400">-${previewCalculation.product_commission.toFixed(2)}</span>
                          </div>
                        )}
                        {previewCalculation.booth_rent_due !== undefined && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Booth Rent</span>
                            <span className="text-red-400">-${previewCalculation.booth_rent_due.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-medium border-t border-slate-600 pt-2">
                          <span className="text-gray-300">Barber Net Earnings</span>
                          <span className="text-green-400">${previewCalculation.net_earnings?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                          <span className="text-gray-300">Shop Earnings</span>
                          <span className="text-blue-400">${previewCalculation.shop_earnings?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}
