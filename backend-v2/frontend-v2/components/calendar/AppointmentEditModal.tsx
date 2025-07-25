'use client'

import React, { useState, useEffect } from 'react'
import { format, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  ScissorsIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { PremiumColors } from '@/lib/premium-design-system'

// Service durations in minutes
const SERVICE_DURATIONS: Record<string, number> = {
  'Haircut': 30,
  'Beard Trim': 20,
  'Haircut & Beard': 45,
  'Hair Color': 60,
  'Hair Treatment': 45,
  'Kids Cut': 20,
  'Senior Cut': 25,
  'Buzz Cut': 15,
  'Design/Pattern': 45,
  'Shampoo & Style': 30
}

// Service prices
const SERVICE_PRICES: Record<string, number> = {
  'Haircut': 35,
  'Beard Trim': 20,
  'Haircut & Beard': 50,
  'Hair Color': 60,
  'Hair Treatment': 40,
  'Kids Cut': 25,
  'Senior Cut': 30,
  'Buzz Cut': 20,
  'Design/Pattern': 45,
  'Shampoo & Style': 35
}

// Time slots for rescheduling
const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8
  const minute = i % 2 === 0 ? 0 : 30
  return { hour, minute, label: format(new Date().setHours(hour, minute, 0, 0), 'h:mm a') }
})

interface Appointment {
  id: number
  client_name: string
  client_email?: string
  client_phone?: string
  service_name: string
  start_time: string
  end_time?: string
  duration_minutes: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  client_tier?: 'new' | 'regular' | 'vip' | 'platinum'
  barber_id: number
  barber_name?: string
  notes?: string
  is_recurring?: boolean
  paid?: boolean
  payment_method?: string
  created_at?: string
}

interface AppointmentEditModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment
  barbers?: Array<{ id: number; name?: string; first_name?: string; last_name?: string }>
  existingAppointments?: Appointment[]
  onUpdate: (appointmentId: number, updates: Partial<Appointment>) => void
  onDelete: (appointmentId: number) => void
  onReschedule: (appointmentId: number, newDateTime: Date) => void
}

