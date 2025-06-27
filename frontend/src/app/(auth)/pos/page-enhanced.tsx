'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart as CartIcon,
  Package,
  LogOut,
  RefreshCw,
  User,
  HelpCircle,
  WifiOff,
  AlertCircle
} from 'lucide-react'
import { PINEntryModal } from '@/components/pos/PINEntryModal'
import { ProductGrid, type Product } from '@/components/pos/ProductGrid'
import { ShoppingCart, type CartItem } from '@/components/pos/ShoppingCart'
import { CheckoutForm } from '@/components/pos/CheckoutForm'
import { ReceiptDisplay } from '@/components/pos/ReceiptDisplay'
import { MobilePOSLayout } from '@/components/pos/MobilePOSLayout'
import { QuickStartGuide } from '@/components/pos/QuickStartGuide'
import { ErrorNotification, OfflineIndicator, SuccessNotification } from '@/components/pos/ErrorNotification'
import { DuplicateConfirmModal } from '@/components/pos/DuplicateConfirmModal'

// API imports
import apiClient from '@/lib/api/client'

// Error handling imports
import { POSErrorHandler, POSError, ErrorType, TransactionRollback } from '@/lib/pos/error-handler'
import { OfflineQueueManager } from '@/lib/pos/offline-queue'
import { NetworkMonitor, useNetworkStatus } from '@/lib/pos/network-monitor'
import { DuplicateDetector, useDuplicateDetection } from '@/lib/pos/duplicate-detector'

// Import POS styles
import '@/styles/pos.css'

interface BarberSession {
  barberId: number
  barberName: string
  sessionToken: string
  expiresAt: Date
}

type ViewState = 'products' | 'checkout' | 'receipt'

