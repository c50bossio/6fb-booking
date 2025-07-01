'use client'

import { useState, useEffect } from 'react'
import { 
  createBookingRule, 
  updateBookingRule, 
  getServices,
  getUsers,
  type BookingRule, 
  type BookingRuleCreate,
  type BookingRuleUpdate,
  type Service
} from '../lib/api'

interface BookingRuleEditorProps {
  rule?: BookingRule | null
  ruleTypes: any
  onSave: () => void
  onCancel: () => void
  onError: (message: string) => void
}

interface RuleParameter {
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'array' | 'date'
}

export default function BookingRuleEditor({
  rule,
  ruleTypes,
  onSave,
  onCancel,
  onError
}: BookingRuleEditorProps) {
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<any[]>([])
  
  // Form state
  const [ruleName, setRuleName] = useState(rule?.rule_name || '')
  const [ruleType, setRuleType] = useState(rule?.rule_type || '')
  const [appliesTo, setAppliesTo] = useState(rule?.applies_to || 'all')
  const [priority, setPriority] = useState(rule?.priority || 0)
  const [isActive, setIsActive] = useState(rule?.is_active ?? true)
  const [selectedServices, setSelectedServices] = useState<number[]>(rule?.service_ids || [])
  const [selectedBarbers, setSelectedBarbers] = useState<number[]>(rule?.barber_ids || [])
  const [selectedClientTypes, setSelectedClientTypes] = useState<string[]>(rule?.client_types || [])
  const [ruleParams, setRuleParams] = useState<RuleParameter[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Initialize rule parameters based on rule type
    if (ruleType) {
      initializeRuleParams()
    }
  }, [ruleType])

  const loadData = async () => {
    try {
      // Load services and barbers for selection
      const [servicesData, usersData] = await Promise.all([
        getServices(),
        getUsers()
      ])
      
      setServices(servicesData)
      // Filter users to get only barbers
      setBarbers(usersData.filter((u: any) => u.role === 'barber' || u.is_barber))
    } catch (err: any) {
      onError('Failed to load data: ' + err.message)
    }
  }

  const initializeRuleParams = () => {
    const allTypes = { ...ruleTypes?.global_rule_types, ...ruleTypes?.service_rule_types }
    const typeInfo = allTypes[ruleType]
    
    if (typeInfo?.parameters) {
      const params: RuleParameter[] = []
      
      Object.entries(typeInfo.parameters).forEach(([key, type]) => {
        const existingValue = rule?.rule_params?.[key]
        let paramType: RuleParameter['type'] = 'string'
        let defaultValue: any = ''
        
        if (typeof type === 'string') {
          if (type.includes('integer') || type.includes('number')) {
            paramType = 'number'
            defaultValue = 0
          } else if (type.includes('boolean')) {
            paramType = 'boolean'
            defaultValue = false
          } else if (type.includes('array')) {
            paramType = 'array'
            defaultValue = []
          } else if (type.includes('date')) {
            paramType = 'date'
            defaultValue = ''
          }
        }
        
        params.push({
          key,
          value: existingValue ?? defaultValue,
          type: paramType
        })
      })
      
      setRuleParams(params)
    } else {
      // For custom rules, parse existing params
      if (rule?.rule_params) {
        const params: RuleParameter[] = []
        Object.entries(rule.rule_params).forEach(([key, value]) => {
          let type: RuleParameter['type'] = 'string'
          if (typeof value === 'number') type = 'number'
          else if (typeof value === 'boolean') type = 'boolean'
          else if (Array.isArray(value)) type = 'array'
          
          params.push({ key, value, type })
        })
        setRuleParams(params)
      }
    }
  }

  const handleParamChange = (index: number, field: 'key' | 'value' | 'type', newValue: any) => {
    setRuleParams(prev => {
      const updated = [...prev]
      
      if (field === 'type' && updated[index].type !== newValue) {
        // Reset value when type changes
        let defaultValue: any = ''
        if (newValue === 'number') defaultValue = 0
        else if (newValue === 'boolean') defaultValue = false
        else if (newValue === 'array') defaultValue = []
        
        updated[index] = { ...updated[index], type: newValue, value: defaultValue }
      } else {
        updated[index] = { ...updated[index], [field]: newValue }
      }
      
      return updated
    })
  }

  const handleAddParam = () => {
    setRuleParams(prev => [...prev, { key: '', value: '', type: 'string' }])
  }

  const handleRemoveParam = (index: number) => {
    setRuleParams(prev => prev.filter((_, i) => i !== index))
  }

  const handleArrayValueChange = (paramIndex: number, value: string) => {
    // Convert comma-separated string to array
    const arrayValue = value.split(',').map(v => v.trim()).filter(v => v)
    handleParamChange(paramIndex, 'value', arrayValue)
  }

  const validateForm = (): boolean => {
    if (!ruleName.trim()) {
      onError('Rule name is required')
      return false
    }
    
    if (!ruleType) {
      onError('Rule type is required')
      return false
    }
    
    // Validate parameters
    for (const param of ruleParams) {
      if (!param.key.trim()) {
        onError('All parameter keys must be filled')
        return false
      }
      
      if (param.type === 'number' && isNaN(Number(param.value))) {
        onError(`Parameter "${param.key}" must be a valid number`)
        return false
      }
    }
    
    // Validate applies_to selections
    if (appliesTo === 'service' && selectedServices.length === 0) {
      onError('Please select at least one service')
      return false
    }
    
    if (appliesTo === 'barber' && selectedBarbers.length === 0) {
      onError('Please select at least one barber')
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      setLoading(true)
      
      // Convert params array to object
      const paramsObject: Record<string, any> = {}
      ruleParams.forEach(param => {
        let value = param.value
        if (param.type === 'number') {
          value = Number(value)
        }
        paramsObject[param.key] = value
      })
      
      if (rule) {
        // Update existing rule
        const updates: BookingRuleUpdate = {
          rule_name: ruleName,
          rule_type: ruleType,
          rule_params: paramsObject,
          applies_to: appliesTo,
          priority,
          is_active: isActive
        }
        
        if (appliesTo === 'service') {
          updates.service_ids = selectedServices
        } else if (appliesTo === 'barber') {
          updates.barber_ids = selectedBarbers
        } else if (appliesTo === 'client_type') {
          updates.client_types = selectedClientTypes
        }
        
        await updateBookingRule(rule.id, updates)
      } else {
        // Create new rule
        const newRule: BookingRuleCreate = {
          rule_name: ruleName,
          rule_type: ruleType,
          rule_params: paramsObject,
          applies_to: appliesTo,
          priority
        }
        
        if (appliesTo === 'service') {
          newRule.service_ids = selectedServices
        } else if (appliesTo === 'barber') {
          newRule.barber_ids = selectedBarbers
        } else if (appliesTo === 'client_type') {
          newRule.client_types = selectedClientTypes
        }
        
        await createBookingRule(newRule)
      }
      
      onSave()
    } catch (err: any) {
      onError(err.message || 'Failed to save rule')
    } finally {
      setLoading(false)
    }
  }

  const getRuleTypeOptions = () => {
    const options: { value: string; label: string; category: string }[] = []
    
    if (ruleTypes?.global_rule_types) {
      Object.entries(ruleTypes.global_rule_types).forEach(([key, info]: [string, any]) => {
        options.push({
          value: key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          category: 'Global Rules'
        })
      })
    }
    
    if (ruleTypes?.service_rule_types) {
      Object.entries(ruleTypes.service_rule_types).forEach(([key, info]: [string, any]) => {
        options.push({
          value: key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          category: 'Service Rules'
        })
      })
    }
    
    return options
  }

  const clientTypes = ['new', 'regular', 'vip', 'walk-in']

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Name
              </label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Weekend advance booking limit"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Type
              </label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a rule type</option>
                {getRuleTypeOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.category}: {option.label}
                  </option>
                ))}
              </select>
              {ruleType && ruleTypes && (
                <p className="mt-1 text-sm text-gray-500">
                  {ruleTypes.global_rule_types?.[ruleType]?.description || 
                   ruleTypes.service_rule_types?.[ruleType]?.description}
                </p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
              />
              <p className="mt-1 text-sm text-gray-500">
                Higher values override lower priority rules
              </p>
            </div>
            
            <div className="flex items-center mt-8">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Rule is active
              </label>
            </div>
          </div>
        </div>

        {/* Rule Parameters */}
        {ruleType && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rule Parameters</h3>
            <div className="space-y-4">
              {ruleParams.map((param, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <input
                    type="text"
                    value={param.key}
                    onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Parameter name"
                  />
                  
                  <select
                    value={param.type}
                    onChange={(e) => handleParamChange(index, 'type', e.target.value)}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="string">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes/No</option>
                    <option value="array">List</option>
                    <option value="date">Date</option>
                  </select>
                  
                  {param.type === 'string' && (
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Value"
                    />
                  )}
                  
                  {param.type === 'number' && (
                    <input
                      type="number"
                      value={param.value}
                      onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  )}
                  
                  {param.type === 'boolean' && (
                    <select
                      value={param.value.toString()}
                      onChange={(e) => handleParamChange(index, 'value', e.target.value === 'true')}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  )}
                  
                  {param.type === 'array' && (
                    <input
                      type="text"
                      value={Array.isArray(param.value) ? param.value.join(', ') : ''}
                      onChange={(e) => handleArrayValueChange(index, e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Comma-separated values"
                    />
                  )}
                  
                  {param.type === 'date' && (
                    <input
                      type="date"
                      value={param.value}
                      onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveParam(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddParam}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add parameter
              </button>
            </div>
          </div>
        )}

        {/* Rule Application */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Rule Application</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Applies To
              </label>
              <select
                value={appliesTo}
                onChange={(e) => setAppliesTo(e.target.value)}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Bookings</option>
                <option value="service">Specific Services</option>
                <option value="barber">Specific Barbers</option>
                <option value="client_type">Client Types</option>
              </select>
            </div>
            
            {appliesTo === 'service' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Services
                </label>
                <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md p-4 max-h-48 overflow-y-auto">
                  {services.map(service => (
                    <label key={service.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServices([...selectedServices, service.id])
                          } else {
                            setSelectedServices(selectedServices.filter(id => id !== service.id))
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {appliesTo === 'barber' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Barbers
                </label>
                <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md p-4 max-h-48 overflow-y-auto">
                  {barbers.map(barber => (
                    <label key={barber.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedBarbers.includes(barber.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBarbers([...selectedBarbers, barber.id])
                          } else {
                            setSelectedBarbers(selectedBarbers.filter(id => id !== barber.id))
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {barber.first_name} {barber.last_name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {appliesTo === 'client_type' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Client Types
                </label>
                <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md p-4">
                  {clientTypes.map(type => (
                    <label key={type} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedClientTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClientTypes([...selectedClientTypes, type])
                          } else {
                            setSelectedClientTypes(selectedClientTypes.filter(t => t !== type))
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-6 border-t border-gray-200">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (rule ? 'Update Rule' : 'Create Rule')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}