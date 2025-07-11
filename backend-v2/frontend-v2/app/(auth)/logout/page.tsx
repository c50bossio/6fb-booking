'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function LogoutPage() {
  const router = useRouter()
  const { logout } = useAuth()

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Perform logout
        await logout()
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Redirect to login page
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
        // Still redirect to login even if logout fails
        router.push('/login')
      }
    }

    performLogout()
  }, [logout, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 max-w-sm w-full">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h2 className="text-xl font-semibold">Signing out...</h2>
          <p className="text-gray-600 text-center">
            Please wait while we securely sign you out.
          </p>
        </div>
      </Card>
    </div>
  )
}