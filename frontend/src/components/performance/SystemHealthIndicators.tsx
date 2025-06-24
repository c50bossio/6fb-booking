import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  Shield,
  Database,
  Zap,
  Mail,
  Calendar,
  CreditCard,
  Server,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Heart,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import type { SystemHealthIndicator, LoadMetrics } from '@/lib/api/performance';

interface SystemHealthIndicatorsProps {
  healthIndicators: SystemHealthIndicator[];
  loadMetrics?: LoadMetrics;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

interface ServiceIcon {
  [key: string]: React.ComponentType<any>;
}

const serviceIcons: ServiceIcon = {
  'Database': Database,
  'Redis Cache': Zap,
  'Stripe API': CreditCard,
  'Google Calendar': Calendar,
  'Email Service': Mail,
  'API Server': Server,
  'Load Balancer': Shield,
  'default': Activity,
};

export function SystemHealthIndicators({
  healthIndicators,
  loadMetrics,
  onRefresh,
  isLoading = false,
  className = '',
}: SystemHealthIndicatorsProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [realtimeData, setRealtimeData] = useState<{ [key: string]: number[] }>({});

  // Simulate real-time data updates for demo
  useEffect(() => {
    const interval = setInterval(() => {
      const newData = { ...realtimeData };
      healthIndicators.forEach(indicator => {
        if (!newData[indicator.service]) {
          newData[indicator.service] = [];
        }
        // Add new data point (simulate response time variations)
        const baseTime = indicator.response_time_ms || 100;
        const variation = (Math.random() - 0.5) * baseTime * 0.3;
        const newPoint = Math.max(1, baseTime + variation);
        
        newData[indicator.service].push(newPoint);
        
        // Keep only last 20 points
        if (newData[indicator.service].length > 20) {
          newData[indicator.service] = newData[indicator.service].slice(-20);
        }
      });
      setRealtimeData(newData);
    }, 2000);

    return () => clearInterval(interval);
  }, [healthIndicators, realtimeData]);

  const getStatusColor = (status: SystemHealthIndicator['status']) => {
    switch (status) {
      case 'healthy':
        return { 
          bg: 'bg-green-50 dark:bg-green-950', 
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-300',
          icon: 'text-green-500',
          indicator: CheckCircle
        };
      case 'warning':
        return { 
          bg: 'bg-yellow-50 dark:bg-yellow-950', 
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-700 dark:text-yellow-300',
          icon: 'text-yellow-500',
          indicator: AlertTriangle
        };
      case 'critical':
        return { 
          bg: 'bg-red-50 dark:bg-red-950', 
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          icon: 'text-red-500',
          indicator: XCircle
        };
      default:
        return { 
          bg: 'bg-gray-50 dark:bg-gray-950', 
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-700 dark:text-gray-300',
          icon: 'text-gray-500',
          indicator: Activity
        };
    }
  };

  const getOverallSystemHealth = () => {
    const healthyCount = healthIndicators.filter(i => i.status === 'healthy').length;
    const total = healthIndicators.length;
    const percentage = total > 0 ? (healthyCount / total) * 100 : 0;
    
    if (percentage >= 90) return { status: 'excellent', color: 'text-green-600', percentage };
    if (percentage >= 75) return { status: 'good', color: 'text-green-500', percentage };
    if (percentage >= 50) return { status: 'fair', color: 'text-yellow-500', percentage };
    return { status: 'poor', color: 'text-red-500', percentage };
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error('Failed to refresh health indicators:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const systemHealth = getOverallSystemHealth();

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* System Overview */}
      <Card className="border-2 border-green-200 dark:border-green-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold flex items-center space-x-2">
            <Heart className="h-6 w-6 text-red-500" />
            <span>System Health Overview</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={`${systemHealth.color} bg-transparent border-current`}>
              {systemHealth.status.toUpperCase()} - {systemHealth.percentage.toFixed(0)}%
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Overall Health */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">System Health</span>
                <Heart className={`h-4 w-4 ${systemHealth.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                <AnimatedNumber value={systemHealth.percentage} format={(value) => `${value.toFixed(0)}%`} />
              </div>
              <Progress value={systemHealth.percentage} className="h-2" />
            </div>

            {/* Active Services */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Services</span>
                <Server className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                <AnimatedNumber 
                  value={healthIndicators.filter(i => i.status !== 'critical').length} 
                  format={(value) => `${value}/${healthIndicators.length}`} 
                />
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Services operational
              </div>
            </div>

            {/* Average Response Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Response</span>
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                <AnimatedNumber 
                  value={healthIndicators.reduce((sum, i) => sum + (i.response_time_ms || 0), 0) / healthIndicators.length} 
                  format={(value) => `${value.toFixed(0)}ms`} 
                />
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Cross-service average
              </div>
            </div>

            {/* System Load */}
            {loadMetrics && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">System Load</span>
                  <Activity className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  <AnimatedNumber 
                    value={loadMetrics.cpu_usage_percent} 
                    format={(value) => `${value.toFixed(0)}%`} 
                  />
                </div>
                <Progress value={loadMetrics.cpu_usage_percent} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Service Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthIndicators.map((indicator) => {
          const ServiceIcon = serviceIcons[indicator.service] || serviceIcons.default;
          const statusStyle = getStatusColor(indicator.status);
          const StatusIndicator = statusStyle.indicator;
          const isSelected = selectedService === indicator.service;
          const chartData = realtimeData[indicator.service]?.map((value, index) => ({
            index,
            responseTime: value,
          })) || [];

          return (
            <Card
              key={indicator.service}
              className={`transition-all duration-200 cursor-pointer hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              } ${statusStyle.bg} ${statusStyle.border}`}
              onClick={() => setSelectedService(isSelected ? null : indicator.service)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <ServiceIcon className={`h-5 w-5 ${statusStyle.icon}`} />
                  <CardTitle className={`text-sm font-medium ${statusStyle.text}`}>
                    {indicator.service}
                  </CardTitle>
                </div>
                <StatusIndicator className={`h-4 w-4 ${statusStyle.icon}`} />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status and Response Time */}
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="outline" 
                      className={`${statusStyle.text} border-current`}
                    >
                      {indicator.status.toUpperCase()}
                    </Badge>
                    {indicator.response_time_ms && (
                      <span className={`text-sm font-medium ${statusStyle.text}`}>
                        {indicator.response_time_ms.toFixed(0)}ms
                      </span>
                    )}
                  </div>

                  {/* Uptime */}
                  {indicator.uptime_percent && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Uptime</span>
                        <span className={`text-xs font-medium ${statusStyle.text}`}>
                          {indicator.uptime_percent.toFixed(2)}%
                        </span>
                      </div>
                      <Progress value={indicator.uptime_percent} className="h-1" />
                    </div>
                  )}

                  {/* Real-time Response Time Chart */}
                  {chartData.length > 0 && (
                    <div className="h-16 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <Tooltip 
                            formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']}
                            labelFormatter={() => 'Real-time'}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="responseTime" 
                            stroke={indicator.status === 'healthy' ? '#10b981' : 
                                    indicator.status === 'warning' ? '#f59e0b' : '#ef4444'} 
                            fill={indicator.status === 'healthy' ? '#10b981' : 
                                  indicator.status === 'warning' ? '#f59e0b' : '#ef4444'} 
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Last Check */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Last check:</span>
                    <span className={statusStyle.text}>
                      {new Date(indicator.last_check).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Details */}
                  {indicator.details && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={indicator.details}>
                      {indicator.details}
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Status:</span>
                          <div className={`font-medium ${statusStyle.text}`}>
                            {indicator.status}
                          </div>
                        </div>
                        {indicator.response_time_ms && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Response:</span>
                            <div className={`font-medium ${statusStyle.text}`}>
                              {indicator.response_time_ms.toFixed(2)}ms
                            </div>
                          </div>
                        )}
                        {indicator.uptime_percent && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Uptime:</span>
                            <div className={`font-medium ${statusStyle.text}`}>
                              {indicator.uptime_percent.toFixed(3)}%
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Last Check:</span>
                          <div className={`font-medium ${statusStyle.text}`}>
                            {new Date(indicator.last_check).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Connection Status */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Connection:</span>
                        <div className="flex items-center space-x-1">
                          {indicator.status === 'healthy' ? (
                            <Wifi className="h-3 w-3 text-green-500" />
                          ) : (
                            <WifiOff className="h-3 w-3 text-red-500" />
                          )}
                          <span className={`text-xs font-medium ${statusStyle.text}`}>
                            {indicator.status === 'healthy' ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Load Details */}
      {loadMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-600" />
              <span>System Resource Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CPU Usage</span>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  <AnimatedNumber value={loadMetrics.cpu_usage_percent} format={(value) => `${value.toFixed(1)}%`} />
                </div>
                <Progress 
                  value={loadMetrics.cpu_usage_percent} 
                  className={`h-2 ${loadMetrics.cpu_usage_percent > 80 ? 'text-red-500' : 'text-blue-500'}`} 
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Memory Usage</span>
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  <AnimatedNumber value={loadMetrics.memory_usage_percent} format={(value) => `${value.toFixed(1)}%`} />
                </div>
                <Progress 
                  value={loadMetrics.memory_usage_percent} 
                  className={`h-2 ${loadMetrics.memory_usage_percent > 80 ? 'text-red-500' : 'text-purple-500'}`} 
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Requests</span>
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  <AnimatedNumber value={loadMetrics.active_requests} format={(value) => value.toString()} />
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Peak: {loadMetrics.peak_active_requests}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Requests/sec</span>
                  <TrendingUp className="h-4 w-4 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  <AnimatedNumber value={loadMetrics.requests_per_second} format={(value) => value.toFixed(1)} />
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {loadMetrics.requests_per_minute}/min
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}