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
import { api } from '@/lib/api';
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

interface ShopMetrics {
  total_revenue: number;
  total_revenue_trend: number;
  service_revenue: number;
  product_revenue: number;
  tips_total: number;
  processing_fees: number;
  net_revenue: number;
  pending_payouts: number;
  completed_payouts: number;
  booth_rent_collected: number;
  booth_rent_pending: number;
  active_barbers: number;
  total_appointments: number;
  average_ticket: number;
  utilization_rate: number;
}

interface BarberRevenue {
  barber_id: string;
  barber_name: string;
  total_revenue: number;
  service_revenue: number;
  product_revenue: number;
  tips: number;
  appointments: number;
  commission_owed: number;
  booth_rent_status: string;
  booth_rent_amount?: number;
}

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

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsRes, barbersRes] = await Promise.all([
        api.get(`/financial/shop-metrics?range=${dateRange}`),
        api.get(`/financial/barber-revenue?range=${dateRange}`)
      ]);

      setMetrics(metricsRes.data);
      setBarberRevenue(barbersRes.data);

      // Calculate revenue breakdown for pie chart
      if (metricsRes.data) {
        const breakdown = [
          {
            category: 'Services',
            amount: metricsRes.data.service_revenue,
            percentage: (metricsRes.data.service_revenue / metricsRes.data.total_revenue) * 100,
            color: '#10b981'
          },
          {
            category: 'Products',
            amount: metricsRes.data.product_revenue,
            percentage: (metricsRes.data.product_revenue / metricsRes.data.total_revenue) * 100,
            color: '#3b82f6'
          },
          {
            category: 'Tips',
            amount: metricsRes.data.tips_total,
            percentage: (metricsRes.data.tips_total / metricsRes.data.total_revenue) * 100,
            color: '#f59e0b'
          }
        ];
        setRevenueBreakdown(breakdown);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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
          <Button variant="outline" size="sm">
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
                        variant={barber.booth_rent_status === 'paid' ? 'success' : 'warning'}
                      >
                        {barber.booth_rent_status}
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
            <Button>Process Payouts</Button>
            <Button variant="outline">Generate Tax Report</Button>
            <Button variant="outline">Manage Payment Methods</Button>
            <Button variant="outline">View All Transactions</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
