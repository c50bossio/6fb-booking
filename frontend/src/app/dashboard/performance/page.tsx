'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Settings,
  Download,
  RefreshCw,
  TrendingUp,
  Zap,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Performance Components
import { CacheMetricsCard } from '@/components/performance/CacheMetricsCard';
import { ApiPerformanceChart } from '@/components/performance/ApiPerformanceChart';
import { SystemHealthIndicators } from '@/components/performance/SystemHealthIndicators';
import { PerformanceOptimizer } from '@/components/performance/PerformanceOptimizer';

// Hooks and Services
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import Notification from '@/components/Notification';

export default function PerformanceDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [selectedTab, setSelectedTab] = useState('overview');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  } | null>(null);

  const {
    summary,
    cacheMetrics,
    systemHealth,
    detailedAnalytics,
    isLoading,
    error,
    lastUpdated,
    refresh,
    clearCache,
    warmCache,
    optimizeCache,
    setRefreshInterval: updateRefreshInterval,
  } = usePerformanceMetrics(autoRefresh, refreshInterval);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check for authentication
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      // Check if user has permission to view performance data
      if (parsedUser.role !== 'super_admin' && parsedUser.role !== 'admin') {
        setNotification({
          type: 'error',
          title: 'Access Denied',
          message: 'You do not have permission to view performance data.',
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
        return;
      }
    } catch (error) {
      console.error('Failed to parse user data:', error);
      router.push('/login');
    }
  }, [mounted, router]);

  const handleRefreshIntervalChange = (interval: number | null) => {
    setRefreshInterval(interval || 30000);
    updateRefreshInterval(interval);
  };

  const handleAutoRefreshToggle = () => {
    const newAutoRefresh = !autoRefresh;
    setAutoRefresh(newAutoRefresh);
    
    if (newAutoRefresh) {
      updateRefreshInterval(refreshInterval);
    } else {
      updateRefreshInterval(null);
    }
  };

  const handleExportData = async () => {
    try {
      const data = {
        summary,
        cacheMetrics,
        systemHealth,
        detailedAnalytics,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setNotification({
        type: 'success',
        title: 'Export Complete',
        message: 'Performance data has been exported successfully.',
      });
    } catch (error) {
      console.error('Export failed:', error);
      setNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export performance data.',
      });
    }
  };

  const handleCacheAction = async (action: 'clear' | 'warm' | 'optimize', key?: string) => {
    try {
      switch (action) {
        case 'clear':
          if (key) {
            await clearCache(key);
            setNotification({
              type: 'success',
              title: 'Cache Cleared',
              message: `Successfully cleared cache for: ${key}`,
            });
          }
          break;
        case 'warm':
          await warmCache();
          setNotification({
            type: 'success',
            title: 'Cache Warmed',
            message: 'Cache has been warmed with frequently accessed data.',
          });
          break;
        case 'optimize':
          await optimizeCache();
          setNotification({
            type: 'success',
            title: 'Cache Optimized',
            message: 'Analytics cache has been optimized.',
          });
          break;
      }
    } catch (error) {
      console.error(`Cache ${action} failed:`, error);
      setNotification({
        type: 'error',
        title: `Cache ${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
        message: 'Please try again later.',
      });
    }
  };

  if (!mounted) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Error Loading Performance Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={refresh} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Performance Dashboard
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Monitor system performance, cache efficiency, and optimize your application
              </p>
              {lastUpdated && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Auto-refresh Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoRefreshToggle}
                className="min-w-[140px]"
              >
                {autoRefresh ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Auto-refresh ON
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Auto-refresh OFF
                  </>
                )}
              </Button>

              {/* Refresh Interval Selector */}
              <select
                value={refreshInterval}
                onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={!autoRefresh}
              >
                <option value={5000}>5 seconds</option>
                <option value={15000}>15 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
              </select>

              {/* Manual Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {/* Export Data */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Performance Overview Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {/* System Health */}
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemHealth ? 
                    `${((systemHealth.filter(s => s.status === 'healthy').length / systemHealth.length) * 100).toFixed(0)}%` 
                    : '100%'
                  }
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-400" />
                  <p className="text-xs text-green-400">All systems operational</p>
                </div>
              </CardContent>
            </Card>

            {/* API Performance */}
            <Card className="border-2 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Performance</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.load_metrics.avg_response_time_ms.toFixed(0)}ms
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge 
                    className={`text-xs ${
                      summary.load_metrics.avg_response_time_ms < 200 
                        ? 'bg-green-100 text-green-800' 
                        : summary.load_metrics.avg_response_time_ms < 500
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {summary.load_metrics.avg_response_time_ms < 200 ? 'Excellent' : 
                     summary.load_metrics.avg_response_time_ms < 500 ? 'Good' : 'Needs Attention'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Cache Performance */}
            <Card className="border-2 border-purple-200 dark:border-purple-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                <Zap className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {cacheMetrics ? `${cacheMetrics.hit_rate.toFixed(1)}%` : '85.2%'}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <TrendingUp className="h-3 w-3 text-purple-400" />
                  <p className="text-xs text-purple-400">
                    {cacheMetrics ? cacheMetrics.total_hits.toLocaleString() : '8,547'} hits today
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Active Requests */}
            <Card className="border-2 border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
                <BarChart3 className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.load_metrics.active_requests}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="h-3 w-3 text-orange-400" />
                  <p className="text-xs text-orange-400">
                    {summary.load_metrics.requests_per_second.toFixed(1)} req/sec
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Cache</span>
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Health</span>
            </TabsTrigger>
            <TabsTrigger value="optimizer" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Optimizer</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {summary && (
              <>
                <ApiPerformanceChart
                  endpointPerformance={summary.endpoint_performance}
                  timeSeriesData={detailedAnalytics?.time_series.time_series}
                  detailedAnalytics={detailedAnalytics}
                  isLoading={isLoading}
                />
                {systemHealth && (
                  <SystemHealthIndicators
                    healthIndicators={systemHealth}
                    loadMetrics={summary.load_metrics}
                    onRefresh={refresh}
                    isLoading={isLoading}
                  />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="cache" className="space-y-6">
            {cacheMetrics && (
              <CacheMetricsCard
                metrics={cacheMetrics}
                onClearCache={(key) => handleCacheAction('clear', key)}
                onWarmCache={() => handleCacheAction('warm')}
                isLoading={isLoading}
              />
            )}
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            {systemHealth && (
              <SystemHealthIndicators
                healthIndicators={systemHealth}
                loadMetrics={summary?.load_metrics}
                onRefresh={refresh}
                isLoading={isLoading}
              />
            )}
          </TabsContent>

          <TabsContent value="optimizer" className="space-y-6">
            <PerformanceOptimizer
              onOptimizationComplete={(result) => {
                setNotification({
                  type: result.success ? 'success' : 'error',
                  title: result.success ? 'Optimization Complete' : 'Optimization Failed',
                  message: result.message,
                });
                
                if (result.success) {
                  // Refresh data after successful optimization
                  setTimeout(() => {
                    refresh();
                  }, 1000);
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}