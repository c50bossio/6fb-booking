'use client'

import { useState } from 'react'
import { 
  UserGroupIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

interface Barber {
  id: string
  name: string
  email: string
  phone: string
  status: 'active' | 'inactive'
  commission: number
  weeklyEarnings: number
  monthlyEarnings: number
  paymentAccount: 'stripe' | 'paypal' | 'bank' | null
  lastPayout: string
}

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([
    {
      id: '1',
      name: 'Marcus Johnson',
      email: 'marcus@example.com',
      phone: '(555) 123-4567',
      status: 'active',
      commission: 70,
      weeklyEarnings: 1680,
      monthlyEarnings: 7200,
      paymentAccount: 'stripe',
      lastPayout: '2024-06-19'
    },
    {
      id: '2',
      name: 'Anthony Davis',
      email: 'anthony@example.com',
      phone: '(555) 234-5678',
      status: 'active',
      commission: 65,
      weeklyEarnings: 1440,
      monthlyEarnings: 6100,
      paymentAccount: 'paypal',
      lastPayout: '2024-06-19'
    },
    {
      id: '3',
      name: 'Jerome Williams',
      email: 'jerome@example.com',
      phone: '(555) 345-6789',
      status: 'active',
      commission: 70,
      weeklyEarnings: 1920,
      monthlyEarnings: 8300,
      paymentAccount: 'stripe',
      lastPayout: '2024-06-19'
    },
    {
      id: '4',
      name: 'David Thompson',
      email: 'david@example.com',
      phone: '(555) 456-7890',
      status: 'inactive',
      commission: 60,
      weeklyEarnings: 0,
      monthlyEarnings: 4200,
      paymentAccount: null,
      lastPayout: '2024-06-12'
    }
  ])

  const [showAddModal, setShowAddModal] = useState(false)
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleConnectAccount = (barberId: string) => {
    setBarbers(barbers.map(barber => 
      barber.id === barberId 
        ? { ...barber, paymentAccount: 'stripe' }
        : barber
    ))
    alert('✅ Payment account connected successfully! (Demo mode)')
  }

  const handlePayNow = (barberName: string, amount: number) => {
    setPayoutSuccess(`${barberName} - ${formatCurrency(amount)}`)
    setTimeout(() => setPayoutSuccess(null), 3000)
  }

  const handleAddBarber = () => {
    const newBarber: Barber = {
      id: Date.now().toString(),
      name: 'New Barber',
      email: 'newbarber@example.com',
      phone: '(555) 999-0000',
      status: 'active',
      commission: 65,
      weeklyEarnings: 1200,
      monthlyEarnings: 5000,
      paymentAccount: null,
      lastPayout: new Date().toISOString().split('T')[0]
    }
    setBarbers([...barbers, newBarber])
    setShowAddModal(false)
    alert('✅ New barber added successfully! (Demo mode)')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">6FB Platform</h1>
              <nav className="ml-10 flex space-x-4">
                <a href="/app" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
                <a href="/app/calendar" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Calendar
                </a>
                <a href="/app/analytics" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Analytics
                </a>
                <a href="/app/barbers" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Barbers
                </a>
                <a href="/app/payments" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Payments
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Demo Mode</span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                D
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Barber Management</h2>
              <p className="text-gray-600 mt-1">Manage your team and payment accounts</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Barber</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Barbers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{barbers.length}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-violet-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {barbers.filter(b => b.status === 'active').length}
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Weekly Earnings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(barbers.reduce((sum, b) => sum + b.weeklyEarnings, 0))}
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Next Payout</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">Thu</p>
              </div>
              <BanknotesIcon className="h-8 w-8 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Barbers Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barber
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weekly Earnings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {barbers.map((barber) => (
                  <tr key={barber.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{barber.name}</div>
                        <div className="text-sm text-gray-500">{barber.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        barber.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {barber.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barber.commission}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(barber.weeklyEarnings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {barber.paymentAccount ? (
                        <div className="flex items-center space-x-2">
                          <CreditCardIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900 capitalize">{barber.paymentAccount}</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleConnectAccount(barber.id)}
                          className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                        >
                          Connect Account
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-3">
                        <button className="text-violet-600 hover:text-violet-700 font-medium">
                          Edit
                        </button>
                        <button className="text-emerald-600 hover:text-emerald-700 font-medium">
                          Pay Now
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}