'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar, 
  Clock, 
  User, 
  DollarSign, 
  MapPin, 
  CheckSquare,
  Square,
  Filter,
  Download
} from 'lucide-react'
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns'
import { Appointment } from '@/types/appointment'
import { BulkSelectionCriteria, selectAppointmentsByCriteria } from '@/lib/calendar-export-enhanced'
import { Select, SelectOption } from '@/components/ui/Select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { Calendar as CalendarPicker } from '@/components/ui/calendar-picker'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'

interface BulkSelectableAppointmentListProps {
  appointments: Appointment[]
  onSelectAppointment?: (appointment: Appointment) => void
  onStatusChange?: (id: number, status: Appointment['status']) => void
  onSelectionChange?: (selectedAppointments: Appointment[]) => void
  selectedIds?: Set<number>
  className?: string
}

// Status color helper
const getStatusColor = (status: Appointment['status']) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    case 'completed':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
    case 'no_show':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
  }
}

// Format appointment date
const formatAppointmentDate = (dateString: string) => {
  const date = parseISO(dateString)
  
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`
  } else if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`
  } else if (isPast(date)) {
    return format(date, 'MMM d, yyyy at h:mm a')
  } else {
    return format(date, 'EEE, MMM d at h:mm a')
  }
}

export function BulkSelectableAppointmentList({
  appointments,
  onSelectAppointment,
  onStatusChange,
  onSelectionChange,
  selectedIds: externalSelectedIds,
  className = ''
}: BulkSelectableAppointmentListProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<number>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedBarber, setSelectedBarber] = useState<string>('all')
  const [selectedService, setSelectedService] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Use external selection state if provided, otherwise use internal
  const selectedIds = externalSelectedIds || internalSelectedIds
  const setSelectedIds = externalSelectedIds ? 
    (ids: Set<number>) => onSelectionChange?.(appointments.filter(apt => ids.has(apt.id))) :
    setInternalSelectedIds

  // Get unique barbers, services, and statuses for filters
  const filterOptions = useMemo(() => {
    const barbers = new Set<string>()
    const services = new Set<string>()
    const statuses = new Set<Appointment['status']>()
    
    appointments.forEach(apt => {
      if (apt.barber?.name) barbers.add(apt.barber.name)
      if (apt.service?.name) services.add(apt.service.name)
      statuses.add(apt.status)
    })
    
    return {
      barbers: Array.from(barbers),
      services: Array.from(services),
      statuses: Array.from(statuses)
    }
  }, [appointments])

  // Handle individual appointment selection
  const handleToggleSelect = useCallback((appointmentId: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(appointmentId)) {
      newSelected.delete(appointmentId)
    } else {
      newSelected.add(appointmentId)
    }
    setSelectedIds(newSelected)
  }, [selectedIds, setSelectedIds])

  // Handle select all/none
  const handleSelectAll = useCallback(() => {
    const allIds = new Set(appointments.map(apt => apt.id))
    setSelectedIds(allIds)
  }, [appointments, setSelectedIds])

  const handleSelectNone = useCallback(() => {
    setSelectedIds(new Set())
  }, [setSelectedIds])

  // Handle select by criteria
  const handleSelectByCriteria = useCallback(() => {
    const criteria: BulkSelectionCriteria = {
      type: 'criteria',
      criteria: {}
    }
    
    if (selectedBarber !== 'all') {
      const barberId = appointments.find(apt => apt.barber?.name === selectedBarber)?.barber_id
      if (barberId) criteria.criteria!.barbers = [barberId]
    }
    
    if (selectedService !== 'all') {
      const serviceId = appointments.find(apt => apt.service?.name === selectedService)?.service_id
      if (serviceId) criteria.criteria!.services = [serviceId]
    }
    
    if (selectedStatus !== 'all') {
      criteria.criteria!.status = [selectedStatus as Appointment['status']]
    }
    
    if (dateRange?.from && dateRange?.to) {
      criteria.criteria!.dateRange = {
        start: dateRange.from,
        end: dateRange.to
      }
    }
    
    const selected = selectAppointmentsByCriteria(appointments, criteria)
    const selectedSet = new Set(selected.map(apt => apt.id))
    setSelectedIds(selectedSet)
  }, [appointments, selectedBarber, selectedService, selectedStatus, dateRange, setSelectedIds])

  // Calculate selection statistics
  const selectionStats = useMemo(() => {
    const selected = appointments.filter(apt => selectedIds.has(apt.id))
    const totalRevenue = selected.reduce((sum, apt) => sum + apt.total_price, 0)
    const byStatus = selected.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      count: selected.length,
      totalRevenue,
      byStatus
    }
  }, [appointments, selectedIds])

  // Group appointments by date
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {}
    
    appointments.forEach(appointment => {
      const date = format(parseISO(appointment.start_time), 'yyyy-MM-dd')
      const dateObj = parseISO(appointment.start_time)
      let groupKey: string
      
      if (isToday(dateObj)) {
        groupKey = 'Today'
      } else if (isTomorrow(dateObj)) {
        groupKey = 'Tomorrow'
      } else if (isPast(dateObj)) {
        groupKey = format(dateObj, 'MMMM d, yyyy')
      } else {
        groupKey = format(dateObj, 'EEEE, MMMM d')
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(appointment)
    })
    
    // Sort appointments within each group
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
      )
    })
    
    return groups
  }, [appointments])

  return (
    <div className={className}>
      {/* Selection Controls */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Bulk Selection</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectNone}
              >
                <Square className="h-4 w-4 mr-2" />
                Select None
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {/* Selection Stats */}
        {selectionStats.count > 0 && (
          <CardContent className="pt-0 pb-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">
                {selectionStats.count} appointment{selectionStats.count !== 1 ? 's' : ''} selected
              </span>
              <span className="text-muted-foreground">•</span>
              <span>
                Total: <span className="font-medium">${selectionStats.totalRevenue.toFixed(2)}</span>
              </span>
              {Object.entries(selectionStats.byStatus).map(([status, count]) => (
                <React.Fragment key={status}>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="secondary" className={getStatusColor(status as Appointment['status'])}>
                    {count} {status}
                  </Badge>
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        )}
        
        {/* Filters */}
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select
                value={selectedBarber}
                onChange={(value) => setSelectedBarber(value as string)}
                placeholder="All barbers"
                options={[
                  { value: 'all', label: 'All barbers' },
                  ...filterOptions.barbers.map(barber => ({
                    value: barber,
                    label: barber
                  }))
                ]}
              />
              
              <Select
                value={selectedService}
                onChange={(value) => setSelectedService(value as string)}
                placeholder="All services"
                options={[
                  { value: 'all', label: 'All services' },
                  ...filterOptions.services.map(service => ({
                    value: service,
                    label: service
                  }))
                ]}
              />
              
              <Select
                value={selectedStatus}
                onChange={(value) => setSelectedStatus(value as string)}
                placeholder="All statuses"
                options={[
                  { value: 'all', label: 'All statuses' },
                  ...filterOptions.statuses.map(status => ({
                    value: status,
                    label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
                  }))
                ]}
              />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} -{" "}
                          {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd")
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <Button
              className="mt-3"
              size="sm"
              onClick={handleSelectByCriteria}
            >
              Apply Filters to Selection
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Appointments List */}
      <div className="space-y-6">
        {Object.entries(groupedAppointments).map(([date, dateAppointments]) => (
          <div key={date}>
            <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-background/95 backdrop-blur py-2">
              {date}
              <Badge variant="secondary" className="ml-2">
                {dateAppointments.length}
              </Badge>
            </h3>
            <div className="space-y-3">
              {dateAppointments.map(appointment => {
                const isSelected = selectedIds.has(appointment.id)
                const isPastAppointment = isPast(parseISO(appointment.end_time))
                const duration = Math.round(
                  (parseISO(appointment.end_time).getTime() - 
                   parseISO(appointment.start_time).getTime()) / 60000
                )
                
                return (
                  <Card 
                    key={appointment.id}
                    className={cn(
                      "transition-all duration-200 hover:shadow-md",
                      isPastAppointment && "opacity-60",
                      isSelected && "ring-2 ring-primary"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(appointment.id)}
                          className="mt-1"
                        />
                        
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {appointment.client?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => onSelectAppointment?.(appointment)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <h4 className="font-medium truncate">
                                {appointment.client?.name || 'Unknown Client'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {appointment.service?.name || 'Unknown Service'}
                              </p>
                            </div>
                            <Badge className={`${getStatusColor(appointment.status)} shrink-0`}>
                              {appointment.status}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatAppointmentDate(appointment.start_time)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{duration} min</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span className="font-medium">${appointment.total_price}</span>
                            </div>
                            {appointment.barber?.name && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{appointment.barber.name}</span>
                              </div>
                            )}
                            {appointment.barber?.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{appointment.barber.location}</span>
                              </div>
                            )}
                          </div>
                          
                          {appointment.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                              Note: {appointment.notes}
                            </p>
                          )}
                          
                          {onStatusChange && appointment.status === 'confirmed' && !isPastAppointment && (
                            <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStatusChange(appointment.id, 'cancelled')}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onStatusChange(appointment.id, 'completed')}
                              >
                                Complete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}