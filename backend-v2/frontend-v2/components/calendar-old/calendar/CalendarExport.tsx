'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Download, FileDown, Globe, Mail } from 'lucide-react'
import { exportCalendar, CalendarExportOptions } from '@/lib/calendar-export'
import { Appointment } from '@/types/appointment'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface CalendarExportProps {
  appointments: Appointment[]
  selectedAppointments?: Appointment[]
  onExport?: (format: string) => void
}

export function CalendarExport({
  appointments,
  selectedAppointments,
  onExport
}: CalendarExportProps) {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<CalendarExportOptions['format']>('ical')
  const [dateRange, setDateRange] = useState<'all' | 'selected' | 'upcoming'>('all')
  const [includeOptions, setIncludeOptions] = useState({
    clientInfo: true,
    serviceDetails: true,
    notes: true,
    pricing: true
  })

  const getAppointmentsToExport = (): Appointment[] => {
    if (selectedAppointments && selectedAppointments.length > 0) {
      return selectedAppointments
    }

    switch (dateRange) {
      case 'upcoming':
        const now = new Date()
        return appointments.filter(apt => new Date(apt.start_time) >= now)
      case 'selected':
        return selectedAppointments || []
      case 'all':
      default:
        return appointments
    }
  }

  const handleQuickExport = (format: CalendarExportOptions['format']) => {
    const appointmentsToExport = getAppointmentsToExport()
    
    if (appointmentsToExport.length === 0) {
      toast({
        title: 'No appointments to export',
        description: 'Please select at least one appointment to export.',
        variant: 'destructive'
      })
      return
    }

    try {
      exportCalendar({
        format,
        appointments: appointmentsToExport
      })
      
      toast({
        title: 'Export successful',
        description: `Exported ${appointmentsToExport.length} appointment${appointmentsToExport.length > 1 ? 's' : ''} to ${format.toUpperCase()} format.`
      })
      
      onExport?.(format)
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your appointments. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleAdvancedExport = () => {
    const appointmentsToExport = getAppointmentsToExport()
    
    if (appointmentsToExport.length === 0) {
      toast({
        title: 'No appointments to export',
        description: 'Please select at least one appointment to export.',
        variant: 'destructive'
      })
      return
    }

    // Filter appointments based on include options
    const processedAppointments = appointmentsToExport.map(apt => ({
      ...apt,
      client: includeOptions.clientInfo ? apt.client : undefined,
      service: includeOptions.serviceDetails ? apt.service : undefined,
      notes: includeOptions.notes ? apt.notes : undefined,
      total_price: includeOptions.pricing ? apt.total_price : 0
    }))

    try {
      exportCalendar({
        format: exportFormat,
        appointments: processedAppointments
      })
      
      toast({
        title: 'Export successful',
        description: `Exported ${processedAppointments.length} appointment${processedAppointments.length > 1 ? 's' : ''} to ${exportFormat.toUpperCase()} format.`
      })
      
      setIsDialogOpen(false)
      onExport?.(exportFormat)
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your appointments. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const exportFormats = [
    {
      value: 'ical',
      label: 'iCalendar (.ics)',
      description: 'Works with Apple Calendar, Outlook, and most calendar apps',
      icon: Calendar
    },
    {
      value: 'google',
      label: 'Google Calendar',
      description: 'Add directly to your Google Calendar',
      icon: Globe
    },
    {
      value: 'outlook',
      label: 'Outlook Calendar',
      description: 'Add directly to your Outlook Calendar',
      icon: Mail
    },
    {
      value: 'csv',
      label: 'CSV Spreadsheet',
      description: 'Export data for Excel, Google Sheets, or other tools',
      icon: FileDown
    }
  ]

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Quick Export</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleQuickExport('ical')}>
            <Calendar className="h-4 w-4 mr-2" />
            iCalendar (.ics)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('google')}>
            <Globe className="h-4 w-4 mr-2" />
            Google Calendar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('outlook')}>
            <Mail className="h-4 w-4 mr-2" />
            Outlook Calendar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
            <FileDown className="h-4 w-4 mr-2" />
            CSV Spreadsheet
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            Advanced Export...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Export Appointments</DialogTitle>
            <DialogDescription>
              Choose your export format and options
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date Range Selection */}
            <div className="space-y-3">
              <Label>Date Range</Label>
              <RadioGroup value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">
                    All appointments ({appointments.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upcoming" id="upcoming" />
                  <Label htmlFor="upcoming" className="font-normal cursor-pointer">
                    Upcoming appointments only (
                    {appointments.filter(apt => new Date(apt.start_time) >= new Date()).length}
                    )
                  </Label>
                </div>
                {selectedAppointments && selectedAppointments.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selected" id="selected" />
                    <Label htmlFor="selected" className="font-normal cursor-pointer">
                      Selected appointments ({selectedAppointments.length})
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>

            {/* Export Format Selection */}
            <div className="space-y-3">
              <Label>Export Format</Label>
              <RadioGroup value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                {exportFormats.map((format) => {
                  const Icon = format.icon
                  return (
                    <div key={format.value} className="flex items-start space-x-2">
                      <RadioGroupItem value={format.value} id={format.value} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={format.value} className="font-normal cursor-pointer flex items-center">
                          <Icon className="h-4 w-4 mr-2" />
                          {format.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            {/* Include Options */}
            <div className="space-y-3">
              <Label>Include in Export</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="clientInfo"
                    checked={includeOptions.clientInfo}
                    onCheckedChange={(checked) =>
                      setIncludeOptions(prev => ({ ...prev, clientInfo: !!checked }))
                    }
                  />
                  <Label htmlFor="clientInfo" className="font-normal cursor-pointer">
                    Client information
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="serviceDetails"
                    checked={includeOptions.serviceDetails}
                    onCheckedChange={(checked) =>
                      setIncludeOptions(prev => ({ ...prev, serviceDetails: !!checked }))
                    }
                  />
                  <Label htmlFor="serviceDetails" className="font-normal cursor-pointer">
                    Service details
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notes"
                    checked={includeOptions.notes}
                    onCheckedChange={(checked) =>
                      setIncludeOptions(prev => ({ ...prev, notes: !!checked }))
                    }
                  />
                  <Label htmlFor="notes" className="font-normal cursor-pointer">
                    Appointment notes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pricing"
                    checked={includeOptions.pricing}
                    onCheckedChange={(checked) =>
                      setIncludeOptions(prev => ({ ...prev, pricing: !!checked }))
                    }
                  />
                  <Label htmlFor="pricing" className="font-normal cursor-pointer">
                    Pricing information
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdvancedExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}