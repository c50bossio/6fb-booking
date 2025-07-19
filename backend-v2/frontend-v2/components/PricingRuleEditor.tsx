'use client'

import { useState, useEffect } from 'react'
import { 
  ServicePricingRule, 
  ServicePricingRuleCreate,
  createServicePricingRule,
  getServicePricingRules,
  deleteServicePricingRule 
} from '../lib/api'
import { format } from 'date-fns'
import { Plus, Trash2, Calendar, Clock, DollarSign, AlertCircle } from 'lucide-react'

interface PricingRuleEditorProps {
  serviceId: number
  serviceName: string
  basePrice: number
}

const RULE_TYPES = [
  { value: 'time_based', label: 'Time-Based' },
  { value: 'day_of_week', label: 'Day of Week' },
  { value: 'date_range', label: 'Date Range' },
  { value: 'happy_hour', label: 'Happy Hour' },
  { value: 'surge_pricing', label: 'Surge Pricing' },
]

const PRICE_MODIFIER_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed_amount', label: 'Fixed Amount' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function PricingRuleEditor({ serviceId, serviceName, basePrice }: PricingRuleEditorProps) {
  const [rules, setRules] = useState<ServicePricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRule, setNewRule] = useState<ServicePricingRuleCreate>({
    rule_type: 'time_based',
    priority: 1,
    price_modifier_type: 'percentage',
    price_modifier_value: 0,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRules()
  }, [serviceId])

  const loadRules = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getServicePricingRules(serviceId)
      setRules(data.sort((a, b) => b.priority - a.priority))
    } catch (err: any) {
      setError('Failed to load pricing rules')
      } finally {
      setLoading(false)
    }
  }

  const handleAddRule = async () => {
    try {
      setSaving(true)
      setError('')
      await createServicePricingRule(serviceId, newRule)
      await loadRules()
      setShowAddForm(false)
      resetForm()
    } catch (err: any) {
      setError(err.message || 'Failed to create pricing rule')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) {
      return
    }

    try {
      await deleteServicePricingRule(serviceId, ruleId)
      await loadRules()
    } catch (err: any) {
      setError('Failed to delete pricing rule')
    }
  }

  const resetForm = () => {
    setNewRule({
      rule_type: 'time_based',
      priority: 1,
      price_modifier_type: 'percentage',
      price_modifier_value: 0,
    })
  }

  const calculateNewPrice = (rule: ServicePricingRule | ServicePricingRuleCreate) => {
    const adjustmentType = 'price_modifier_type' in rule ? rule.price_modifier_type : rule.price_adjustment_type
    const adjustmentValue = 'price_modifier_value' in rule ? rule.price_modifier_value : rule.price_adjustment_value
    
    if (adjustmentType === 'percentage') {
      return basePrice * (1 + adjustmentValue / 100)
    } else {
      return basePrice + adjustmentValue
    }
  }

  const formatRuleDescription = (rule: ServicePricingRule) => {
    const parts = []
    
    switch (rule.rule_type) {
      case 'time_based':
        if (rule.start_time && rule.end_time) {
          parts.push(`Between ${rule.start_time} - ${rule.end_time}`)
        }
        break
      case 'day_of_week':
        if (rule.day_of_week !== undefined) {
          parts.push(`On ${DAYS_OF_WEEK.find(d => d.value === rule.day_of_week)?.label}s`)
        }
        break
      case 'date_range':
        if (rule.start_date && rule.end_date) {
          parts.push(`From ${format(new Date(rule.start_date), 'MMM d, yyyy')} to ${format(new Date(rule.end_date), 'MMM d, yyyy')}`)
        }
        break
      case 'happy_hour':
        if (rule.start_time && rule.end_time) {
          parts.push(`Happy Hour: ${rule.start_time} - ${rule.end_time}`)
        }
        break
      case 'surge_pricing':
        parts.push('Surge Pricing Active')
        break
    }

    if (rule.price_adjustment_type === 'percentage') {
      parts.push(`${rule.price_adjustment_value > 0 ? '+' : ''}${rule.price_adjustment_value}%`)
    } else {
      parts.push(`${rule.price_adjustment_value > 0 ? '+' : ''}$${Math.abs(rule.price_adjustment_value)}`)
    }

    return parts.join(' - ')
  }

  if (loading) {
    return <div className="text-center py-4">Loading pricing rules...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Pricing Rules</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Rule
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Current Rules */}
      {rules.length > 0 ? (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`border rounded-lg p-4 ${
                rule.is_active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {RULE_TYPES.find(t => t.value === rule.rule_type)?.label}
                    </span>
                    <span className="text-xs text-gray-500">Priority: {rule.priority}</span>
                    {!rule.is_active && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{formatRuleDescription(rule)}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-gray-500">
                      Base: ${basePrice.toFixed(2)}
                    </span>
                    <span className="text-teal-600 font-medium">
                      New: ${calculateNewPrice(rule).toFixed(2)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="ml-4 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No pricing rules configured</p>
          <p className="text-sm text-gray-500 mt-1">Add rules to adjust pricing dynamically</p>
        </div>
      )}

      {/* Add Rule Form */}
      {showAddForm && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-4">Add New Pricing Rule</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rule Type
              </label>
              <select
                value={newRule.rule_type}
                onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {RULE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <input
                type="number"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 1 })}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                min="1"
                max="100"
              />
            </div>

            {/* Conditional fields based on rule type */}
            {newRule.rule_type === 'day_of_week' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Day of Week
                </label>
                <select
                  value={newRule.day_of_week || 0}
                  onChange={(e) => setNewRule({ ...newRule, day_of_week: parseInt(e.target.value) })}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(newRule.rule_type === 'time_based' || newRule.rule_type === 'happy_hour') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newRule.start_time || ''}
                    onChange={(e) => setNewRule({ ...newRule, start_time: e.target.value })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newRule.end_time || ''}
                    onChange={(e) => setNewRule({ ...newRule, end_time: e.target.value })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </>
            )}

            {newRule.rule_type === 'date_range' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newRule.start_date || ''}
                    onChange={(e) => setNewRule({ ...newRule, start_date: e.target.value })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newRule.end_date || ''}
                    onChange={(e) => setNewRule({ ...newRule, end_date: e.target.value })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price Adjustment Type
              </label>
              <select
                value={newRule.price_modifier_type}
                onChange={(e) => setNewRule({ ...newRule, price_modifier_type: e.target.value })}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {PRICE_MODIFIER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {newRule.price_modifier_type === 'percentage' ? 'Percentage' : 'Amount'} (+ or -)
              </label>
              <input
                type="number"
                value={newRule.price_modifier_value}
                onChange={(e) => setNewRule({ ...newRule, price_modifier_value: parseFloat(e.target.value) || 0 })}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                step={newRule.price_modifier_type === 'percentage' ? '1' : '0.01'}
                placeholder={newRule.price_modifier_type === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 5.00'}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Preview: ${basePrice.toFixed(2)} → ${calculateNewPrice(newRule).toFixed(2)}
            </p>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddForm(false)
                resetForm()
              }}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRule}
              disabled={saving}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Rule'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}