import React, { useState, useEffect } from 'react'
import { fetchAPI } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { 
  GiftIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface GiftCertificatesSectionProps {
  userRole?: string
}

export default function GiftCertificatesSection({ userRole }: GiftCertificatesSectionProps) {
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    async function loadCertificates() {
      try {
        setLoading(true)
        // In production, this would fetch from the gift certificates API
        const mockData = [
          { 
            id: 1, 
            code: 'GIFT-2024-001', 
            amount: 100, 
            balance: 100, 
            status: 'active',
            recipient: 'John Doe',
            purchaser: 'Jane Smith',
            created_at: '2024-01-15',
            expires_at: '2024-07-15'
          },
          { 
            id: 2, 
            code: 'GIFT-2024-002', 
            amount: 50, 
            balance: 25, 
            status: 'partial',
            recipient: 'Mike Wilson',
            purchaser: 'Sarah Johnson',
            created_at: '2024-01-20',
            expires_at: '2024-07-20'
          },
          { 
            id: 3, 
            code: 'GIFT-2024-003', 
            amount: 75, 
            balance: 0, 
            status: 'redeemed',
            recipient: 'Lisa Chen',
            purchaser: 'David Brown',
            created_at: '2024-01-10',
            expires_at: '2024-07-10'
          }
        ]
        setCertificates(mockData)
      } catch (error) {
        console.error('Error fetching gift certificates:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCertificates()
  }, [])

  if (loading) {
    return <div>Loading gift certificates...</div>
  }

  const activeCertificates = certificates.filter(c => c.status === 'active')
  const totalBalance = certificates.reduce((sum, c) => sum + c.balance, 0)
  const totalIssued = certificates.reduce((sum, c) => sum + c.amount, 0)

  return (
    <div className="space-y-6">
      {/* Gift Certificate Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Active Certificates</p>
                <p className="text-lg font-bold">{activeCertificates.length}</p>
              </div>
              <GiftIcon className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Balance</p>
                <p className="text-lg font-bold">${totalBalance.toFixed(2)}</p>
              </div>
              <GiftIcon className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Issued</p>
                <p className="text-lg font-bold">${totalIssued.toFixed(2)}</p>
              </div>
              <GiftIcon className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Redemption Rate</p>
                <p className="text-lg font-bold">
                  {((totalIssued - totalBalance) / totalIssued * 100).toFixed(0)}%
                </p>
              </div>
              <CheckCircleIcon className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Certificate */}
      {userRole !== 'client' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create Gift Certificate</CardTitle>
              <Button
                leftIcon={<PlusIcon className="h-4 w-4" />}
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                New Certificate
              </Button>
            </div>
          </CardHeader>
          {showCreateForm && (
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount</label>
                    <input
                      type="number"
                      placeholder="$0.00"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Recipient Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Recipient Email</label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Expiration Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary">
                    Create Certificate
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      {/* Gift Certificates List */}
      <Card>
        <CardHeader>
          <CardTitle>All Gift Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Code</th>
                  <th className="text-left py-2">Recipient</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Balance</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Expires</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id} className="border-b">
                    <td className="py-3 font-mono text-sm">{cert.code}</td>
                    <td className="py-3">{cert.recipient}</td>
                    <td className="py-3">${cert.amount.toFixed(2)}</td>
                    <td className="py-3 font-medium">${cert.balance.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        cert.status === 'active' ? 'bg-green-100 text-green-800' :
                        cert.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        cert.status === 'redeemed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <span className="mr-1">
                          {cert.status === 'active' && <CheckCircleIcon className="h-3 w-3" />}
                          {cert.status === 'partial' && <ClockIcon className="h-3 w-3" />}
                          {cert.status === 'redeemed' && <CheckCircleIcon className="h-3 w-3" />}
                          {cert.status === 'expired' && <XCircleIcon className="h-3 w-3" />}
                        </span>
                        {cert.status}
                      </span>
                    </td>
                    <td className="py-3">{new Date(cert.expires_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}