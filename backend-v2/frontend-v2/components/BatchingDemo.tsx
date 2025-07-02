'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { requestBatcher, batchDashboardData, batchCalendarData } from '@/lib/requestBatcher'
import { useCalendarBatching, useBatchingStats } from '@/hooks/useCalendarBatching'

/**
 * Demo component to showcase request batching performance improvements
 * This component demonstrates:
 * 1. Request batching vs individual requests
 * 2. Smart caching behavior
 * 3. Performance monitoring
 * 4. Different batching strategies
 */
export const BatchingDemo: React.FC = () => {
  const [demoResults, setDemoResults] = useState<any[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({})
  const [isRunning, setIsRunning] = useState(false)
  const { stats } = useBatchingStats()

  // Configure different batching strategies for demo
  useEffect(() => {
    requestBatcher.configure('demo-aggressive', {
      strategy: 'hybrid',
      maxWaitMs: 20,
      maxBatchSize: 5,
      minBatchSize: 1,
      priorityThreshold: 7
    })

    requestBatcher.configure('demo-conservative', {
      strategy: 'time',
      maxWaitMs: 200,
      maxBatchSize: 10,
      minBatchSize: 2
    })

    requestBatcher.configure('demo-count-based', {
      strategy: 'count',
      maxWaitMs: 1000,
      maxBatchSize: 3,
      minBatchSize: 1
    })
  }, [])

  const runBatchingDemo = async () => {
    setIsRunning(true)
    const results: any[] = []
    
    try {
      console.log('🚀 Starting Request Batching Demo...')

      // Demo 1: Individual requests (baseline)
      const individualStart = performance.now()
      const individualResults = await Promise.all([
        fetch('/api/demo/endpoint1').then(r => r.json()).catch(() => ({ demo: 'data1' })),
        fetch('/api/demo/endpoint2').then(r => r.json()).catch(() => ({ demo: 'data2' })),
        fetch('/api/demo/endpoint3').then(r => r.json()).catch(() => ({ demo: 'data3' }))
      ])
      const individualTime = performance.now() - individualStart

      results.push({
        type: 'Individual Requests',
        time: individualTime,
        requests: 3,
        results: individualResults.length
      })

      // Demo 2: Batched requests
      const batchStart = performance.now()
      const batchResults = await batchDashboardData([
        { endpoint: '/api/demo/endpoint1', priority: 8 },
        { endpoint: '/api/demo/endpoint2', priority: 6 },
        { endpoint: '/api/demo/endpoint3', priority: 5 }
      ])
      const batchTime = performance.now() - batchStart

      results.push({
        type: 'Batched Requests',
        time: batchTime,
        requests: 3,
        results: batchResults.length,
        improvement: ((individualTime - batchTime) / individualTime * 100).toFixed(1) + '%'
      })

      // Demo 3: Cached requests
      const cacheStart = performance.now()
      const cachedResults = await Promise.all([
        requestBatcher.batch('demo-cache', '/api/demo/cached1', {}, 5, { key: 'demo-cache-1', ttl: 30000 }),
        requestBatcher.batch('demo-cache', '/api/demo/cached2', {}, 5, { key: 'demo-cache-2', ttl: 30000 }),
        requestBatcher.batch('demo-cache', '/api/demo/cached3', {}, 5, { key: 'demo-cache-3', ttl: 30000 })
      ])
      const cacheTime = performance.now() - cacheStart

      results.push({
        type: 'Cached Requests (First)',
        time: cacheTime,
        requests: 3,
        results: cachedResults.filter(r => r).length
      })

      // Demo 4: Cache hits
      const cacheHitStart = performance.now()
      const cacheHitResults = await Promise.all([
        requestBatcher.batch('demo-cache', '/api/demo/cached1', {}, 5, { key: 'demo-cache-1', ttl: 30000 }),
        requestBatcher.batch('demo-cache', '/api/demo/cached2', {}, 5, { key: 'demo-cache-2', ttl: 30000 }),
        requestBatcher.batch('demo-cache', '/api/demo/cached3', {}, 5, { key: 'demo-cache-3', ttl: 30000 })
      ])
      const cacheHitTime = performance.now() - cacheHitStart

      results.push({
        type: 'Cached Requests (Cache Hit)',
        time: cacheHitTime,
        requests: 3,
        results: cacheHitResults.filter(r => r).length,
        improvement: ((cacheTime - cacheHitTime) / cacheTime * 100).toFixed(1) + '%'
      })

      // Demo 5: Different priority levels
      const priorityStart = performance.now()
      await Promise.all([
        requestBatcher.batch('demo-aggressive', '/api/demo/high-priority', {}, 9),
        requestBatcher.batch('demo-aggressive', '/api/demo/medium-priority', {}, 5),
        requestBatcher.batch('demo-aggressive', '/api/demo/low-priority', {}, 2)
      ])
      const priorityTime = performance.now() - priorityStart

      results.push({
        type: 'Priority-based Batching',
        time: priorityTime,
        requests: 3,
        note: 'High priority requests execute faster'
      })

      setDemoResults(results)
      setPerformanceMetrics({
        totalTime: results.reduce((sum, r) => sum + r.time, 0),
        averageImprovement: results
          .filter(r => r.improvement)
          .reduce((sum, r) => sum + parseFloat(r.improvement || '0'), 0) / 
          results.filter(r => r.improvement).length
      })

    } catch (error) {
      console.error('Demo error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const clearCache = () => {
    requestBatcher.clearCache()
    console.log('🧹 Cache cleared')
  }

  const flushBatches = async () => {
    await requestBatcher.flush()
    console.log('⚡ All pending batches flushed')
  }

  const configureBatching = (strategy: string) => {
    const configs = {
      aggressive: {
        strategy: 'hybrid' as const,
        maxWaitMs: 20,
        maxBatchSize: 3,
        priorityThreshold: 6
      },
      balanced: {
        strategy: 'hybrid' as const,
        maxWaitMs: 100,
        maxBatchSize: 8,
        priorityThreshold: 7
      },
      conservative: {
        strategy: 'time' as const,
        maxWaitMs: 300,
        maxBatchSize: 15
      }
    }

    requestBatcher.configure('demo-config', configs[strategy as keyof typeof configs])
    console.log(`⚙️ Configured batching strategy: ${strategy}`)
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Batching System Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={runBatchingDemo} 
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunning ? 'Running Demo...' : 'Run Performance Demo'}
              </Button>
              <Button onClick={clearCache} variant="outline">
                Clear Cache
              </Button>
              <Button onClick={flushBatches} variant="outline">
                Flush Batches
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => configureBatching('aggressive')} 
                variant="outline"
                size="sm"
              >
                Aggressive Batching
              </Button>
              <Button 
                onClick={() => configureBatching('balanced')} 
                variant="outline"
                size="sm"
              >
                Balanced Batching
              </Button>
              <Button 
                onClick={() => configureBatching('conservative')} 
                variant="outline"
                size="sm"
              >
                Conservative Batching
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Results */}
      {demoResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left">Type</th>
                    <th className="border border-gray-300 p-2 text-left">Time (ms)</th>
                    <th className="border border-gray-300 p-2 text-left">Requests</th>
                    <th className="border border-gray-300 p-2 text-left">Results</th>
                    <th className="border border-gray-300 p-2 text-left">Improvement</th>
                    <th className="border border-gray-300 p-2 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {demoResults.map((result, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-2 font-medium">{result.type}</td>
                      <td className="border border-gray-300 p-2">
                        {result.time.toFixed(2)}
                      </td>
                      <td className="border border-gray-300 p-2">{result.requests}</td>
                      <td className="border border-gray-300 p-2">{result.results}</td>
                      <td className="border border-gray-300 p-2 text-green-600 font-medium">
                        {result.improvement || '-'}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm text-gray-600">
                        {result.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {performanceMetrics.averageImprovement && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-medium">
                  Average Performance Improvement: {performanceMetrics.averageImprovement.toFixed(1)}%
                </p>
                <p className="text-green-600 text-sm">
                  Total demo time: {performanceMetrics.totalTime.toFixed(2)}ms
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Live Batch Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Live Batch Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats).map(([batchType, batchStats]: [string, any]) => (
              <div key={batchType} className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">{batchType}</h4>
                {typeof batchStats === 'object' && batchStats !== null ? (
                  <div className="space-y-1 text-sm">
                    {Object.entries(batchStats).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-mono">
                          {typeof value === 'number' ? 
                            (key.includes('Time') || key.includes('Age') ? 
                              `${value.toFixed(0)}ms` : value) : 
                            String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">{String(batchStats)}</p>
                )}
              </div>
            ))}
          </div>

          {Object.keys(stats).length === 0 && (
            <p className="text-gray-500 text-center py-4">
              No active batches. Run the demo or navigate to dashboard/calendar to see batching in action.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How Request Batching Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">🚀 Batching Strategies:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><strong>Time-based:</strong> Execute batch after a time delay</li>
                <li><strong>Count-based:</strong> Execute when batch reaches maximum size</li>
                <li><strong>Hybrid:</strong> Execute on high priority or batch size limits</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">💾 Smart Caching:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Automatic response caching with configurable TTL</li>
                <li>Cache-first strategy for repeated requests</li>
                <li>Intelligent cache invalidation</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">⚡ Performance Benefits:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Reduced total request time through parallel execution</li>
                <li>Lower server load with intelligent request grouping</li>
                <li>Improved user experience with faster data loading</li>
                <li>Reduced network overhead</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BatchingDemo