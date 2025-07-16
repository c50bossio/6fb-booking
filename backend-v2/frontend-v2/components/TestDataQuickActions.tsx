'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/hooks/use-toast'
import { fetchAPI } from '@/lib/api'

// Icons
const BeakerIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 11.172V5l-1-1z" />
  </svg>
)

const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

interface TestDataQuickActionsProps {
  userRole?: string | null
  className?: string
}

export function TestDataQuickActions({ userRole, className = '' }: TestDataQuickActionsProps) {
  const [loading, setLoading] = useState(false)

  // Only show for admin roles
  const allowedRoles = ['admin', 'super_admin', 'shop_owner', 'enterprise_owner']
  if (!userRole || !allowedRoles.includes(userRole)) {
    return null
  }

  const handleQuickCreate = async () => {
    setLoading(true)
    try {
      await fetchAPI('/api/v1/test-data/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customization: {
            client_count: 10,
            appointment_count: 20,
            payment_count: 10,
            start_date_days_ago: 30,
            end_date_days_ahead: 14,
            include_enterprise: false,
            location_count: 1,
            vip_client_percentage: 20,
            new_client_percentage: 30
          }
        })
      })
      toast({
        title: 'Success',
        description: 'Quick test data created successfully! (10 clients, 20 appointments)',
      })
    } catch (error) {
      console.error('Failed to create test data:', error)
      toast({
        title: 'Error',
        description: 'Failed to create test data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickRefresh = async () => {
    setLoading(true)
    try {
      await fetchAPI('/api/v1/test-data/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })
      toast({
        title: 'Success',
        description: 'Test data refreshed successfully!',
      })
    } catch (error) {
      console.error('Failed to refresh test data:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh test data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BeakerIcon />
          Test Data
          <Badge variant="secondary" className="text-xs">
            DEV
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleQuickCreate}
            disabled={loading}
            className="flex items-center gap-2 text-xs"
          >
            <DatabaseIcon />
            Quick Create
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleQuickRefresh}
            disabled={loading}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshIcon />
            Refresh
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Quick access to test data management for development
        </p>
      </CardContent>
    </Card>
  )
}

export default TestDataQuickActions