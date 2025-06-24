import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
} from 'recharts';
import type { EndpointPerformance, TimeSeriesData, DetailedAnalytics } from '@/lib/api/performance';

interface ApiPerformanceChartProps {
  endpointPerformance: EndpointPerformance[];
  timeSeriesData?: TimeSeriesData[];
  detailedAnalytics?: DetailedAnalytics;
  isLoading?: boolean;
  className?: string;
}

type ChartType = 'response-time' | 'throughput' | 'error-rate' | 'endpoint-comparison';
type TimeRange = '1h' | '6h' | '24h' | '7d';

export function ApiPerformanceChart({
  endpointPerformance,
  timeSeriesData,
  detailedAnalytics,
  isLoading = false,
  className = '',
}: ApiPerformanceChartProps) {
  const [selectedChart, setSelectedChart] = useState<ChartType>('response-time');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('24h');
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const getEndpointStatus = (endpoint: EndpointPerformance) => {
    if (endpoint.avg_response_time > 1000) return { status: 'slow', color: 'text-red-500', icon: AlertTriangle };
    if (endpoint.success_rate < 95) return { status: 'errors', color: 'text-yellow-500', icon: XCircle };
    return { status: 'healthy', color: 'text-green-500', icon: CheckCircle };
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter and sort endpoints
  const filteredEndpoints = useMemo(() => {
    let filtered = [...endpointPerformance];
    
    if (showOnlyErrors) {
      filtered = filtered.filter(ep => ep.success_rate < 100 || ep.avg_response_time > 500);
    }
    
    if (selectedEndpoints.length > 0) {
      filtered = filtered.filter(ep => selectedEndpoints.includes(`${ep.method}:${ep.path}`));
    }
    
    return filtered.sort((a, b) => {
      switch (selectedChart) {
        case 'response-time':
          return b.avg_response_time - a.avg_response_time;
        case 'throughput':
          return b.total_requests - a.total_requests;
        case 'error-rate':
          return (100 - a.success_rate) - (100 - b.success_rate);
        default:
          return b.total_requests - a.total_requests;
      }
    });
  }, [endpointPerformance, showOnlyErrors, selectedEndpoints, selectedChart]);

  // Prepare chart data based on selected type
  const chartData = useMemo(() => {
    if (selectedChart === 'endpoint-comparison') {
      return filteredEndpoints.slice(0, 10).map(ep => ({
        name: `${ep.method} ${ep.path.split('/').pop() || ep.path}`,
        'Avg Response Time': ep.avg_response_time,
        'Requests': ep.total_requests,
        'Success Rate': ep.success_rate,
        'Error Rate': 100 - ep.success_rate,
        fullPath: ep.path,
        method: ep.method,
      }));
    }
    
    if (timeSeriesData) {
      return timeSeriesData.map(point => ({
        time: new Date(point.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        timestamp: point.timestamp,
        'Response Time': point.avg_response_time,
        'P95 Response Time': point.p95_response_time,
        'Requests': point.requests,
        'Error Rate': point.error_rate,
        'Success Rate': 100 - point.error_rate,
      }));
    }
    
    return [];
  }, [selectedChart, filteredEndpoints, timeSeriesData]);

  const overallStats = useMemo(() => {
    if (endpointPerformance.length === 0) return null;
    
    const totalRequests = endpointPerformance.reduce((sum, ep) => sum + ep.total_requests, 0);
    const totalErrors = endpointPerformance.reduce((sum, ep) => sum + ep.failed_requests, 0);
    const avgResponseTime = endpointPerformance.reduce((sum, ep) => sum + (ep.avg_response_time * ep.total_requests), 0) / totalRequests;
    const successRate = ((totalRequests - totalErrors) / totalRequests) * 100;
    
    return {
      totalRequests,
      totalErrors,
      avgResponseTime,
      successRate,
      totalEndpoints: endpointPerformance.length,
    };
  }, [endpointPerformance]);

  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    switch (selectedChart) {
      case 'response-time':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'Response Time' || name === 'P95 Response Time' 
                    ? formatDuration(value) 
                    : value.toLocaleString(), 
                  name
                ]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="Response Time" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3}
              />
              <Area 
                type="monotone" 
                dataKey="P95 Response Time" 
                stroke="#ef4444" 
                fill="#ef4444" 
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'throughput':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Requests']} />
              <Legend />
              <Bar dataKey="Requests" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'error-rate':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Success Rate']} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Success Rate" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="Error Rate" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'endpoint-comparison':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={chartData}>
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="Avg Response Time" 
                name="Response Time"
                unit="ms"
              />
              <YAxis 
                type="number" 
                dataKey="Requests" 
                name="Total Requests"
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: number, name: string) => [
                  name === 'Avg Response Time' ? formatDuration(value) : value.toLocaleString(),
                  name
                ]}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.name;
                  }
                  return '';
                }}
              />
              <Scatter 
                name="Endpoints" 
                dataKey="Success Rate" 
                fill="#3b82f6"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Statistics */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Requests</span>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              <AnimatedNumber value={overallStats.totalRequests} format={(value) => value.toLocaleString()} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Response</span>
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              <AnimatedNumber value={overallStats.avgResponseTime} format={formatDuration} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Success Rate</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              <AnimatedNumber value={overallStats.successRate} format={(value) => `${value.toFixed(1)}%`} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Errors</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              <AnimatedNumber value={overallStats.totalErrors} format={(value) => value.toLocaleString()} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Endpoints</span>
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              <AnimatedNumber value={overallStats.totalEndpoints} format={(value) => value.toString()} />
            </div>
          </div>
        </div>
      )}

      {/* Main Chart */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <CardTitle className="text-xl font-semibold flex items-center space-x-2">
              <Activity className="h-6 w-6 text-purple-600" />
              <span>API Performance Analytics</span>
            </CardTitle>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Chart Type Selector */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {[
                  { type: 'response-time' as ChartType, label: 'Response Time', icon: Clock },
                  { type: 'throughput' as ChartType, label: 'Throughput', icon: BarChart3 },
                  { type: 'error-rate' as ChartType, label: 'Success Rate', icon: CheckCircle },
                  { type: 'endpoint-comparison' as ChartType, label: 'Comparison', icon: Activity },
                ].map(({ type, label, icon: Icon }) => (
                  <Button
                    key={type}
                    variant={selectedChart === type ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedChart(type)}
                    className="text-xs"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>

              {/* Filters */}
              <Button
                variant={showOnlyErrors ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyErrors(!showOnlyErrors)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Issues Only
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Endpoint Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            <span>Endpoint Performance Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3">Endpoint</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-right p-3">Requests</th>
                  <th className="text-right p-3">Success Rate</th>
                  <th className="text-right p-3">Avg Response</th>
                  <th className="text-right p-3">P95 Response</th>
                  <th className="text-right p-3">Throughput</th>
                </tr>
              </thead>
              <tbody>
                {filteredEndpoints.slice(0, 10).map((endpoint) => {
                  const status = getEndpointStatus(endpoint);
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr 
                      key={`${endpoint.method}:${endpoint.path}`}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              endpoint.method === 'GET' ? 'border-blue-500 text-blue-700' :
                              endpoint.method === 'POST' ? 'border-green-500 text-green-700' :
                              endpoint.method === 'PUT' ? 'border-yellow-500 text-yellow-700' :
                              endpoint.method === 'DELETE' ? 'border-red-500 text-red-700' :
                              'border-gray-500 text-gray-700'
                            }`}
                          >
                            {endpoint.method}
                          </Badge>
                          <span className="font-mono text-xs truncate max-w-xs" title={endpoint.path}>
                            {endpoint.path}
                          </span>
                        </div>
                      </td>
                      <td className="text-center p-3">
                        <StatusIcon className={`h-4 w-4 mx-auto ${status.color}`} />
                      </td>
                      <td className="text-right p-3 font-medium">
                        {endpoint.total_requests.toLocaleString()}
                      </td>
                      <td className="text-right p-3">
                        <span className={`font-medium ${
                          endpoint.success_rate >= 99 ? 'text-green-600' :
                          endpoint.success_rate >= 95 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {endpoint.success_rate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right p-3 font-medium">
                        {formatDuration(endpoint.avg_response_time)}
                      </td>
                      <td className="text-right p-3 font-medium">
                        {formatDuration(endpoint.p95_response_time)}
                      </td>
                      <td className="text-right p-3">
                        <div className="flex items-center justify-end space-x-1">
                          <span className="font-medium">
                            {formatBytes(endpoint.total_bytes_sent)}
                          </span>
                          <ArrowUp className="h-3 w-3 text-green-500" />
                          <span className="text-gray-500">/</span>
                          <span className="font-medium">
                            {formatBytes(endpoint.total_bytes_received)}
                          </span>
                          <ArrowDown className="h-3 w-3 text-blue-500" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}