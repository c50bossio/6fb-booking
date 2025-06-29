'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import PaymentDetails from '@/components/PaymentDetails';
import RefundManager from '@/components/RefundManager';
import PaymentReports from '@/components/PaymentReports';
import { format, parseISO } from 'date-fns';
import { Download, RefreshCw, DollarSign, TrendingUp, AlertCircle, Search, Filter, Gift } from 'lucide-react';

interface Payment {
  id: number;
  amount: number;
  status: string;
  stripe_payment_intent_id?: string;
  platform_fee: number;
  barber_amount: number;
  commission_rate: number;
  refund_amount: number;
  gift_certificate_amount_used: number;
  created_at: string;
  appointment?: {
    id: number;
    service_name: string;
    start_time: string;
    user?: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
    barber?: {
      id: number;
      first_name: string;
      last_name: string;
    };
  };
}

interface PaymentHistoryResponse {
  payments: Payment[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface PaymentStats {
  total_revenue: number;
  total_transactions: number;
  average_transaction: number;
  refund_rate: number;
  gift_certificate_usage: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showRefundManager, setShowRefundManager] = useState(false);
  const [showReports, setShowReports] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const router = useRouter();

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [currentPage, statusFilter, dateRange]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '50',
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (dateRange.start) {
        params.append('start_date', dateRange.start);
      }
      
      if (dateRange.end) {
        params.append('end_date', dateRange.end);
      }

      const response: PaymentHistoryResponse = await fetchAPI(`/api/v1/payments/history?${params}`);
      setPayments(response.payments);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Calculate stats from payments or fetch from a dedicated endpoint
      const params = new URLSearchParams();
      if (dateRange.start) params.append('start_date', dateRange.start);
      if (dateRange.end) params.append('end_date', dateRange.end);
      
      const report = await fetchAPI(`/api/v1/payments/reports`, {
        method: 'POST',
        body: JSON.stringify({
          start_date: dateRange.start || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
          end_date: dateRange.end || new Date().toISOString(),
        }),
      });
      
      // Convert report data to stats
      setStats({
        total_revenue: report.revenue.total,
        total_transactions: report.transactions.total,
        average_transaction: report.averages.transaction_amount,
        refund_rate: report.transactions.refunded / report.transactions.total * 100,
        gift_certificate_usage: report.revenue.gift_certificates_used,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRefund = async (payment: Payment) => {
    setSelectedPayment(payment);
    setShowRefundManager(true);
  };

  const handleRefundComplete = () => {
    setShowRefundManager(false);
    setSelectedPayment(null);
    fetchPayments();
    fetchStats();
  };

  const exportPayments = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        start_date: dateRange.start || '',
        end_date: dateRange.end || '',
      });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/export?${params}`, {
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
        a.download = `payments_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting payments:', error);
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        payment.appointment?.user?.first_name?.toLowerCase().includes(search) ||
        payment.appointment?.user?.last_name?.toLowerCase().includes(search) ||
        payment.appointment?.user?.email?.toLowerCase().includes(search) ||
        payment.appointment?.service_name?.toLowerCase().includes(search) ||
        payment.stripe_payment_intent_id?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (showReports) {
    return <PaymentReports onBack={() => setShowReports(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <p className="mt-2 text-gray-600">Track transactions, process refunds, and generate reports</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.total_revenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-teal-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_transactions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-teal-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.average_transaction.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-teal-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Refund Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.refund_rate.toFixed(1)}%</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gift Certificates</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.gift_certificate_usage.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by client name, email, or transaction ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Status</option>
                <option value="succeeded">Succeeded</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="partially_refunded">Partially Refunded</option>
              </select>
              
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Start Date"
              />
              
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="End Date"
              />
              
              <button
                onClick={fetchPayments}
                className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              
              <button
                onClick={exportPayments}
                className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setShowReports(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                View Reports
              </button>
              
              <button
                onClick={() => router.push('/payments/gift-certificates')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Gift className="h-4 w-4" />
                Gift Certificates
              </button>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barber
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(parseISO(payment.created_at), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {payment.appointment?.user?.first_name} {payment.appointment?.user?.last_name}
                      </div>
                      <div className="text-gray-500">{payment.appointment?.user?.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.appointment?.service_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">${payment.amount.toFixed(2)}</div>
                      {payment.gift_certificate_amount_used > 0 && (
                        <div className="text-purple-600 text-xs">
                          Gift cert: ${payment.gift_certificate_amount_used.toFixed(2)}
                        </div>
                      )}
                      {payment.refund_amount > 0 && (
                        <div className="text-red-600 text-xs">
                          Refunded: ${payment.refund_amount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                      payment.status === 'refunded' ? 'bg-gray-100 text-gray-800' :
                      payment.status === 'partially_refunded' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.appointment?.barber ? 
                      `${payment.appointment.barber.first_name} ${payment.appointment.barber.last_name}` : 
                      'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedPayment(payment)}
                        className="text-teal-600 hover:text-teal-900"
                      >
                        View
                      </button>
                      {payment.status === 'succeeded' && payment.refund_amount < payment.amount && (
                        <button
                          onClick={() => handleRefund(payment)}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment && !showRefundManager && (
        <PaymentDetails
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onRefund={() => handleRefund(selectedPayment)}
        />
      )}

      {/* Refund Manager Modal */}
      {showRefundManager && selectedPayment && (
        <RefundManager
          payment={selectedPayment}
          onClose={() => {
            setShowRefundManager(false);
            setSelectedPayment(null);
          }}
          onComplete={handleRefundComplete}
        />
      )}
    </div>
  );
}