import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface Service {
  id: number
  name: string
  is_active: boolean
}

interface ServiceBulkOperationsProps {
  services: Service[]
  selectedServices: number[]
  onBulkAction: (action: string) => void
  className?: string
}

export const ServiceBulkOperations: React.FC<ServiceBulkOperationsProps> = ({ 
  services, 
  selectedServices, 
  onBulkAction, 
  className = '' 
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Bulk Operations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
          </p>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onBulkAction('update-prices')}
            disabled={selectedServices.length === 0}
          >
            Update Prices
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onBulkAction('export')}
            disabled={selectedServices.length === 0}
          >
            Export Services
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => onBulkAction('duplicate')}
            disabled={selectedServices.length === 0}
          >
            Duplicate Services
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}