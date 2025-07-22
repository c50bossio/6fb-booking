'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { format, addDays } from 'date-fns'
import { 
  CheckIcon, 
  XMarkIcon, 
  ClockIcon, 
  CalendarIcon, 
  TrashIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { useCalendarSecurity } from '@/hooks/useCalendarSecurity'
import { useCalendarUndoRedo } from '@/hooks/useCalendarUndoRedo'
import { useCalendarInteraction } from '@/hooks/useCalendarInteraction'
import type { BookingResponse } from '@/lib/api'

interface BulkOperationsPanelProps {
  selectedAppointments: BookingResponse[]
  onSelectionChange: (appointments: BookingResponse[]) => void
  onBulkReschedule: (appointments: BookingResponse[], newDate: string) => Promise<void>
  onBulkCancel: (appointments: BookingResponse[], reason?: string) => Promise<void>
  onBulkStatusUpdate: (appointments: BookingResponse[], newStatus: string) => Promise<void>
  onClose: () => void
  isVisible: boolean
}

export function BulkOperationsPanel({
  selectedAppointments,
  onSelectionChange,
  onBulkReschedule,
  onBulkCancel,
  onBulkStatusUpdate,
  onClose,
  isVisible
}: BulkOperationsPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [operationType, setOperationType] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)

  const { secureFormSubmission, auditSecurityEvent } = useCalendarSecurity({
    userIdentifier: 'bulk_operations'
  })

  const { announceToScreenReader } = useCalendarInteraction({
    announceChanges: true
  })

  // Bulk operation statistics
  const operationStats = useMemo(() => {
    const stats = {
      totalAppointments: selectedAppointments.length,
      totalRevenue: 0,
      statusBreakdown: {} as Record<string, number>,
      dateRange: { earliest: null as Date | null, latest: null as Date | null },
      uniqueClients: new Set<string>(),
      uniqueServices: new Set<string>()
    }

    selectedAppointments.forEach(apt => {
      // Revenue calculation
      if (apt.price) stats.totalRevenue += apt.price

      // Status breakdown
      stats.statusBreakdown[apt.status] = (stats.statusBreakdown[apt.status] || 0) + 1

      // Date range
      const aptDate = new Date(apt.start_time)
      if (!stats.dateRange.earliest || aptDate < stats.dateRange.earliest) {
        stats.dateRange.earliest = aptDate
      }
      if (!stats.dateRange.latest || aptDate > stats.dateRange.latest) {
        stats.dateRange.latest = aptDate
      }

      // Unique clients and services
      if (apt.client_name) stats.uniqueClients.add(apt.client_name)
      if (apt.service_name) stats.uniqueServices.add(apt.service_name)
    })

    return stats
  }, [selectedAppointments])

  // Handle bulk reschedule
  const handleBulkReschedule = useCallback(async () => {
    if (!rescheduleDate || selectedAppointments.length === 0) return

    setIsProcessing(true)
    setOperationType('reschedule')

    const result = await secureFormSubmission(
      { 
        appointmentIds: selectedAppointments.map(apt => apt.id),
        newDate: rescheduleDate,
        operationType: 'bulk_reschedule'
      },
      async (data) => {
        auditSecurityEvent('Bulk Reschedule Started', { 
          appointmentCount: selectedAppointments.length,
          newDate: data.newDate
        })
        
        await onBulkReschedule(selectedAppointments, data.newDate)
        
        return { success: true }
      },
      'bulk_reschedule'
    )

    setIsProcessing(false)
    setOperationType(null)

    if (result.success) {
      announceToScreenReader(`Successfully rescheduled ${selectedAppointments.length} appointments`)
      onSelectionChange([])
      onClose()
    } else {
      announceToScreenReader(`Failed to reschedule appointments: ${result.error}`)
    }
  }, [rescheduleDate, selectedAppointments, secureFormSubmission, auditSecurityEvent, onBulkReschedule, announceToScreenReader, onSelectionChange, onClose])

  // Handle bulk cancellation
  const handleBulkCancel = useCallback(async () => {
    if (selectedAppointments.length === 0) return

    setIsProcessing(true)
    setOperationType('cancel')

    const result = await secureFormSubmission(
      {
        appointmentIds: selectedAppointments.map(apt => apt.id),
        reason: cancellationReason,
        operationType: 'bulk_cancel'
      },
      async (data) => {
        auditSecurityEvent('Bulk Cancel Started', {
          appointmentCount: selectedAppointments.length,
          reason: data.reason
        })

        await onBulkCancel(selectedAppointments, data.reason)
        
        return { success: true }
      },
      'bulk_cancel'
    )

    setIsProcessing(false)
    setOperationType(null)
    setShowConfirmation(false)

    if (result.success) {
      announceToScreenReader(`Successfully cancelled ${selectedAppointments.length} appointments`)
      onSelectionChange([])
      onClose()
    } else {
      announceToScreenReader(`Failed to cancel appointments: ${result.error}`)
    }
  }, [selectedAppointments, cancellationReason, secureFormSubmission, auditSecurityEvent, onBulkCancel, announceToScreenReader, onSelectionChange, onClose])

  // Handle status update
  const handleStatusUpdate = useCallback(async (newStatus: string) => {
    if (selectedAppointments.length === 0) return

    setIsProcessing(true)
    setOperationType('status_update')

    const result = await secureFormSubmission(
      {
        appointmentIds: selectedAppointments.map(apt => apt.id),
        newStatus,
        operationType: 'bulk_status_update'
      },
      async (data) => {
        auditSecurityEvent('Bulk Status Update Started', {
          appointmentCount: selectedAppointments.length,
          newStatus: data.newStatus
        })

        await onBulkStatusUpdate(selectedAppointments, data.newStatus)
        
        return { success: true }
      },
      'bulk_status_update'
    )

    setIsProcessing(false)
    setOperationType(null)

    if (result.success) {
      announceToScreenReader(`Successfully updated ${selectedAppointments.length} appointments to ${newStatus}`)
      onSelectionChange([])
      onClose()
    } else {
      announceToScreenReader(`Failed to update appointments: ${result.error}`)
    }
  }, [selectedAppointments, secureFormSubmission, auditSecurityEvent, onBulkStatusUpdate, announceToScreenReader, onSelectionChange, onClose])

  if (!isVisible || selectedAppointments.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <h2 className="text-xl font-semibold">
              Bulk Operations
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedAppointments.length} appointment{selectedAppointments.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full w-8 h-8 p-0"
          >
            <XMarkIcon className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Operation Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {operationStats.totalAppointments}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Appointments
              </div>
            </div>
            
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${operationStats.totalRevenue.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Value
              </div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {operationStats.uniqueClients.size}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Unique Clients
              </div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {operationStats.uniqueServices.size}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Services
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          {Object.keys(operationStats.statusBreakdown).length > 1 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium mb-2">Status Breakdown</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(operationStats.statusBreakdown).map(([status, count]) => (
                  <span
                    key={status}
                    className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-sm"
                  >
                    {status}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bulk Operations */}
          <div className="space-y-4">
            <h3 className="font-medium">Choose Action</h3>

            {/* Bulk Reschedule */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium">Reschedule All</h4>
              </div>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                />
                <Button
                  onClick={handleBulkReschedule}
                  disabled={!rescheduleDate || isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing && operationType === 'reschedule' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRightIcon className="w-4 h-4" />
                  )}
                  Reschedule
                </Button>
              </div>
            </div>

            {/* Quick Status Updates */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <BoltIcon className="w-5 h-5 text-green-600" />
                <h4 className="font-medium">Update Status</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleStatusUpdate('confirmed')}
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Confirm All
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Complete All
                </Button>
              </div>
            </div>

            {/* Bulk Cancel */}
            <div className="p-4 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <h4 className="font-medium text-red-700">Cancel All</h4>
              </div>
              
              {!showConfirmation ? (
                <Button
                  onClick={() => setShowConfirmation(true)}
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Cancel Appointments
                </Button>
              ) : (
                <div className="space-y-3">
                  <textarea
                    placeholder="Reason for cancellation (optional)"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowConfirmation(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkCancel}
                      disabled={isProcessing}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isProcessing && operationType === 'cancel' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                      Confirm Cancellation
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Appointments Preview */}
          <div className="max-h-48 overflow-y-auto">
            <h3 className="font-medium mb-2">Selected Appointments</h3>
            <div className="space-y-2">
              {selectedAppointments.slice(0, 5).map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {apt.service_name} - {apt.client_name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {format(new Date(apt.start_time), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    ${apt.price || 0}
                  </div>
                </div>
              ))}
              {selectedAppointments.length > 5 && (
                <div className="text-center text-sm text-gray-600 dark:text-gray-400 p-2">
                  ... and {selectedAppointments.length - 5} more
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}