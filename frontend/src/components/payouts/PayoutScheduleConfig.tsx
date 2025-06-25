'use client'

import { useState } from 'react'
import { CalendarIcon, ClockIcon, CurrencyDollarIcon, BellIcon } from '@heroicons/react/24/outline'

interface PayoutSchedule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  dayOfWeek?: number // 0-6 for weekly/biweekly
  dayOfMonth?: number // 1-31 for monthly
  time: string // HH:MM format
  minPayoutAmount: number
  autoApprove: boolean
  notifyBarbers: boolean
  notifyAdmin: boolean
  paymentMethods: string[]
}

export default function PayoutScheduleConfig() {
  const [schedule, setSchedule] = useState<PayoutSchedule>({
    frequency: 'weekly',
    dayOfWeek: 4, // Thursday
    time: '10:00',
    minPayoutAmount: 50,
    autoApprove: true,
    notifyBarbers: true,
    notifyAdmin: true,
    paymentMethods: ['stripe', 'paypal']
  })

  const [saving, setSaving] = useState(false)

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      // API call to save schedule configuration
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulated
      console.log('Saving schedule:', schedule)
    } catch (error) {
      console.error('Error saving schedule:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-violet-600" />
          Payout Schedule Configuration
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Configure automatic payout schedules for your barbers
        </p>
      </div>

      <div className="space-y-6">
        {/* Frequency Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payout Frequency
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['daily', 'weekly', 'biweekly', 'monthly'].map((freq) => (
              <button
                key={freq}
                onClick={() => setSchedule({ ...schedule, frequency: freq as any })}
                className={`px-4 py-2 rounded-lg border-2 transition-all capitalize ${
                  schedule.frequency === freq
                    ? 'border-violet-600 bg-violet-50 text-violet-700 font-medium'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        {/* Day Selection */}
        {schedule.frequency === 'weekly' || schedule.frequency === 'biweekly' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day of Week
            </label>
            <select
              value={schedule.dayOfWeek}
              onChange={(e) => setSchedule({ ...schedule, dayOfWeek: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              {daysOfWeek.map((day, index) => (
                <option key={index} value={index}>{day}</option>
              ))}
            </select>
          </div>
        ) : schedule.frequency === 'monthly' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day of Month
            </label>
            <select
              value={schedule.dayOfMonth || 1}
              onChange={(e) => setSchedule({ ...schedule, dayOfMonth: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Time Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ClockIcon className="h-4 w-4 inline mr-1" />
            Processing Time
          </label>
          <input
            type="time"
            value={schedule.time}
            onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>

        {/* Minimum Payout Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CurrencyDollarIcon className="h-4 w-4 inline mr-1" />
            Minimum Payout Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={schedule.minPayoutAmount}
              onChange={(e) => setSchedule({ ...schedule, minPayoutAmount: parseInt(e.target.value) })}
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              min="0"
              step="10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Payouts below this amount will roll over to the next period
          </p>
        </div>

        {/* Payment Methods */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Methods
          </label>
          <div className="space-y-2">
            {['stripe', 'paypal', 'bank_transfer'].map((method) => (
              <label key={method} className="flex items-center">
                <input
                  type="checkbox"
                  checked={schedule.paymentMethods.includes(method)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSchedule({
                        ...schedule,
                        paymentMethods: [...schedule.paymentMethods, method]
                      })
                    } else {
                      setSchedule({
                        ...schedule,
                        paymentMethods: schedule.paymentMethods.filter(m => m !== method)
                      })
                    }
                  }}
                  className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {method.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-sm font-medium text-gray-900 flex items-center">
            <BellIcon className="h-4 w-4 mr-2" />
            Automation Settings
          </h4>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={schedule.autoApprove}
              onChange={(e) => setSchedule({ ...schedule, autoApprove: e.target.checked })}
              className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Automatically approve payouts
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={schedule.notifyBarbers}
              onChange={(e) => setSchedule({ ...schedule, notifyBarbers: e.target.checked })}
              className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Notify barbers when payouts are processed
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={schedule.notifyAdmin}
              onChange={(e) => setSchedule({ ...schedule, notifyAdmin: e.target.checked })}
              className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Send admin summary after each payout run
            </span>
          </label>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}
