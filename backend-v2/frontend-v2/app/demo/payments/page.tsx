'use client'

import { useState } from 'react'
import { useDemoMode } from '@/components/demo/DemoModeProvider'
import DemoWrapper from '@/components/demo/DemoWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { format, subDays, parseISO } from 'date-fns'
import { 
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface DemoPayment {
  id: number
  amount: number
  status: string
  stripe_payment_intent_id: string
  platform_fee: number
  barber_amount: number
  commission_rate: number
  created_at: string
  appointment: {
    service_name: string
    start_time: string
    client_name: string
  }
}

// Generate realistic demo payment data
const generateDemoPayments = (): DemoPayment[] => {
  const payments: DemoPayment[] = []
  const services = ['Haircut', 'Beard Trim', 'Haircut & Beard Trim', 'Hair Styling', 'Full Service']
  const clients = ['Marcus Johnson', 'David Thompson', 'Alex Rivera', 'Jordan Smith', 'Chris Williams', 'Sam Davis', 'Taylor Brown']
  const amounts = [45, 25, 65, 35, 85]
  
  for (let i = 0; i < 25; i++) {
    const amount = amounts[Math.floor(Math.random() * amounts.length)]
    const platformFee = Math.round(amount * 0.08) // 8% platform fee
    const barberAmount = amount - platformFee
    const created = subDays(new Date(), Math.floor(Math.random() * 30))
    
    payments.push({
      id: i + 1,
      amount,
      status: Math.random() > 0.1 ? 'completed' : Math.random() > 0.5 ? 'pending' : 'failed',
      stripe_payment_intent_id: `pi_demo_${Date.now()}_${i}`,
      platform_fee: platformFee,
      barber_amount: barberAmount,
      commission_rate: 8,
      created_at: created.toISOString(),
      appointment: {
        service_name: services[Math.floor(Math.random() * services.length)],
        start_time: created.toISOString(),
        client_name: clients[Math.floor(Math.random() * clients.length)]
      }
    })
  }
  
  return payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export default function DemoPaymentsPage() {
  const { user } = useDemoMode()
  const [payments] = useState<DemoPayment[]>(generateDemoPayments())
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month')
  
  // Calculate metrics
  const completedPayments = payments.filter(p => p.status === 'completed')
  const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalBarberEarnings = completedPayments.reduce((sum, p) => sum + p.barber_amount, 0)
  const totalPlatformFees = completedPayments.reduce((sum, p) => sum + p.platform_fee, 0)
  const averageTransaction = completedPayments.length > 0 ? totalRevenue / completedPayments.length : 0
  
  // This week vs last week
  const thisWeekPayments = completedPayments.filter(p => 
    new Date(p.created_at) >= subDays(new Date(), 7)
  )
  const lastWeekPayments = completedPayments.filter(p => {
    const date = new Date(p.created_at)
    return date >= subDays(new Date(), 14) && date < subDays(new Date(), 7)
  })
  
  const thisWeekRevenue = thisWeekPayments.reduce((sum, p) => sum + p.amount, 0)
  const lastWeekRevenue = lastWeekPayments.reduce((sum, p) => sum + p.amount, 0)
  const weeklyGrowth = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue * 100) : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4" />
      case 'pending':
        return <ExclamationTriangleIcon className="w-4 h-4" />
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4" />
      default:
        return null
    }
  }

  const demoFeatures = [
    'View comprehensive payment history and transaction details',
    'Track revenue trends and barber earnings',
    'Monitor Stripe integration and platform fees',
    'Analyze payment success rates and failed transactions'
  ]

  return (
    <DemoWrapper
      title="Payment Dashboard"
      description="Comprehensive payment management and revenue tracking"
      demoFeatures={demoFeatures}
    >
      <div className="space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${totalRevenue}
                  </div>
                  <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                    +{weeklyGrowth.toFixed(1)}% vs last week
                  </div>
                </div>
                <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Your Earnings</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${totalBarberEarnings}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    After platform fees
                  </div>
                </div>
                <BanknotesIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Transaction</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${averageTransaction.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Per appointment
                  </div>
                </div>
                <CreditCardIcon className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {((completedPayments.length / payments.length) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Payment completion
                  </div>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stripe Integration Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-300">
              💳 Stripe Integration Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Payment Processing</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Secure card processing</li>
                  <li>• Apple Pay & Google Pay</li>
                  <li>• Automatic receipts</li>
                  <li>• Fraud protection</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Payout Schedule</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• Daily automatic payouts</li>
                  <li>• Direct bank transfer</li>
                  <li>• 2-day processing time</li>
                  <li>• No minimum threshold</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Fees & Pricing</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <li>• 2.9% + 30¢ per transaction</li>
                  <li>• Platform fee: 8% of total</li>
                  <li>• No monthly fees</li>
                  <li>• No setup costs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={timeframe === 'week' ? 'primary' : 'outline'} 
                  size="sm"
                  onClick={() => setTimeframe('week')}
                >
                  Week
                </Button>
                <Button 
                  variant={timeframe === 'month' ? 'primary' : 'outline'} 
                  size="sm"
                  onClick={() => setTimeframe('month')}
                >
                  Month
                </Button>
                <Button 
                  variant={timeframe === 'year' ? 'primary' : 'outline'} 
                  size="sm"
                  onClick={() => setTimeframe('year')}
                >
                  Year
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.slice(0, 10).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {payment.appointment.client_name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {payment.appointment.service_name} • {format(parseISO(payment.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {payment.stripe_payment_intent_id}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${payment.amount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      You earn: ${payment.barber_amount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      Platform fee: ${payment.platform_fee}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-6">
              <Button variant="outline">
                View All Transactions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <ArrowDownIcon className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Request Payout
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Transfer ${totalBarberEarnings} to your bank account
              </p>
              <Button variant="outline" className="w-full">
                Initiate Payout
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <CreditCardIcon className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Payment Settings
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Manage Stripe account and payment preferences
              </p>
              <Button variant="outline" className="w-full">
                Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <ArrowUpIcon className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Export Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Download payment reports for accounting
              </p>
              <Button variant="outline" className="w-full">
                Export
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DemoWrapper>
  )
}