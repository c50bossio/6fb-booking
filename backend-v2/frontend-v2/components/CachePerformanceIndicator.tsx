/**
 * Cache Performance Indicator Component
 * 
 * Shows real-time cache performance metrics for development and debugging.
 * Only visible in development mode or when explicitly enabled.
 */

'use client'

import { useState, useEffect } from 'react'
import { useCachePerformance } from '@/hooks/useTimeSlotsCache'

interface CachePerformanceIndicatorProps {
  show?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  compact?: boolean
}

export default function CachePerformanceIndicator({
  show = process.env.NODE_ENV === 'development',
  position = 'top-right',
  compact = true
}: CachePerformanceIndicatorProps) {
  const { currentMetrics, cacheEfficiency, averageHitRate } = useCachePerformance()
  const [isVisible, setIsVisible] = useState(show)
  const [isExpanded, setIsExpanded] = useState(false)

  // Hide in production unless explicitly shown
  if (!show && process.env.NODE_ENV === 'production') {
    return null
  }

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  const efficiencyColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    moderate: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    poor: 'text-red-600 bg-red-50 border-red-200'
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed ${positionClasses[position]} z-50 w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs font-mono hover:bg-gray-700 transition-colors`}
        title="Show cache performance"
      >
        📊
      </button>
    )
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 font-mono text-xs`}>
      <div 
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition-all duration-200 ${
          isExpanded ? 'w-64' : compact ? 'w-32' : 'w-48'
        }`}
      >
        {/* Header */}
        <div className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {compact ? 'Cache' : 'Cache Performance'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '−' : '+'}
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Hide"
            >
              ×
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="p-2 space-y-1">
          {/* Hit Rate - Always visible */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Hit Rate:</span>
            <span className={`px-1 rounded text-xs font-semibold ${efficiencyColors[cacheEfficiency as keyof typeof efficiencyColors]}`}>
              {Math.round(currentMetrics.hitRate * 100)}%
            </span>
          </div>

          {/* Cache Size */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Entries:</span>
            <span className="text-gray-900 dark:text-gray-100">
              {currentMetrics.size}
            </span>
          </div>

          {/* Fresh vs Stale (compact mode) */}
          {!isExpanded && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Fresh:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {currentMetrics.freshEntries}/{currentMetrics.size}
              </span>
            </div>
          )}

          {/* Expanded metrics */}
          {isExpanded && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Fresh:</span>
                <span className="text-green-600 dark:text-green-400">
                  {currentMetrics.freshEntries}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Stale:</span>
                <span className="text-orange-600 dark:text-orange-400">
                  {currentMetrics.staleEntries}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Avg Age:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {currentMetrics.avgAge}s
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Avg Hit:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {averageHitRate}%
                </span>
              </div>

              {/* Efficiency indicator */}
              <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`px-1 rounded text-xs capitalize ${efficiencyColors[cacheEfficiency as keyof typeof efficiencyColors]}`}>
                    {cacheEfficiency}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Performance indicator bar */}
        <div className="px-2 pb-2">
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${
                cacheEfficiency === 'good' ? 'bg-green-500' :
                cacheEfficiency === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.round(currentMetrics.hitRate * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Cache Debug Panel - More detailed view for debugging
 */
export function CacheDebugPanel({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean
  onClose: () => void 
}) {
  const { currentMetrics, performanceLog, cacheEfficiency } = useCachePerformance()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cache Performance Analytics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* Current Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {Math.round(currentMetrics.hitRate * 100)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Hit Rate</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {currentMetrics.size}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Cache Entries</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {currentMetrics.avgAge}s
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Age</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className={`text-2xl font-bold capitalize ${
                cacheEfficiency === 'good' ? 'text-green-600' :
                cacheEfficiency === 'moderate' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {cacheEfficiency}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Efficiency</div>
            </div>
          </div>

          {/* Performance History */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Performance History
            </h3>
            <div className="space-y-2">
              {performanceLog.slice(-10).map((entry, index) => (
                <div key={entry.timestamp} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Hit Rate: {Math.round(entry.hitRate * 100)}%</span>
                    <span>Size: {entry.size}</span>
                    <span>Age: {entry.avgAge}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cache Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Cache Performance Tips
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Hit rates above 70% indicate good cache efficiency</li>
              <li>• Fresh entries are served immediately without API calls</li>
              <li>• Stale entries trigger background refresh while serving cached data</li>
              <li>• Lower average age means data is being refreshed frequently</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}