'use client'

import React, { useState } from 'react'

/**
 * Isolated debug page with minimal dependencies
 * Bypasses AppLayout, providers, and complex systems completely
 */
export default function AgentsDebugPage() {
  const [counter, setCounter] = useState(0)
  const [logs, setLogs] = useState<string[]>([])

  // Simple interaction test
  const handleClick = () => {
    setCounter(prev => prev + 1)
    setLogs(prev => [...prev, `Button clicked at ${new Date().toLocaleTimeString()}`])
    console.log('Debug page: Button clicked', counter + 1)
  }

  // Test async operation
  const handleAsyncTest = async () => {
    setLogs(prev => [...prev, 'Starting async test...'])
    console.log('Debug page: Starting async test')
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setLogs(prev => [...prev, 'Async test completed successfully'])
      console.log('Debug page: Async test completed')
    } catch (error) {
      setLogs(prev => [...prev, `Async test failed: ${error}`])
      console.error('Debug page: Async test failed', error)
    }
  }

  return (
    <div>
      <h1 style={{ color: '#1f2937', marginBottom: '16px' }}>
        🔬 Isolated Debug Page
      </h1>
      
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#ecfdf5', 
        border: '1px solid #10b981',
        borderRadius: '6px',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#065f46' }}>✅ Isolation Test</h2>
        <p style={{ margin: 0, color: '#047857' }}>
          If you can see this page without console errors, the issue is in the complex layout system.
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#374151', marginBottom: '12px' }}>Interactive Tests</h3>
        
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button 
            onClick={handleClick}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Click (Count: {counter})
          </button>
          
          <button 
            onClick={handleAsyncTest}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Async Operation
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#374151', marginBottom: '12px' }}>Environment Check</h3>
        <ul style={{ color: '#6b7280', fontSize: '14px' }}>
          <li>NODE_ENV: {process.env.NODE_ENV || 'undefined'}</li>
          <li>Next.js Version: {process.env.NEXT_PUBLIC_VERSION || 'unknown'}</li>
          <li>Timestamp: {new Date().toISOString()}</li>
          <li>User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent.substring(0, 50) + '...' : 'Server-side'}</li>
        </ul>
      </div>

      {logs.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#374151', marginBottom: '12px' }}>Activity Log</h3>
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            padding: '12px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {logs.map((log, index) => (
              <div key={index} style={{ 
                fontSize: '12px', 
                color: '#6b7280',
                marginBottom: '4px',
                fontFamily: 'monospace'
              }}>
                {index + 1}. {log}
              </div>
            ))}
          </div>
          <button
            onClick={() => setLogs([])}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Clear Logs
          </button>
        </div>
      )}

      <div style={{
        padding: '16px',
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '6px',
        fontSize: '14px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#92400e' }}>🔍 Debug Instructions</h4>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#a16207' }}>
          <li>Open browser developer tools (F12)</li>
          <li>Check the Console tab for any errors or warnings</li>
          <li>Click the test buttons above and monitor for new errors</li>
          <li>Compare error patterns with the complex `/agents/test` route</li>
          <li>If no errors here but errors on `/agents/test`, the layout system is the culprit</li>
        </ol>
      </div>

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <a 
          href="/agents/test"
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          ← Back to Complex Test Page
        </a>
      </div>
    </div>
  )
}