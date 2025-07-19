'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, Calendar, Clock, CheckCircle, XCircle, ArrowRight, Info } from 'lucide-react'
import { calendarAPI } from '@/lib/api'

interface Conflict {
  id: string
  appointment_id: number
  appointment_details: {
    client_name: string
    service_name: string
    start_time: string
    end_time: string
    status: string
  }
  google_event: {
    id: string
    summary: string
    start: string
    end: string
  }
  conflict_type: 'overlap' | 'deleted_appointment' | 'modified_time' | 'duplicate'
  resolution_options: ResolutionOption[]
}

interface ResolutionOption {
  id: string
  action: string
  description: string
  recommended?: boolean
}

interface PriorityRule {
  id: string
  name: string
  description: string
  priority: number
  criteria: {
    source: 'local' | 'google' | 'both'
    appointment_status?: string[]
    service_types?: string[]
  }
  action: 'keep_local' | 'keep_google' | 'manual_review'
  enabled: boolean
}

export default function CalendarConflictResolver() {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [priorityRules, setPriorityRules] = useState<PriorityRule[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [showRules, setShowRules] = useState(false)
  const [selectedConflicts, setSelectedConflicts] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchConflicts()
    loadPriorityRules()
  }, [])

  const fetchConflicts = async () => {
    try {
      setLoading(true)
      // This would be an actual API call to fetch conflicts
      // For now, we'll simulate some conflicts
      const mockConflicts: Conflict[] = [
        {
          id: '1',
          appointment_id: 101,
          appointment_details: {
            client_name: 'John Doe',
            service_name: 'Haircut',
            start_time: '2024-01-15T10:00:00',
            end_time: '2024-01-15T11:00:00',
            status: 'confirmed'
          },
          google_event: {
            id: 'google-1',
            summary: 'Meeting with client',
            start: '2024-01-15T10:30:00',
            end: '2024-01-15T11:30:00'
          },
          conflict_type: 'overlap',
          resolution_options: [
            {
              id: 'reschedule-appointment',
              action: 'Reschedule appointment',
              description: 'Move the appointment to an available time slot',
              recommended: true
            },
            {
              id: 'cancel-google',
              action: 'Remove Google event',
              description: 'Delete the conflicting Google Calendar event'
            },
            {
              id: 'keep-both',
              action: 'Keep both',
              description: 'Mark as double-booked and handle manually'
            }
          ]
        }
      ]
      setConflicts(mockConflicts)
    } catch (error) {
      } finally {
      setLoading(false)
    }
  }

  const loadPriorityRules = () => {
    // Load saved priority rules from localStorage or API
    const savedRules = localStorage.getItem('calendarPriorityRules')
    if (savedRules) {
      setPriorityRules(JSON.parse(savedRules))
    } else {
      // Default rules
      setPriorityRules([
        {
          id: '1',
          name: 'Confirmed appointments priority',
          description: 'Confirmed appointments take priority over Google Calendar events',
          priority: 1,
          criteria: {
            source: 'local',
            appointment_status: ['confirmed']
          },
          action: 'keep_local',
          enabled: true
        },
        {
          id: '2',
          name: 'Google Calendar blocks',
          description: 'Respect busy times marked in Google Calendar',
          priority: 2,
          criteria: {
            source: 'google'
          },
          action: 'keep_google',
          enabled: true
        }
      ])
    }
  }

  const handleResolveConflict = async (conflictId: string, resolution: string) => {
    try {
      setResolving(conflictId)
      
      // Simulate API call to resolve conflict
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Remove resolved conflict from list
      setConflicts(conflicts.filter(c => c.id !== conflictId))
      setSelectedConflicts(prev => {
        const newSet = new Set(prev)
        newSet.delete(conflictId)
        return newSet
      })
    } catch (error) {
      } finally {
      setResolving(null)
    }
  }

  const handleBulkResolve = async (action: string) => {
    if (selectedConflicts.size === 0) return

    const confirmMessage = `Are you sure you want to ${action} ${selectedConflicts.size} conflicts?`
    if (!confirm(confirmMessage)) return

    try {
      setResolving('bulk')
      
      // Process each selected conflict
      for (const conflictId of Array.from(selectedConflicts)) {
        await handleResolveConflict(conflictId, action)
      }
      
      setSelectedConflicts(new Set())
    } finally {
      setResolving(null)
    }
  }

  const toggleRuleEnabled = (ruleId: string) => {
    const updatedRules = priorityRules.map(rule =>
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    )
    setPriorityRules(updatedRules)
    localStorage.setItem('calendarPriorityRules', JSON.stringify(updatedRules))
  }

  const getConflictIcon = (type: Conflict['conflict_type']) => {
    switch (type) {
      case 'overlap':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'deleted_appointment':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'modified_time':
        return <Clock className="h-5 w-5 text-orange-500" />
      case 'duplicate':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Calendar Conflicts</h2>
            <p className="text-sm text-gray-600 mt-1">
              Resolve conflicts between your appointments and Google Calendar
            </p>
          </div>
          
          <button
            onClick={() => setShowRules(!showRules)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {showRules ? 'Hide' : 'Show'} Priority Rules
          </button>
        </div>

        {conflicts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600">No conflicts detected!</p>
            <p className="text-sm text-gray-500 mt-1">
              Your appointments and Google Calendar are in sync.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} to resolve
            </p>
            
            {selectedConflicts.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedConflicts.size} selected
                </span>
                <button
                  onClick={() => handleBulkResolve('keep_local')}
                  disabled={resolving === 'bulk'}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  Keep Appointments
                </button>
                <button
                  onClick={() => handleBulkResolve('keep_google')}
                  disabled={resolving === 'bulk'}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  Keep Google Events
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Priority Rules */}
      {showRules && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Priority Rules</h3>
          
          <div className="space-y-3">
            {priorityRules.map(rule => (
              <div
                key={rule.id}
                className={`p-4 rounded-lg border ${
                  rule.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{rule.name}</h4>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Priority {rule.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{rule.description}</p>
                  </div>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => toggleRuleEnabled(rule.id)}
                      className="text-primary-600 focus:ring-primary-500 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">Enabled</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          
          <button className="mt-4 text-sm text-primary-600 hover:text-primary-700">
            + Add Custom Rule
          </button>
        </div>
      )}

      {/* Conflicts List */}
      {conflicts.length > 0 && (
        <div className="space-y-4">
          {conflicts.map(conflict => (
            <div
              key={conflict.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedConflicts.has(conflict.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedConflicts)
                        if (e.target.checked) {
                          newSet.add(conflict.id)
                        } else {
                          newSet.delete(conflict.id)
                        }
                        setSelectedConflicts(newSet)
                      }}
                      className="text-primary-600 focus:ring-primary-500 rounded"
                    />
                  </label>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      {getConflictIcon(conflict.conflict_type)}
                      <span className="font-medium text-gray-900">
                        {conflict.conflict_type.replace('_', ' ').charAt(0).toUpperCase() + 
                         conflict.conflict_type.replace('_', ' ').slice(1)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Appointment Details */}
                      <div className="bg-primary-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-primary-600" />
                          <span className="font-medium text-primary-900">Appointment</span>
                        </div>
                        <p className="text-sm text-primary-800">
                          {conflict.appointment_details.client_name} - {conflict.appointment_details.service_name}
                        </p>
                        <p className="text-sm text-primary-700 mt-1">
                          {format(new Date(conflict.appointment_details.start_time), 'MMM d, h:mm a')} - 
                          {format(new Date(conflict.appointment_details.end_time), 'h:mm a')}
                        </p>
                        <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                          conflict.appointment_details.status === 'confirmed' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {conflict.appointment_details.status}
                        </span>
                      </div>
                      
                      {/* Google Event Details */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-gray-600" />
                          <span className="font-medium text-gray-900">Google Calendar</span>
                        </div>
                        <p className="text-sm text-gray-800">
                          {conflict.google_event.summary}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {format(new Date(conflict.google_event.start), 'MMM d, h:mm a')} - 
                          {format(new Date(conflict.google_event.end), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Resolution Options */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {conflict.resolution_options.map(option => (
                        <button
                          key={option.id}
                          onClick={() => handleResolveConflict(conflict.id, option.id)}
                          disabled={resolving === conflict.id}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            option.recommended
                              ? 'bg-primary-600 text-white hover:bg-primary-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {resolving === conflict.id ? 'Processing...' : option.action}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}