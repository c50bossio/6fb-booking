'use client'

import React, { useState, useEffect, useRef, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Zap, 
  Clock, 
  MemoryStick, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface PerformanceMetrics {
  fps: number
  renderTime: number
  componentCount: number
  memoryUsage: number
  rerenderCount: number
}

interface ComponentRenderInfo {
  name: string
  renderCount: number
  avgRenderTime: number
  lastRenderTime: number
}

const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0,
    rerenderCount: 0,
  })
  
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const animationId = useRef<number>()
  
  useEffect(() => {
    const measureFPS = () => {
      frameCount.current++
      const currentTime = performance.now()
      
      if (currentTime >= lastTime.current + 1000) {
        const fps = Math.round((frameCount.current * 1000) / (currentTime - lastTime.current))
        
        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage: (performance as any).memory?.usedJSHeapSize 
            ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
            : 0
        }))
        
        frameCount.current = 0
        lastTime.current = currentTime
      }
      
      animationId.current = requestAnimationFrame(measureFPS)
    }
    
    animationId.current = requestAnimationFrame(measureFPS)
    
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current)
      }
    }
  }, [])
  
  return metrics
}

const PerformanceIndicator = memo(({ 
  label, 
  value, 
  unit, 
  icon: Icon,
  status 
}: {
  label: string
  value: number
  unit: string
  icon: React.ElementType
  status: 'good' | 'warning' | 'error'
}) => {
  const statusColors = {
    good: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500'
  }
  
  const StatusIcon = status === 'good' ? CheckCircle : status === 'warning' ? AlertCircle : XCircle
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${statusColors[status]}`} />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold">
            {value}
            <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
          </p>
        </div>
      </div>
      <StatusIcon className={`h-5 w-5 ${statusColors[status]}`} />
    </div>
  )
})

PerformanceIndicator.displayName = 'PerformanceIndicator'

export const PerformanceMonitor = memo(function PerformanceMonitor() {
  const metrics = usePerformanceMetrics()
  const [isExpanded, setIsExpanded] = useState(false)
  const [componentRenders, setComponentRenders] = useState<ComponentRenderInfo[]>([])
  
  // Determine status based on metrics
  const fpsStatus = metrics.fps >= 55 ? 'good' : metrics.fps >= 30 ? 'warning' : 'error'
  const memoryStatus = metrics.memoryUsage < 100 ? 'good' : metrics.memoryUsage < 200 ? 'warning' : 'error'
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          size="sm"
          variant="outline"
          className="shadow-lg"
        >
          <Activity className="h-4 w-4 mr-2" />
          Performance
        </Button>
      </div>
    )
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Performance Monitor</CardTitle>
              <CardDescription>Real-time metrics</CardDescription>
            </div>
            <Button
              onClick={() => setIsExpanded(false)}
              size="icon"
              variant="ghost"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <PerformanceIndicator
              label="FPS"
              value={metrics.fps}
              unit="fps"
              icon={Zap}
              status={fpsStatus}
            />
            <PerformanceIndicator
              label="Memory"
              value={metrics.memoryUsage}
              unit="MB"
              icon={MemoryStick}
              status={memoryStatus}
            />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Performance Tips</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              {metrics.fps < 55 && (
                <p className="flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5" />
                  Low FPS detected. Check for heavy computations or excessive re-renders.
                </p>
              )}
              {metrics.memoryUsage > 150 && (
                <p className="flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5" />
                  High memory usage. Consider cleaning up event listeners and large objects.
                </p>
              )}
              {metrics.fps >= 55 && metrics.memoryUsage < 100 && (
                <p className="flex items-start gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                  Performance is optimal!
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

// React DevTools Profiler integration helper
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return memo(
    React.forwardRef<any, P>((props, ref) => {
      const renderCount = useRef(0)
      const renderStartTime = useRef(0)
      
      useEffect(() => {
        renderStartTime.current = performance.now()
        return () => {
          const renderTime = performance.now() - renderStartTime.current
          renderCount.current++
          
          // Log slow renders
          if (renderTime > 16) { // More than one frame (16ms)
            console.warn(
              `[Performance] ${componentName} slow render:`,
              `${renderTime.toFixed(2)}ms (render #${renderCount.current})`
            )
          }
        }
      })
      
      return <Component {...(props as any)} ref={ref} />
    })
  )
}

// Performance optimization tips component
export const PerformanceOptimizationTips = memo(function PerformanceOptimizationTips() {
  const tips = [
    {
      title: 'Use React.memo',
      description: 'Wrap components that receive the same props frequently',
      impact: 'high',
    },
    {
      title: 'Optimize re-renders',
      description: 'Use useCallback and useMemo for expensive operations',
      impact: 'high',
    },
    {
      title: 'Virtualize long lists',
      description: 'Use react-window or similar for lists with many items',
      impact: 'medium',
    },
    {
      title: 'Lazy load components',
      description: 'Use React.lazy for code splitting',
      impact: 'medium',
    },
    {
      title: 'Debounce user input',
      description: 'Prevent excessive updates from rapid user actions',
      impact: 'medium',
    },
  ]
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Optimization Tips</CardTitle>
        <CardDescription>
          Best practices for optimal React performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-3">
              <Badge 
                variant={tip.impact === 'high' ? 'destructive' : 'secondary'}
                className="mt-0.5"
              >
                {tip.impact}
              </Badge>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{tip.title}</h4>
                <p className="text-sm text-muted-foreground">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})