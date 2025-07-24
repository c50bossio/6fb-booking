'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getProfile,
  getBookingRules,
  getRuleTypes,
  deleteBookingRule,
  updateBookingRule,
  type BookingRule
} from '../../../lib/api'
import BusinessHours from '../../../components/BusinessHours'
import BookingRulesList from '../../../components/BookingRulesList'
import BookingRuleEditor from '../../../components/BookingRuleEditor'
// import VisualBookingRulesBuilder from '../../../components/admin/VisualBookingRulesBuilder'

type TabType = 'business-hours' | 'booking-rules' | 'rule-editor' | 'visual-builder'

export default function AdminBookingRulesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Data state
  const [bookingRules, setBookingRules] = useState<BookingRule[]>([])
  const [ruleTypes, setRuleTypes] = useState<any>(null)
  
  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('business-hours')
  const [editingRule, setEditingRule] = useState<BookingRule | null>(null)
  const [showRuleEditor, setShowRuleEditor] = useState(false)
  const [showVisualBuilder, setShowVisualBuilder] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check if user is authenticated and is admin
      const userProfile = await getProfile()
      if (!userProfile?.role || !['admin', 'super_admin'].includes(userProfile.role)) {
        router.push('/dashboard')
        return
      }
      setUser(userProfile)

      // Load booking rules and rule types
      const [rulesData, typesData] = await Promise.all([
        getBookingRules(),
        getRuleTypes()
      ])
      
      setBookingRules(rulesData)
      setRuleTypes(typesData)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return
    
    try {
      setError('')
      await deleteBookingRule(ruleId)
      setSuccess('Rule deleted successfully')
      loadData() // Reload rules
    } catch (err: any) {
      setError(err.message || 'Failed to delete rule')
    }
  }

  const handleToggleRuleStatus = async (rule: BookingRule) => {
    try {
      setError('')
      await updateBookingRule(rule.id, { is_active: !rule.is_active })
      setSuccess(`Rule ${rule.is_active ? 'disabled' : 'enabled'} successfully`)
      loadData() // Reload rules
    } catch (err: any) {
      setError(err.message || 'Failed to update rule status')
    }
  }

  const handleEditRule = (rule: BookingRule) => {
    setEditingRule(rule)
    setShowRuleEditor(true)
    setActiveTab('rule-editor')
  }

  const handleCreateRule = () => {
    setEditingRule(null)
    setShowRuleEditor(true)
    setActiveTab('rule-editor')
  }

  const handleOpenVisualBuilder = () => {
    setShowVisualBuilder(true)
    setActiveTab('visual-builder')
  }

  const handleSaveVisualRules = (visualRules: any[]) => {
    // Convert visual rules to API format and save
    setSuccess('Visual rules saved successfully')
    setShowVisualBuilder(false)
    setActiveTab('booking-rules')
    loadData()
  }

  const handleCancelVisualBuilder = () => {
    setShowVisualBuilder(false)
    setActiveTab('booking-rules')
  }

  const handleRuleSaved = () => {
    setSuccess('Rule saved successfully')
    setShowRuleEditor(false)
    setEditingRule(null)
    setActiveTab('booking-rules')
    loadData()
  }

  const handleReorderRules = async (rules: BookingRule[]) => {
    try {
      setError('')
      // Update priority for each rule based on new order
      const updates = rules.map((rule, index) => 
        updateBookingRule(rule.id, { priority: rules.length - index })
      )
      await Promise.all(updates)
      setSuccess('Rule priorities updated successfully')
      loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to update rule priorities')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-gray-600">Loading booking rules...</p>
        </div>
      </div>
    )
  }

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">Admin or Super Admin role required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booking Rules Management</h1>
                <p className="text-gray-600 mt-1">Configure business hours, booking policies, and restrictions</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleOpenVisualBuilder}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Visual Builder
                </button>
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Admin
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <nav className="flex space-x-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('business-hours')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'business-hours'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Business Hours
              </button>
              <button
                onClick={() => setActiveTab('booking-rules')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'booking-rules'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Booking Rules ({bookingRules.length})
              </button>
              <button
                onClick={() => setActiveTab('visual-builder')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'visual-builder'
                    ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Visual Builder
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  New
                </span>
              </button>
              {(showRuleEditor || activeTab === 'rule-editor') && (
                <button
                  onClick={() => setActiveTab('rule-editor')}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'rule-editor'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {editingRule ? 'Edit Rule' : 'New Rule'}
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700 mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white shadow-sm rounded-lg">
          {activeTab === 'business-hours' && (
            <BusinessHours
              onError={setError}
              onSuccess={setSuccess}
            />
          )}
          
          {activeTab === 'booking-rules' && (
            <BookingRulesList
              rules={bookingRules}
              ruleTypes={ruleTypes}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              onToggleStatus={handleToggleRuleStatus}
              onReorder={handleReorderRules}
              onCreateNew={handleCreateRule}
            />
          )}
          
          {activeTab === 'visual-builder' && (
            <div className="p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Visual Builder Temporarily Unavailable</h3>
              <p className="text-gray-600">The visual builder is currently being updated. Please use the booking rules tab instead.</p>
            </div>
          )}
          
          {activeTab === 'rule-editor' && showRuleEditor && (
            <BookingRuleEditor
              rule={editingRule}
              ruleTypes={ruleTypes}
              onSave={handleRuleSaved}
              onCancel={() => {
                setShowRuleEditor(false)
                setEditingRule(null)
                setActiveTab('booking-rules')
              }}
              onError={setError}
            />
          )}
        </div>
      </div>
    </div>
  )
}