'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Bot, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function AgentsPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Simplified for debugging
  const mockAgents = [
    {
      id: 1,
      name: 'Rebooking Agent',
      status: 'active',
      total_conversations: 45,
      successful_conversations: 38,
      total_revenue_generated: 2850
    },
    {
      id: 2,
      name: 'Birthday Agent',
      status: 'paused',
      total_conversations: 12,
      successful_conversations: 8,
      total_revenue_generated: 960
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Agents
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Automate your barbershop operations with intelligent AI agents
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => router.push('/agents/analytics')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          
          <Button onClick={() => setLoading(!loading)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mockAgents.map((agent) => (
            <Card key={agent.id} className="p-6">
              <h3 className="font-semibold mb-2">{agent.name}</h3>
              <p className="text-sm text-gray-600 mb-4">Status: {agent.status}</p>
              <div className="space-y-2 text-sm">
                <div>Conversations: {agent.total_conversations}</div>
                <div>Successful: {agent.successful_conversations}</div>
                <div>Revenue: ${agent.total_revenue_generated}</div>
              </div>
              <div className="mt-4 flex space-x-2">
                <Button size="sm">Activate</Button>
                <Button size="sm" variant="outline">Settings</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Debug Info</h3>
        <p className="text-sm text-blue-700">
          This is a simplified version of the agents page for debugging. 
          If you can see this, the page is rendering correctly.
        </p>
        <p className="text-sm text-blue-700 mt-2">
          Frontend URL: http://localhost:3002/agents
        </p>
      </div>
    </div>
  )
}