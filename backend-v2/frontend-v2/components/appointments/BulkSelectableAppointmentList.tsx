import React, { useState } from 'react'
import { Appointment } from '@/types/appointment'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/Badge'

interface BulkSelectableAppointmentListProps {
  appointments: Appointment[]
  onSelectionChange: (selectedIds: string[]) => void
  className?: string
}

export const BulkSelectableAppointmentList: React.FC<BulkSelectableAppointmentListProps> = ({
  appointments,
  onSelectionChange,
  className = ''
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleSelectAll = () => {
    const allIds = appointments.map(apt => apt.id.toString())
    setSelectedIds(allIds)
    onSelectionChange(allIds)
  }

  const handleSelectNone = () => {
    setSelectedIds([])
    onSelectionChange([])
  }

  const handleToggleSelect = (appointmentId: string) => {
    const newSelection = selectedIds.includes(appointmentId)
      ? selectedIds.filter(id => id !== appointmentId)
      : [...selectedIds, appointmentId]
    
    setSelectedIds(newSelection)
    onSelectionChange(newSelection)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      confirmed: 'default',
      pending: 'secondary',
      cancelled: 'destructive',
      completed: 'success'
    } as const
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Select Appointments ({selectedIds.length} selected)</CardTitle>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectNone}>
              Select None
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div 
              key={appointment.id}
              className="flex items-center space-x-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Checkbox 
                checked={selectedIds.includes(appointment.id.toString())}
                onCheckedChange={() => handleToggleSelect(appointment.id.toString())}
              />
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {appointment.client_name || 'Unknown Client'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {appointment.client_email}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatDate(appointment.start_time)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {appointment.service_name}
                  </div>
                </div>
                
                <div>
                  {getStatusBadge(appointment.status)}
                </div>
                
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">
                    ${appointment.total_amount?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {appointments.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No appointments found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}