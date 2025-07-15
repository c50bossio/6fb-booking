'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Server, Database, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'checking';
  responseTime?: number;
  error?: string;
}

interface SystemResources {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: number;
}

export function DevHealthMonitor() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Frontend', status: 'checking' },
    { name: 'Backend API', status: 'checking' },
    { name: 'Redis Cache', status: 'checking' }
  ]);
  
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [isVisible, setIsVisible] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set client flag to prevent hydration mismatch
    setIsClient(true);
    
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      setIsVisible(false);
      return;
    }

    const checkHealth = async () => {
      // Check Frontend (self)
      setServices(prev => prev.map(s => 
        s.name === 'Frontend' ? { ...s, status: 'up', responseTime: 0 } : s
      ));

      // Check Backend API
      try {
        const startTime = Date.now();
        const response = await fetch('http://localhost:8000/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        }).catch(() => null);
        
        const responseTime = Date.now() - startTime;
        
        setServices(prev => prev.map(s => 
          s.name === 'Backend API' ? {
            ...s,
            status: response?.ok ? 'up' : 'down',
            responseTime,
            error: !response?.ok ? 'Connection failed' : undefined
          } : s
        ));
      } catch (error) {
        setServices(prev => prev.map(s => 
          s.name === 'Backend API' ? {
            ...s,
            status: 'down',
            error: 'Connection timeout'
          } : s
        ));
      }

      // Check Redis (via backend endpoint)
      try {
        const response = await fetch('http://localhost:8000/api/v1/health/redis', {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        }).catch(() => null);
        
        setServices(prev => prev.map(s => 
          s.name === 'Redis Cache' ? {
            ...s,
            status: response?.ok ? 'up' : 'down',
            error: response?.status === 404 ? 'Not configured' : (!response?.ok ? 'Not available' : undefined)
          } : s
        ));
      } catch {
        setServices(prev => prev.map(s => 
          s.name === 'Redis Cache' ? {
            ...s,
            status: 'down',
            error: 'Not configured'
          } : s
        ));
      }

      // Update system resources (mock for now, would need backend endpoint)
      setResources({
        memory: {
          used: Math.random() * 8,
          total: 16,
          percentage: Math.random() * 100
        },
        cpu: Math.random() * 100
      });

      setLastCheck(new Date());
    };

    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const allHealthy = services.every(s => s.status === 'up');

  return (
    <div className="fixed bottom-4 right-4 w-80 max-w-[calc(100vw-2rem)] z-50 md:w-80">
      <Card className={`shadow-lg border-2 ${allHealthy ? 'border-green-500' : 'border-red-500'} max-h-[calc(100vh-2rem)] overflow-y-auto`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Dev Health Monitor</span>
            </span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0 w-6 h-6 flex items-center justify-center"
              aria-label="Close development health monitor"
            >
              ×
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Services Status */}
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between text-sm min-h-[1.5rem]">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {service.name === 'Frontend' && <Server className="h-3 w-3 flex-shrink-0" />}
                  {service.name === 'Backend API' && <Server className="h-3 w-3 flex-shrink-0" />}
                  {service.name === 'Redis Cache' && <Database className="h-3 w-3 flex-shrink-0" />}
                  <span className="truncate">{service.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {service.responseTime !== undefined && (
                    <span className="text-xs text-gray-500 hidden sm:inline">{service.responseTime}ms</span>
                  )}
                  {service.status === 'up' && <CheckCircle2 className="h-4 w-4 text-green-500" aria-label={`${service.name} is healthy`} />}
                  {service.status === 'down' && <XCircle className="h-4 w-4 text-red-500" aria-label={`${service.name} is unhealthy${service.error ? ': ' + service.error : ''}`} />}
                  {service.status === 'checking' && <Clock className="h-4 w-4 text-yellow-500 animate-pulse" aria-label={`Checking ${service.name} status`} />}
                </div>
              </div>
            ))}
          </div>

          {/* System Resources */}
          {resources && (
            <div className="pt-2 border-t space-y-3">
              <div className="text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">Memory</span>
                  <span className="text-gray-600">{resources.memory.percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      resources.memory.percentage > 80 ? 'bg-red-500' : 
                      resources.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(resources.memory.percentage, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">CPU</span>
                  <span className="text-gray-600">{resources.cpu.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      resources.cpu > 80 ? 'bg-red-500' : 
                      resources.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(resources.cpu, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Last Check */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Last check: {isClient ? lastCheck.toLocaleTimeString() : '--:--:--'}
          </div>

          {/* Alert if services are down */}
          {!allHealthy && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" aria-label="Warning: Services are down" />
                <span className="font-medium">Services Down</span>
              </div>
              <div className="text-red-600 leading-relaxed">
                Run <code className="bg-red-100 px-1 rounded text-red-800">npm run dev:clean</code> to restart
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}