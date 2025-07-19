import { Appointment } from '@/types/appointment'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

/**
 * Enhanced calendar export utilities for BookedBarber V2
 * Following Six Figure Barber methodology for business metrics tracking
 */

// Export format types
export type ExportFormat = 'ical' | 'google' | 'outlook' | 'apple' | 'csv' | 'pdf' | 'json'

// Export template types aligned with 6FB methodology
export type ExportTemplate = 
  | 'client-report'      // Client appointment history and spending
  | 'revenue-summary'    // Revenue breakdown by period
  | 'service-analytics'  // Service performance metrics
  | 'business-metrics'   // Comprehensive 6FB metrics
  | 'tax-report'        // Tax-ready financial report
  | 'marketing-insights' // Client acquisition and retention metrics

// Filter criteria for appointments
export interface AppointmentFilters {
  status?: Appointment['status'][]
  serviceTypes?: number[]
  priceRange?: {
    min: number
    max: number
  }
  clientIds?: number[]
  barberIds?: number[]
  dateRange?: {
    start: Date
    end: Date
  }
}

// Export configuration
export interface ExportConfig {
  format: ExportFormat
  template?: ExportTemplate
  filters?: AppointmentFilters
  includeOptions?: {
    clientInfo: boolean
    serviceDetails: boolean
    notes: boolean
    pricing: boolean
    barberInfo: boolean
    analytics: boolean
  }
  emailOptions?: {
    recipients: string[]
    subject: string
    message: string
    sendCopy: boolean
  }
  scheduleOptions?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    dayOfWeek?: number
    dayOfMonth?: number
    time: string
  }
}

// Export history entry
export interface ExportHistoryEntry {
  id: string
  timestamp: Date
  config: ExportConfig
  appointmentCount: number
  totalRevenue: number
  fileName: string
  status: 'success' | 'failed'
  errorMessage?: string
}

// Selection criteria for bulk operations
export interface BulkSelectionCriteria {
  type: 'all' | 'none' | 'criteria'
  criteria?: {
    barbers?: number[]
    services?: number[]
    dateRange?: {
      start: Date
      end: Date
    }
    status?: Appointment['status'][]
    priceAbove?: number
    priceBelow?: number
  }
}

/**
 * Filter appointments based on criteria
 */
export function filterAppointments(
  appointments: Appointment[],
  filters: AppointmentFilters
): Appointment[] {
  return appointments.filter(appointment => {
    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(appointment.status)) return false
    }

    // Service type filter
    if (filters.serviceTypes && filters.serviceTypes.length > 0) {
      if (!appointment.service_id || !filters.serviceTypes.includes(appointment.service_id)) {
        return false
      }
    }

    // Price range filter
    if (filters.priceRange) {
      const price = appointment.total_price
      if (price < filters.priceRange.min || price > filters.priceRange.max) {
        return false
      }
    }

    // Client filter
    if (filters.clientIds && filters.clientIds.length > 0) {
      if (!appointment.client_id || !filters.clientIds.includes(appointment.client_id)) {
        return false
      }
    }

    // Barber filter
    if (filters.barberIds && filters.barberIds.length > 0) {
      if (!filters.barberIds.includes(appointment.barber_id)) {
        return false
      }
    }

    // Date range filter
    if (filters.dateRange) {
      const appointmentDate = parseISO(appointment.start_time)
      if (!isWithinInterval(appointmentDate, {
        start: filters.dateRange.start,
        end: filters.dateRange.end
      })) {
        return false
      }
    }

    return true
  })
}

/**
 * Select appointments based on bulk criteria
 */
export function selectAppointmentsByCriteria(
  appointments: Appointment[],
  criteria: BulkSelectionCriteria
): Appointment[] {
  if (criteria.type === 'all') {
    return appointments
  }

  if (criteria.type === 'none') {
    return []
  }

  if (criteria.type === 'criteria' && criteria.criteria) {
    return filterAppointments(appointments, {
      barberIds: criteria.criteria.barbers,
      serviceTypes: criteria.criteria.services,
      dateRange: criteria.criteria.dateRange,
      status: criteria.criteria.status,
      priceRange: criteria.criteria.priceAbove || criteria.criteria.priceBelow ? {
        min: criteria.criteria.priceAbove || 0,
        max: criteria.criteria.priceBelow || Number.MAX_SAFE_INTEGER
      } : undefined
    })
  }

  return []
}

/**
 * Generate PDF export with professional styling
 */
