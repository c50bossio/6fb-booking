'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CreditCardIcon, BanknotesIcon } from '@heroicons/react/24/outline'

export default function TestImportsPage() {
  const [loading] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-8">
        <h1 className="text-2xl font-bold flex items-center space-x-2">
          <ArrowLeftIcon className="h-6 w-6" />
          <span>Barber Payments - Test Imports</span>
        </h1>
        
        <div className="mt-4 space-y-4">
          <div className="flex items-center space-x-2">
            <CreditCardIcon className="h-5 w-5" />
            <span>Credit Card Icon Working</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <BanknotesIcon className="h-5 w-5" />
            <span>Banknotes Icon Working</span>
          </div>
          
          <div className="bg-green-600 p-4 rounded">
            ✅ Basic imports working: {loading ? 'Loading' : 'Ready'}
          </div>
          
          <button
            onClick={() => router.push('/analytics')}
            className="bg-blue-600 px-4 py-2 rounded"
          >
            Test Router
          </button>
        </div>
      </div>
    </div>
  )
}