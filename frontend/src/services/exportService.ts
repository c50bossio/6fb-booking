import { CalendarAppointment, Barber, Service } from '@/components/calendar/RobustCalendar'
import { SearchResult } from './searchService'

// ===== TYPES =====

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel'
  filename?: string
  includeHeaders?: boolean
  columns?: string[]
  dateFormat?: string
  timezone?: string
}

export interface ExportColumn {
  key: string
  label: string
  format?: (value: any, appointment: CalendarAppointment) => string
}

// ===== DEFAULT COLUMNS =====

const defaultColumns: ExportColumn[] = [
  { key: 'date', label: 'Date', format: (value) => new Date(value).toLocaleDateString() },
  { key: 'startTime', label: 'Start Time' },
  { key: 'endTime', label: 'End Time' },
  { key: 'client', label: 'Client Name' },
  { key: 'clientPhone', label: 'Phone' },
  { key: 'clientEmail', label: 'Email' },
  { key: 'barber', label: 'Barber' },
  { key: 'service', label: 'Service' },
  { key: 'duration', label: 'Duration (min)' },
  { key: 'price', label: 'Price', format: (value) => `$${value.toFixed(2)}` },
  { key: 'status', label: 'Status', format: (value) => value.charAt(0).toUpperCase() + value.slice(1) },
  { key: 'paymentStatus', label: 'Payment Status', format: (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A' },
  { key: 'notes', label: 'Notes' }
]

// ===== EXPORT SERVICE CLASS =====

export class ExportService {

  // ===== UNIFIED EXPORT METHOD =====

  exportToFormat(
    appointments: CalendarAppointment[] | SearchResult<CalendarAppointment>[],
    format: 'csv' | 'pdf' | 'excel',
    options?: { barbers?: Barber[], services?: Service[] }
  ): void {
    switch (format) {
      case 'csv':
        this.exportToCSV(appointments)
        break
      case 'pdf':
        this.exportToPDF(appointments, { format: 'pdf' }, options?.barbers, options?.services)
        break
      case 'excel':
        this.exportToExcel(appointments)
        break
    }
  }

  // ===== CSV EXPORT =====

  exportToCSV(
    appointments: CalendarAppointment[] | SearchResult<CalendarAppointment>[],
    options: ExportOptions = { format: 'csv', includeHeaders: true }
  ): void {
    const data = this.prepareData(appointments)
    const columns = this.getColumns(options.columns)

    // Build CSV content
    let csvContent = ''

    // Add headers if requested
    if (options.includeHeaders !== false) {
      csvContent += columns.map(col => this.escapeCSV(col.label)).join(',') + '\n'
    }

    // Add data rows
    data.forEach(appointment => {
      const row = columns.map(col => {
        const value = appointment[col.key as keyof CalendarAppointment]
        const formatted = col.format ? col.format(value, appointment) : value
        return this.escapeCSV(String(formatted || ''))
      })
      csvContent += row.join(',') + '\n'
    })

    // Download file
    this.downloadFile(
      csvContent,
      options.filename || `appointments_${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    )
  }

  // ===== PDF EXPORT =====

  async exportToPDF(
    appointments: CalendarAppointment[] | SearchResult<CalendarAppointment>[],
    options: ExportOptions = { format: 'pdf' },
    barbers?: Barber[],
    services?: Service[]
  ): Promise<void> {
    const data = this.prepareData(appointments)
    const columns = this.getColumns(options.columns)

    // Create PDF content using HTML
    const html = this.generatePDFHTML(data, columns, options, barbers, services)

    // Create a hidden iframe to print
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    // Write content to iframe
    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()

      // Wait for content to load then print
      iframe.onload = () => {
        iframe.contentWindow?.print()
        // Remove iframe after a delay
        setTimeout(() => {
          document.body.removeChild(iframe)
        }, 1000)
      }
    }
  }

  // ===== EXCEL EXPORT =====

  exportToExcel(
    appointments: CalendarAppointment[] | SearchResult<CalendarAppointment>[],
    options: ExportOptions = { format: 'excel' }
  ): void {
    const data = this.prepareData(appointments)
    const columns = this.getColumns(options.columns)

    // Create table HTML for Excel
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'
    html += '<head><meta charset="utf-8"><title>Appointments Export</title></head>'
    html += '<body><table border="1">'

    // Add headers
    html += '<thead><tr>'
    columns.forEach(col => {
      html += `<th style="background-color:#8b5cf6;color:white;font-weight:bold;padding:10px;">${col.label}</th>`
    })
    html += '</tr></thead>'

    // Add data rows
    html += '<tbody>'
    data.forEach((appointment, index) => {
      html += `<tr style="background-color:${index % 2 === 0 ? '#f9fafb' : 'white'}">`
      columns.forEach(col => {
        const value = appointment[col.key as keyof CalendarAppointment]
        const formatted = col.format ? col.format(value, appointment) : value
        html += `<td style="padding:8px;">${formatted || ''}</td>`
      })
      html += '</tr>'
    })
    html += '</tbody></table></body></html>'

    // Download as Excel file
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const filename = options.filename || `appointments_${new Date().toISOString().split('T')[0]}.xls`

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ===== HELPER METHODS =====

  private prepareData(
    appointments: CalendarAppointment[] | SearchResult<CalendarAppointment>[]
  ): CalendarAppointment[] {
    // Extract appointments from SearchResult if needed
    if (appointments.length > 0 && 'item' in appointments[0]) {
      return (appointments as SearchResult<CalendarAppointment>[]).map(result => result.item)
    }
    return appointments as CalendarAppointment[]
  }

  private getColumns(customColumns?: string[]): ExportColumn[] {
    if (customColumns && customColumns.length > 0) {
      return defaultColumns.filter(col => customColumns.includes(col.key))
    }
    return defaultColumns
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  private generatePDFHTML(
    appointments: CalendarAppointment[],
    columns: ExportColumn[],
    options: ExportOptions,
    barbers?: Barber[],
    services?: Service[]
  ): string {
    const title = options.filename?.replace(/\.pdf$/, '') || 'Appointments Report'
    const date = new Date().toLocaleDateString()

    // Calculate summary statistics
    const totalAppointments = appointments.length
    const totalRevenue = appointments.reduce((sum, apt) => sum + apt.price, 0)
    const confirmedCount = appointments.filter(apt => apt.status === 'confirmed').length
    const paidCount = appointments.filter(apt => apt.paymentStatus === 'paid').length

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: Arial, sans-serif; font-size: 12px; }
          h1 { color: #8b5cf6; margin-bottom: 10px; }
          .header { margin-bottom: 20px; }
          .summary { margin-bottom: 20px; padding: 15px; background-color: #f9fafb; border-radius: 8px; }
          .summary-item { display: inline-block; margin-right: 30px; }
          .summary-label { font-weight: bold; color: #6b7280; }
          .summary-value { font-size: 18px; color: #1f2937; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #8b5cf6; color: white; padding: 10px; text-align: left; font-weight: bold; }
          td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .status-confirmed { color: #10b981; font-weight: bold; }
          .status-pending { color: #f59e0b; font-weight: bold; }
          .status-cancelled { color: #ef4444; font-weight: bold; }
          .status-completed { color: #3b82f6; font-weight: bold; }
          .payment-paid { color: #10b981; }
          .payment-unpaid { color: #ef4444; }
          .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>Generated on ${date}</p>
        </div>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total Appointments</div>
            <div class="summary-value">${totalAppointments}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Revenue</div>
            <div class="summary-value">$${totalRevenue.toFixed(2)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Confirmed</div>
            <div class="summary-value">${confirmedCount}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Paid</div>
            <div class="summary-value">${paidCount}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
    `

    // Add table headers
    columns.forEach(col => {
      html += `<th>${col.label}</th>`
    })

    html += `
            </tr>
          </thead>
          <tbody>
    `

    // Add data rows
    appointments.forEach(appointment => {
      html += '<tr>'
      columns.forEach(col => {
        const value = appointment[col.key as keyof CalendarAppointment]
        const formatted = col.format ? col.format(value, appointment) : value

        // Apply special styling for status columns
        let cellClass = ''
        if (col.key === 'status') {
          cellClass = `class="status-${value}"`
        } else if (col.key === 'paymentStatus') {
          cellClass = `class="payment-${value}"`
        }

        html += `<td ${cellClass}>${formatted || ''}</td>`
      })
      html += '</tr>'
    })

    html += `
          </tbody>
        </table>

        <div class="footer">
          <p>© ${new Date().getFullYear()} Six Figure Barber - Appointment Management System</p>
        </div>
      </body>
      </html>
    `

    return html
  }

  // ===== ANALYTICS EXPORT =====

  exportAnalytics(
    analytics: any,
    format: 'csv' | 'json' = 'json',
    filename?: string
  ): void {
    const defaultFilename = `search_analytics_${new Date().toISOString().split('T')[0]}`

    if (format === 'json') {
      const content = JSON.stringify(analytics, null, 2)
      this.downloadFile(
        content,
        filename || `${defaultFilename}.json`,
        'application/json'
      )
    } else {
      // Convert analytics to CSV format
      const rows = [
        ['Metric', 'Value'],
        ['Total Searches', analytics.totalSearches],
        ['Average Search Time (ms)', analytics.averageSearchTime.toFixed(2)],
        ['Average Result Count', analytics.averageResultCount.toFixed(1)],
        ['Click Through Rate (%)', analytics.clickThroughRate.toFixed(1)],
        ['', ''],
        ['Popular Queries', 'Count']
      ]

      analytics.popularQueries.forEach((query: any) => {
        rows.push([query.query, query.count])
      })

      const csvContent = rows.map(row => row.join(',')).join('\n')
      this.downloadFile(
        csvContent,
        filename || `${defaultFilename}.csv`,
        'text/csv'
      )
    }
  }
}

// ===== SINGLETON INSTANCE =====

export const exportService = new ExportService()
