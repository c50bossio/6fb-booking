'use client'

import React from 'react'
import { useAccessibilityMonitor } from '@/lib/accessibility-audit'
import { cn } from '@/lib/utils'
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  X, 
  Shield,
  RefreshCw,
  Download,
  Wrench
} from 'lucide-react'
import { Button } from './ui/button'

export function AccessibilityMonitor() {
  const [isOpen, setIsOpen] = React.useState(false)
  const { report, startMonitoring, stopMonitoring, runAudit, autoFix } = useAccessibilityMonitor()
  const [isAutoFixing, setIsAutoFixing] = React.useState(false)

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  React.useEffect(() => {
    // Auto-start monitoring in development
    startMonitoring()
    return () => stopMonitoring()
  }, [startMonitoring, stopMonitoring])

  const handleAutoFix = async () => {
    setIsAutoFixing(true)
    const fixedCount = autoFix()
    await new Promise(resolve => setTimeout(resolve, 500))
    runAudit() // Re-run audit after fixes
    setIsAutoFixing(false)
    
    if (fixedCount > 0) {
    }
  }

  const exportReport = () => {
    if (!report) return
    
    const reportData = {
      ...report,
      url: window.location.href,
      userAgent: navigator.userAgent
    }
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accessibility-report-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <Info className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-4 right-4 z-50',
          'w-12 h-12 rounded-full',
          'bg-white dark:bg-gray-800 shadow-lg',
          'border-2 border-gray-200 dark:border-gray-700',
          'flex items-center justify-center',
          'hover:scale-110 transition-transform',
          report && report.errors > 0 && 'border-red-500'
        )}
        aria-label="Toggle accessibility monitor"
      >
        <Shield className={cn(
          'h-6 w-6',
          report && report.errors > 0 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'
        )} />
        {report && report.errors > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            {report.errors}
          </span>
        )}
      </button>

      {/* Monitor panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Accessibility Monitor
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {report && (
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Score:
                  </span>
                  <span className={cn('text-2xl font-bold', getScoreColor(report.score))}>
                    {report.score}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-red-600 dark:text-red-400">
                    {report.errors} errors
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400">
                    {report.warnings} warnings
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2">
            <Button
              onClick={runAudit}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Re-scan
            </Button>
            <Button
              onClick={handleAutoFix}
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={isAutoFixing}
            >
              <Wrench className="h-4 w-4 mr-1" />
              {isAutoFixing ? 'Fixing...' : 'Auto-fix'}
            </Button>
            <Button
              onClick={exportReport}
              size="sm"
              variant="outline"
              disabled={!report}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Issues list */}
          <div className="overflow-y-auto max-h-[400px]">
            {report && report.issues.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {report.issues.map((issue, index) => (
                  <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {issue.issue}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {issue.element}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          WCAG {issue.wcagCriteria}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Fix: {issue.fix}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No accessibility issues found!
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              WCAG 2.1 AA Compliance Check
            </p>
          </div>
        </div>
      )}
    </>
  )
}

// Export a provider component that can be added to the app layout
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AccessibilityMonitor />
    </>
  )
}