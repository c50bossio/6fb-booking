'use client'

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
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
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission: 65
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleConnectAccount = (barberId: string) => {
    setBarbers(barbers.map(barber =>
      barber.id === barberId
        ? { ...barber, paymentAccount: 'stripe' }
        : barber
    ))
    showNotification('success', 'Payment account connected successfully!')
  }

  const handlePayNow = (barberId: string) => {
    const barber = barbers.find(b => b.id === barberId)
    if (barber) {
      setPayoutSuccess(`${barber.name} - ${formatCurrency(barber.weeklyEarnings)}`)
      setTimeout(() => setPayoutSuccess(null), 3000)
      showNotification('success', `Payout of ${formatCurrency(barber.weeklyEarnings)} sent to ${barber.name}!`)
    }
  }

  const handleEditBarber = (barber: Barber) => {
    setEditingBarber(barber)
    setFormData({
      name: barber.name,
      email: barber.email,
      phone: barber.phone,
      commission: barber.commission
    })
    setShowEditModal(true)
  }

  const handleAddBarber = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      showNotification('error', 'Please fill in all required fields')
      return
    }

    const newBarber: Barber = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      status: 'active',
      commission: formData.commission,
      weeklyEarnings: Math.floor(Math.random() * 1000) + 800, // Random demo earnings
      monthlyEarnings: Math.floor(Math.random() * 3000) + 3000,
      paymentAccount: null,
      lastPayout: new Date().toISOString().split('T')[0]
    }

    setBarbers([...barbers, newBarber])
    setShowAddModal(false)
    setFormData({ name: '', email: '', phone: '', commission: 65 })
    showNotification('success', `${formData.name} has been added successfully!`)
  }

  const handleUpdateBarber = () => {
    if (!editingBarber || !formData.name.trim() || !formData.email.trim()) {
      showNotification('error', 'Please fill in all required fields')
      return
    }

    setBarbers(barbers.map(barber =>
      barber.id === editingBarber.id
        ? { ...barber, ...formData }
        : barber
    ))

    setShowEditModal(false)
    setEditingBarber(null)
    setFormData({ name: '', email: '', phone: '', commission: 65 })
    showNotification('success', `${formData.name}'s profile has been updated!`)
  }

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', commission: 65 })
  }

  const { theme } = useTheme();

  return (
    <div className={`min-h-screen transition-colors ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>

      {/* Notification System */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Payout Success Notification */}
      {payoutSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
          💰 Payout Processed: {payoutSuccess}
        </div>
      )}

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
          <div className={`rounded-lg shadow-sm p-4 transition-colors ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Barbers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{barbers.length}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-violet-600" />
            </div>
          </div>
          <div className={`rounded-lg shadow-sm p-4 transition-colors ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
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
          <div className={`rounded-lg shadow-sm p-4 transition-colors ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
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
          <div className={`rounded-lg shadow-sm p-4 transition-colors ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
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
        <div className={`rounded-xl shadow-sm overflow-hidden transition-colors ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
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
                        <button
                          onClick={() => handleEditBarber(barber)}
                          className="text-violet-600 hover:text-violet-700 font-medium flex items-center space-x-1"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handlePayNow(barber.id)}
                          disabled={!barber.paymentAccount || barber.weeklyEarnings === 0}
                          className={`font-medium flex items-center space-x-1 ${
                            barber.paymentAccount && barber.weeklyEarnings > 0
                              ? 'text-emerald-600 hover:text-emerald-700'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <CurrencyDollarIcon className="h-4 w-4" />
                          <span>Pay Now</span>
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

      {/* Add Barber Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Barber</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddBarber(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Enter barber name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission %
                  </label>
                  <input
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({...formData, commission: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-md hover:from-violet-700 hover:to-purple-700"
                >
                  Add Barber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Barber Modal */}
      {showEditModal && editingBarber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Barber</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateBarber(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Enter barber name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission %
                  </label>
                  <input
                    type="number"
                    value={formData.commission}
                    onChange={(e) => setFormData({...formData, commission: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>Current Status:</strong> {editingBarber.status}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Weekly Earnings:</strong> {formatCurrency(editingBarber.weeklyEarnings)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Payment Account:</strong> {editingBarber.paymentAccount || 'Not connected'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBarber(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-md hover:from-violet-700 hover:to-purple-700"
                >
                  Update Barber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
