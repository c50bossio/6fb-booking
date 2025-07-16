'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { CloudIcon, LinkIcon, CogIcon } from '@heroicons/react/24/outline'

export interface IntegrationsPanelProps {
  className?: string
}

export function IntegrationsPanel({ className }: IntegrationsPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CloudIcon className="w-5 h-5" />
          <span>Integrations</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Connect your business with popular tools and services.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <LinkIcon className="w-4 h-4" />
                <span className="font-medium">Google Calendar</span>
              </div>
              <p className="text-xs text-gray-500">Sync appointments with Google Calendar</p>
              <Button variant="outline" size="sm" className="w-full">
                Configure
              </Button>
            </div>
            
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <CogIcon className="w-4 h-4" />
                <span className="font-medium">Stripe Payments</span>
              </div>
              <p className="text-xs text-gray-500">Process payments and manage billing</p>
              <Button variant="outline" size="sm" className="w-full">
                Configure
              </Button>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="w-full">
            View All Integrations →
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default IntegrationsPanel