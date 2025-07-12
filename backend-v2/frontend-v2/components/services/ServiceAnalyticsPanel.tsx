import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ServiceAnalyticsPanelProps {
  className?: string
}

export const ServiceAnalyticsPanel: React.FC<ServiceAnalyticsPanelProps> = ({ className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Service Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Booking Rate</span>
            <span className="font-semibold">78%</span>
          </div>
          <div className="flex justify-between">
            <span>Average Duration</span>
            <span className="font-semibold">45 min</span>
          </div>
          <div className="flex justify-between">
            <span>Customer Satisfaction</span>
            <span className="font-semibold">4.8/5</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}