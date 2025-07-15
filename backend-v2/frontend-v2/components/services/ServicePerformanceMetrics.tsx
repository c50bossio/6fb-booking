import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ServicePerformanceMetricsProps {
  className?: string
}

export const ServicePerformanceMetrics: React.FC<ServicePerformanceMetricsProps> = ({ className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">89%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold">4.7</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">$65</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Revenue</div>
            </div>
            <div>
              <div className="text-2xl font-bold">92%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Rebooking Rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}