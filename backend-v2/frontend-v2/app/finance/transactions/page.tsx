'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAPI, getProfile, type User } from '@/lib/api'
import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'
import { 
  Download, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Search, 
  Filter,
  ArrowLeftIcon,
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { DateRangeSelector, DateRangePreset } from '@/components/analytics/shared/DateRangeSelector'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'

interface Payment {
  id: number
  amount: number
  status: string
  stripe_payment_intent_id?: string
  platform_fee: number
  barber_amount: number
  commission_rate: number
  refund_amount: number
  gift_certificate_amount_used: number
  created_at: string
  appointment?: {
    id: number
    service_name: string
    start_time: string
    user?: {
      id: number
      first_name: string
      last_name: string
      email: string
    }
    barber?: {
      id: number
      first_name: string
      last_name: string
    }
  }
}

interface PaymentStats {
  total_revenue: number
  total_transactions: number
  average_transaction: number
  refund_rate: number
  gift_certificate_usage: number
  successful_rate: number
}

export default function TransactionsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Initialize dates
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        // Get user profile
        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        setUser(userData)

        // Fetch payments
        const params = new URLSearchParams({
          page: currentPage.toString(),
          page_size: '50',
          start_date: startDate,
          end_date: endDate
        })
        
        if (statusFilter !== 'all') {
          params.append('status', statusFilter)
        }

        const response = await fetchAPI(`/api/v2/payments/history?${params}`)
        setPayments(response.payments || [])
        setTotalPages(response.total_pages || 1)

        // Calculate stats
        const report = await fetchAPI(`/api/v2/payments/reports`, {
          method: 'POST',
          body: JSON.stringify({
            start_date: startDate,
            end_date: endDate
          })
        })
        
        setStats({
          total_revenue: report.revenue.total,
          total_transactions: report.transactions.total,
          average_transaction: report.averages.transaction_amount,
          refund_rate: (report.transactions.refunded / report.transactions.total) * 100,
          gift_certificate_usage: report.revenue.gift_certificates_used,
          successful_rate: (report.transactions.successful / report.transactions.total) * 100
        })
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setLoading(false)
      }
    }

    if (startDate && endDate) {
      loadData()
    }
  }, [currentPage, statusFilter, startDate, endDate, router])

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        start_date: startDate,
        end_date: endDate
      })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v2/payments/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting transactions:', error)
    }
  }

  const filteredPayments = payments.filter(payment => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        payment.appointment?.user?.first_name?.toLowerCase().includes(search) ||
        payment.appointment?.user?.last_name?.toLowerCase().includes(search) ||
        payment.appointment?.user?.email?.toLowerCase().includes(search) ||
        payment.appointment?.service_name?.toLowerCase().includes(search) ||
        payment.stripe_payment_intent_id?.toLowerCase().includes(search)
      )
    }
    return true
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-600" />
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-600" />
      case 'refunded':
      case 'partially_refunded':
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      default:
        return null
    }
  }

  if (loading) {
    return <PageLoading message="Loading transactions..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/finance')}
                variant="ghost"
                size="sm"
                leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
              >
                Financial Center
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Transactions
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  View and manage all payment transactions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Revenue</p>
                    <p className="text-lg font-bold">${stats.total_revenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Transactions</p>
                    <p className="text-lg font-bold">{stats.total_transactions}</p>
                  </div>
                  <CreditCardIcon className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Avg Transaction</p>
                    <p className="text-lg font-bold">${stats.average_transaction.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Success Rate</p>
                    <p className="text-lg font-bold">{stats.successful_rate.toFixed(1)}%</p>
                  </div>
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Refund Rate</p>
                    <p className="text-lg font-bold">{stats.refund_rate.toFixed(1)}%</p>
                  </div>
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Gift Certificates</p>
                    <p className="text-lg font-bold">${stats.gift_certificate_usage.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search by client name, email, or transaction ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="partially_refunded">Partially Refunded</option>
                </select>
                
                <Button
                  onClick={() => window.location.reload()}
                  variant="secondary"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Refresh
                </Button>
                
                <Button
                  onClick={handleExport}
                  variant="secondary"
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Export
                </Button>
              </div>
              
              <DateRangeSelector
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                preset={datePreset}
                onPresetChange={setDatePreset}
              />
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Barber
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {format(parseISO(payment.created_at), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {payment.appointment?.user?.first_name} {payment.appointment?.user?.last_name}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">{payment.appointment?.user?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {payment.appointment?.service_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">${payment.amount.toFixed(2)}</div>
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
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(payment.status)}
                          <span className={`text-sm font-medium capitalize ${
                            payment.status === 'succeeded' ? 'text-green-600' :
                            payment.status === 'pending' ? 'text-yellow-600' :
                            payment.status === 'failed' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {payment.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {payment.appointment?.barber ? 
                          `${payment.appointment.barber.first_name} ${payment.appointment.barber.last_name}` : 
                          'N/A'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => setSelectedPayment(payment)}
                            variant="ghost"
                            size="sm"
                          >
                            View
                          </Button>
                          {payment.status === 'succeeded' && payment.refund_amount < payment.amount && (
                            <Button
                              onClick={() => {
                                setSelectedPayment(payment)
                                // Open refund modal
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-orange-600 hover:text-orange-700"
                            >
                              Refund
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    variant="secondary"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    variant="secondary"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing page <span className="font-medium">{currentPage}</span> of{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="secondary"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      variant="secondary"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}