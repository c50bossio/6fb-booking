'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { customerAuthService } from '@/lib/api/customer-auth'
import type { Customer } from '@/lib/api/customer-auth'
import { smartStorage } from '@/lib/utils/storage'

interface CustomerAuthContextType {
  customer: Customer | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined)

const PUBLIC_ROUTES = ['/customer/login', '/customer/signup', '/customer/reset-password', '/book']

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      checkAuth()
    }
  }, [isClient])

  useEffect(() => {
    // Skip redirection during SSR or if not on customer routes
    if (!isClient || !pathname.startsWith('/customer')) return

    // Redirect to login if not authenticated and not on a public route
    if (!loading && !customer && !PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
      router.push('/customer/login')
    }
  }, [customer, loading, pathname, router, isClient])

  const checkAuth = async () => {
    try {
      let token = null
      try {
        // Safely access localStorage with error handling for browser extension conflicts
        token = typeof window !== 'undefined' ? localStorage.getItem('customer_access_token') : null
      } catch (e) {
        console.warn('Unable to access localStorage (possibly blocked by extension):', e)
        // Continue without token - app will work but customer won't be logged in
      }

      if (!token) {
        setLoading(false)
        return
      }

      const currentCustomer = await customerAuthService.getCurrentCustomer()
      setCustomer(currentCustomer)
    } catch (error) {
      console.error('Customer auth check failed:', error)
      try {
        // Safely remove token if auth fails
        if (typeof window !== 'undefined') {
          localStorage.removeItem('customer_access_token')
          localStorage.removeItem('customer')
        }
      } catch (e) {
        console.warn('Unable to clear localStorage:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await customerAuthService.login({ email, password })
      setCustomer(response.customer)
      router.push('/customer/dashboard')
    } catch (error: any) {
      console.error('Customer login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    await customerAuthService.logout()
    setCustomer(null)
    router.push('/customer/login')
  }

  const value = {
    customer,
    isLoading: loading,
    isAuthenticated: !!customer,
    login,
    logout,
  }

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  )
}

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext)
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider')
  }
  return context
}
