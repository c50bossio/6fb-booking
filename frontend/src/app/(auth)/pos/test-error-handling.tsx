'use client'

import React, { useState } from 'react'
import { AlertCircle, WifiOff, RefreshCw, Check, X } from 'lucide-react'
import { POSErrorHandler, ErrorType } from '@/lib/pos/error-handler'
import { NetworkMonitor } from '@/lib/pos/network-monitor'
import { OfflineQueueManager } from '@/lib/pos/offline-queue'
import { DuplicateDetector } from '@/lib/pos/duplicate-detector'

export default function TestErrorHandlingPage() {
  const [testResults, setTestResults] = useState<Record<string, { passed: boolean; message: string }>>({})
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    setTestResults({})

    // Test 1: Network Error Recovery
    await testNetworkErrorRecovery()

    // Test 2: Offline Mode Detection
    await testOfflineMode()

    // Test 3: Duplicate Detection
    await testDuplicateDetection()

    // Test 4: Error Parsing
    await testErrorParsing()

    // Test 5: Retry Logic
    await testRetryLogic()

    setIsRunning(false)
  }

  const addTestResult = (testName: string, passed: boolean, message: string) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: { passed, message }
    }))
  }

  const testNetworkErrorRecovery = async () => {
    try {
      // Simulate network error and recovery
      let attemptCount = 0
      const result = await NetworkMonitor.withRetry(
        async () => {
          attemptCount++
          if (attemptCount < 3) {
            throw new Error('Network error')
          }
          return 'Success after retries'
        },
        {
          maxRetries: 3,
          initialDelay: 100
        }
      )

      addTestResult(
        'Network Error Recovery',
        true,
        `Successfully recovered after ${attemptCount} attempts`
      )
    } catch (error) {
      addTestResult(
        'Network Error Recovery',
        false,
        'Failed to recover from network error'
      )
    }
  }

  const testOfflineMode = async () => {
    try {
      // Initialize offline queue
      OfflineQueueManager.initialize()

      // Queue a test transaction
      const transactionId = await OfflineQueueManager.queueTransaction('sale', {
        items: [{ product_id: 1, quantity: 1, unit_price: 10 }],
        total: 10,
        payment_method: 'cash'
      })

      // Check if transaction is queued
      const pendingCount = OfflineQueueManager.getPendingCount()

      addTestResult(
        'Offline Mode Detection',
        pendingCount > 0,
        `Transaction queued successfully. Pending: ${pendingCount}`
      )

      // Cleanup
      OfflineQueueManager.destroy()
    } catch (error) {
      addTestResult(
        'Offline Mode Detection',
        false,
        'Failed to queue offline transaction'
      )
    }
  }

  const testDuplicateDetection = async () => {
    try {
      const transaction1 = {
        items: [
          { product_id: 1, quantity: 2, unit_price: 15.00 },
          { product_id: 2, quantity: 1, unit_price: 25.00 }
        ],
        total: 55.00,
        paymentMethod: 'card'
      }

      const transaction2 = {
        items: [
          { product_id: 1, quantity: 2, unit_price: 15.00 },
          { product_id: 2, quantity: 1, unit_price: 25.00 }
        ],
        total: 55.00,
        paymentMethod: 'card'
      }

      // Record first transaction
      DuplicateDetector.recordTransaction(transaction1)

      // Check for duplicate
      const result = await DuplicateDetector.checkDuplicate(transaction2)

      addTestResult(
        'Duplicate Detection',
        result.isDuplicate,
        'Successfully detected duplicate transaction'
      )
    } catch (error) {
      addTestResult(
        'Duplicate Detection',
        false,
        'Failed to detect duplicate transaction'
      )
    }
  }

  const testErrorParsing = () => {
    try {
      // Test various error scenarios
      const networkError = {
        request: {},
        message: 'Network Error'
      }

      const authError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      }

      const validationError = {
        response: {
          status: 422,
          data: {
            message: 'Validation failed',
            errors: { email: ['Invalid email format'] }
          }
        }
      }

      const parsedNetworkError = POSErrorHandler.parseError(networkError)
      const parsedAuthError = POSErrorHandler.parseError(authError)
      const parsedValidationError = POSErrorHandler.parseError(validationError)

      const allCorrect =
        parsedNetworkError.type === ErrorType.NETWORK_ERROR &&
        parsedAuthError.type === ErrorType.AUTHENTICATION_ERROR &&
        parsedValidationError.type === ErrorType.VALIDATION_ERROR

      addTestResult(
        'Error Parsing',
        allCorrect,
        'All error types correctly identified'
      )
    } catch (error) {
      addTestResult(
        'Error Parsing',
        false,
        'Failed to parse errors correctly'
      )
    }
  }

  const testRetryLogic = () => {
    try {
      let error = POSErrorHandler.createError(
        ErrorType.NETWORK_ERROR,
        'Network error',
        null,
        true
      )

      // Test retry counting
      let retryable = POSErrorHandler.isRetryable(error)
      error = POSErrorHandler.incrementRetry(error)
      error = POSErrorHandler.incrementRetry(error)
      error = POSErrorHandler.incrementRetry(error)

      const notRetryableAnymore = !POSErrorHandler.isRetryable(error)

      addTestResult(
        'Retry Logic',
        retryable && notRetryableAnymore,
        'Retry logic working correctly (max 3 retries)'
      )
    } catch (error) {
      addTestResult(
        'Retry Logic',
        false,
        'Failed to test retry logic'
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-8">POS Error Handling Test Suite</h1>

          <div className="mb-8">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </button>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            {Object.entries(testResults).map(([testName, result]) => (
              <div
                key={testName}
                className={`p-4 rounded-lg border ${
                  result.passed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.passed ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    <h3 className="font-semibold">{testName}</h3>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      result.passed ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {result.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{result.message}</p>
              </div>
            ))}
          </div>

          {/* Feature Documentation */}
          <div className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold">Error Handling Features</h2>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold flex items-center gap-2">
                  <WifiOff className="w-5 h-5" />
                  Network Error Recovery
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  Automatically retries failed requests with exponential backoff. Maximum 3 retries with delays of 1s, 2s, and 5s.
                </p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Offline Mode
                </h3>
                <p className="mt-2 text-sm text-gray-700">
                  Automatically detects when offline and queues transactions locally. Syncs automatically when connection is restored.
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-semibold">Duplicate Prevention</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Detects potential duplicate transactions within a 5-minute window based on amount, items, and payment method.
                </p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold">Transaction Rollback</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Automatically rolls back failed transactions to maintain data consistency.
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold">User-Friendly Messages</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Converts technical errors into clear, actionable messages for users.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
