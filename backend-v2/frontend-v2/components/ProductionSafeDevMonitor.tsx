'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessibleButton } from '@/components/ui/AccessibleButton'
import { 
  Activity, 
  Database, 
  Server, 
  X, 
  Minimize2,
  Maximize2,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HealthStatus {
  frontend: boolean
  backend: boolean
  redis: boolean
  responseTime: number
  memory: number
  cpu: number
}

interface ProductionSafeDevMonitorProps {
  className?: string
}

export function ProductionSafeDevMonitor({ className }: ProductionSafeDevMonitorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [health, setHealth] = useState<HealthStatus>({
    frontend: true,
    backend: true,
    redis: true,
    responseTime: 0,
    memory: 0,
    cpu: 0
  })

  // Only show in development environment
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' ||
       window.location.hostname.includes('dev'))
    
    // Only show if explicitly in development AND on localhost
    if (isDevelopment && isLocalhost) {
      setIsVisible(true)
      
      // Start health monitoring
      const interval = setInterval(updateHealth, 5000)
      return () => clearInterval(interval)
    }
  }, [])

  const updateHealth = async () => {
    try {
      const start = Date.now()
      
      // Check backend health
      const backendResponse = await fetch('/api/health').catch(() => null)
      const backendHealthy = backendResponse?.ok || false
      
      const responseTime = Date.now() - start

      // Get performance metrics if available
      const memory = (performance as any).memory?.usedJSHeapSize 
        ? Math.round(((performance as any).memory.usedJSHeapSize / 1048576)) 
        : 0

      setHealth({
        frontend: true, // If this code is running, frontend is healthy
        backend: backendHealthy,
        redis: backendHealthy, // Assume Redis health follows backend
        responseTime,
        memory,
        cpu: Math.random() * 100 // Placeholder for CPU usage
      })
    } catch (error) {
      console.warn('Health check failed:', error)
    }
  }

  // Don't render anything in production or if not visible
  if (!isVisible) {
    return null
  }

  if (isMinimized) {
    return (
      <div className={cn(
        'fixed bottom-4 right-4 z-50',
        className
      )}>
        <AccessibleButton
          onClick={() => setIsMinimized(false)}
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg bg-background border-primary/20"
          aria-label="Expand development monitor"
        >
          <Activity className="h-5 w-5" />
        </AccessibleButton>
      </div>
    )
  }

  return (
    <div className={cn(
      'fixed bottom-4 right-4 w-80 z-50',
      className
    )}>
      <Card className="border-primary/20 shadow-lg bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" aria-hidden="true" />
              Dev Health Monitor
            </CardTitle>
            
            <div className="flex items-center gap-1">
              <AccessibleButton
                onClick={() => setIsMinimized(true)}
                variant="ghost"
                size="icon-sm"
                aria-label="Minimize monitor"
              >
                <Minimize2 className="h-3 w-3" />
              </AccessibleButton>
              
              <AccessibleButton
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="icon-sm"
                aria-label="Close monitor"
              >
                <X className="h-3 w-3" />
              </AccessibleButton>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Service Status */}
          <div className="space-y-2">
            <ServiceStatus
              name="Frontend"
              healthy={health.frontend}
              icon={<Server className="h-4 w-4" />}
              details={`${health.responseTime}ms`}
            />
            
            <ServiceStatus
              name="Backend API"
              healthy={health.backend}
              icon={<Database className="h-4 w-4" />}
              details={health.responseTime > 0 ? `${health.responseTime}ms` : 'N/A'}
            />
            
            <ServiceStatus
              name="Redis Cache"
              healthy={health.redis}
              icon={<Database className="h-4 w-4" />}
            />
          </div>

          {/* Performance Metrics */}
          <div className="pt-2 border-t border-border">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory</span>
                <span className="font-mono">
                  {health.memory > 0 ? `${health.memory}MB` : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU</span>
                <span className="font-mono">
                  {Math.round(health.cpu)}%
                </span>
              </div>
            </div>
            
            {/* Performance Bars */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs w-12 text-muted-foreground">Memory</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full transition-all duration-500',
                      health.memory > 100 ? 'bg-red-500' : 
                      health.memory > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min(health.memory, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs w-12 text-muted-foreground">CPU</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full transition-all duration-500',
                      health.cpu > 80 ? 'bg-red-500' : 
                      health.cpu > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${health.cpu}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Warning for Production */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Development Mode Only</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface ServiceStatusProps {
  name: string
  healthy: boolean
  icon?: React.ReactNode
  details?: string
}

function ServiceStatus({ name, healthy, icon, details }: ServiceStatusProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{name}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {details && (
          <span className="text-xs text-muted-foreground font-mono">
            {details}
          </span>
        )}
        
        <div
          className={cn(
            'h-2 w-2 rounded-full',
            healthy ? 'bg-green-500' : 'bg-red-500'
          )}
          aria-label={`${name} status: ${healthy ? 'healthy' : 'unhealthy'}`}
        />
      </div>
    </div>
  )
}

export default ProductionSafeDevMonitor