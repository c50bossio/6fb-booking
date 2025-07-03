import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

interface CampaignsSectionProps {
  userRole?: string
}

export default function CampaignsSection({ userRole }: CampaignsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marketing Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Campaign management features coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}