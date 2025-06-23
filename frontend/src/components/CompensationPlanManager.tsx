'use client'

import React, { useState, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  HomeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import apiClient from '@/lib/api/client'

interface CompensationPlan {
  id: number
  name: string
  description?: string
  payment_type: 'commission' | 'booth_rent' | 'hybrid'
  commission_rate?: number
  booth_rent_amount?: number
  booth_rent_frequency?: string
  product_commission_rate?: number
  tip_handling?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function CompensationPlanManager() {
  const [plans, setPlans] = useState<CompensationPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CompensationPlan | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    payment_type: 'commission' as 'commission' | 'booth_rent' | 'hybrid',
    commission_rate: 30,
    booth_rent_amount: 500,
    booth_rent_frequency: 'weekly',
    product_commission_rate: 15,
    tip_handling: 'barber_keeps_all',
    is_active: true
  })

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await apiClient.get('/compensation-plans')
      setPlans(response.data || [])
    } catch (error) {
      console.error('Failed to fetch compensation plans:', error)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPlan) {
        await apiClient.put(`/compensation-plans/${editingPlan.id}`, formData)
      } else {
        await apiClient.post('/compensation-plans', formData)
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        payment_type: 'commission',
        commission_rate: 30,
        booth_rent_amount: 500,
        booth_rent_frequency: 'weekly',
        product_commission_rate: 15,
        tip_handling: 'barber_keeps_all',
        is_active: true
      })
      setShowAddPlan(false)
      setEditingPlan(null)

      // Refresh plans
      fetchPlans()
    } catch (error: any) {
      console.error('Failed to save plan:', error)
      alert(`Failed to save plan: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleEdit = (plan: CompensationPlan) => {
    setFormData({
      name: plan.name,
      description: plan.description || '',
      payment_type: plan.payment_type,
      commission_rate: plan.commission_rate || 30,
      booth_rent_amount: plan.booth_rent_amount || 500,
      booth_rent_frequency: plan.booth_rent_frequency || 'weekly',
      product_commission_rate: plan.product_commission_rate || 15,
      tip_handling: plan.tip_handling || 'barber_keeps_all',
      is_active: plan.is_active
    })
    setEditingPlan(plan)
    setShowAddPlan(true)
  }

  const handleDelete = async (planId: number, planName: string) => {
    if (!confirm(`Are you sure you want to delete the "${planName}" compensation plan?`)) {
      return
    }

    try {
      await apiClient.delete(`/compensation-plans/${planId}`)
      fetchPlans()
    } catch (error: any) {
      console.error('Failed to delete plan:', error)
      alert(`Failed to delete plan: ${error.response?.data?.detail || error.message}`)
    }
  }

  const togglePlanStatus = async (plan: CompensationPlan) => {
    try {
      await apiClient.patch(`/compensation-plans/${plan.id}`, {
        is_active: !plan.is_active
      })
      fetchPlans()
    } catch (error: any) {
      console.error('Failed to toggle plan status:', error)
      alert(`Failed to update plan: ${error.response?.data?.detail || error.message}`)
    }
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
        <h2 className="text-xl font-bold text-white">Compensation Plans</h2>
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

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(plan)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Edit plan"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(plan.id, plan.name)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete plan"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {plan.description && (
              <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  {plan.payment_type === 'commission' ? (
                    <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
                  ) : (
                    <HomeIcon className="h-5 w-5 text-blue-400" />
                  )}
                  <span className="text-sm text-gray-300">Type</span>
                </div>
                <span className="text-sm font-medium text-white capitalize">
                  {plan.payment_type.replace('_', ' ')}
                </span>
              </div>

              {plan.payment_type !== 'booth_rent' && plan.commission_rate && (
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <span className="text-sm text-gray-300">Service Commission</span>
                  <span className="text-sm font-medium text-white">{plan.commission_rate}%</span>
                </div>
              )}

              {plan.payment_type !== 'commission' && plan.booth_rent_amount && (
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <span className="text-sm text-gray-300">Booth Rent</span>
                  <span className="text-sm font-medium text-white">
                    ${plan.booth_rent_amount}/{plan.booth_rent_frequency}
                  </span>
                </div>
              )}

              {plan.product_commission_rate && (
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <span className="text-sm text-gray-300">Product Commission</span>
                  <span className="text-sm font-medium text-white">{plan.product_commission_rate}%</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3">
                <span className="text-sm text-gray-400">Status</span>
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
        ))}
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
                  onClick={() => {
                    setShowAddPlan(false)
                    setEditingPlan(null)
                  }}
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
                        onChange={(e) => setFormData({...formData, commission_rate: parseInt(e.target.value)})}
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
                        onChange={(e) => setFormData({...formData, product_commission_rate: parseInt(e.target.value)})}
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
                        onChange={(e) => setFormData({...formData, booth_rent_amount: parseInt(e.target.value)})}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Frequency
                      </label>
                      <select
                        value={formData.booth_rent_frequency}
                        onChange={(e) => setFormData({...formData, booth_rent_frequency: e.target.value})}
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
                    onChange={(e) => setFormData({...formData, tip_handling: e.target.value})}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="barber_keeps_all">Barber keeps 100% of tips</option>
                    <option value="split_tips">Split tips with shop</option>
                    <option value="pool_tips">Pool tips among team</option>
                  </select>
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
                  onClick={() => {
                    setShowAddPlan(false)
                    setEditingPlan(null)
                  }}
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
    </div>
  )
}
