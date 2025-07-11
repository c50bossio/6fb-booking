import React, { useState, useEffect } from 'react'
import { fetchAPI } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BanknotesIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface PayoutsSectionProps {
  userRole?: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function PayoutsSection({ userRole, dateRange }: PayoutsSectionProps) {
  const [payoutsData, setPayoutsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPayouts() {
      try {
        setLoading(true)
        const response = await fetchAPI(`/api/v1/payments/payouts?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`)
        setPayoutsData(response)
      } catch (error) {
        console.error('Error fetching payouts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPayouts()
  }, [dateRange])

  if (loading || !payoutsData) {
    return <div>Loading payouts...</div>
  }

  return (
    <div className="space-y-6">
      {/* Payout Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Next Payout</p>
                <p className="text-lg font-bold">
                  {payoutsData.next_payout ? 
                    `$${payoutsData.next_payout.amount.toFixed(2)}` : 
                    'No payout scheduled'
                  }
                </p>
                {payoutsData.next_payout && (
                  <p className="text-xs text-gray-500">
                    {new Date(payoutsData.next_payout.date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <BanknotesIcon className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Paid Out</p>
                <p className="text-lg font-bold">${payoutsData.total_paid_out?.toFixed(2) || '0.00'}</p>
              </div>
              <CheckCircleIcon className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Pending Balance</p>
                <p className="text-lg font-bold">${payoutsData.pending_balance?.toFixed(2) || '0.00'}</p>
              </div>
              <ClockIcon className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Payout Frequency</p>
                <p className="text-lg font-bold">{payoutsData.payout_frequency || 'Daily'}</p>
              </div>
              <CalendarIcon className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium mb-2">Current Payout Settings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Schedule:</span>
                  <span className="font-medium">{payoutsData.payout_schedule || 'Daily automatic'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum Payout:</span>
                  <span className="font-medium">${payoutsData.minimum_payout || '10.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bank Account:</span>
                  <span className="font-medium">****{payoutsData.bank_last_four || '1234'}</span>
                </div>
              </div>
            </div>
            
            <Button variant="outline" className="w-full">
              Update Payout Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payoutsData.history && payoutsData.history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutsData.history.map((payout: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="py-3">{new Date(payout.date).toLocaleDateString()}</td>
                      <td className="py-3 font-medium">${payout.amount.toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                          payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="py-3">{payout.method || 'Bank Transfer'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No payout history available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}