export default function AppointmentEditModal({
  isOpen,
  onClose,
  appointment,
  barbers = [],
  existingAppointments = [],
  onUpdate,
  onDelete,
  onReschedule
}: AppointmentEditModalProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'reschedule' | 'history'>('edit')
  const [editData, setEditData] = useState({
    service_name: appointment.service_name,
    notes: appointment.notes || '',
    status: appointment.status,
    paid: appointment.paid || false,
    payment_method: appointment.payment_method || 'cash'
  })
  
  // Reschedule state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(appointment.start_time))
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ hour: number; minute: number } | null>(null)
  const [rescheduleConflicts, setRescheduleConflicts] = useState<string[]>([])
  
  // Cancellation state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false)

  // Calculate appointment details
  const startTime = new Date(appointment.start_time)
  const duration = SERVICE_DURATIONS[editData.service_name] || appointment.duration_minutes
  const endTime = addMinutes(startTime, duration)
  const price = SERVICE_PRICES[editData.service_name] || appointment.price

  // Check for reschedule conflicts
  useEffect(() => {
    if (selectedDate && selectedTimeSlot) {
      const newStartTime = new Date(selectedDate)
      newStartTime.setHours(selectedTimeSlot.hour, selectedTimeSlot.minute, 0, 0)
      const newEndTime = addMinutes(newStartTime, duration)
      
      const conflicts: string[] = []
      
      // Check business hours
      if (selectedTimeSlot.hour < 8 || selectedTimeSlot.hour >= 19) {
        conflicts.push('Outside business hours')
      }
      
      // Check for overlapping appointments
      existingAppointments
        .filter(apt => apt.id !== appointment.id && apt.barber_id === appointment.barber_id)
        .forEach(apt => {
          const aptStart = new Date(apt.start_time)
          const aptEnd = addMinutes(aptStart, apt.duration_minutes)
          
          if (
            (newStartTime >= aptStart && newStartTime < aptEnd) ||
            (newEndTime > aptStart && newEndTime <= aptEnd) ||
            (newStartTime <= aptStart && newEndTime >= aptEnd)
          ) {
            conflicts.push(`Conflicts with ${apt.client_name} at ${format(aptStart, 'h:mm a')}`)
          }
        })
      
      setRescheduleConflicts(conflicts)
    }
  }, [selectedDate, selectedTimeSlot, duration, existingAppointments, appointment])

  // Handle edit save
  const handleEditSave = () => {
    setIsLoading(true)
    
    const updates: Partial<Appointment> = {
      service_name: editData.service_name,
      notes: editData.notes,
      status: editData.status,
      paid: editData.paid,
      payment_method: editData.payment_method,
      duration_minutes: duration,
      price: price
    }
    
    onUpdate(appointment.id, updates)
    setIsLoading(false)
    onClose()
  }

  // Handle reschedule
  const handleReschedule = () => {
    if (!selectedDate || !selectedTimeSlot || rescheduleConflicts.length > 0) return
    
    setIsLoading(true)
    
    const newDateTime = new Date(selectedDate)
    newDateTime.setHours(selectedTimeSlot.hour, selectedTimeSlot.minute, 0, 0)
    
    onReschedule(appointment.id, newDateTime)
    setIsLoading(false)
    onClose()
  }

  // Handle cancellation
  const handleCancel = () => {
    if (!cancellationReason.trim()) return
    
    setIsLoading(true)
    
    onUpdate(appointment.id, {
      status: 'cancelled',
      notes: `${appointment.notes ? appointment.notes + '\n\n' : ''}Cancellation reason: ${cancellationReason}`
    })
    
    setIsLoading(false)
    onClose()
  }

  // Handle no-show
  const handleNoShow = () => {
    setIsLoading(true)
    
    onUpdate(appointment.id, {
      status: 'no_show',
      notes: `${appointment.notes ? appointment.notes + '\n\n' : ''}Marked as no-show on ${format(new Date(), 'MMM d, yyyy at h:mm a')}`
    })
    
    setIsLoading(false)
    onClose()
  }

  // Get available time slots for selected date
  const getAvailableTimeSlots = () => {
    if (!selectedDate) return TIME_SLOTS
    
    const bookedSlots = existingAppointments
      .filter(apt => 
        apt.id !== appointment.id && 
        apt.barber_id === appointment.barber_id &&
        isSameDay(new Date(apt.start_time), selectedDate)
      )
      .map(apt => {
        const start = new Date(apt.start_time)
        return { hour: start.getHours(), minute: start.getMinutes() }
      })
    
    return TIME_SLOTS.filter(slot => {
      return !bookedSlots.some(booked => 
        booked.hour === slot.hour && booked.minute === slot.minute
      )
    })
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'vip': return 'bg-yellow-100 text-yellow-800'
      case 'platinum': return 'bg-purple-100 text-purple-800'
      case 'regular': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'no_show': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Mock appointment history
  const appointmentHistory = [
    { date: '2024-11-15', service: 'Haircut', price: 35, status: 'completed' },
    { date: '2024-10-20', service: 'Haircut & Beard', price: 50, status: 'completed' },
    { date: '2024-09-25', service: 'Haircut', price: 35, status: 'completed' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Manage Appointment</DialogTitle>
        </DialogHeader>

        {/* Appointment Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UserIcon className="h-5 w-5 text-gray-600" />
              <div>
                <div className="font-medium">{appointment.client_name}</div>
                <div className="text-sm text-gray-600">
                  {appointment.client_phone && <span>{appointment.client_phone}</span>}
                  {appointment.client_email && appointment.client_phone && <span> • </span>}
                  {appointment.client_email && <span>{appointment.client_email}</span>}
                </div>
              </div>
            </div>
            <Badge className={getTierColor(appointment.client_tier || 'new')}>
              {appointment.client_tier || 'new'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-4 w-4 text-gray-600" />
              <span>{format(startTime, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-4 w-4 text-gray-600" />
              <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status}
            </Badge>
            {appointment.paid && (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircleIcon className="h-4 w-4" />
                <span className="text-sm">Paid ({appointment.payment_method})</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} defaultValue="edit" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Edit Details</TabsTrigger>
            <TabsTrigger value="reschedule">Reschedule</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Edit Tab */}
          <TabsContent value="edit" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <ScissorsIcon className="h-4 w-4" />
                <span>Service</span>
              </Label>
              <Select 
                value={editData.service_name} 
                onValueChange={(value) => setEditData({ ...editData, service_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_DURATIONS).map(([service, duration]) => (
                    <SelectItem key={service} value={service}>
                      <div className="flex items-center justify-between w-full">
                        <span>{service}</span>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{duration} min</span>
                          <span>•</span>
                          <span>${SERVICE_PRICES[service]}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={editData.status} 
                onValueChange={(value) => setEditData({ ...editData, status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={3}
                placeholder="Add any notes or special instructions..."
              />
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="font-medium">Payment</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="paid"
                    checked={editData.paid}
                    onChange={(e) => setEditData({ ...editData, paid: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="paid">Mark as paid</label>
                </div>
                {editData.paid && (
                  <Select 
                    value={editData.payment_method} 
                    onValueChange={(value) => setEditData({ ...editData, payment_method: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="app">App</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Total Price</span>
                </div>
                <span className="text-2xl font-bold text-green-600">${price}</span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <div className="space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
                >
                  Cancel Appointment
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNoShow}
                  disabled={appointment.status === 'no_show' || appointment.status === 'completed'}
                >
                  Mark No-Show
                </Button>
              </div>
              <Button 
                onClick={handleEditSave}
                style={{ backgroundColor: PremiumColors.primary[500] }}
                disabled={isLoading}
              >
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Reschedule Tab */}
          <TabsContent value="reschedule" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < startOfDay(new Date())}
                  className="rounded-md border"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Select Time</Label>
                <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                  {getAvailableTimeSlots().map((slot) => (
                    <Button
                      key={`${slot.hour}-${slot.minute}`}
                      variant={
                        selectedTimeSlot?.hour === slot.hour && 
                        selectedTimeSlot?.minute === slot.minute 
                          ? 'default' 
                          : 'outline'
                      }
                      size="sm"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className="text-sm"
                    >
                      {slot.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {selectedDate && selectedTimeSlot && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="font-medium mb-2">New Appointment Time</div>
                <div className="text-sm space-y-1">
                  <div>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</div>
                  <div>{TIME_SLOTS.find(s => s.hour === selectedTimeSlot.hour && s.minute === selectedTimeSlot.minute)?.label}</div>
                </div>
              </div>
            )}

            {rescheduleConflicts.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <div className="font-medium text-orange-900 mb-1">Cannot reschedule:</div>
                  <ul className="list-disc list-inside text-sm text-orange-800">
                    {rescheduleConflicts.map((conflict, index) => (
                      <li key={index}>{conflict}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleReschedule}
                style={{ backgroundColor: PremiumColors.primary[500] }}
                disabled={!selectedDate || !selectedTimeSlot || rescheduleConflicts.length > 0 || isLoading}
              >
                Confirm Reschedule
              </Button>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Client History</div>
                <div className="text-sm text-gray-600">
                  Total spent: <span className="font-medium">${appointmentHistory.reduce((sum, apt) => sum + apt.price, 0)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {appointmentHistory.map((apt, index) => (
                  <div key={index} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{apt.service}</div>
                      <div className="text-sm text-gray-600">{apt.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${apt.price}</div>
                      <Badge className={getStatusColor(apt.status)} variant="outline" size="sm">
                        {apt.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <CalendarDaysIcon className="h-4 w-4" />
                  <span>{appointmentHistory.length} appointments</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ChartBarIcon className="h-4 w-4" />
                  <span>Avg. ${Math.round(appointmentHistory.reduce((sum, apt) => sum + apt.price, 0) / appointmentHistory.length)}/visit</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BanknotesIcon className="h-4 w-4" />
                  <span>Most frequent: Haircut</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Cancellation Confirmation Dialog */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Cancel Appointment</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </p>
              <Textarea
                placeholder="Reason for cancellation (required)"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="mb-4"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                  Keep Appointment
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleCancel}
                  disabled={!cancellationReason.trim() || isLoading}
                >
                  Cancel Appointment
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Helper function
function isSameDay(date1: Date, date2: Date): boolean {
  return format(date1, 'yyyy-MM-dd') === format(date2, 'yyyy-MM-dd')
}