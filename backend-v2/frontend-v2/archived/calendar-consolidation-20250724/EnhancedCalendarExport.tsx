'use client'

import React, { useState, useEffect } from 'react'
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
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectOption } from '@/components/ui/select'
import { 
  Calendar, 
  Download, 
  FileDown, 
  Globe, 
  Mail,
  FileJson,
  FileText,
  Send,
  Clock,
  History,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { 
  ExportFormat,
  ExportTemplate,
  ExportConfig,
  filterAppointments,
  generatePDF,
  exportToJSON,
  saveExportConfig,
  getSavedExportConfigs,
  deleteSavedExportConfig,
  saveExportHistory,
  getExportHistory,
  clearExportHistory,
  emailExport,
  scheduleRecurringExport,
  getScheduledExports,
  deleteScheduledExport
} from '@/lib/calendar-export-enhanced'
import { exportCalendar } from '@/lib/calendar-export'
import { Appointment } from '@/types/appointment'
import { format as formatDate } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EnhancedCalendarExportProps {
  appointments: Appointment[]
  selectedAppointments?: Appointment[]
  onExport?: (format: string, count: number) => void
}

const exportFormats: Array<{
  value: ExportFormat
  label: string
  description: string
  icon: React.FC<{ className?: string }>
}> = [
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
  },
  {
    value: 'pdf',
    label: 'PDF Report',
    description: 'Professional reports with 6FB business metrics',
    icon: FileText
  },
  {
    value: 'json',
    label: 'JSON Data',
    description: 'Full data export for backup or migration',
    icon: FileJson
  }
]

const exportTemplates: Array<{
  value: ExportTemplate
  label: string
  description: string
}> = [
  {
    value: 'client-report',
    label: 'Client Report',
    description: 'Detailed appointment history for clients'
  },
  {
    value: 'revenue-summary',
    label: 'Revenue Summary',
    description: 'Financial overview with daily/weekly totals'
  },
  {
    value: 'service-analytics',
    label: 'Service Analytics',
    description: 'Performance metrics for each service'
  },
  {
    value: 'business-metrics',
    label: 'Business Metrics (6FB)',
    description: 'Comprehensive Six Figure Barber metrics'
  },
  {
    value: 'tax-report',
    label: 'Tax Report',
    description: 'Monthly summaries for tax preparation'
  },
  {
    value: 'marketing-insights',
    label: 'Marketing Insights',
    description: 'Client retention and acquisition metrics'
  }
]

