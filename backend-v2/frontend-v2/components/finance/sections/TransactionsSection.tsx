import React, { useState, useEffect } from 'react'
import { fetchAPI } from '@/lib/api'
import { format } from 'date-fns/format'
import { parseISO } from 'date-fns/parseISO'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  RefreshCw, 
  Search, 
  Filter,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  AlertCircle
} from 'lucide-react'

interface TransactionsSectionProps {
  userRole?: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

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

export default function TransactionsSection({ userRole, dateRange }: TransactionsSectionProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    async function loadPayments() {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: currentPage.toString(),
          page_size: '20',
          start_date: dateRange.startDate,
          end_date: dateRange.endDate
        })
        
        if (statusFilter !== 'all') {
          params.append('status', statusFilter)
        }

        const response = await fetchAPI(`/api/v2/payments/history?${params}`)
        setPayments(response.payments || [])
        setTotalPages(response.total_pages || 1)
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPayments()
  }, [currentPage, statusFilter, dateRange])

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
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
    return <div>Loading transactions...</div>
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
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
                  {userRole !== 'client' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Barber
                    </th>
                  )}
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
                    {userRole !== 'client' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {payment.appointment?.barber ? 
                          `${payment.appointment.barber.first_name} ${payment.appointment.barber.last_name}` : 
                          'N/A'
                        }
                      </td>
                    )}
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
  )
}