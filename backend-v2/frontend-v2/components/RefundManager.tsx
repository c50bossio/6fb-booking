'use client';

import { useState } from 'react';
import { X, AlertCircle, DollarSign, Info } from 'lucide-react';
import { fetchAPI } from '@/lib/api';

interface RefundManagerProps {
  payment: {
    id: number;
    amount: number;
    refund_amount: number;
    status: string;
    created_at: string;
    appointment?: {
      user?: {
        first_name: string;
        last_name: string;
        email: string;
      };
      service_name?: string;
    };
  };
  onClose: () => void;
  onComplete: () => void;
}

const REFUND_REASONS = [
  { value: 'requested_by_customer', label: 'Requested by customer' },
  { value: 'duplicate', label: 'Duplicate payment' },
  { value: 'fraudulent', label: 'Fraudulent transaction' },
  { value: 'service_not_provided', label: 'Service not provided' },
  { value: 'quality_issue', label: 'Quality issue' },
  { value: 'cancelled_appointment', label: 'Cancelled appointment' },
  { value: 'other', label: 'Other' },
];

export default function RefundManager({ payment, onClose, onComplete }: RefundManagerProps) {
  const maxRefundAmount = payment.amount - payment.refund_amount;
  const [refundAmount, setRefundAmount] = useState(maxRefundAmount.toString());
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleRefundTypeChange = (type: 'full' | 'partial') => {
    setRefundType(type);
    if (type === 'full') {
      setRefundAmount(maxRefundAmount.toString());
    }
  };

  const handleRefundAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setRefundAmount(value);
    }
  };

  const validateForm = () => {
    const amount = parseFloat(refundAmount);
    
    if (!reason) {
      setError('Please select a reason for the refund');
      return false;
    }
    
    if (reason === 'other' && !customReason.trim()) {
      setError('Please provide a reason for the refund');
      return false;
    }
    
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid refund amount');
      return false;
    }
    
    if (amount > maxRefundAmount) {
      setError(`Refund amount cannot exceed $${maxRefundAmount.toFixed(2)}`);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }
    
    try {
      setProcessing(true);
      
      const finalReason = reason === 'other' ? customReason : REFUND_REASONS.find(r => r.value === reason)?.label || reason;
      
      await fetchAPI('/api/v1/payments/refund', {
        method: 'POST',
        body: JSON.stringify({
          payment_id: payment.id,
          amount: parseFloat(refundAmount),
          reason: finalReason,
        }),
      });
      
      // Send notification if requested
      if (notifyCustomer && payment.appointment?.user?.email) {
        try {
          await fetchAPI('/api/v1/notifications/refund', {
            method: 'POST',
            body: JSON.stringify({
              payment_id: payment.id,
              email: payment.appointment.user.email,
              amount: parseFloat(refundAmount),
              reason: finalReason,
            }),
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }
      
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to process refund');
      setShowConfirmation(false);
    } finally {
      setProcessing(false);
    }
  };

  const refundAmountNum = parseFloat(refundAmount) || 0;
  const refundPercentage = maxRefundAmount > 0 ? (refundAmountNum / payment.amount) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Process Refund</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Payment Info */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <div className="text-sm space-y-1">
              <p className="font-medium text-gray-900">
                {payment.appointment?.user?.first_name} {payment.appointment?.user?.last_name}
              </p>
              <p className="text-gray-600">{payment.appointment?.service_name}</p>
              <p className="text-gray-600">Original amount: ${payment.amount.toFixed(2)}</p>
              {payment.refund_amount > 0 && (
                <p className="text-orange-600">Previously refunded: ${payment.refund_amount.toFixed(2)}</p>
              )}
              <p className="font-medium text-gray-900">Available to refund: ${maxRefundAmount.toFixed(2)}</p>
            </div>
          </div>

          {showConfirmation ? (
            /* Confirmation Screen */
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-orange-800">Confirm Refund</h3>
                    <div className="mt-2 text-sm text-orange-700">
                      <p>You are about to refund ${refundAmountNum.toFixed(2)} ({refundPercentage.toFixed(0)}% of original amount).</p>
                      <p className="mt-1">This action cannot be undone.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Reason:</span> {reason === 'other' ? customReason : REFUND_REASONS.find(r => r.value === reason)?.label}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Customer notification:</span> {notifyCustomer ? 'Yes' : 'No'}
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </div>
          ) : (
            /* Form Screen */
            <div className="space-y-4">
              {/* Refund Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refund Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleRefundTypeChange('full')}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      refundType === 'full'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Full Refund
                  </button>
                  <button
                    onClick={() => handleRefundTypeChange('partial')}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      refundType === 'partial'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    Partial Refund
                  </button>
                </div>
              </div>

              {/* Refund Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refund Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={refundAmount}
                    onChange={(e) => handleRefundAmountChange(e.target.value)}
                    disabled={refundType === 'full'}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="0.00"
                  />
                </div>
                {refundAmountNum > 0 && (
                  <p className="mt-1 text-sm text-gray-600">
                    {refundPercentage.toFixed(0)}% of original amount
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Refund
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select a reason</option>
                  {REFUND_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Reason */}
              {reason === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Please specify
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={3}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter the reason for refund..."
                  />
                </div>
              )}

              {/* Notify Customer */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notify-customer"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="notify-customer" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Send refund notification to customer
                </label>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-3 text-sm text-blue-700">
                    <p>• Refunds typically appear within 5-10 business days</p>
                    <p>• The customer will receive an email confirmation</p>
                    <p>• This action will be logged for audit purposes</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Review Refund
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}