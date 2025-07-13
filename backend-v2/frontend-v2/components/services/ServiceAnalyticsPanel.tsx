import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface Service {
  id: number
  name: string
  category: string
  base_price: number
  is_active: boolean
}

interface ServiceMetrics {
  totalServices: number
  totalRevenue: number
  totalBookings: number
}

interface ServiceAnalyticsPanelProps {
  services: Service[]
  metrics: ServiceMetrics | null
  dateRange: string
  onDateRangeChange: (range: string) => void
  className?: string
}

export const ServiceAnalyticsPanel: React.FC<ServiceAnalyticsPanelProps> = ({ 
  services, 
  metrics, 
  dateRange, 
  onDateRangeChange, 
  className = '' 
}) => {
  return (
    <div className={className}>
      <div className="mb-6">
        <select 
          value={dateRange} 
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${metrics?.totalRevenue || 0}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last {dateRange}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.totalBookings || 0}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Active Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{services.filter(s => s.is_active).length}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Out of {services.length} total</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}