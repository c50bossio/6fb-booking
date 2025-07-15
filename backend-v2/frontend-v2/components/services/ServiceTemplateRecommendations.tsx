import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'

interface ServiceTemplateRecommendationsProps {
  className?: string
}

export const ServiceTemplateRecommendations: React.FC<ServiceTemplateRecommendationsProps> = ({ className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recommended Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border rounded-lg p-3">
            <h4 className="font-medium">Classic Cut Package</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Haircut + Wash + Style</p>
            <Button size="sm" variant="outline" className="mt-2">Apply Template</Button>
          </div>
          <div className="border rounded-lg p-3">
            <h4 className="font-medium">Premium Experience</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cut + Wash + Beard + Hot Towel</p>
            <Button size="sm" variant="outline" className="mt-2">Apply Template</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}