'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import '../styles/six-figure-barber-theme.css'
import { 
  AlertTriangle, 
  Clock, 
  Calendar,
  User,
  CheckCircle,
  X,
  RefreshCw,
  ArrowRight,
  Zap,
  Shield,
  AlertCircle,
  Users,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react'

interface ConflictType {
  id: string
  type: 'double_booking' | 'overlap' | 'unavailable_barber' | 'service_mismatch' | 'time_past'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

interface BookingConflict {
  id: string
  conflictType: ConflictType
  primaryBooking: {
    id: number
    clientName: string
    serviceName: string
    barberName: string
    originalTime: string
    duration: number
    price: number
  }
  conflictingBooking?: {
    id: number
    clientName: string
    serviceName: string
    barberName: string
    time: string
    duration: number
  }
  detectedAt: Date
  suggestedResolutions: ResolutionOption[]
  status: 'detected' | 'resolving' | 'resolved' | 'escalated'
}

interface ResolutionOption {
  id: string
  type: 'reschedule' | 'reassign_barber' | 'split_service' | 'upgrade_service' | 'cancel_conflicting'
  title: string
  description: string
  impact: string
  estimatedTime: number
  clientSatisfactionImpact: 'positive' | 'neutral' | 'negative'
  revenueImpact: number
  autoApplicable: boolean
  requiresClientContact: boolean
}

interface BookingConflictResolutionProps {
  conflicts?: BookingConflict[]
  onConflictResolved?: (conflictId: string, resolution: ResolutionOption) => void
  onEscalateConflict?: (conflictId: string) => void
  showPreventiveMode?: boolean
}

const conflictTypes: ConflictType[] = [
  {
    id: 'double_booking',
    type: 'double_booking',
    severity: 'critical',
    title: 'Double Booking Detected',
    description: 'Two appointments scheduled at the same time',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'text-red-600 bg-red-50'
  },
  {
    id: 'overlap',
    type: 'overlap',
    severity: 'high',
    title: 'Appointment Overlap',
    description: 'New booking overlaps with existing appointment',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-orange-600 bg-orange-50'
  },
  {
    id: 'unavailable_barber',
    type: 'unavailable_barber',
    severity: 'medium',
    title: 'Barber Unavailable',
    description: 'Barber is not available at requested time',
    icon: <User className="w-5 h-5" />,
    color: 'text-yellow-600 bg-yellow-50'
  },
  {
    id: 'service_mismatch',
    type: 'service_mismatch',
    severity: 'low',
    title: 'Service Duration Mismatch',
    description: 'Service requires more time than allocated',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-blue-600 bg-blue-50'
  }
]

// Mock conflict data for demonstration
const mockConflicts: BookingConflict[] = [
  {
    id: 'conflict_1',
    conflictType: conflictTypes[0], // double_booking
    primaryBooking: {
      id: 101,
      clientName: 'John Smith',
      serviceName: 'Premium Haircut',
      barberName: 'Marcus Johnson',
      originalTime: '2:00 PM',
      duration: 45,
      price: 65
    },
    conflictingBooking: {
      id: 102,
      clientName: 'Mike Wilson',
      serviceName: 'Beard Trim',
      barberName: 'Marcus Johnson',
      time: '2:00 PM',
      duration: 30
    },
    detectedAt: new Date(),
    status: 'detected',
    suggestedResolutions: [
      {
        id: 'res_1',
        type: 'reschedule',
        title: 'Reschedule Conflicting Appointment',
        description: 'Move Mike Wilson to 2:45 PM slot',
        impact: 'Minimal disruption, maintains both bookings',
        estimatedTime: 5,
        clientSatisfactionImpact: 'neutral',
        revenueImpact: 0,
        autoApplicable: false,
        requiresClientContact: true
      },
      {
        id: 'res_2',
        type: 'reassign_barber',
        title: 'Reassign to Available Barber',
        description: 'Move Mike Wilson to Diego Rivera at 2:00 PM',
        impact: 'Different barber, same time slot',
        estimatedTime: 3,
        clientSatisfactionImpact: 'neutral',
        revenueImpact: 0,
        autoApplicable: true,
        requiresClientContact: true
      }
    ]
  },
  {
    id: 'conflict_2',
    conflictType: conflictTypes[1], // overlap
    primaryBooking: {
      id: 103,
      clientName: 'Sarah Davis',
      serviceName: 'Full Grooming Experience',
      barberName: 'Diego Rivera',
      originalTime: '3:00 PM',
      duration: 75,
      price: 85
    },
    detectedAt: new Date(Date.now() - 300000), // 5 minutes ago
    status: 'resolving',
    suggestedResolutions: [
      {
        id: 'res_3',
        type: 'split_service',
        title: 'Split Into Multiple Sessions',
        description: 'Break service into 45min + 30min sessions',
        impact: 'Spread service across two appointments',
        estimatedTime: 10,
        clientSatisfactionImpact: 'negative',
        revenueImpact: 5,
        autoApplicable: false,
        requiresClientContact: true
      },
      {
        id: 'res_4',
        type: 'upgrade_service',
        title: 'Upgrade to Premium Slot',
        description: 'Move to next available 90-minute slot with discount',
        impact: 'Better time allocation, client satisfaction boost',
        estimatedTime: 7,
        clientSatisfactionImpact: 'positive',
        revenueImpact: 15,
        autoApplicable: false,
        requiresClientContact: true
      }
    ]
  }
]

export function BookingConflictResolution({ 
  conflicts = mockConflicts,
  onConflictResolved,
  onEscalateConflict,
  showPreventiveMode = true 
}: BookingConflictResolutionProps) {
  const [activeConflicts, setActiveConflicts] = useState<BookingConflict[]>(conflicts)
  const [selectedConflict, setSelectedConflict] = useState<BookingConflict | null>(null)
  const [resolutionInProgress, setResolutionInProgress] = useState<string | null>(null)
  const [preventiveChecks, setPreventiveChecks] = useState(true)

  useEffect(() => {
    // Simulate real-time conflict detection
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance every 30 seconds
        // In production, this would check for actual conflicts
        console.log('Checking for new conflicts...')
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleResolveConflict = async (conflict: BookingConflict, resolution: ResolutionOption) => {
    setResolutionInProgress(resolution.id)
    
    // Simulate resolution process
    await new Promise(resolve => setTimeout(resolve, resolution.estimatedTime * 1000))
    
    // Update conflict status
    setActiveConflicts(prev => 
      prev.map(c => 
        c.id === conflict.id 
          ? { ...c, status: 'resolved' }
          : c
      )
    )
    
    setResolutionInProgress(null)
    onConflictResolved?.(conflict.id, resolution)
  }

  const handleEscalate = (conflictId: string) => {
    setActiveConflicts(prev => 
      prev.map(c => 
        c.id === conflictId 
          ? { ...c, status: 'escalated' }
          : c
      )
    )
    onEscalateConflict?.(conflictId)
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge className="bg-red-100 text-red-800">Critical</Badge>
      case 'high': return <Badge className="bg-orange-100 text-orange-800">High</Badge>
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case 'low': return <Badge className="bg-blue-100 text-blue-800">Low</Badge>
      default: return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'detected': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'resolving': return <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'escalated': return <AlertTriangle className="w-4 h-4 text-purple-500" />
      default: return null
    }
  }

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      case 'sms': return <MessageSquare className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const pendingConflicts = activeConflicts.filter(c => c.status === 'detected' || c.status === 'resolving')
  const resolvedConflicts = activeConflicts.filter(c => c.status === 'resolved')

  return (
    <div className="space-y-6">
      {/* Conflict Detection Status */}
      <Card className="sfb-card-premium">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" style={{ color: 'var(--sfb-teal)' }} />
              <div>
                <h3 className="sfb-heading-secondary font-medium">Conflict Detection System</h3>
                <p className="text-sm sfb-text-premium">
                  {preventiveChecks ? 'Active monitoring for booking conflicts' : 'Reactive mode - manual checking only'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreventiveChecks(!preventiveChecks)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  preventiveChecks 
                    ? 'sfb-button-premium' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preventiveChecks ? 'Auto' : 'Manual'}
              </button>
              <div className={`w-3 h-3 rounded-full ${
                preventiveChecks ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Conflicts */}
      {pendingConflicts.length > 0 && (
        <Card className="sfb-card-premium border-red-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="sfb-heading-secondary font-semibold">Active Conflicts ({pendingConflicts.length})</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className={`p-4 rounded-lg border transition-all ${conflict.conflictType.color} ${
                  selectedConflict?.id === conflict.id ? 'ring-2 ring-teal-300' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {conflict.conflictType.icon}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium sfb-heading-secondary">{conflict.conflictType.title}</h4>
                        {getSeverityBadge(conflict.conflictType.severity)}
                        {getStatusIcon(conflict.status)}
                      </div>
                      <p className="text-sm sfb-text-premium">{conflict.conflictType.description}</p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {conflict.detectedAt.toLocaleTimeString()}
                  </div>
                </div>

                {/* Conflict Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <h5 className="font-medium text-sm">Primary Booking</h5>
                    <div className="text-sm space-y-1">
                      <div>👤 {conflict.primaryBooking.clientName}</div>
                      <div>✂️ {conflict.primaryBooking.serviceName}</div>
                      <div>🧑‍💼 {conflict.primaryBooking.barberName}</div>
                      <div>🕐 {conflict.primaryBooking.originalTime} ({conflict.primaryBooking.duration}min)</div>
                      <div>💰 ${conflict.primaryBooking.price}</div>
                    </div>
                  </div>
                  
                  {conflict.conflictingBooking && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Conflicting Booking</h5>
                      <div className="text-sm space-y-1">
                        <div>👤 {conflict.conflictingBooking.clientName}</div>
                        <div>✂️ {conflict.conflictingBooking.serviceName}</div>
                        <div>🧑‍💼 {conflict.conflictingBooking.barberName}</div>
                        <div>🕐 {conflict.conflictingBooking.time} ({conflict.conflictingBooking.duration}min)</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resolution Options */}
                <div className="space-y-3">
                  <h5 className="font-medium text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Suggested Resolutions
                  </h5>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {conflict.suggestedResolutions.map((resolution) => (
                      <div
                        key={resolution.id}
                        className="p-3 rounded-lg border border-gray-200 bg-white hover:border-teal-300 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h6 className="font-medium text-sm">{resolution.title}</h6>
                          <div className="flex items-center gap-1">
                            {resolution.requiresClientContact && getContactIcon('phone')}
                            {resolution.autoApplicable && <Zap className="w-3 h-3 text-green-500" />}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2">{resolution.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">~{resolution.estimatedTime}min</span>
                            {resolution.revenueImpact !== 0 && (
                              <span className={`font-medium ${
                                resolution.revenueImpact > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {resolution.revenueImpact > 0 ? '+' : ''}${resolution.revenueImpact}
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleResolveConflict(conflict, resolution)}
                            disabled={resolutionInProgress === resolution.id}
                            className="px-3 py-1 rounded text-xs font-medium sfb-button-premium disabled:opacity-50"
                          >
                            {resolutionInProgress === resolution.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Escalation Option */}
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleEscalate(conflict.id)}
                      className="text-sm text-gray-600 hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Escalate to Manager
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recently Resolved Conflicts */}
      {resolvedConflicts.length > 0 && (
        <Card className="sfb-card-premium border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="sfb-heading-secondary font-semibold">Recently Resolved ({resolvedConflicts.length})</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {resolvedConflicts.slice(0, 3).map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <div>
                    <span className="font-medium text-sm">{conflict.conflictType.title}</span>
                    <span className="text-xs text-gray-600 ml-2">
                      {conflict.primaryBooking.clientName} • {conflict.primaryBooking.barberName}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-green-600 font-medium">
                  Resolved ✓
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Conflicts State */}
      {pendingConflicts.length === 0 && (
        <Card className="sfb-card-premium border-green-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="sfb-heading-secondary font-medium mb-2">No Active Conflicts</h3>
            <p className="text-sm sfb-text-premium">
              All bookings are properly scheduled with no conflicts detected.
            </p>
            {preventiveChecks && (
              <p className="text-xs text-green-600 mt-2">
                ✓ Continuous monitoring active
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}