export function EnhancedCalendarExport({
  appointments,
  selectedAppointments,
  onExport
}: EnhancedCalendarExportProps) {
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('export')
  
  // Export state
  const [exportFormat, setExportFormat] = useState<ExportFormat>('ical')
  const [exportTemplate, setExportTemplate] = useState<ExportTemplate>('client-report')
  const [dateRange, setDateRange] = useState<'all' | 'selected' | 'upcoming' | 'custom'>('all')
  const [includeOptions, setIncludeOptions] = useState({
    clientInfo: true,
    serviceDetails: true,
    notes: true,
    pricing: true,
    barberInfo: true,
    analytics: false
  })
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  
  // Email state
  const [emailRecipients, setEmailRecipients] = useState('')
  const [emailSubject, setEmailSubject] = useState('BookedBarber Export')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendCopyToSelf, setSendCopyToSelf] = useState(true)
  
  // Schedule state
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState('1')
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState('1')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  
  // Saved configs and history
  const [savedConfigs, setSavedConfigs] = useState(getSavedExportConfigs())
  const [exportHistory, setExportHistory] = useState(getExportHistory())
  const [scheduledExports, setScheduledExports] = useState(getScheduledExports())
  const [configName, setConfigName] = useState('')

  // Refresh saved data when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      setSavedConfigs(getSavedExportConfigs())
      setExportHistory(getExportHistory())
      setScheduledExports(getScheduledExports())
    }
  }, [isDialogOpen])

  const getAppointmentsToExport = (): Appointment[] => {
    let appointmentsToFilter = appointments

    // First apply date range filter
    if (selectedAppointments && selectedAppointments.length > 0 && dateRange === 'selected') {
      appointmentsToFilter = selectedAppointments
    } else if (dateRange === 'upcoming') {
      const now = new Date()
      appointmentsToFilter = appointments.filter(apt => new Date(apt.start_time) >= now)
    }

    // Then apply additional filters
    return filterAppointments(appointmentsToFilter, {
      status: statusFilter.length > 0 ? statusFilter as Appointment['status'][] : undefined,
      priceRange: (priceMin || priceMax) ? {
        min: priceMin ? parseFloat(priceMin) : 0,
        max: priceMax ? parseFloat(priceMax) : Number.MAX_SAFE_INTEGER
      } : undefined
    })
  }

  const handleQuickExport = async (format: ExportFormat) => {
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
      if (format === 'pdf') {
        const pdfBlob = await generatePDF(appointmentsToExport, 'client-report', includeOptions)
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `bookedbarber-export-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else if (format === 'json') {
        const jsonData = exportToJSON(appointmentsToExport, includeOptions)
        const blob = new Blob([jsonData], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `bookedbarber-export-${formatDate(new Date(), 'yyyy-MM-dd')}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        exportCalendar({
          format: format as 'ical' | 'google' | 'outlook' | 'csv',
          appointments: appointmentsToExport
        })
      }
      
      // Save to history
      saveExportHistory({
        timestamp: new Date(),
        config: { format, includeOptions },
        appointmentCount: appointmentsToExport.length,
        totalRevenue: appointmentsToExport.reduce((sum, apt) => sum + apt.total_price, 0),
        fileName: `export-${format}-${formatDate(new Date(), 'yyyy-MM-dd-HHmmss')}`,
        status: 'success'
      })
      
      toast({
        title: 'Export successful',
        description: `Exported ${appointmentsToExport.length} appointment${appointmentsToExport.length > 1 ? 's' : ''} to ${format.toUpperCase()} format.`
      })
      
      onExport?.(format, appointmentsToExport.length)
    } catch (error) {
      // Save failed attempt to history
      saveExportHistory({
        timestamp: new Date(),
        config: { format, includeOptions },
        appointmentCount: appointmentsToExport.length,
        totalRevenue: 0,
        fileName: `export-${format}-${formatDate(new Date(), 'yyyy-MM-dd-HHmmss')}`,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your appointments. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const handleAdvancedExport = async () => {
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
      let exportBlob: Blob | null = null
      let fileName = `bookedbarber-export-${formatDate(new Date(), 'yyyy-MM-dd')}`

      if (exportFormat === 'pdf') {
        exportBlob = await generatePDF(appointmentsToExport, exportTemplate, includeOptions)
        fileName += '.pdf'
      } else if (exportFormat === 'json') {
        const jsonData = exportToJSON(appointmentsToExport, includeOptions)
        exportBlob = new Blob([jsonData], { type: 'application/json' })
        fileName += '.json'
      } else {
        // Use existing export function for calendar formats
        exportCalendar({
          format: exportFormat as 'ical' | 'google' | 'outlook' | 'csv',
          appointments: appointmentsToExport,
          filename: fileName
        })
      }

      // Handle email export if requested
      if (activeTab === 'email' && exportBlob) {
        const recipients = emailRecipients.split(',').map(r => r.trim()).filter(Boolean)
        if (sendCopyToSelf) {
          // Add current user email if available
          // recipients.push(currentUserEmail)
        }
        
        const result = await emailExport(exportBlob, fileName, {
          recipients,
          subject: emailSubject,
          message: emailMessage,
          sendCopy: sendCopyToSelf
        })
        
        toast({
          title: result.success ? 'Email sent' : 'Email prepared',
          description: result.message
        })
      } else if (exportBlob) {
        // Download the file
        const url = URL.createObjectURL(exportBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
      
      // Save to history
      saveExportHistory({
        timestamp: new Date(),
        config: { 
          format: exportFormat, 
          template: exportTemplate,
          includeOptions,
          filters: {
            status: statusFilter as Appointment['status'][],
            priceRange: (priceMin || priceMax) ? {
              min: parseFloat(priceMin) || 0,
              max: parseFloat(priceMax) || Number.MAX_SAFE_INTEGER
            } : undefined
          }
        },
        appointmentCount: appointmentsToExport.length,
        totalRevenue: appointmentsToExport.reduce((sum, apt) => sum + apt.total_price, 0),
        fileName,
        status: 'success'
      })
      
      toast({
        title: 'Export successful',
        description: `Exported ${appointmentsToExport.length} appointment${appointmentsToExport.length > 1 ? 's' : ''}.`
      })
      
      setIsDialogOpen(false)
      onExport?.(exportFormat, appointmentsToExport.length)
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An error occurred during export.',
        variant: 'destructive'
      })
    }
  }

  const handleSaveConfig = () => {
    if (!configName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this export configuration.',
        variant: 'destructive'
      })
      return
    }

    const config: ExportConfig = {
      format: exportFormat,
      template: exportTemplate,
      filters: {
        status: statusFilter as Appointment['status'][],
        priceRange: (priceMin || priceMax) ? {
          min: parseFloat(priceMin) || 0,
          max: parseFloat(priceMax) || Number.MAX_SAFE_INTEGER
        } : undefined
      },
      includeOptions
    }

    saveExportConfig(config, configName)
    setSavedConfigs(getSavedExportConfigs())
    setConfigName('')
    
    toast({
      title: 'Configuration saved',
      description: `Export configuration "${configName}" has been saved.`
    })
  }

  const handleLoadConfig = (name: string) => {
    const config = savedConfigs[name]
    if (!config) return

    setExportFormat(config.format)
    if (config.template) setExportTemplate(config.template)
    if (config.includeOptions) setIncludeOptions(config.includeOptions)
    if (config.filters?.status) setStatusFilter(config.filters.status)
    if (config.filters?.priceRange) {
      setPriceMin(config.filters.priceRange.min.toString())
      setPriceMax(config.filters.priceRange.max.toString())
    }
    
    toast({
      title: 'Configuration loaded',
      description: `Loaded export settings from "${name}".`
    })
  }

  const handleScheduleExport = async () => {
    const config: ExportConfig = {
      format: exportFormat,
      template: exportTemplate,
      filters: {
        status: statusFilter as Appointment['status'][],
        priceRange: (priceMin || priceMax) ? {
          min: parseFloat(priceMin) || 0,
          max: parseFloat(priceMax) || Number.MAX_SAFE_INTEGER
        } : undefined
      },
      includeOptions,
      scheduleOptions: {
        frequency: scheduleFrequency,
        dayOfWeek: scheduleFrequency === 'weekly' ? parseInt(scheduleDayOfWeek) : undefined,
        dayOfMonth: scheduleFrequency === 'monthly' ? parseInt(scheduleDayOfMonth) : undefined,
        time: scheduleTime
      }
    }

    const result = await scheduleRecurringExport(config)
    
    if (result.scheduleId) {
      setScheduledExports(getScheduledExports())
    }
    
    toast({
      title: result.success ? 'Export scheduled' : 'Schedule saved locally',
      description: result.message
    })
  }

  const appointmentsToExport = getAppointmentsToExport()

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
          {exportFormats.map(format => {
            const Icon = format.icon
            return (
              <DropdownMenuItem 
                key={format.value}
                onClick={() => handleQuickExport(format.value)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {format.label}
              </DropdownMenuItem>
            )
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            Advanced Export...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Advanced Export</DialogTitle>
            <DialogDescription>
              Configure export options, filters, and automation
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="export" className="mt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="export" className="space-y-4 px-1">
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

                {/* Template Selection for PDF */}
                {exportFormat === 'pdf' && (
                  <div className="space-y-3">
                    <Label>Report Template</Label>
                    <Select 
                      value={exportTemplate} 
                      onChange={(value) => setExportTemplate(value as ExportTemplate)}
                      options={exportTemplates.map(template => ({
                        value: template.value,
                        label: template.label,
                        description: template.description
                      }))}
                    />
                  </div>
                )}

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
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="barberInfo"
                        checked={includeOptions.barberInfo}
                        onCheckedChange={(checked) =>
                          setIncludeOptions(prev => ({ ...prev, barberInfo: !!checked }))
                        }
                      />
                      <Label htmlFor="barberInfo" className="font-normal cursor-pointer">
                        Barber information
                      </Label>
                    </div>
                    {exportFormat === 'json' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="analytics"
                          checked={includeOptions.analytics}
                          onCheckedChange={(checked) =>
                            setIncludeOptions(prev => ({ ...prev, analytics: !!checked }))
                          }
                        />
                        <Label htmlFor="analytics" className="font-normal cursor-pointer">
                          Analytics metadata
                        </Label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Configuration */}
                <div className="space-y-3 pt-4 border-t">
                  <Label>Save Configuration</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Configuration name"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                    />
                    <Button onClick={handleSaveConfig} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                  {Object.keys(savedConfigs).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Load Saved Configuration</Label>
                      {Object.entries(savedConfigs).map(([name, config]) => (
                        <div key={name} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium text-sm">{name}</div>
                            <div className="text-xs text-muted-foreground">
                              {config.format.toUpperCase()} • Saved {formatDate(new Date(config.savedAt), 'MMM d, yyyy')}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadConfig(name)}
                            >
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                deleteSavedExportConfig(name)
                                setSavedConfigs(getSavedExportConfigs())
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="filters" className="space-y-4 px-1">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Filters will be applied to the selected date range from the Export tab.
                    Currently exporting {appointmentsToExport.length} appointments.
                  </AlertDescription>
                </Alert>

                {/* Status Filter */}
                <div className="space-y-3">
                  <Label>Status Filter</Label>
                  <div className="space-y-2">
                    {['confirmed', 'completed', 'cancelled', 'pending', 'no_show'].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={statusFilter.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStatusFilter([...statusFilter, status])
                            } else {
                              setStatusFilter(statusFilter.filter(s => s !== status))
                            }
                          }}
                        />
                        <Label htmlFor={`status-${status}`} className="font-normal cursor-pointer">
                          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-3">
                  <Label>Price Range</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                    />
                    <span>to</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                    />
                  </div>
                </div>

                {/* Filter Summary */}
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    <p>Active filters:</p>
                    <ul className="list-disc list-inside mt-2">
                      {statusFilter.length > 0 && (
                        <li>Status: {statusFilter.join(', ')}</li>
                      )}
                      {(priceMin || priceMax) && (
                        <li>Price: ${priceMin || '0'} - ${priceMax || '∞'}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 px-1">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Configure email settings to send the export directly to recipients.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Label htmlFor="recipients">Recipients (comma-separated)</Label>
                  <Input
                    id="recipients"
                    placeholder="email1@example.com, email2@example.com"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    placeholder="Add a custom message to the email..."
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendCopy"
                    checked={sendCopyToSelf}
                    onCheckedChange={(checked) => setSendCopyToSelf(!!checked)}
                  />
                  <Label htmlFor="sendCopy" className="font-normal cursor-pointer">
                    Send a copy to myself
                  </Label>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4 px-1">
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Schedule recurring exports to run automatically. Backend integration required for automatic execution.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Label>Frequency</Label>
                  <Select 
                    value={scheduleFrequency} 
                    onChange={(value) => setScheduleFrequency(value as 'daily' | 'weekly' | 'monthly')}
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' }
                    ]}
                  />
                </div>

                {scheduleFrequency === 'weekly' && (
                  <div className="space-y-3">
                    <Label>Day of Week</Label>
                    <Select 
                      value={scheduleDayOfWeek} 
                      onChange={(value) => setScheduleDayOfWeek(value as string)}
                      options={[
                        { value: '0', label: 'Sunday' },
                        { value: '1', label: 'Monday' },
                        { value: '2', label: 'Tuesday' },
                        { value: '3', label: 'Wednesday' },
                        { value: '4', label: 'Thursday' },
                        { value: '5', label: 'Friday' },
                        { value: '6', label: 'Saturday' }
                      ]}
                    />
                  </div>
                )}

                {scheduleFrequency === 'monthly' && (
                  <div className="space-y-3">
                    <Label>Day of Month</Label>
                    <Select 
                      value={scheduleDayOfMonth} 
                      onChange={(value) => setScheduleDayOfMonth(value as string)}
                      options={Array.from({ length: 28 }, (_, i) => i + 1).map(day => ({
                        value: day.toString(),
                        label: day.toString()
                      }))}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>

                <Button onClick={handleScheduleExport} className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Export
                </Button>

                {Object.keys(scheduledExports).length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="text-sm">Scheduled Exports</Label>
                    {Object.entries(scheduledExports).map(([id, schedule]) => (
                      <div key={id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium text-sm">
                            {schedule.format.toUpperCase()} Export
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {schedule.scheduleOptions?.frequency} at {schedule.scheduleOptions?.time}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            deleteScheduledExport(id)
                            setScheduledExports(getScheduledExports())
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 px-1">
                <div className="flex items-center justify-between mb-4">
                  <Label>Export History</Label>
                  {exportHistory.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        clearExportHistory()
                        setExportHistory([])
                      }}
                    >
                      Clear History
                    </Button>
                  )}
                </div>

                {exportHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No export history yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {exportHistory.map(entry => (
                      <div key={entry.id} className="p-3 border rounded">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {entry.config.format.toUpperCase()} Export
                              {entry.status === 'success' ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(new Date(entry.timestamp), 'MMM d, yyyy at h:mm a')}
                            </div>
                            <div className="text-xs mt-1">
                              {entry.appointmentCount} appointments • ${entry.totalRevenue.toFixed(2)}
                            </div>
                            {entry.errorMessage && (
                              <div className="text-xs text-red-500 mt-1">
                                Error: {entry.errorMessage}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Re-export with same settings
                              if (entry.config.format) setExportFormat(entry.config.format)
                              if (entry.config.template) setExportTemplate(entry.config.template)
                              if (entry.config.includeOptions) setIncludeOptions(entry.config.includeOptions)
                              setActiveTab('export')
                            }}
                          >
                            <History className="h-3 w-3 mr-1" />
                            Reuse
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="mt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                {appointmentsToExport.length} appointments ready to export
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdvancedExport}>
                  {activeTab === 'email' ? (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  ) : activeTab === 'schedule' ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Save Schedule
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}