export async function generatePDF(
  appointments: Appointment[],
  template: ExportTemplate = 'client-report',
  includeOptions: ExportConfig['includeOptions']
): Promise<Blob> {
  const doc = new jsPDF()
  
  // Set professional styling
  doc.setFontSize(20)
  doc.text('BookedBarber', 105, 20, { align: 'center' })
  
  // Add template-specific title
  doc.setFontSize(16)
  const titles: Record<ExportTemplate, string> = {
    'client-report': 'Client Appointment Report',
    'revenue-summary': 'Revenue Summary Report',
    'service-analytics': 'Service Analytics Report',
    'business-metrics': 'Business Metrics Report (6FB)',
    'tax-report': 'Tax Report',
    'marketing-insights': 'Marketing Insights Report'
  }
  doc.text(titles[template], 105, 35, { align: 'center' })
  
  // Add date range
  doc.setFontSize(10)
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 105, 45, { align: 'center' })
  
  // Prepare data based on template
  let tableData: any[] = []
  let columns: any[] = []
  
  switch (template) {
    case 'client-report':
      columns = ['Date', 'Time', 'Service', 'Status', 'Price']
      tableData = appointments.map(apt => [
        format(parseISO(apt.start_time), 'MM/dd/yyyy'),
        format(parseISO(apt.start_time), 'h:mm a'),
        apt.service?.name || 'N/A',
        apt.status,
        `$${apt.total_price.toFixed(2)}`
      ])
      break
      
    case 'revenue-summary':
      // Group by date and calculate daily totals
      const revenueByDate = appointments.reduce((acc, apt) => {
        const date = format(parseISO(apt.start_time), 'yyyy-MM-dd')
        if (!acc[date]) acc[date] = { count: 0, revenue: 0 }
        acc[date].count++
        acc[date].revenue += apt.total_price
        return acc
      }, {} as Record<string, { count: number; revenue: number }>)
      
      columns = ['Date', 'Appointments', 'Revenue', 'Average']
      tableData = Object.entries(revenueByDate).map(([date, data]) => [
        format(parseISO(date), 'MM/dd/yyyy'),
        data.count.toString(),
        `$${data.revenue.toFixed(2)}`,
        `$${(data.revenue / data.count).toFixed(2)}`
      ])
      break
      
    case 'service-analytics':
      // Group by service
      const serviceStats = appointments.reduce((acc, apt) => {
        const serviceName = apt.service?.name || 'Unknown'
        if (!acc[serviceName]) acc[serviceName] = { count: 0, revenue: 0 }
        acc[serviceName].count++
        acc[serviceName].revenue += apt.total_price
        return acc
      }, {} as Record<string, { count: number; revenue: number }>)
      
      columns = ['Service', 'Count', 'Total Revenue', 'Avg Price']
      tableData = Object.entries(serviceStats).map(([service, data]) => [
        service,
        data.count.toString(),
        `$${data.revenue.toFixed(2)}`,
        `$${(data.revenue / data.count).toFixed(2)}`
      ])
      break
      
    case 'business-metrics':
      // Calculate 6FB metrics
      const totalRevenue = appointments.reduce((sum, apt) => sum + apt.total_price, 0)
      const uniqueClients = new Set(appointments.map(apt => apt.client_id)).size
      const avgRevenuePerClient = totalRevenue / (uniqueClients || 1)
      const completedAppts = appointments.filter(apt => apt.status === 'completed').length
      const completionRate = (completedAppts / appointments.length) * 100
      
      columns = ['Metric', 'Value']
      tableData = [
        ['Total Revenue', `$${totalRevenue.toFixed(2)}`],
        ['Total Appointments', appointments.length.toString()],
        ['Unique Clients', uniqueClients.toString()],
        ['Average Revenue per Client', `$${avgRevenuePerClient.toFixed(2)}`],
        ['Completed Appointments', completedAppts.toString()],
        ['Completion Rate', `${completionRate.toFixed(1)}%`],
        ['Average Service Price', `$${(totalRevenue / appointments.length).toFixed(2)}`]
      ]
      break
      
    case 'tax-report':
      // Monthly summary for tax purposes
      const taxSummary = appointments.reduce((acc, apt) => {
        const month = format(parseISO(apt.start_time), 'yyyy-MM')
        if (!acc[month]) acc[month] = { revenue: 0, count: 0 }
        acc[month].revenue += apt.total_price
        acc[month].count++
        return acc
      }, {} as Record<string, { revenue: number; count: number }>)
      
      columns = ['Month', 'Appointments', 'Gross Revenue', 'Tax (est. 30%)']
      tableData = Object.entries(taxSummary).map(([month, data]) => [
        format(parseISO(month + '-01'), 'MMMM yyyy'),
        data.count.toString(),
        `$${data.revenue.toFixed(2)}`,
        `$${(data.revenue * 0.3).toFixed(2)}`
      ])
      break
      
    case 'marketing-insights':
      // Client acquisition and retention metrics
      const clientAppointments = appointments.reduce((acc, apt) => {
        if (!apt.client_id) return acc
        if (!acc[apt.client_id]) acc[apt.client_id] = []
        acc[apt.client_id].push(apt)
        return acc
      }, {} as Record<number, Appointment[]>)
      
      const retentionData = Object.values(clientAppointments).map(appts => ({
        visits: appts.length,
        totalSpent: appts.reduce((sum, apt) => sum + apt.total_price, 0),
        firstVisit: Math.min(...appts.map(apt => parseISO(apt.start_time).getTime())),
        lastVisit: Math.max(...appts.map(apt => parseISO(apt.start_time).getTime()))
      }))
      
      const avgVisitsPerClient = retentionData.reduce((sum, d) => sum + d.visits, 0) / retentionData.length
      const avgSpendPerClient = retentionData.reduce((sum, d) => sum + d.totalSpent, 0) / retentionData.length
      const returningClients = retentionData.filter(d => d.visits > 1).length
      const retentionRate = (returningClients / retentionData.length) * 100
      
      columns = ['Metric', 'Value']
      tableData = [
        ['Total Unique Clients', retentionData.length.toString()],
        ['Returning Clients', returningClients.toString()],
        ['Retention Rate', `${retentionRate.toFixed(1)}%`],
        ['Average Visits per Client', avgVisitsPerClient.toFixed(1)],
        ['Average Spend per Client', `$${avgSpendPerClient.toFixed(2)}`],
        ['New Clients (1 visit)', (retentionData.length - returningClients).toString()]
      ]
      break
  }
  
  // Add table to PDF
  doc.autoTable({
    head: [columns],
    body: tableData,
    startY: 55,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255]
    }
  })
  
  // Add summary footer
  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.text(`Total Appointments: ${appointments.length}`, 14, finalY)
  doc.text(`Total Revenue: $${appointments.reduce((sum, apt) => sum + apt.total_price, 0).toFixed(2)}`, 14, finalY + 7)
  
  // Add 6FB branding
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text('Generated by BookedBarber - Six Figure Barber Program', 105, 280, { align: 'center' })
  
  return doc.output('blob')
}

