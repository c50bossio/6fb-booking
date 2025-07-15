'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  CreditCard, 
  AlertTriangle, 
  RefreshCw, 
  Phone, 
  Mail,
  CheckCircle,
  XCircle,
  Info,
  Loader2
} from 'lucide-react'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expiryMonth: number
  expiryYear: number
}

interface PaymentErrorRecoveryProps {
  error: {
    type: 'card_declined' | 'insufficient_funds' | 'expired_card' | 'processing_error' | 'network'
    message: string
    code?: string
  }
  onRetry: () => void
  onChangePaymentMethod: () => void
  onContactSupport: () => void
  retryCount: number
  savedPaymentMethods?: PaymentMethod[]
}

export function PaymentErrorRecovery({
  error,
  onRetry,
  onChangePaymentMethod,
  onContactSupport,
  retryCount,
  savedPaymentMethods = []
}: PaymentErrorRecoveryProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  const getRecoveryOptions = () => {
    switch (error.type) {
      case 'card_declined':
        return {
          title: 'Card Declined',
          icon: XCircle,
          iconColor: 'text-red-600',
          suggestions: [
            'Contact your bank to authorize the transaction',
            'Try a different payment method',
            'Ensure you have sufficient funds',
            'Check if international transactions are enabled'
          ],
          showAlternativeMethods: true,
          canRetry: retryCount < 3
        }
      
      case 'insufficient_funds':
        return {
          title: 'Insufficient Funds',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          suggestions: [
            'Add funds to your account',
            'Try a different payment method',
            'Use a credit card instead of debit',
            'Split payment across multiple cards (contact support)'
          ],
          showAlternativeMethods: true,
          canRetry: false
        }
      
      case 'expired_card':
        return {
          title: 'Card Expired',
          icon: CreditCard,
          iconColor: 'text-orange-600',
          suggestions: [
            'Use a different payment method',
            'Update your card expiration date',
            'Contact your bank for a replacement card'
          ],
          showAlternativeMethods: true,
          canRetry: false
        }
      
      case 'processing_error':
        return {
          title: 'Processing Error',
          icon: AlertTriangle,
          iconColor: 'text-yellow-600',
          suggestions: [
            'Wait a few moments and try again',
            'Check your internet connection',
            'Try using a different browser',
            'Clear your browser cache and cookies'
          ],
          showAlternativeMethods: false,
          canRetry: true
        }
      
      case 'network':
        return {
          title: 'Connection Error',
          icon: RefreshCw,
          iconColor: 'text-blue-600',
          suggestions: [
            'Check your internet connection',
            'Disable VPN if you\'re using one',
            'Try again in a few moments',
            'Use a different network connection'
          ],
          showAlternativeMethods: false,
          canRetry: true
        }
      
      default:
        return {
          title: 'Payment Failed',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          suggestions: [
            'Try again with the same card',
            'Use a different payment method',
            'Contact customer support for assistance'
          ],
          showAlternativeMethods: true,
          canRetry: retryCount < 3
        }
    }
  }

  const options = getRecoveryOptions()
  const IconComponent = options.icon

  return (
    <div className="space-y-6">
      {/* Error Summary */}
      <Card>
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <IconComponent className={`h-12 w-12 mx-auto ${options.iconColor}`} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {options.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                {error.message}
              </p>
              {error.code && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Error code: {error.code}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Info className="h-5 w-5 mr-2 text-blue-600" />
            What You Can Do
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {options.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Alternative Payment Methods */}
      {options.showAlternativeMethods && savedPaymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Try Another Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedPaymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedMethodId === method.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                  onClick={() => setSelectedMethodId(method.id)}
                >
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {method.brand} •••• {method.last4}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Expires {method.expiryMonth}/{method.expiryYear}
                      </p>
                    </div>
                  </div>
                  {selectedMethodId === method.id && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              ))}
            </div>
            {selectedMethodId && (
              <Button
                onClick={() => onChangePaymentMethod()}
                className="w-full mt-4"
                variant="primary"
              >
                Use Selected Card
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {options.canRetry && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-1"
            variant="primary"
          >
            {isRetrying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        )}
        
        <Button
          onClick={onChangePaymentMethod}
          className="flex-1"
          variant={options.canRetry ? "outline" : "primary"}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Add New Card
        </Button>
      </div>

      {/* Contact Support */}
      {retryCount > 2 && (
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="py-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Still having trouble? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={onContactSupport}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Support
                </Button>
                <Button
                  onClick={() => window.open('tel:+1-800-BARBER', '_self')}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <Badge variant="outline" className="mb-2">
            Secure Payment Processing
          </Badge>
          <br />
          Your payment information is encrypted and processed securely. 
          We never store your card details on our servers.
        </p>
      </div>
    </div>
  )
}

export default PaymentErrorRecovery