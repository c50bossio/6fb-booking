/**
 * Error monitoring debug component for development
 */
import React, { useState, useEffect } from 'react'
import { errorTracker, useErrorReporting } from '@/lib/monitoring/errorTracking'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Bug, RefreshCw, Trash2, Activity } from 'lucide-react'

interface ErrorMonitoringDebugProps {
  className?: string
}

export default function ErrorMonitoringDebug({ className }: ErrorMonitoringDebugProps) {
  const [summary, setSummary] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { reportError, reportApiError, reportValidationError, reportPerformanceIssue } = useErrorReporting()

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true)
      updateSummary()
    }
  }, [])

  const updateSummary = () => {
    setSummary(errorTracker.getErrorSummary())
  }

  const triggerTestErrors = () => {
    // Test JavaScript error
    reportError(new Error('Test JavaScript error'), {
      category: 'javascript',
      severity: 'low',
      context: {
        component: 'ErrorMonitoringDebug',
        action: 'test_error'
      },
      tags: ['test', 'debug']
    })

    // Test API error
    reportApiError(
      { status: 500, message: 'Test server error', response: { data: { message: 'Internal server error' } } },
      '/api/v1/test',
      'GET'
    )

    // Test validation error
    reportValidationError(
      new Error('Test validation failed'),
      'email',
      'invalid-email',
      'ErrorMonitoringDebug'
    )

    // Test performance issue
    reportPerformanceIssue(
      'slow_operation',
      2500,
      1000,
      'ErrorMonitoringDebug'
    )

    setTimeout(updateSummary, 100)
  }

  const clearErrors = () => {
    errorTracker.clearErrors()
    updateSummary()
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white'
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'javascript': return 'bg-purple-500 text-white'
      case 'api': return 'bg-red-500 text-white'
      case 'network': return 'bg-orange-500 text-white'
      case 'validation': return 'bg-blue-500 text-white'
      case 'performance': return 'bg-yellow-500 text-white'
      case 'business': return 'bg-green-500 text-white'
      case 'ui': return 'bg-pink-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className={`fixed bottom-4 right-4 w-96 max-h-96 overflow-hidden z-50 ${className}`}>
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Activity className="h-4 w-4 text-blue-500" />
            <span>Error Monitoring Debug</span>
            <Badge variant="outline" className="text-xs">DEV</Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex space-x-2">
            <Button
              onClick={triggerTestErrors}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Bug className="h-3 w-3 mr-1" />
              Test Errors
            </Button>
            
            <Button
              onClick={updateSummary}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            
            <Button
              onClick={clearErrors}
              size="sm"
              variant="outline"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {summary && (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  <div className="font-medium">Total Errors</div>
                  <div className="text-lg font-bold">{summary.totalErrors}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  <div className="font-medium">Recent</div>
                  <div className="text-lg font-bold">{summary.recentErrors.length}</div>
                </div>
              </div>

              {/* Severity Breakdown */}
              {Object.keys(summary.errorsBySeverity).length > 0 && (
                <div>
                  <div className="font-medium mb-1">By Severity</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(summary.errorsBySeverity).map(([severity, count]) => (
                      <Badge
                        key={severity}
                        className={`text-xs ${getSeverityColor(severity)}`}
                      >
                        {severity}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {Object.keys(summary.errorsByCategory).length > 0 && (
                <div>
                  <div className="font-medium mb-1">By Category</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(summary.errorsByCategory).map(([category, count]) => (
                      <Badge
                        key={category}
                        className={`text-xs ${getCategoryColor(category)}`}
                      >
                        {category}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Errors */}
              {summary.recentErrors.length > 0 && (
                <div>
                  <div className="font-medium mb-1">Recent Errors</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {summary.recentErrors.slice(0, 5).map((error: any, index: number) => (
                      <div
                        key={index}
                        className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <Badge className={`text-xs ${getSeverityColor(error.error.severity)}`}>
                            {error.error.severity}
                          </Badge>
                          <Badge className={`text-xs ${getCategoryColor(error.error.category)}`}>
                            {error.error.category}
                          </Badge>
                        </div>
                        <div className="font-medium truncate">
                          {error.error.message}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {error.error.context?.component || 'Unknown'} • 
                          {new Date(error.occurredAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}