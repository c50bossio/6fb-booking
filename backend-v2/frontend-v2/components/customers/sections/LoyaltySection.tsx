import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

interface LoyaltySectionProps {
  userRole?: string
}

export default function LoyaltySection({ userRole }: LoyaltySectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Program</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Loyalty program features coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}