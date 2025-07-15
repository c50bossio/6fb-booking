import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface ServicePricingOptimizationProps {
  className?: string
}

export const ServicePricingOptimization: React.FC<ServicePricingOptimizationProps> = ({ className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Pricing Optimization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">Classic Cut</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current: $45</p>
              </div>
              <div className="text-right">
                <div className="text-green-600 font-medium">+$5</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Suggested</div>
              </div>
            </div>
            <Button size="sm" variant="outline" className="mt-2 w-full">Apply Suggestion</Button>
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">Beard Trim</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current: $25</p>
              </div>
              <div className="text-right">
                <div className="text-green-600 font-medium">+$3</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Suggested</div>
              </div>
            </div>
            <Button size="sm" variant="outline" className="mt-2 w-full">Apply Suggestion</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}