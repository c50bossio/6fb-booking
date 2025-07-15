import React, { useState, useEffect } from 'react'
import { fetchAPI } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  ReceiptPercentIcon,
  UserGroupIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface CommissionsSectionProps {
  userRole?: string
}

export default function CommissionsSection({ userRole }: CommissionsSectionProps) {
  const [commissionsData, setCommissionsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editingBarber, setEditingBarber] = useState<number | null>(null)

  useEffect(() => {
    async function loadCommissions() {
      try {
        setLoading(true)
        // In production, this would fetch from the commissions API
        const mockData = {
          default_rate: 60,
          barbers: [
            { id: 1, name: 'John Smith', rate: 60, bookings: 142, revenue: 8540 },
            { id: 2, name: 'Sarah Johnson', rate: 65, bookings: 128, revenue: 7920 },
            { id: 3, name: 'Mike Davis', rate: 55, bookings: 156, revenue: 9360 },
            { id: 4, name: 'Lisa Chen', rate: 70, bookings: 98, revenue: 6860 },
            { id: 5, name: 'David Wilson', rate: 60, bookings: 134, revenue: 8040 }
          ]
        }
        setCommissionsData(mockData)
      } catch (error) {
        console.error('Error fetching commissions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCommissions()
  }, [])

  if (loading || !commissionsData) {
    return <div>Loading commissions...</div>
  }

  const averageRate = commissionsData.barbers.reduce((sum: number, barber: any) => sum + barber.rate, 0) / commissionsData.barbers.length

  return (
    <div className="space-y-6">
      {/* Commission Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Default Rate</p>
                <p className="text-lg font-bold">{commissionsData.default_rate}%</p>
              </div>
              <ReceiptPercentIcon className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Average Rate</p>
                <p className="text-lg font-bold">{averageRate.toFixed(1)}%</p>
              </div>
              <ReceiptPercentIcon className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Barbers</p>
                <p className="text-lg font-bold">{commissionsData.barbers.length}</p>
              </div>
              <UserGroupIcon className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Commission Rates by Barber</CardTitle>
            <Button size="sm">
              Set Default Rate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Barber</th>
                  <th className="text-left py-2">Commission Rate</th>
                  <th className="text-left py-2">Monthly Bookings</th>
                  <th className="text-left py-2">Monthly Revenue</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {commissionsData.barbers.map((barber: any) => (
                  <tr key={barber.id} className="border-b">
                    <td className="py-3 font-medium">{barber.name}</td>
                    <td className="py-3">
                      {editingBarber === barber.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            defaultValue={barber.rate}
                            className="w-20 px-2 py-1 border rounded"
                          />
                          <span>%</span>
                        </div>
                      ) : (
                        <span className={`font-medium ${
                          barber.rate > commissionsData.default_rate ? 'text-green-600' :
                          barber.rate < commissionsData.default_rate ? 'text-red-600' :
                          ''
                        }`}>
                          {barber.rate}%
                        </span>
                      )}
                    </td>
                    <td className="py-3">{barber.bookings}</td>
                    <td className="py-3">${barber.revenue.toLocaleString()}</td>
                    <td className="py-3">
                      {editingBarber === barber.id ? (
                        <div className="flex space-x-2">
                          <Button size="sm" variant="primary">Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingBarber(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingBarber(barber.id)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Commission Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2">Current Structure</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>Service Revenue:</span>
                  <span className="font-medium">Barber keeps {100 - commissionsData.default_rate}%</span>
                </li>
                <li className="flex justify-between">
                  <span>Product Sales:</span>
                  <span className="font-medium">Barber keeps 80%</span>
                </li>
                <li className="flex justify-between">
                  <span>Tips:</span>
                  <span className="font-medium">Barber keeps 100%</span>
                </li>
                <li className="flex justify-between">
                  <span>Platform Fee:</span>
                  <span className="font-medium">{commissionsData.default_rate}% of services</span>
                </li>
              </ul>
            </div>
            
            <Button variant="outline" className="w-full">
              Customize Commission Structure
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}