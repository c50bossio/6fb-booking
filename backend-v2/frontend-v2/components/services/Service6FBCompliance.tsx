import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Service6FBComplianceProps {
  className?: string
}

export const Service6FBCompliance: React.FC<Service6FBComplianceProps> = ({ className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>6FB Compliance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Pricing Structure</span>
            <Badge variant="default">Compliant</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Service Categories</span>
            <Badge variant="default">Compliant</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Time Allocations</span>
            <Badge variant="secondary">Review Needed</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}