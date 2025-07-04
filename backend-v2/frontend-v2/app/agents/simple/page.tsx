'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function SimpleAgentsPage() {
  const [loading, setLoading] = useState(false)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Agents (Simple)
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Simplified agents page for debugging
          </p>
        </div>
        
        <Button onClick={() => setLoading(!loading)}>
          {loading ? 'Loading...' : 'Toggle Loading'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Test Agent 1</h3>
            <p className="text-sm text-gray-600">Rebooking Agent</p>
            <div className="mt-4 flex space-x-2">
              <Button size="sm">Activate</Button>
              <Button size="sm" variant="outline">Settings</Button>
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Test Agent 2</h3>
            <p className="text-sm text-gray-600">Birthday Wishes Agent</p>
            <div className="mt-4 flex space-x-2">
              <Button size="sm">Activate</Button>
              <Button size="sm" variant="outline">Settings</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}