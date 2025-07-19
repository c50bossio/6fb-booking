'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI, getPaymentHistory, getStripeConnectStatus, getProfile } from '@/lib/api';
import StripeConnectOnboarding from '@/components/StripeConnectOnboarding';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { DollarSign, TrendingUp, Calendar, CreditCard, Download, Eye } from 'lucide-react';

interface EarningsSummary {
  total_earnings: number;
  pending_payouts: number;
  total_appointments: number;
  average_per_appointment: number;
  this_month: number;
  last_month: number;
}

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role?: string;
  first_name?: string;
  last_name?: string;
}

export default function BarberEarningsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()).toISOString().split('T')[0],
    end: endOfMonth(new Date()).toISOString().split('T')[0],
  });
  
  const router = useRouter();

  useEffect(() => {
    // Fetch user profile first
    const initializeUser = async () => {
      try {
        const profile = await getProfile();
        
        // Check if user has barber role
        if (profile.role !== 'barber' && profile.role !== 'admin' && profile.role !== 'super_admin') {
          setAuthError(true);
          return;
        }
        
        setUser(profile as UserProfile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setAuthError(true);
        router.push('/login');
      }
    };

    initializeUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [dateRange, user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Check Stripe Connect status
      const stripeStatusResult = await getStripeConnectStatus();
      setStripeStatus(stripeStatusResult);
      
      if (!stripeStatusResult.charges_enabled || !stripeStatusResult.payouts_enabled) {
        setShowOnboarding(true);
        return;
      }

      // Fetch earnings summary
      const summaryResponse = await fetchAPI('/api/v2/analytics/barber-earnings', {
        method: 'POST',
        body: JSON.stringify({
          barber_id: user.id,
          start_date: dateRange.start,
          end_date: dateRange.end,
        }),
      });
      
      setEarnings({
        total_earnings: summaryResponse.total_revenue || 0,
        pending_payouts: summaryResponse.pending_payouts || 0,
        total_appointments: summaryResponse.total_appointments || 0,
        average_per_appointment: summaryResponse.average_ticket || 0,
        this_month: summaryResponse.current_month_revenue || 0,
        last_month: summaryResponse.last_month_revenue || 0,
      });

      // Fetch payment history
      const paymentHistory = await getPaymentHistory({
        barber_id: user.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        page: 1,
        page_size: 50,
      });
      
      setPayments(paymentHistory.payments);
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportEarnings = async () => {
    if (!user) return;
    
    try {
      const params = new URLSearchParams({
        barber_id: user.id.toString(),
        start_date: dateRange.start,
        end_date: dateRange.end,
        format: 'csv',
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v2/payments/earnings/export?${params}`, {
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
        a.download = `earnings_${dateRange.start}_to_${dateRange.end}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting earnings:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in as a barber to view this page.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Setup Payouts</h1>
          <StripeConnectOnboarding onComplete={() => {
            setShowOnboarding(false);
            fetchData();
          }} />
        </div>
      </div>
    );
  }

  const monthGrowth = earnings && earnings.last_month > 0 
    ? ((earnings.this_month - earnings.last_month) / earnings.last_month * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Earnings</h1>
          <p className="mt-2 text-gray-600">Track your income and payouts</p>
        </div>

        {/* Summary Cards */}
        {earnings && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">${earnings.total_earnings.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1">This period</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <CreditCard className="h-6 w-6 text-yellow-600" />
                </div>
                <span className="text-sm text-gray-500">Pending Payouts</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">${earnings.pending_payouts.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1">To be transferred</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">This Month</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">${earnings.this_month.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                {parseFloat(monthGrowth) > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : null}
                {monthGrowth}% vs last month
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">Avg per Service</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">${earnings.average_per_appointment.toFixed(2)}</p>
              <p className="text-sm text-gray-600 mt-1">{earnings.total_appointments} services</p>
            </div>
          </div>
        )}

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            
            <button
              onClick={exportEarnings}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Earnings Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Appointment Earnings</h2>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Your Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(parseISO(payment.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {payment.appointment?.user?.first_name} {payment.appointment?.user?.last_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.appointment?.service_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${payment.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${payment.platform_fee.toFixed(2)} ({(payment.commission_rate * 100).toFixed(0)}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-green-600">
                      ${payment.barber_amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {payments.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No earnings found for this period</p>
            </div>
          )}
        </div>

        {/* Stripe Dashboard Link */}
        {stripeStatus?.has_account && (
          <div className="mt-6 text-center">
            <a
              href="https://dashboard.stripe.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
            >
              <Eye className="h-4 w-4" />
              View detailed reports in Stripe Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}