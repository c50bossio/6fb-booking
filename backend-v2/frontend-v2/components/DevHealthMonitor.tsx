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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      setIsVisible(false);
      return;
    }

    const checkHealth = async () => {
      // Detect if we're in GitHub Codespaces
      const isCodespaces = window.location.hostname.includes('.app.github.dev');
      const backendUrl = isCodespaces 
        ? window.location.hostname.replace('-3000.app.github.dev', '-8000.app.github.dev')
        : 'localhost:8000';
      const backendProtocol = isCodespaces ? 'https://' : 'http://';
      const backendBaseUrl = `${backendProtocol}${backendUrl}`;

      // Check Frontend (self)
      setServices(prev => prev.map(s => 
        s.name === 'Frontend' ? { ...s, status: 'up', responseTime: 0 } : s
      ));

      // Check Backend API
      try {
        const startTime = Date.now();
        const response = await fetch(`${backendBaseUrl}/health`, {
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
        const response = await fetch(`${backendBaseUrl}/api/v2/health/redis`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        }).catch(() => null);
        
        setServices(prev => prev.map(s => 
          s.name === 'Redis Cache' ? {
            ...s,
            status: response?.ok ? 'up' : 'down',
            error: !response?.ok ? 'Not available' : undefined
          } : s
        ));
      } catch {
        setServices(prev => prev.map(s => 
          s.name === 'Redis Cache' ? {
            ...s,
            status: 'down',
            error: 'Check failed'
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
    <div className="fixed bottom-4 right-4 w-80 z-50">
      <Card className={`shadow-lg border-2 ${allHealthy ? 'border-green-500' : 'border-red-500'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dev Health Monitor
            </span>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Services Status */}
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {service.name === 'Frontend' && <Server className="h-3 w-3" />}
                  {service.name === 'Backend API' && <Server className="h-3 w-3" />}
                  {service.name === 'Redis Cache' && <Database className="h-3 w-3" />}
                  <span>{service.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {service.responseTime !== undefined && (
                    <span className="text-xs text-gray-500">{service.responseTime}ms</span>
                  )}
                  {service.status === 'up' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {service.status === 'down' && <XCircle className="h-4 w-4 text-red-500" />}
                  {service.status === 'checking' && <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />}
                </div>
              </div>
            ))}
          </div>

          {/* System Resources */}
          {resources && (
            <div className="pt-2 border-t space-y-2">
              <div className="text-xs">
                <div className="flex justify-between">
                  <span>Memory</span>
                  <span>{resources.memory.percentage.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className={`h-1.5 rounded-full ${
                      resources.memory.percentage > 80 ? 'bg-red-500' : 
                      resources.memory.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${resources.memory.percentage}%` }}
                  />
                </div>
              </div>
              
              <div className="text-xs">
                <div className="flex justify-between">
                  <span>CPU</span>
                  <span>{resources.cpu.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className={`h-1.5 rounded-full ${
                      resources.cpu > 80 ? 'bg-red-500' : 
                      resources.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${resources.cpu}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Last Check */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Last check: {mounted ? lastCheck.toLocaleTimeString() : 'Loading...'}
          </div>

          {/* Alert if services are down */}
          {!allHealthy && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span className="font-medium">Services Down</span>
              </div>
              <div className="mt-1">Run `npm run dev:clean` to restart</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}