import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ServiceQuickActionsProps {
  className?: string
}

export const ServiceQuickActions: React.FC<ServiceQuickActionsProps> = ({ className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button className="w-full">
            Add New Service
          </Button>
          <Button variant="outline" className="w-full">
            Import Services
          </Button>
          <Button variant="outline" className="w-full">
            View Templates
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}