'use client'

import { useState } from 'react'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface WebhookTesterProps {
  selectedWebhookId: string | null
  onWebhookSelect: (id: string) => void
}

export default function WebhookTester({ selectedWebhookId, onWebhookSelect }: WebhookTesterProps) {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleTest = async () => {
    if (!selectedWebhookId) return
    
    setTesting(true)
    try {
      // Mock test implementation
      await new Promise(resolve => setTimeout(resolve, 1000))
      setResults({
        status: 'success',
        message: 'Webhook test completed successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setResults({
        status: 'error',
        message: 'Webhook test failed',
        timestamp: new Date().toISOString()
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Testing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!selectedWebhookId ? (
            <p className="text-gray-500">Select a webhook from the configuration tab to test it.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">Test webhook: {selectedWebhookId}</p>
              <Button onClick={handleTest} disabled={testing}>
                {testing ? 'Testing...' : 'Run Test'}
              </Button>
              {results && (
                <div className={`p-4 rounded-lg ${results.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`font-medium ${results.status === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {results.message}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{results.timestamp}</p>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}