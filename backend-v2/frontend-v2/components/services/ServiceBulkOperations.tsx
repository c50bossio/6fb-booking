import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ServiceBulkOperationsProps {
  className?: string
}

export const ServiceBulkOperations: React.FC<ServiceBulkOperationsProps> = ({ className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Bulk Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Button variant="outline" className="w-full">
            Update Prices
          </Button>
          <Button variant="outline" className="w-full">
            Export Services
          </Button>
          <Button variant="outline" className="w-full">
            Duplicate Services
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}