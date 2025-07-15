import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'

interface SixFBComplianceDashboardProps {
  className?: string
}

export const SixFBComplianceDashboard: React.FC<SixFBComplianceDashboardProps> = ({ className = '' }) => {
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Six Figure Barber Compliance Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold">Business Structure</h3>
              <div className="flex justify-between items-center">
                <span>Service Pricing</span>
                <Badge variant="default">Compliant</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Booking Process</span>
                <Badge variant="default">Compliant</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Client Management</span>
                <Badge variant="secondary">Review Needed</Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold">Revenue Optimization</h3>
              <div className="flex justify-between items-center">
                <span>Upselling Framework</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Package Pricing</span>
                <Badge variant="default">Optimized</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Retention Strategy</span>
                <Badge variant="secondary">Needs Setup</Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold">Analytics & Tracking</h3>
              <div className="flex justify-between items-center">
                <span>Revenue Tracking</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Client Analytics</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>6FB Reporting</span>
                <Badge variant="secondary">Setup Required</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SixFBComplianceDashboard