'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign, CreditCard, Gift, Users, FileText, PieChart as PieChartIcon } from 'lucide-react';
import { LineChart, BarChart, PieChart } from '@/components/analytics/ChartComponents';

interface PaymentReportsProps {
  onBack: () => void;
}

interface ReportData {
  period: {
    start: string;
    end: string;
  };
  revenue: {
    total: number;
    credit_card: number;
    gift_certificates_used: number;
    refunds: number;
    net: number;
  };
  commissions: {
    platform_fees: number;
    barber_payouts: number;
    average_commission_rate: number;
  };
  transactions: {
    total: number;
    succeeded: number;
    failed: number;
    refunded: number;
    partially_refunded: number;
  };
  averages: {
    transaction_amount: number;
    daily_revenue: number;
    transactions_per_day: number;
  };
  daily_breakdown?: Array<{
    date: string;
    revenue: number;
    transactions: number;
    refunds: number;
  }>;
  barber_breakdown?: Array<{
    barber_id: number;
    barber_name: string;
    revenue: number;
    transactions: number;
    commission_earned: number;
  }>;
  service_breakdown?: Array<{
    service_name: string;
    revenue: number;
    transactions: number;
  }>;
}

const PRESET_PERIODS = [
  { label: 'Last 30 Days', getValue: () => ({ start: subMonths(new Date(), 1), end: new Date() }) },
  { label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Last Month', getValue: () => ({ 
      start: startOfMonth(subMonths(new Date(), 1)), 
      end: endOfMonth(subMonths(new Date(), 1)) 
    }) 
  },
  { label: 'This Year', getValue: () => ({ start: startOfYear(new Date()), end: new Date() }) },
];

export default function PaymentReports({ onBack }: PaymentReportsProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedPeriod, setSelectedPeriod] = useState('Last 30 Days');
  const [includeTax, setIncludeTax] = useState(false);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI('/api/v1/payments/reports', {
        method: 'POST',
        body: JSON.stringify({
          start_date: new Date(dateRange.start).toISOString(),
          end_date: new Date(dateRange.end).toISOString(),
        }),
      });
      setReportData(response);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (periodLabel: string) => {
    setSelectedPeriod(periodLabel);
    const period = PRESET_PERIODS.find(p => p.label === periodLabel);
    if (period) {
      const { start, end } = period.getValue();
      setDateRange({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      });
    }
  };

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        format,
        start_date: dateRange.start,
        end_date: dateRange.end,
        include_tax: includeTax.toString(),
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/reports/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `payment_report_${dateRange.start}_to_${dateRange.end}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <p className="text-gray-600">No report data available</p>
          <button onClick={onBack} className="mt-4 text-teal-600 hover:text-teal-700">
            Go back
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const revenueChartData = {
    labels: reportData.daily_breakdown?.map(d => format(new Date(d.date), 'MMM d')) || [],
    datasets: [
      {
        label: 'Revenue',
        data: reportData.daily_breakdown?.map(d => d.revenue) || [],
        borderColor: 'rgb(20, 184, 166)',
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        tension: 0.3,
      },
    ],
  };

  const paymentMethodData = {
    labels: ['Credit Card', 'Gift Certificates'],
    datasets: [
      {
        data: [
          reportData.revenue.credit_card,
          reportData.revenue.gift_certificates_used,
        ],
        backgroundColor: ['#0ea5e9', '#a855f7'],
        borderWidth: 0,
      },
    ],
  };

  const transactionStatusData = {
    labels: ['Succeeded', 'Failed', 'Refunded', 'Partially Refunded'],
    datasets: [
      {
        label: 'Transactions',
        data: [
          reportData.transactions.succeeded,
          reportData.transactions.failed,
          reportData.transactions.refunded,
          reportData.transactions.partially_refunded,
        ],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payment Reports</h1>
              <p className="mt-2 text-gray-600">
                Comprehensive payment analytics and insights
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => exportReport('csv')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              
              <button
                onClick={() => exportReport('pdf')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Select
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                {PRESET_PERIODS.map(period => (
                  <option key={period.label} value={period.label}>
                    {period.label}
                  </option>
                ))}
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setDateRange({ ...dateRange, start: e.target.value });
                  setSelectedPeriod('custom');
                }}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setDateRange({ ...dateRange, end: e.target.value });
                  setSelectedPeriod('custom');
                }}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>
            
            <button
              onClick={fetchReportData}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Update Report
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${reportData.revenue.total.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mt-1">
              Net: ${reportData.revenue.net.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Transactions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{reportData.transactions.total}</p>
            <p className="text-sm text-gray-600 mt-1">
              Avg: ${reportData.averages.transaction_amount.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Gift className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Gift Certificates</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${reportData.revenue.gift_certificates_used.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {((reportData.revenue.gift_certificates_used / reportData.revenue.total) * 100).toFixed(1)}% of revenue
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <TrendingDown className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-sm text-gray-500">Refunds</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${reportData.revenue.refunds.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {reportData.transactions.refunded + reportData.transactions.partially_refunded} transactions
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <LineChart
              data={revenueChartData}
              height={300}
              className="w-full"
            />
          </div>
          
          {/* Payment Methods */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
            <PieChart
              data={paymentMethodData}
              height={250}
              className="w-full"
            />
          </div>
        </div>

        {/* Transaction Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Status Breakdown</h3>
          <BarChart
            data={transactionStatusData}
            height={300}
            className="w-full"
          />
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commission Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Platform Fees</span>
                <span className="font-medium">${reportData.commissions.platform_fees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Barber Payouts</span>
                <span className="font-medium">${reportData.commissions.barber_payouts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Average Commission Rate</span>
                <span className="font-medium">{(reportData.commissions.average_commission_rate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          {/* Daily Averages */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Averages</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Revenue per Day</span>
                <span className="font-medium">${reportData.averages.daily_revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Transactions per Day</span>
                <span className="font-medium">{reportData.averages.transactions_per_day.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Average Transaction</span>
                <span className="font-medium">${reportData.averages.transaction_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <PieChartIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Tax Information</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>These reports show gross revenue before taxes. For tax reporting purposes, please consult with your accountant.</p>
                <p className="mt-1">You can enable tax calculations in your business settings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}