'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import {
  Mail,
  MessageSquare,
  Bell,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

interface NotificationAnalyticsProps {
  className?: string;
  dateRange?: 'today' | 'week' | 'month' | 'quarter';
}

interface AnalyticsData {
  summary: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalOpened: number;
    totalClicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
  byType: {
    email: { sent: number; delivered: number; opened: number; clicked: number };
    sms: { sent: number; delivered: number; opened: number; clicked: number };
    push: { sent: number; delivered: number; opened: number; clicked: number };
  };
  byTemplate: Array<{
    template: string;
    sent: number;
    delivered: number;
    failed: number;
    openRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    email: number;
    sms: number;
    push: number;
  }>;
  deliveryStatusData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

// Mock data - in real implementation, this would come from the API
const mockAnalyticsData: AnalyticsData = {
  summary: {
    totalSent: 2547,
    totalDelivered: 2401,
    totalFailed: 146,
    totalOpened: 1823,
    totalClicked: 456,
    deliveryRate: 94.3,
    openRate: 75.9,
    clickRate: 25.0
  },
  byType: {
    email: { sent: 1876, delivered: 1789, opened: 1356, clicked: 342 },
    sms: { sent: 589, delivered: 567, opened: 423, clicked: 98 },
    push: { sent: 82, delivered: 45, opened: 44, clicked: 16 }
  },
  byTemplate: [
    { template: 'appointment_confirmation', sent: 1245, delivered: 1198, failed: 47, openRate: 82.1 },
    { template: 'appointment_reminder', sent: 856, delivered: 823, failed: 33, openRate: 68.5 },
    { template: 'appointment_cancellation', sent: 234, delivered: 218, failed: 16, openRate: 45.2 },
    { template: 'payment_receipt', sent: 212, delivered: 162, failed: 50, openRate: 91.4 }
  ],
  timeSeriesData: [
    { date: '2024-06-17', email: 245, sms: 67, push: 12 },
    { date: '2024-06-18', email: 289, sms: 78, push: 15 },
    { date: '2024-06-19', email: 267, sms: 82, push: 11 },
    { date: '2024-06-20', email: 298, sms: 91, push: 18 },
    { date: '2024-06-21', email: 276, sms: 85, push: 14 },
    { date: '2024-06-22', email: 312, sms: 94, push: 8 },
    { date: '2024-06-23', email: 189, sms: 92, push: 4 }
  ],
  deliveryStatusData: [
    { name: 'Delivered', value: 2401, color: '#10b981' },
    { name: 'Failed', value: 146, color: '#ef4444' }
  ]
};

export const NotificationAnalytics: React.FC<NotificationAnalyticsProps> = ({
  className,
  dateRange = 'week'
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState(dateRange);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedDateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setData(mockAnalyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error || 'Failed to load analytics data'}</p>
            <Button onClick={fetchAnalyticsData} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Analytics</h2>
          <p className="text-gray-600">Monitor notification performance and delivery rates</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sent</p>
                <p className="text-2xl font-bold">{formatNumber(data.summary.totalSent)}</p>
              </div>
              <Bell className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivery Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPercentage(data.summary.deliveryRate)}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPercentage(data.summary.openRate)}
                </p>
              </div>
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Click Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercentage(data.summary.clickRate)}
                </p>
              </div>
              <Zap className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Series Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line type="monotone" dataKey="email" stroke="#3b82f6" name="Email" strokeWidth={2} />
                <Line type="monotone" dataKey="sms" stroke="#10b981" name="SMS" strokeWidth={2} />
                <Line type="monotone" dataKey="push" stroke="#8b5cf6" name="Push" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Delivery Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.deliveryStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.deliveryStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Notification Types Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Notification Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email */}
            <div className="text-center">
              <Mail className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Email</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sent:</span>
                  <span className="font-medium">{formatNumber(data.byType.email.sent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delivered:</span>
                  <span className="font-medium">{formatNumber(data.byType.email.delivered)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Opened:</span>
                  <span className="font-medium">{formatNumber(data.byType.email.opened)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Clicked:</span>
                  <span className="font-medium">{formatNumber(data.byType.email.clicked)}</span>
                </div>
              </div>
            </div>

            {/* SMS */}
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">SMS</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sent:</span>
                  <span className="font-medium">{formatNumber(data.byType.sms.sent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delivered:</span>
                  <span className="font-medium">{formatNumber(data.byType.sms.delivered)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Read:</span>
                  <span className="font-medium">{formatNumber(data.byType.sms.opened)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Clicked:</span>
                  <span className="font-medium">{formatNumber(data.byType.sms.clicked)}</span>
                </div>
              </div>
            </div>

            {/* Push */}
            <div className="text-center">
              <Bell className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Push</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sent:</span>
                  <span className="font-medium">{formatNumber(data.byType.push.sent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Delivered:</span>
                  <span className="font-medium">{formatNumber(data.byType.push.delivered)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Opened:</span>
                  <span className="font-medium">{formatNumber(data.byType.push.opened)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Clicked:</span>
                  <span className="font-medium">{formatNumber(data.byType.push.clicked)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Template Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byTemplate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="template"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.replace('_', ' ')}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(value) => (value as string).replace('_', ' ')}
              />
              <Legend />
              <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
              <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
              <Bar dataKey="failed" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-4">Template Details</h4>
            <div className="space-y-3">
              {data.byTemplate.map((template) => (
                <div key={template.template} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{template.template.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600">
                      {formatNumber(template.sent)} sent • {formatNumber(template.delivered)} delivered
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        template.openRate > 70 ? 'bg-green-50 text-green-700 border-green-200' :
                        template.openRate > 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {formatPercentage(template.openRate)} open rate
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
