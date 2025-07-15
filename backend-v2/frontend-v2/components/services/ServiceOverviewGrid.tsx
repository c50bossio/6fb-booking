import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ServiceOverviewGridProps {
  className?: string
}

export const ServiceOverviewGrid: React.FC<ServiceOverviewGridProps> = ({ className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>Total Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">12</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active services</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Popular Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">5</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">High demand</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">$2,450</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">This month</p>
        </CardContent>
      </Card>
    </div>
  )
}