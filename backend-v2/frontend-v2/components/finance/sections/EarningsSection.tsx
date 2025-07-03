import React, { useState, useEffect } from 'react'
import { fetchAPI } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  CurrencyDollarIcon,
  CalendarDaysIcon,
  TrendingUpIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface EarningsSectionProps {
  userRole?: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function EarningsSection({ userRole, dateRange }: EarningsSectionProps) {
  const [earningsData, setEarningsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  useEffect(() => {
    async function loadEarnings() {
      try {
        setLoading(true)
        const response = await fetchAPI(
          `/api/v1/payments/earnings?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
        )
        setEarningsData(response)
      } catch (error) {
        console.error('Error fetching earnings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEarnings()
  }, [dateRange])

  if (loading || !earningsData) {
    return <div>Loading earnings...</div>
  }

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Earnings</p>
                <p className="text-lg font-bold">${earningsData.total_earnings?.toFixed(2) || '0.00'}</p>
              </div>
              <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Pending Amount</p>
                <p className="text-lg font-bold">${earningsData.pending_amount?.toFixed(2) || '0.00'}</p>
              </div>
              <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Commission Rate</p>
                <p className="text-lg font-bold">{earningsData.commission_rate || 0}%</p>
              </div>
              <ChartBarIcon className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Next Payout</p>
                <p className="text-lg font-bold">
                  {earningsData.next_payout_date ? 
                    new Date(earningsData.next_payout_date).toLocaleDateString() : 
                    'Not scheduled'
                  }
                </p>
              </div>
              <TrendingUpIcon className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Earnings Breakdown</CardTitle>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span>Service Earnings</span>
              <span className="font-bold">${earningsData.service_earnings?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span>Tips</span>
              <span className="font-bold">${earningsData.tips?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span>Product Sales</span>
              <span className="font-bold">${earningsData.product_earnings?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span>Platform Fees</span>
              <span className="font-bold text-red-600">-${earningsData.platform_fees?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Net Earnings</span>
                <span className="text-xl font-bold text-green-600">
                  ${(earningsData.total_earnings - earningsData.platform_fees)?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Earnings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {earningsData.recent_earnings && earningsData.recent_earnings.length > 0 ? (
            <div className="space-y-3">
              {earningsData.recent_earnings.map((earning: any, index: number) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{earning.service_name}</p>
                    <p className="text-sm text-gray-600">{earning.client_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(earning.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${earning.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">
                      {earning.commission_rate}% commission
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No earnings data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}