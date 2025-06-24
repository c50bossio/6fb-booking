import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  Database,
  Zap,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  HardDrive,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { CacheMetrics } from '@/lib/api/performance';

interface CacheMetricsCardProps {
  metrics: CacheMetrics;
  onClearCache?: (key: string) => Promise<void>;
  onWarmCache?: () => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function CacheMetricsCard({
  metrics,
  onClearCache,
  onWarmCache,
  isLoading = false,
  className = '',
}: CacheMetricsCardProps) {
  const [selectedCacheItem, setSelectedCacheItem] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isWarming, setIsWarming] = useState(false);

  const getCacheHealthStatus = () => {
    if (metrics.hit_rate >= 85) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (metrics.hit_rate >= 70) return { status: 'good', color: 'text-green-500', bg: 'bg-green-50' };
    if (metrics.hit_rate >= 50) return { status: 'fair', color: 'text-yellow-500', bg: 'bg-yellow-50' };
    return { status: 'poor', color: 'text-red-500', bg: 'bg-red-50' };
  };

  const getMemoryUsageStatus = () => {
    if (metrics.memory_usage_percent < 70) return { status: 'healthy', color: 'text-green-600' };
    if (metrics.memory_usage_percent < 85) return { status: 'warning', color: 'text-yellow-500' };
    return { status: 'critical', color: 'text-red-500' };
  };

  const handleClearCache = async (key: string) => {
    if (!onClearCache) return;
    
    setIsClearing(true);
    try {
      await onClearCache(key);
      setSelectedCacheItem(null);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleWarmCache = async () => {
    if (!onWarmCache) return;
    
    setIsWarming(true);
    try {
      await onWarmCache();
    } catch (error) {
      console.error('Failed to warm cache:', error);
    } finally {
      setIsWarming(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTTL = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const healthStatus = getCacheHealthStatus();
  const memoryStatus = getMemoryUsageStatus();

  // Prepare TTL distribution data for chart
  const ttlData = Object.entries(metrics.ttl_distribution).map(([range, count]) => ({
    range,
    count,
    percentage: ((count / Object.values(metrics.ttl_distribution).reduce((a, b) => a + b, 0)) * 100).toFixed(1),
  }));

  // Prepare hit/miss data for pie chart
  const hitMissData = [
    { name: 'Hits', value: metrics.total_hits, color: '#10b981' },
    { name: 'Misses', value: metrics.total_misses, color: '#ef4444' },
  ];

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cache Overview */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold flex items-center space-x-2">
            <Database className="h-6 w-6 text-blue-600" />
            <span>Cache Performance</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge 
              className={`${healthStatus.bg} ${healthStatus.color} border-0`}
            >
              {healthStatus.status.toUpperCase()}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWarmCache}
              disabled={isWarming}
              className="ml-2"
            >
              {isWarming ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isWarming ? 'Warming...' : 'Warm Cache'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Hit Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hit Rate</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                <AnimatedNumber value={metrics.hit_rate} format={(value) => `${value.toFixed(1)}%`} />
              </div>
              <Progress value={metrics.hit_rate} className="h-2" />
            </div>

            {/* Cache Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cache Size</span>
                <HardDrive className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                <AnimatedNumber value={metrics.cache_size_mb} format={(value) => `${value.toFixed(1)} MB`} />
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {((metrics.cache_size_mb / 1024) * 100).toFixed(1)}% of 1GB limit
              </div>
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Memory Usage</span>
                <Activity className={`h-4 w-4 ${memoryStatus.color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                <AnimatedNumber value={metrics.memory_usage_percent} format={(value) => `${value.toFixed(1)}%`} />
              </div>
              <Progress value={metrics.memory_usage_percent} className="h-2" />
            </div>

            {/* Evictions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Evictions</span>
                {metrics.evictions > 10 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                <AnimatedNumber value={metrics.evictions} format={(value) => value.toLocaleString()} />
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {metrics.evictions > 10 ? 'Consider increasing cache size' : 'Healthy eviction rate'}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hit/Miss Ratio */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Hit/Miss Ratio</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={hitMissData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {hitMissData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* TTL Distribution */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">TTL Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ttlData}>
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Items']} />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Cached Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <span>Top Cached Items</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.top_cached_items.map((item, index) => (
              <div
                key={item.key}
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                  selectedCacheItem === item.key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setSelectedCacheItem(selectedCacheItem === item.key ? null : item.key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {item.key}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center space-x-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{item.hits.toLocaleString()} hits</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <HardDrive className="h-3 w-3" />
                        <span>{formatBytes(item.size_bytes)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>TTL: {formatTTL(item.ttl_remaining)}</span>
                      </span>
                    </div>
                  </div>
                  {selectedCacheItem === item.key && onClearCache && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearCache(item.key);
                      }}
                      disabled={isClearing}
                      className="ml-4"
                    >
                      {isClearing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {isClearing ? 'Clearing...' : 'Clear'}
                    </Button>
                  )}
                </div>
                {selectedCacheItem === item.key && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Hit Ratio:</span>
                        <div className="font-medium">
                          {((item.hits / (metrics.total_hits + metrics.total_misses)) * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Size Ratio:</span>
                        <div className="font-medium">
                          {((item.size_bytes / (metrics.cache_size_mb * 1024 * 1024)) * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Expiry:</span>
                        <div className="font-medium">
                          {new Date(Date.now() + item.ttl_remaining * 1000).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}