/**
 * Export appointments as JSON
 */
export function exportToJSON(
  appointments: Appointment[],
  includeOptions: ExportConfig['includeOptions']
): string {
  const processedAppointments = appointments.map(apt => {
    const data: any = {
      id: apt.id,
      start_time: apt.start_time,
      end_time: apt.end_time,
      status: apt.status,
      created_at: apt.created_at,
      updated_at: apt.updated_at
    }
    
    if (includeOptions?.clientInfo && apt.client) {
      data.client = {
        id: apt.client.id,
        name: apt.client.name,
        email: apt.client.email,
        phone: apt.client.phone
      }
    }
    
    if (includeOptions?.serviceDetails && apt.service) {
      data.service = {
        id: apt.service.id,
        name: apt.service.name,
        description: apt.service.description,
        duration: apt.service.duration,
        price: apt.service.price
      }
    }
    
    if (includeOptions?.barberInfo && apt.barber) {
      data.barber = {
        id: apt.barber.id,
        name: apt.barber.name,
        email: apt.barber.email,
        location: apt.barber.location
      }
    }
    
    if (includeOptions?.notes) {
      data.notes = apt.notes
    }
    
    if (includeOptions?.pricing) {
      data.total_price = apt.total_price
    }
    
    if (includeOptions?.analytics) {
      // Add calculated metrics
      const startDate = parseISO(apt.start_time)
      data.analytics = {
        dayOfWeek: format(startDate, 'EEEE'),
        timeOfDay: format(startDate, 'HH:mm'),
        month: format(startDate, 'MMMM'),
        year: format(startDate, 'yyyy'),
        duration_minutes: apt.service?.duration || 0,
        is_completed: apt.status === 'completed',
        is_cancelled: apt.status === 'cancelled',
        is_no_show: apt.status === 'no_show'
      }
    }
    
    return data
  })
  
  const exportData = {
    export_date: new Date().toISOString(),
    appointment_count: appointments.length,
    total_revenue: appointments.reduce((sum, apt) => sum + apt.total_price, 0),
    date_range: {
      start: appointments.length > 0 ? 
        Math.min(...appointments.map(apt => parseISO(apt.start_time).getTime())) : null,
      end: appointments.length > 0 ? 
        Math.max(...appointments.map(apt => parseISO(apt.end_time).getTime())) : null
    },
    appointments: processedAppointments
  }
  
  return JSON.stringify(exportData, null, 2)
}

