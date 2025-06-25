'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppPage() {
  const router = useRouter()

  useEffect(() => {
    console.log('🔄 App page useEffect running...')

    // Set demo mode flag in sessionStorage
    try {
      sessionStorage.setItem('demo_mode', 'true')
      console.log('✅ Demo mode set in sessionStorage')
    } catch (e) {
      // Fallback if sessionStorage is blocked
      console.log('⚠️ SessionStorage blocked, using URL parameter')
    }

    console.log('🚀 Attempting redirect to dashboard...')
    // Use setTimeout to ensure DOM is ready and force a hard navigation
    const timer = setTimeout(() => {
      console.log('🔄 Executing redirect now...')
      window.location.href = '/dashboard?demo=true'
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-teal-500 hover:bg-teal-400 transition ease-in-out duration-150">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading Demo...
        </div>
      </div>
    </div>
  )
}