export default function EnhancedPOSPage() {
  const router = useRouter()
  const networkStatus = useNetworkStatus()
  const { checkForDuplicate, recordTransaction, isChecking } = useDuplicateDetection()

  // Core state
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

  // Error handling state
  const [currentError, setCurrentError] = useState<POSError | null>(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateTransaction, setDuplicateTransaction] = useState<any>(null)
  const [pendingPayment, setPendingPayment] = useState<any>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [offlineQueueCount, setOfflineQueueCount] = useState(0)

  // Initialize offline queue manager
  useEffect(() => {
    OfflineQueueManager.initialize()

    // Update offline queue count periodically
    const interval = setInterval(() => {
      setOfflineQueueCount(OfflineQueueManager.getPendingCount())
    }, 5000)

    return () => {
      clearInterval(interval)
      OfflineQueueManager.destroy()
    }
  }, [])

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
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${parsedSession.sessionToken}`
      } else {
        localStorage.removeItem('pos_session')
      }
    }
  }, [])

  const loadInitialData = async () => {
    try {
      setIsLoading(true)

      // Use retry logic for initial load
      await NetworkMonitor.withRetry(
        async () => {
          // Load barbers
          const barbersResponse = await apiClient.get('/barbers')
          const barbersList = barbersResponse.data.items.map((b: any) => ({
            id: b.id,
            name: `${b.first_name} ${b.last_name}`
          }))
          setBarbers(barbersList)

          // Load products
          const productsResponse = await apiClient.get('/product-catalog/products')
          setProducts(productsResponse.data.items || [])
        },
        {
          maxRetries: 3,
          onRetry: (attempt, error) => {
            const posError = POSErrorHandler.parseError(error)
            setCurrentError(POSErrorHandler.incrementRetry(posError))
          }
        }
      )
    } catch (error) {
      const posError = POSErrorHandler.parseError(error)
      setCurrentError(posError)

      // Try to load from cache if available
      loadFromCache()
    } finally {
      setIsLoading(false)
    }
  }

  const loadFromCache = () => {
    // Load cached data if available
    const cachedBarbers = localStorage.getItem('pos_cached_barbers')
    const cachedProducts = localStorage.getItem('pos_cached_products')

    if (cachedBarbers) {
      setBarbers(JSON.parse(cachedBarbers))
    }
    if (cachedProducts) {
      setProducts(JSON.parse(cachedProducts))
    }
  }

  const handleAuthenticate = async (barberId: number, pin: string) => {
    try {
      const response = await NetworkMonitor.withRetry(
        async () => {
          return await apiClient.post('/barber-pin/authenticate', {
            barber_id: barberId,
            pin: pin,
            device_info: navigator.userAgent
          })
        },
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            setCurrentError(POSErrorHandler.createError(
              ErrorType.AUTHENTICATION_ERROR,
              `Authentication attempt ${attempt + 1} failed`,
              null,
              true
            ))
          }
        }
      )

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

        setCurrentError(null)
        setSuccessMessage('Successfully authenticated')
      }
    } catch (error) {
      const posError = POSErrorHandler.parseError(error)
      setCurrentError(posError)
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
        // Log logout error but don't block the logout process
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

    // Show success feedback
    setSuccessMessage(`${product.name} added to cart`)
    setTimeout(() => setSuccessMessage(null), 2000)
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

      const saleData = {
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
      }

      // Check for duplicate transaction
      const duplicateCheck = await checkForDuplicate({
        items: saleData.items,
        total: saleData.total,
        paymentMethod: saleData.payment_method
      })

      if (duplicateCheck.isDuplicate) {
        // Show duplicate confirmation modal
        setDuplicateTransaction(duplicateCheck.similarTransaction)
        setPendingPayment({ saleData, paymentMethod, paymentDetails })
        setShowDuplicateModal(true)
        return
      }

      // Proceed with payment
      await processSale(saleData, paymentMethod, paymentDetails)
    } catch (error) {
      const posError = POSErrorHandler.parseError(error)
      setCurrentError(posError)

      // Attempt rollback if needed
      if (posError.type === ErrorType.TRANSACTION_FAILED) {
        await handleTransactionRollback()
      }
    }
  }

  const processSale = async (saleData: any, paymentMethod: string, paymentDetails: any) => {
    const transactionId = `txn_${Date.now()}`

    try {
      // Register rollback handler
      TransactionRollback.register(transactionId, async () => {
        // Rollback logic here (e.g., void the transaction)
        console.log('Rolling back transaction:', transactionId)
      })

      let saleResponse

      if (networkStatus.isOnline) {
        // Online mode - direct API call with retry
        saleResponse = await NetworkMonitor.withRetry(
          async () => await apiClient.post('/sales', saleData),
          {
            maxRetries: 2,
            onRetry: (attempt, error) => {
              const posError = POSErrorHandler.parseError(error)
              setCurrentError(POSErrorHandler.incrementRetry(posError))
            }
          }
        )
      } else {
        // Offline mode - queue for later
        const queueId = await OfflineQueueManager.queueTransaction('sale', saleData)
        saleResponse = {
          data: {
            id: queueId,
            offline: true
          }
        }

        setCurrentError(POSErrorHandler.createError(
          ErrorType.OFFLINE,
          'Sale saved offline and will sync when connection is restored',
          null,
          false
        ))
      }

      // Record successful transaction for duplicate detection
      recordTransaction({
        items: saleData.items,
        total: saleData.total,
        paymentMethod: saleData.payment_method
      })

      // Calculate commission
      const totalCommission = cartItems.reduce((sum, item) => {
        const commission = item.product.commission_rate || 0.15
        return sum + (item.product.price * item.quantity * commission)
      }, 0)

      setLastTransaction({
        id: saleResponse.data.id,
        items: cartItems,
        total: saleData.total,
        paymentMethod,
        commission: totalCommission,
        offline: saleResponse.data.offline
      })

      setCurrentView('receipt')
      setCartItems([])
      setCurrentError(null)
      setSuccessMessage('Transaction completed successfully!')

      // Clear rollback handler on success
      TransactionRollback.clear(transactionId)
    } catch (error) {
      // Trigger rollback
      await TransactionRollback.rollback(transactionId)
      throw error
    }
  }

  const handleTransactionRollback = async () => {
    // Implement rollback logic
    console.log('Performing transaction rollback...')

    // Clear the cart and reset to products view
    setCartItems([])
    setCurrentView('products')
  }

  const handleDuplicateConfirm = async () => {
    setShowDuplicateModal(false)

    if (pendingPayment) {
      await processSale(
        pendingPayment.saleData,
        pendingPayment.paymentMethod,
        pendingPayment.paymentDetails
      )
    }
  }

  const handleNewSale = () => {
    setCurrentView('products')
    setLastTransaction(null)
    setCurrentError(null)
  }

  const handleRetryError = async () => {
    if (currentError && POSErrorHandler.isRetryable(currentError)) {
      setCurrentError(POSErrorHandler.incrementRetry(currentError))

      // Retry the last operation based on error context
      if (currentView === 'products') {
        await loadInitialData()
      }
    }
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
      {/* Error Notification */}
      <ErrorNotification
        error={currentError}
        onRetry={handleRetryError}
        onDismiss={() => setCurrentError(null)}
        autoHide={false}
      />

      {/* Success Notification */}
      {successMessage && (
        <SuccessNotification
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Duplicate Confirmation Modal */}
      <DuplicateConfirmModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={handleDuplicateConfirm}
        similarTransaction={duplicateTransaction}
        currentTotal={pendingPayment?.saleData?.total || 0}
      />

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

              <div className="flex items-center gap-3">
                {/* Network Status Indicator */}
                {networkStatus.status !== 'online' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    <WifiOff className="w-4 h-4" />
                    <span>{networkStatus.status === 'offline' ? 'Offline' : 'Slow Connection'}</span>
                  </div>
                )}

                {/* Offline Queue Indicator */}
                {offlineQueueCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{offlineQueueCount} pending</span>
                  </div>
                )}

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
                offline={lastTransaction.offline}
              />
            )}
          </main>
        </>
      )}
    </div>
  )
}
