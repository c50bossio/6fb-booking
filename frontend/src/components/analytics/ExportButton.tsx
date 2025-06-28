'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, FileText, FileSpreadsheet, Loader } from 'lucide-react'
import { format } from 'date-fns'

interface ExportButtonProps {
  data: any
  dateRange: { from: Date; to: Date }
}

export function ExportButton({ data, dateRange }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const exportData = async (format: 'csv' | 'pdf' | 'excel') => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({
        format,
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd')
      })

      const response = await fetch(`/api/v1/analytics/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-report-${format(new Date(), 'yyyy-MM-dd')}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
      setIsOpen(false)
    }
  }

  const exportOptions = [
    {
      format: 'csv' as const,
      label: 'Export as CSV',
      icon: FileText,
      description: 'Comma-separated values for Excel'
    },
    {
      format: 'pdf' as const,
      label: 'Export as PDF',
      icon: FileText,
      description: 'Formatted report with charts'
    },
    {
      format: 'excel' as const,
      label: 'Export as Excel',
      icon: FileSpreadsheet,
      description: 'Excel workbook with multiple sheets'
    }
  ]

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="ml-2">Export</span>
      </Button>

      {isOpen && (
        <Card className="absolute top-full mt-2 right-0 p-2 z-50 shadow-lg w-64">
          {exportOptions.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.format}
                onClick={() => exportData(option.format)}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </Card>
      )}
    </div>
  )
}
