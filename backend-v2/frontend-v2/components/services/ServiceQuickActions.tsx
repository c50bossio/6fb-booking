import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface Service {
  id: number
  name: string
  is_active: boolean
}

interface ServiceQuickActionsProps {
  services: Service[]
  onActionComplete: () => void
  className?: string
}

export const ServiceQuickActions: React.FC<ServiceQuickActionsProps> = ({ 
  services, 
  onActionComplete, 
  className = '' 
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button className="w-full" onClick={() => onActionComplete()}>
            Add New Service
          </Button>
          <Button variant="outline" className="w-full" onClick={() => onActionComplete()}>
            Import Services
          </Button>
          <Button variant="outline" className="w-full" onClick={() => onActionComplete()}>
            View Templates
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}