/**
 * Save export configuration for reuse
 */
export function saveExportConfig(
  config: ExportConfig,
  name: string
): void {
  const savedConfigs = getSavedExportConfigs()
  savedConfigs[name] = {
    ...config,
    savedAt: new Date().toISOString()
  }
  localStorage.setItem('bookedbarber_export_configs', JSON.stringify(savedConfigs))
}

/**
 * Get saved export configurations
 */
export function getSavedExportConfigs(): Record<string, ExportConfig & { savedAt: string }> {
  try {
    const saved = localStorage.getItem('bookedbarber_export_configs')
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

/**
 * Delete saved export configuration
 */
export function deleteSavedExportConfig(name: string): void {
  const savedConfigs = getSavedExportConfigs()
  delete savedConfigs[name]
  localStorage.setItem('bookedbarber_export_configs', JSON.stringify(savedConfigs))
}

/**
 * Save export to history
 */
export function saveExportHistory(entry: Omit<ExportHistoryEntry, 'id'>): void {
  const history = getExportHistory()
  const newEntry: ExportHistoryEntry = {
    ...entry,
    id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  history.unshift(newEntry)
  // Keep only last 50 entries
  if (history.length > 50) {
    history.splice(50)
  }
  localStorage.setItem('bookedbarber_export_history', JSON.stringify(history))
}

/**
 * Get export history
 */
export function getExportHistory(): ExportHistoryEntry[] {
  try {
    const saved = localStorage.getItem('bookedbarber_export_history')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

/**
 * Clear export history
 */
export function clearExportHistory(): void {
  localStorage.removeItem('bookedbarber_export_history')
}

/**
 * Email export functionality (requires backend integration)
 */
export async function emailExport(
  exportBlob: Blob,
  fileName: string,
  emailOptions: ExportConfig['emailOptions']
): Promise<{ success: boolean; message: string }> {
  // This would integrate with your backend email service
  // For now, we'll create a mailto link as a fallback
  
  const formData = new FormData()
  formData.append('file', exportBlob, fileName)
  formData.append('recipients', JSON.stringify(emailOptions?.recipients || []))
  formData.append('subject', emailOptions?.subject || 'BookedBarber Export')
  formData.append('message', emailOptions?.message || '')
  
  try {
    // TODO: Replace with actual API endpoint
    const response = await fetch('/api/v2/exports/email', {
      method: 'POST',
      body: formData
    })
    
    if (response.ok) {
      return { success: true, message: 'Export emailed successfully' }
    } else {
      throw new Error('Failed to email export')
    }
  } catch (error) {
    // Fallback: Create mailto link
    const subject = encodeURIComponent(emailOptions?.subject || 'BookedBarber Export')
    const body = encodeURIComponent(
      `${emailOptions?.message || 'Please find the BookedBarber export attached.'}\n\n` +
      `Note: The export file needs to be manually attached to this email.`
    )
    const recipients = emailOptions?.recipients?.join(',') || ''
    
    window.location.href = `mailto:${recipients}?subject=${subject}&body=${body}`
    
    return { 
      success: false, 
      message: 'Email client opened. Please attach the downloaded export file manually.' 
    }
  }
}

/**
 * Schedule recurring export (requires backend integration)
 */
export async function scheduleRecurringExport(
  config: ExportConfig
): Promise<{ success: boolean; scheduleId?: string; message: string }> {
  try {
    // TODO: Replace with actual API endpoint
    const response = await fetch('/api/v2/exports/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    
    if (response.ok) {
      const data = await response.json()
      return { 
        success: true, 
        scheduleId: data.schedule_id,
        message: 'Export scheduled successfully' 
      }
    } else {
      throw new Error('Failed to schedule export')
    }
  } catch (error) {
    // Save to local storage as fallback
    const schedules = getScheduledExports()
    const scheduleId = `schedule_${Date.now()}`
    schedules[scheduleId] = {
      ...config,
      createdAt: new Date().toISOString()
    }
    localStorage.setItem('bookedbarber_scheduled_exports', JSON.stringify(schedules))
    
    return { 
      success: false, 
      scheduleId,
      message: 'Export schedule saved locally. Backend integration required for automatic execution.' 
    }
  }
}

/**
 * Get scheduled exports
 */
export function getScheduledExports(): Record<string, ExportConfig & { createdAt: string }> {
  try {
    const saved = localStorage.getItem('bookedbarber_scheduled_exports')
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

/**
 * Delete scheduled export
 */
export function deleteScheduledExport(scheduleId: string): void {
  const schedules = getScheduledExports()
  delete schedules[scheduleId]
  localStorage.setItem('bookedbarber_scheduled_exports', JSON.stringify(schedules))
}