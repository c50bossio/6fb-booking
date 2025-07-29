'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Home, Mail, Clock, Wifi } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [autoRetry, setAutoRetry] = useState(false)

  useEffect(() => {
    // Track online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    // Log error for monitoring
    console.error('Application Error:', error)
    
    // Auto-retry logic for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      setAutoRetry(true)
      const retryTimer = setTimeout(() => {
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1)
          reset()
        }
      }, 2000 + (retryCount * 1000)) // Exponential backoff

      return () => clearTimeout(retryTimer)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [error, reset, retryCount])

  const errorType = getErrorType(error)
  const errorConfig = getErrorConfig(errorType, isOnline)

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    reset()
  }

  const handleContactSupport = () => {
    const errorDetails = {
      message: error.message,
      digest: error.digest,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }
    
    const mailtoLink = `mailto:support@bookedbarber.com?subject=Error Report&body=${encodeURIComponent(
      `Error Details:\n${JSON.stringify(errorDetails, null, 2)}\n\nPlease describe what you were doing when this error occurred:`
    )}`
    
    window.location.href = mailtoLink
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Error Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Error Icon */}
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            {errorConfig.icon}
          </div>

          {/* Error Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {errorConfig.title}
          </h1>

          {/* Error Description */}
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            {errorConfig.description}
          </p>

          {/* Connection Status */}
          {!isOnline && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center justify-center gap-2">
              <Wifi className="w-5 h-5 text-orange-600" />
              <span className="text-orange-800 font-medium">
                You appear to be offline. Check your connection and try again.
              </span>
            </div>
          )}

          {/* Auto-retry Status */}
          {autoRetry && retryCount < 3 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-blue-800">
                Auto-retrying in {3 - retryCount} seconds... (Attempt {retryCount + 1}/3)
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={handleRetry}
              disabled={retryCount >= 5}
              className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              {retryCount >= 5 ? 'Max Retries Reached' : 'Try Again'}
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Home className="w-5 h-5" />
              Go Home
            </button>

            <button
              onClick={handleContactSupport}
              className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Mail className="w-5 h-5" />
              Contact Support
            </button>
          </div>

          {/* Helpful Tips */}
          <div className="bg-gray-50 rounded-lg p-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-3">Helpful Tips:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {errorConfig.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-teal-600 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error Details (Development) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
                Technical Details (Development Only)
              </summary>
              <div className="mt-3 p-4 bg-gray-100 rounded-lg text-xs font-mono text-gray-800 whitespace-pre-wrap overflow-auto max-h-40">
                {error.stack || error.message}
              </div>
            </details>
          )}
        </div>

        {/* Service Status */}
        <div className="mt-6 text-center">
          <a 
            href="https://status.bookedbarber.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Check Service Status
          </a>
        </div>
      </div>
    </div>
  )
}

// Error type detection
function getErrorType(error: Error): string {
  const message = error.message.toLowerCase()
  
  if (message.includes('network') || message.includes('fetch')) return 'network'
  if (message.includes('timeout')) return 'timeout'
  if (message.includes('unauthorized') || message.includes('401')) return 'auth'
  if (message.includes('not found') || message.includes('404')) return 'notfound'
  if (message.includes('server') || message.includes('500')) return 'server'
  if (message.includes('payment') || message.includes('stripe')) return 'payment'
  
  return 'generic'
}

// Error configuration
function getErrorConfig(errorType: string, isOnline: boolean) {
  const configs = {
    network: {
      icon: <Wifi className="w-10 h-10 text-red-500" />,
      title: "Connection Problem",
      description: "We're having trouble connecting to our servers. This might be a temporary network issue.",
      tips: [
        "Check your internet connection",
        "Try refreshing the page in a few seconds", 
        "If you're on mobile, try switching between WiFi and cellular data",
        "Clear your browser cache and cookies"
      ]
    },
    timeout: {
      icon: <Clock className="w-10 h-10 text-orange-500" />,
      title: "Request Timed Out",
      description: "The server is taking too long to respond. This might be due to high traffic or server maintenance.",
      tips: [
        "Wait a moment and try again",
        "Check if you have a stable internet connection",
        "Try using a different browser or device",
        "Contact support if the problem persists"
      ]
    },
    auth: {
      icon: <AlertTriangle className="w-10 h-10 text-yellow-500" />,
      title: "Authentication Required",
      description: "Your session has expired or you need to log in to access this page.",
      tips: [
        "Try logging in again",
        "Clear your browser cookies and cache",
        "Make sure you're using the correct login credentials",
        "Reset your password if you've forgotten it"
      ]
    },
    payment: {
      icon: <AlertTriangle className="w-10 h-10 text-red-500" />,
      title: "Payment Processing Error",
      description: "There was an issue processing your payment. Don't worry - you haven't been charged.",
      tips: [
        "Check that your payment details are correct",
        "Try a different payment method",
        "Contact your bank if the card was declined",
        "Reach out to support for assistance"
      ]
    },
    server: {
      icon: <AlertTriangle className="w-10 h-10 text-red-500" />,
      title: "Server Error",
      description: "Something went wrong on our end. Our team has been notified and is working to fix it.",
      tips: [
        "Try refreshing the page",
        "Wait a few minutes and try again",
        "Check our status page for ongoing issues",
        "Contact support if you need immediate help"
      ]
    },
    generic: {
      icon: <AlertTriangle className="w-10 h-10 text-red-500" />,
      title: "Something Went Wrong",
      description: "An unexpected error occurred. We're sorry for the inconvenience.",
      tips: [
        "Try refreshing the page",
        "Check your internet connection",
        "Try using a different browser",
        "Contact support if the problem continues"
      ]
    }
  }

  return configs[errorType as keyof typeof configs] || configs.generic
}