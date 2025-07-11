import React, { useState, useEffect } from 'react'
import { fetchAPI } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CreditCardIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

interface BillingSectionProps {
  userRole?: string
}

export default function BillingSection({ userRole }: BillingSectionProps) {
  const [billingData, setBillingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBilling() {
      try {
        setLoading(true)
        // In production, this would fetch from the billing API
        const mockData = {
          current_plan: {
            name: 'Professional',
            price: 299,
            billing_cycle: 'monthly',
            features: [
              'Unlimited bookings',
              'Advanced analytics',
              'Marketing tools',
              'Priority support',
              'Custom branding'
            ]
          },
          payment_method: {
            type: 'card',
            last_four: '4242',
            brand: 'Visa',
            expires: '12/25'
          },
          next_billing_date: '2024-02-15',
          billing_history: [
            { date: '2024-01-15', amount: 299, status: 'paid', invoice_id: 'INV-2024-001' },
            { date: '2023-12-15', amount: 299, status: 'paid', invoice_id: 'INV-2023-012' },
            { date: '2023-11-15', amount: 299, status: 'paid', invoice_id: 'INV-2023-011' }
          ]
        }
        setBillingData(mockData)
      } catch (error) {
        console.error('Error fetching billing:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBilling()
  }, [])

  if (loading || !billingData) {
    return <div>Loading billing information...</div>
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{billingData.current_plan.name}</h3>
                  <p className="text-gray-600">${billingData.current_plan.price}/{billingData.current_plan.billing_cycle}</p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Included Features:</h4>
                <ul className="space-y-1">
                  {billingData.current_plan.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full">
                  Change Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CreditCardIcon className="h-8 w-8 text-gray-600" />
                  <div>
                    <p className="font-medium">{billingData.payment_method.brand} ****{billingData.payment_method.last_four}</p>
                    <p className="text-sm text-gray-600">Expires {billingData.payment_method.expires}</p>
                  </div>
                </div>
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ExclamationCircleIcon className="h-5 w-5 text-blue-600" />
                  <p className="text-sm">
                    Next billing date: <span className="font-medium">{new Date(billingData.next_billing_date).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                Update Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Billing History</CardTitle>
            <Button variant="secondary" size="sm">
              Download All Invoices
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Invoice ID</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {billingData.billing_history.map((invoice: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-3">{new Date(invoice.date).toLocaleDateString()}</td>
                    <td className="py-3 font-mono text-sm">{invoice.invoice_id}</td>
                    <td className="py-3 font-medium">${invoice.amount}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-bold mb-2">Starter</h3>
              <p className="text-3xl font-bold mb-4">$99<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-sm">
                <li>Up to 100 bookings/month</li>
                <li>Basic analytics</li>
                <li>Email support</li>
              </ul>
              <Button variant="outline" className="w-full mt-4">
                Downgrade
              </Button>
            </div>
            
            <div className="p-6 border-2 border-primary-500 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <h3 className="text-lg font-bold mb-2">Professional</h3>
              <p className="text-3xl font-bold mb-4">$299<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-sm">
                <li>Unlimited bookings</li>
                <li>Advanced analytics</li>
                <li>Priority support</li>
              </ul>
              <Button className="w-full mt-4" disabled>
                Current Plan
              </Button>
            </div>
            
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-bold mb-2">Enterprise</h3>
              <p className="text-3xl font-bold mb-4">$599<span className="text-sm font-normal">/month</span></p>
              <ul className="space-y-2 text-sm">
                <li>Multi-location support</li>
                <li>Custom integrations</li>
                <li>Dedicated support</li>
              </ul>
              <Button variant="primary" className="w-full mt-4">
                Upgrade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}