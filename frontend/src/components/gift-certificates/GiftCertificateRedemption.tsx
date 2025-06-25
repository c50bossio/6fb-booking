'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { api } from '@/lib/api';

interface GiftCertificateRedemptionProps {
  appointmentId?: number;
  totalAmount: number;
  onApply?: (certificate: any, amountApplied: number) => void;
  onCancel?: () => void;
}

export const GiftCertificateRedemption: React.FC<GiftCertificateRedemptionProps> = ({
  appointmentId,
  totalAmount,
  onApply,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedCertificate, setValidatedCertificate] = useState<any>(null);
  const [amountToUse, setAmountToUse] = useState('');

  const formatCode = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Add dashes every 4 characters
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }

    return parts.join('-').slice(0, 19); // Max length: XXXX-XXXX-XXXX-XXXX
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
    setError(null);
    setValidatedCertificate(null);
  };

  const handleValidate = async () => {
    if (!code || code.length < 19) {
      setError('Please enter a valid gift certificate code');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const response = await api.get(`/gift-certificates/validate/${code}`, {
        params: {
          amount_to_use: totalAmount
        }
      });

      if (response.data.valid) {
        setValidatedCertificate(response.data);
        // Set default amount to use (minimum of certificate balance or total amount)
        const maxAmount = Math.min(response.data.remaining_balance, totalAmount);
        setAmountToUse(maxAmount.toFixed(2));
      } else {
        setError(response.data.error || 'Invalid gift certificate');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate gift certificate');
    } finally {
      setValidating(false);
    }
  };

  const handleApply = async () => {
    if (!validatedCertificate || !appointmentId) {
      return;
    }

    const amount = parseFloat(amountToUse);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > validatedCertificate.remaining_balance) {
      setError('Amount exceeds certificate balance');
      return;
    }

    if (amount > totalAmount) {
      setError('Amount exceeds total due');
      return;
    }

    setApplying(true);
    setError(null);

    try {
      const response = await api.post('/gift-certificates/redeem', {
        code: code,
        appointment_id: appointmentId,
        amount_to_use: amount
      });

      if (onApply) {
        onApply(validatedCertificate, amount);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply gift certificate');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Apply Gift Certificate</h3>

      <div className="space-y-4">
        {/* Code Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Gift Certificate Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono uppercase"
              maxLength={19}
            />
            <Button
              onClick={handleValidate}
              disabled={validating || !code || code.length < 19}
              variant="outline"
            >
              {validating ? <LoadingSpinner /> : 'Validate'}
            </Button>
          </div>
        </div>

        {/* Validated Certificate Info */}
        {validatedCertificate && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold mb-2">
              Valid Gift Certificate
            </p>
            <div className="space-y-1 text-sm text-green-700">
              <p>From: {validatedCertificate.sender_name}</p>
              <p>Balance: ${validatedCertificate.remaining_balance.toFixed(2)}</p>
              <p>Expires: {new Date(validatedCertificate.expiry_date).toLocaleDateString()}</p>
            </div>

            {/* Amount to Use */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Apply
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">$</span>
                <input
                  type="number"
                  value={amountToUse}
                  onChange={(e) => setAmountToUse(e.target.value)}
                  min="0.01"
                  max={Math.min(validatedCertificate.remaining_balance, totalAmount)}
                  step="0.01"
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAmountToUse(Math.min(validatedCertificate.remaining_balance, totalAmount).toFixed(2))}
                >
                  Max
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Summary */}
        {validatedCertificate && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Gift Certificate:</span>
                <span className="font-semibold">-${parseFloat(amountToUse || '0').toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Amount Due:</span>
                <span>${(totalAmount - parseFloat(amountToUse || '0')).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {validatedCertificate && appointmentId ? (
            <Button
              onClick={handleApply}
              disabled={applying || !amountToUse || parseFloat(amountToUse) <= 0}
              className="flex-1"
            >
              {applying ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Applying...
                </>
              ) : (
                'Apply Gift Certificate'
              )}
            </Button>
          ) : (
            <div className="flex-1 text-center text-sm text-gray-500">
              {!appointmentId && 'Create a booking to apply gift certificate'}
            </div>
          )}

          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={applying}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
