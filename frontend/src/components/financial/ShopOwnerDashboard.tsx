import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  CreditCard,
  AlertCircle,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react';
import { financialService } from '@/lib/api/financial';
import type { ShopMetrics as ImportedShopMetrics, BarberRevenue as ImportedBarberRevenue } from '@/lib/api/financial';
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Notification from '@/components/Notification';

// Use the imported types from financial API
type ShopMetrics = ImportedShopMetrics;
type BarberRevenue = ImportedBarberRevenue;

interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export function ShopOwnerDashboard() {
  const [metrics, setMetrics] = useState<ShopMetrics | null>(null);
  const [barberRevenue, setBarberRevenue] = useState<BarberRevenue[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const handleExport = () => {
    if (!barberRevenue.length) {
      setNotification({
        type: 'warning',
        title: 'No data to export',
        message: 'There is no barber revenue data available to export.'
      });
      return;
    }

    // Create CSV content
    const headers = ['Barber', 'Total Revenue', 'Services', 'Products', 'Tips', 'Commission', 'Booth Rent Status'];
    const rows = barberRevenue.map(barber => [
      barber.barber_name,
      barber.total_revenue.toFixed(2),
      barber.service_revenue.toFixed(2),
      barber.product_revenue.toFixed(2),
      barber.tips.toFixed(2),
      barber.commission_owed.toFixed(2),
      financialService.getBoothRentStatusLabel(barber.booth_rent_status)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barber-revenue-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setNotification({
      type: 'success',
      title: 'Export successful',
      message: 'Barber revenue data has been exported to CSV.'
    });
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'process-payouts':
        setNotification({
          type: 'info',
          title: 'Processing Payouts',
          message: 'This feature is coming soon. Payouts will be processed automatically.'
        });
        break;
      case 'tax-report':
        setNotification({
          type: 'info',
          title: 'Generating Report',
          message: 'Tax report generation will be available soon.'
        });
        break;
      case 'payment-methods':
        setNotification({
          type: 'info',
          title: 'Payment Methods',
          message: 'Payment method management will be available in the settings.'
        });
        break;
      case 'transactions':
        setNotification({
          type: 'info',
          title: 'Transaction History',
          message: 'Full transaction history view is coming soon.'
        });
        break;
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Map date range to API expected format
      const apiDateRange = dateRange === 'week' ? 'last_7_days' :
                          dateRange === 'month' ? 'last_30_days' :
                          'last_90_days';

      const [metricsRes, barbersRes] = await Promise.all([
        financialService.getShopMetrics(apiDateRange),
        financialService.getBarberRevenue(apiDateRange)
      ]);

      if (metricsRes.data) {
        setMetrics(metricsRes.data);

        // Calculate revenue breakdown for pie chart
        const breakdown = [
          {
            category: 'Services',
            amount: metricsRes.data.service_revenue,
            percentage: metricsRes.data.total_revenue > 0
              ? (metricsRes.data.service_revenue / metricsRes.data.total_revenue) * 100
              : 0,
            color: '#10b981'
          },
          {
            category: 'Products',
            amount: metricsRes.data.product_revenue,
            percentage: metricsRes.data.total_revenue > 0
              ? (metricsRes.data.product_revenue / metricsRes.data.total_revenue) * 100
              : 0,
            color: '#3b82f6'
          },
          {
            category: 'Tips',
            amount: metricsRes.data.tips_total,
            percentage: metricsRes.data.total_revenue > 0
              ? (metricsRes.data.tips_total / metricsRes.data.total_revenue) * 100
              : 0,
            color: '#f59e0b'
          }
        ];
        setRevenueBreakdown(breakdown);
      }

      if (barbersRes.data) {
        setBarberRevenue(barbersRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setNotification({
        type: 'error',
        title: 'Failed to load dashboard data',
        message: 'Please try again later or contact support if the issue persists.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-gray-200 dark:bg-gray-700" />
              <CardContent className="h-20 bg-gray-100 dark:bg-gray-800" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Shop Performance Overview</h2>
        <div className="flex gap-2">
          <Button
            variant={dateRange === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('week')}
          >
            This Week
          </Button>
          <Button
            variant={dateRange === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('month')}
          >
            This Month
          </Button>
          <Button
            variant={dateRange === 'quarter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('quarter')}
          >
            This Quarter
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedNumber value={metrics.total_revenue} format={formatCurrency} />
            </div>
            <div className="flex items-center gap-1 mt-1">
              {metrics.total_revenue_trend > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+{metrics.total_revenue_trend}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">{metrics.total_revenue_trend}%</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.net_revenue)}</div>
            <p className="text-xs text-muted-foreground">After fees & payouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Barbers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_barbers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.utilization_rate}% utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Ticket</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.average_ticket)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.total_appointments} appointments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {revenueBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Barber Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barberRevenue.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="barber_name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="total_revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Financial Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.pending_payouts)}</div>
            <Progress value={65} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Next batch: Tomorrow at 5 PM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booth Rent</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.booth_rent_collected)}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">Pending</span>
              <span className="text-sm font-medium">{formatCurrency(metrics.booth_rent_pending)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Fees</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.processing_fees)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              2.9% + $0.30 per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barber Revenue Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Barber Revenue Details</CardTitle>
          <Button variant="outline" size="sm" onClick={() => handleExport()}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Barber</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Services</th>
                  <th className="text-right p-2">Products</th>
                  <th className="text-right p-2">Tips</th>
                  <th className="text-right p-2">Commission</th>
                  <th className="text-center p-2">Booth Rent</th>
                </tr>
              </thead>
              <tbody>
                {barberRevenue.map((barber) => (
                  <tr key={barber.barber_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2 font-medium">{barber.barber_name}</td>
                    <td className="text-right p-2">{formatCurrency(barber.total_revenue)}</td>
                    <td className="text-right p-2">{formatCurrency(barber.service_revenue)}</td>
                    <td className="text-right p-2">{formatCurrency(barber.product_revenue)}</td>
                    <td className="text-right p-2">{formatCurrency(barber.tips)}</td>
                    <td className="text-right p-2">{formatCurrency(barber.commission_owed)}</td>
                    <td className="text-center p-2">
                      <Badge
                        variant={barber.booth_rent_status === 'paid' ? 'default' :
                                barber.booth_rent_status === 'overdue' ? 'destructive' :
                                'secondary'}
                        className={barber.booth_rent_status === 'paid' ? 'bg-green-100 text-green-800' :
                                  barber.booth_rent_status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'}
                      >
                        {financialService.getBoothRentStatusLabel(barber.booth_rent_status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleAction('process-payouts')}>Process Payouts</Button>
            <Button variant="outline" onClick={() => handleAction('tax-report')}>
              <Download className="h-4 w-4 mr-2" />
              Generate Tax Report
            </Button>
            <Button variant="outline" onClick={() => handleAction('payment-methods')}>Manage Payment Methods</Button>
            <Button variant="outline" onClick={() => handleAction('transactions')}>View All Transactions</Button>
          </div>
        </CardContent>
      </Card>

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
