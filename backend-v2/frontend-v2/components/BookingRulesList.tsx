'use client'

import { useState, useEffect } from 'react'
// import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import type { BookingRule } from '../lib/api'

interface BookingRulesListProps {
  rules: BookingRule[]
  ruleTypes: any
  onEdit: (rule: BookingRule) => void
  onDelete: (ruleId: number) => void
  onToggleStatus: (rule: BookingRule) => void
  onReorder: (rules: BookingRule[]) => void
  onCreateNew: () => void
}

export default function BookingRulesList({
  rules,
  ruleTypes,
  onEdit,
  onDelete,
  onToggleStatus,
  onReorder,
  onCreateNew
}: BookingRulesListProps) {
  const [orderedRules, setOrderedRules] = useState<BookingRule[]>([])
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Sort rules by priority (higher priority first)
    const sorted = [...rules].sort((a, b) => b.priority - a.priority)
    setOrderedRules(sorted)
  }, [rules])

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const items = [...orderedRules]
    const temp = items[index - 1]
    items[index - 1] = items[index]
    items[index] = temp
    setOrderedRules(items)
    onReorder(items)
  }

  const handleMoveDown = (index: number) => {
    if (index === orderedRules.length - 1) return
    const items = [...orderedRules]
    const temp = items[index + 1]
    items[index + 1] = items[index]
    items[index] = temp
    setOrderedRules(items)
    onReorder(items)
  }

  const getRuleTypeInfo = (ruleType: string) => {
    const globalTypes = ruleTypes?.global_rule_types || {}
    const serviceTypes = ruleTypes?.service_rule_types || {}
    return globalTypes[ruleType] || serviceTypes[ruleType] || { description: ruleType }
  }

  const getRuleIcon = (ruleType: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      max_advance_booking: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      min_advance_booking: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      blackout_dates: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      max_duration: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      default: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    }
    return iconMap[ruleType] || iconMap.default
  }

  const formatRuleParams = (params: Record<string, any>) => {
    return Object.entries(params).map(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      let formattedValue: string
      
      // Safe rendering for all data types
      if (value === null || value === undefined) {
        formattedValue = 'N/A'
      } else if (Array.isArray(value)) {
        formattedValue = value.join(', ')
      } else if (typeof value === 'boolean') {
        formattedValue = value ? 'Yes' : 'No'
      } else if (typeof value === 'object') {
        // Safely handle nested objects by converting to JSON string
        try {
          formattedValue = JSON.stringify(value)
        } catch {
          formattedValue = '[Complex Object]'
        }
      } else {
        formattedValue = String(value)
      }

      return `${formattedKey}: ${formattedValue}`
    }).join(' • ')
  }

  // Filter rules
  const filteredRules = orderedRules.filter(rule => {
    if (filterType !== 'all' && rule.rule_type !== filterType) return false
    if (filterStatus === 'active' && !rule.is_active) return false
    if (filterStatus === 'inactive' && rule.is_active) return false
    if (searchTerm && !rule.rule_name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Get unique rule types for filter
  const uniqueRuleTypes = Array.from(new Set(rules.map(r => r.rule_type)))

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Active Booking Rules</h3>
          <p className="mt-1 text-sm text-gray-500">
            Use the arrow buttons to reorder rules by priority. Higher priority rules override lower ones.
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Rule
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          {uniqueRuleTypes.map(type => (
            <option key={type} value={type}>
              {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No rules found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Get started by creating a new booking rule'}
          </p>
          {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
            <div className="mt-6">
              <button
                onClick={onCreateNew}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Rule
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRules.map((rule, index) => (
            <div
              key={rule.id}
              className={`bg-white border rounded-lg p-4 shadow-sm ${!rule.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start flex-1">
                  <div className="mr-3 mt-1 flex flex-col space-y-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === filteredRules.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className={`mr-3 ${rule.is_active ? 'text-blue-600' : 'text-gray-400'}`}>
                        {getRuleIcon(rule.rule_type)}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {rule.rule_name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {getRuleTypeInfo(rule.rule_type).description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Priority: {rule.priority}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Applies to: {rule.applies_to}
                      </span>
                      {rule.rule_params && Object.keys(rule.rule_params).length > 0 && (
                        <span className="text-gray-500">
                          {formatRuleParams(rule.rule_params)}
                        </span>
                      )}
                    </div>
                    
                    {(rule.service_ids && rule.service_ids.length > 0) && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">Services: {rule.service_ids.length} selected</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onToggleStatus(rule)}
                    className={`px-3 py-1 text-xs rounded-full ${
                      rule.is_active
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </button>
                  
                  <button
                    onClick={() => onEdit(rule)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit rule"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => onDelete(rule.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete rule"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule Conflict Warning */}
      {filteredRules.length > 1 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm text-yellow-700">
              <p className="font-medium">Rule Priority Information</p>
              <p className="mt-1">
                Rules are evaluated in priority order. When multiple rules apply to the same booking scenario, 
                the rule with the highest priority takes precedence. Use the arrow buttons to reorder rules.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}