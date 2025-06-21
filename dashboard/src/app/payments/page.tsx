'use client';

import { useState, useEffect } from 'react';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface BarberPaymentModel {
  id: number;
  barber_id: number;
  barber_name: string;
  payment_type: 'commission' | 'booth_rent' | 'hybrid';
  service_commission_rate: number;
  product_commission_rate: number;
  stripe_connected: boolean;
  square_connected: boolean;
  total_revenue: number;
  pending_payout: number;
}

interface CommissionSummary {
  barber_id: number;
  barber_name: string;
  period_start: string;
  period_end: string;
  service_revenue: number;
  service_commission: number;
  product_revenue: number;
  product_commission: number;
  total_commission: number;
  shop_owner_portion: number;
  barber_portion: number;
  status: string;
}

interface PaymentMetrics {
  total_revenue: number;
  total_commissions: number;
  pending_payouts: number;
  completed_payouts: number;
  active_barbers: number;
  product_sales: number;
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [barberModels, setBarberModels] = useState<BarberPaymentModel[]>([]);
  const [commissions, setCommissions] = useState<CommissionSummary[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [processingPayout, setProcessingPayout] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      if (selectedPeriod === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate.setDate(startDate.getDate() - 30);
      }

      // Fetch all data in parallel
      const [metricsRes, modelsRes, commissionsRes] = await Promise.all([
        axios.get('/api/v1/payments/metrics'),
        axios.get('/api/v1/payment-splits/connected-accounts'),
        axios.get('/api/v1/payroll/period-summary', {
          params: {
            period_start: startDate.toISOString(),
            period_end: endDate.toISOString()
          }
        })
      ]);

      setMetrics(metricsRes.data);
      setBarberModels(modelsRes.data);
      setCommissions(commissionsRes.data);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (barberId: number) => {
    setProcessingPayout(barberId);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      await axios.post('/api/v1/barber-payments/payouts/process', {
        barber_id: barberId,
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
        include_services: true,
        include_products: true
      });

      // Refresh data
      await fetchData();
      
      // Show success message (you could use a toast library here)
      alert('Payout processed successfully!');
    } catch (error) {
      console.error('Error processing payout:', error);
      alert('Failed to process payout. Please try again.');
    } finally {
      setProcessingPayout(null);
    }
  };

  const processBatchPayouts = async () => {
    if (!confirm('Process payouts for all eligible barbers?')) return;
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      await axios.post('/api/v1/barber-payments/payouts/batch', {
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString()
      });

      await fetchData();
      alert('Batch payouts processed successfully!');
    } catch (error) {
      console.error('Error processing batch payouts:', error);
      alert('Failed to process batch payouts. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <BanknotesIcon className="h-8 w-8 text-emerald-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Payment Management</h1>
                <p className="text-sm text-gray-400">Manage barber commissions and payouts</p>
              </div>
            </div>
            <button
              onClick={processBatchPayouts}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Process All Payouts</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="mb-6 flex items-center space-x-4">
          <span className="text-gray-400">Period:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={`$${metrics?.total_revenue?.toFixed(2) || '0.00'}`}
            icon={<CurrencyDollarIcon className="h-6 w-6 text-emerald-400" />}
            bgColor="bg-emerald-500/10"
          />
          <MetricCard
            title="Total Commissions"
            value={`$${metrics?.total_commissions?.toFixed(2) || '0.00'}`}
            icon={<ChartBarIcon className="h-6 w-6 text-blue-400" />}
            bgColor="bg-blue-500/10"
          />
          <MetricCard
            title="Pending Payouts"
            value={`$${metrics?.pending_payouts?.toFixed(2) || '0.00'}`}
            icon={<ClockIcon className="h-6 w-6 text-yellow-400" />}
            bgColor="bg-yellow-500/10"
          />
          <MetricCard
            title="Product Sales"
            value={`$${metrics?.product_sales?.toFixed(2) || '0.00'}`}
            icon={<ShoppingBagIcon className="h-6 w-6 text-purple-400" />}
            bgColor="bg-purple-500/10"
          />
        </div>

        {/* Barber Payment Models */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Barber Payment Setup</h2>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Barber</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Payment Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Service Rate</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Product Rate</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {barberModels.map((model) => (
                  <tr key={model.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-white">{model.barber_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-medium rounded-full border bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {model.payment_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{(model.service_commission_rate * 100).toFixed(0)}%</td>
                    <td className="px-6 py-4 text-gray-300">{(model.product_commission_rate * 100).toFixed(0)}%</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {model.stripe_connected ? (
                          <span className="flex items-center text-green-400">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            <span className="text-xs">Stripe Connected</span>
                          </span>
                        ) : model.square_connected ? (
                          <span className="flex items-center text-blue-400">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            <span className="text-xs">Square Connected</span>
                          </span>
                        ) : (
                          <span className="flex items-center text-yellow-400">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            <span className="text-xs">Not Connected</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {/* Handle edit */}}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commission Summary */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Commission Summary</h2>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Barber</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Service Revenue</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Product Revenue</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Total Commission</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Barber Payout</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {commissions.map((commission) => (
                  <tr key={commission.barber_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-white">{commission.barber_name}</td>
                    <td className="px-6 py-4 text-gray-300">${commission.service_revenue.toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-300">${commission.product_revenue.toFixed(2)}</td>
                    <td className="px-6 py-4 text-emerald-400">${commission.total_commission.toFixed(2)}</td>
                    <td className="px-6 py-4 text-white font-semibold">${commission.barber_portion.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => processPayout(commission.barber_id)}
                        disabled={processingPayout === commission.barber_id}
                        className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                      >
                        {processingPayout === commission.barber_id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span>Pay Out</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
}

function MetricCard({ title, value, icon, bgColor }: MetricCardProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
      <div className="flex items-center space-x-4">
        <div className={`p-3 ${bgColor} rounded-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}