'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart as CartIcon,
  Package,
  LogOut,
  RefreshCw,
  User,
  HelpCircle
} from 'lucide-react'
import { PINEntryModal } from '@/components/pos/PINEntryModal'
import { ProductGrid, type Product } from '@/components/pos/ProductGrid'
import { ShoppingCart, type CartItem } from '@/components/pos/ShoppingCart'
import { CheckoutForm } from '@/components/pos/CheckoutForm'
import { ReceiptDisplay } from '@/components/pos/ReceiptDisplay'
import { MobilePOSLayout } from '@/components/pos/MobilePOSLayout'
import { QuickStartGuide } from '@/components/pos/QuickStartGuide'

// API imports
import apiClient from '@/lib/api/client'

// Import POS styles
import '@/styles/pos.css'

interface BarberSession {
  barberId: number
  barberName: string
  sessionToken: string
  expiresAt: Date
}

type ViewState = 'products' | 'checkout' | 'receipt'

export default function POSPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [session, setSession] = useState<BarberSession | null>(null)
  const [showPINModal, setShowPINModal] = useState(true)
  const [showQuickStart, setShowQuickStart] = useState(false)
  const [barbers, setBarbers] = useState<Array<{ id: number; name: string }>>([])
  const [products, setProducts] = useState<Product[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [currentView, setCurrentView] = useState<ViewState>('products')
  const [lastTransaction, setLastTransaction] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load barbers and products on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  // Check for existing session
  useEffect(() => {
    const savedSession = localStorage.getItem('pos_session')
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession)
      if (new Date(parsedSession.expiresAt) > new Date()) {
        setSession(parsedSession)
        setIsAuthenticated(true)
        setShowPINModal(false)
      } else {
        localStorage.removeItem('pos_session')
      }
    }
  }, [])

  const loadInitialData = async () => {
    try {
      setIsLoading(true)

      // Load barbers
      const barbersResponse = await apiClient.get('/barbers')
      const barbersList = barbersResponse.data.items.map((b: any) => ({
        id: b.id,
        name: `${b.first_name} ${b.last_name}`
      }))
      setBarbers(barbersList)

      // Load products
      const productsResponse = await apiClient.get('/products')
      setProducts(productsResponse.data.items || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthenticate = async (barberId: number, pin: string) => {
    try {
      const response = await apiClient.post('/barber-pin/authenticate', {
        barber_id: barberId,
        pin: pin,
        device_info: navigator.userAgent
      })

      if (response.data.success) {
        const barber = barbers.find(b => b.id === barberId)
        const newSession: BarberSession = {
          barberId,
          barberName: barber?.name || 'Unknown',
          sessionToken: response.data.session_token,
          expiresAt: new Date(response.data.expires_at)
        }

        setSession(newSession)
        setIsAuthenticated(true)
        setShowPINModal(false)
        localStorage.setItem('pos_session', JSON.stringify(newSession))

        // Set auth header for future requests
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.session_token}`
      }
    } catch (error) {
      console.error('Authentication failed:', error)
      throw error
    }
  }

  const handleLogout = async () => {
    if (session?.sessionToken) {
      try {
        await apiClient.post('/barber-pin/logout', {
          session_token: session.sessionToken
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    setIsAuthenticated(false)
    setSession(null)
    setShowPINModal(true)
    setCartItems([])
    setCurrentView('products')
    localStorage.removeItem('pos_session')
    delete apiClient.defaults.headers.common['Authorization']
  }

  const handleAddToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity === 0) {
      handleRemoveItem(productId)
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )
      )
    }
  }

  const handleRemoveItem = (productId: number) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId))
  }

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      setCurrentView('checkout')
    }
  }

  const handleCompletePayment = async (paymentMethod: string, paymentDetails: any) => {
    try {
      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
      const tax = subtotal * 0.0875
      const total = subtotal + tax

      // Create sale record
      const saleResponse = await apiClient.post('/sales', {
        barber_id: session?.barberId,
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          commission_rate: item.product.commission_rate || 0.15
        })),
        subtotal,
        tax,
        total,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        customer_email: paymentDetails.customerEmail,
        customer_phone: paymentDetails.customerPhone
      })

      // Calculate commission
      const totalCommission = cartItems.reduce((sum, item) => {
        const commission = item.product.commission_rate || 0.15
        return sum + (item.product.price * item.quantity * commission)
      }, 0)

      setLastTransaction({
        id: saleResponse.data.id,
        items: cartItems,
        total,
        paymentMethod,
        commission: totalCommission
      })

      setCurrentView('receipt')
      setCartItems([])
    } catch (error) {
      console.error('Payment processing failed:', error)
      throw error
    }
  }

  const handleNewSale = () => {
    setCurrentView('products')
    setLastTransaction(null)
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading POS System...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* PIN Modal */}
      <PINEntryModal
        isOpen={showPINModal}
        onClose={() => router.push('/')}
        onAuthenticate={handleAuthenticate}
        barbers={barbers}
      />

      {isAuthenticated && (
        <>
          {/* Header */}
          <header className="bg-white border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">POS Terminal</h1>
                {session && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{session.barberName}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQuickStart(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* Quick Start Guide */}
          <QuickStartGuide
            isOpen={showQuickStart}
            onClose={() => setShowQuickStart(false)}
          />

          {/* Main Content */}
          <main className="flex-1 flex overflow-hidden pos-container">
            {currentView === 'products' && (
              <MobilePOSLayout
                cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                cartTotal={cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) * 1.0875}
                cartContent={
                  <ShoppingCart
                    items={cartItems}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemoveItem={handleRemoveItem}
                    onCheckout={handleCheckout}
                  />
                }
              >
                <ProductGrid
                  products={products}
                  onAddToCart={handleAddToCart}
                />
              </MobilePOSLayout>
            )}

            {currentView === 'checkout' && (
              <div className="flex-1">
                <CheckoutForm
                  items={cartItems}
                  total={cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) * 1.0875}
                  onBack={() => setCurrentView('products')}
                  onComplete={handleCompletePayment}
                />
              </div>
            )}

            {currentView === 'receipt' && lastTransaction && (
              <ReceiptDisplay
                items={lastTransaction.items}
                total={lastTransaction.total}
                paymentMethod={lastTransaction.paymentMethod}
                transactionId={lastTransaction.id}
                barberName={session?.barberName || ''}
                commission={lastTransaction.commission}
                onClose={handleNewSale}
                onPrint={() => window.print()}
                onEmail={() => console.log('Email receipt')}
                onSMS={() => console.log('SMS receipt')}
              />
            )}
          </main>
        </>
      )}
    </div>
  )
}
