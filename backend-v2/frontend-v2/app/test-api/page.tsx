'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function TestAPIPage() {
  const [results, setResults] = useState<any[]>([])

  const addResult = (test: string, success: boolean, detail: string) => {
    setResults(prev => [...prev, { test, success, detail, timestamp: new Date().toISOString() }])
  }

  const runTests = async () => {
    setResults([])
    
    // Test 1: Direct fetch to backend health
    try {
      addResult('Backend Health Check', true, 'Starting...')
      const healthRes = await fetch('http://localhost:8000/health')
      const healthData = await healthRes.json()
      addResult('Backend Health Check', true, `Status: ${healthRes.status}, Data: ${JSON.stringify(healthData)}`)
    } catch (error: any) {
      addResult('Backend Health Check', false, `Error: ${error.message}`)
    }

    // Test 2: Check localStorage for token
    const token = localStorage.getItem('token')
    addResult('Token Check', !!token, token ? `Token exists (length: ${token.length})` : 'No token found')

    // Test 3: Test authenticated endpoint
    if (token) {
      try {
        const meRes = await fetch('http://localhost:8000/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        const meData = await meRes.json()
        addResult('Auth Check', meRes.ok, `Status: ${meRes.status}, User: ${JSON.stringify(meData)}`)
      } catch (error: any) {
        addResult('Auth Check', false, `Error: ${error.message}`)
      }
    }

    // Test 4: Test appointments endpoint
    try {
      const apptRes = await fetch('http://localhost:8000/api/v1/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const apptData = await apptRes.json()
      addResult('Appointments API', apptRes.ok, `Status: ${apptRes.status}, Count: ${apptData.appointments?.length || 0}`)
    } catch (error: any) {
      addResult('Appointments API', false, `Error: ${error.message}`)
    }

    // Test 5: Test slots endpoint
    try {
      const today = new Date().toISOString().split('T')[0]
      const slotsRes = await fetch(`http://localhost:8000/api/v1/appointments/slots?appointment_date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const slotsData = await slotsRes.json()
      addResult('Slots API', slotsRes.ok, `Status: ${slotsRes.status}, Available slots: ${slotsData.slots?.length || 0}`)
    } catch (error: any) {
      addResult('Slots API', false, `Error: ${error.message}`)
    }

    // Test 6: Test API through the api.ts module
    try {
      const { getAvailableSlots } = await import('@/lib/api')
      const today = new Date().toISOString().split('T')[0]
      const slots = await getAvailableSlots({ date: today })
      addResult('API Module Test', true, `Slots received: ${slots.slots?.length || 0}`)
    } catch (error: any) {
      addResult('API Module Test', false, `Error: ${error.message}`)
    }
  }

  const clearAuth = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    setResults([])
    addResult('Clear Auth', true, 'Authentication data cleared')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Connection Test</h1>
      
      <div className="flex gap-4 mb-6">
        <Button onClick={runTests}>Run All Tests</Button>
        <Button variant="secondary" onClick={clearAuth}>Clear Auth Data</Button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <Card key={index} className={`p-4 ${result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-start gap-3">
              <div className={`text-2xl ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.success ? '✓' : '✗'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{result.test}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{result.detail}</p>
                <p className="text-xs text-gray-500 mt-1">{result.timestamp}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside text-sm space-y-1">
          <li>Make sure both backend (port 8000) and frontend (port 3001) are running</li>
          <li>Click "Run All Tests" to check connectivity</li>
          <li>If you see CORS errors, check the browser console</li>
          <li>If authentication fails, try logging in again at /login</li>
          <li>Use "Clear Auth Data" to reset and try fresh login</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2">Environment Info:</h3>
        <pre className="text-xs">
{`API URL: ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
Current URL: ${typeof window !== 'undefined' ? window.location.href : 'SSR'}
Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR'}`}
        </pre>
      </div>
    </div>
  )
}