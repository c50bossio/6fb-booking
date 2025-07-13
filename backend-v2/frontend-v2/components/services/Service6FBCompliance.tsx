import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Service {
  id: number
  name: string
  base_price: number
  is_active: boolean
}

interface ComplianceData {
  score: number
  tier: string
  opportunities: string[]
}

interface Service6FBComplianceProps {
  services: Service[]
  compliance?: ComplianceData
  onImprove: () => void
  className?: string
}

export const Service6FBCompliance: React.FC<Service6FBComplianceProps> = ({ 
  services, 
  compliance, 
  onImprove, 
  className = '' 
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>6FB Compliance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">{compliance?.score || 0}%</div>
            <Badge variant={
              compliance?.tier === 'elite' ? 'success' :
              compliance?.tier === 'growth' ? 'warning' : 'default'
            }>
              {compliance?.tier?.toUpperCase() || 'FOUNDATION'}
            </Badge>
          </div>
          
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
          
          {compliance?.opportunities && compliance.opportunities.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Opportunities:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {compliance.opportunities.map((opportunity, index) => (
                  <li key={index}>• {opportunity}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}