'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { api } from '@/lib/api';

interface MobileGiftCertificateFormProps {
  totalAmount: number;
  onApply: (certificate: any, amountApplied: number) => void;
  onCancel: () => void;
}

export const MobileGiftCertificateForm: React.FC<MobileGiftCertificateFormProps> = ({
  totalAmount,
  onApply,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCode = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const parts = [];
    for (let i = 0; i < cleaned.length; i += 4) {
      parts.push(cleaned.slice(i, i + 4));
    }
    return parts.join('-').slice(0, 19);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
    setError(null);
  };

  const handleApply = async () => {
    if (!code || code.length < 19) {
      setError('Please enter a valid gift certificate code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate the gift certificate
      const validation = await api.get(`/gift-certificates/validate/${code}`, {
        params: { amount_to_use: totalAmount }
      });

      if (!validation.data.valid) {
        setError(validation.data.error || 'Invalid gift certificate');
        return;
      }

      // Apply the maximum amount possible
      const amountToApply = Math.min(validation.data.remaining_balance, totalAmount);
      onApply(validation.data, amountToApply);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply gift certificate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <h4 className="font-semibold mb-3">Have a Gift Certificate?</h4>

      <div className="space-y-3">
        <input
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          className="w-full px-3 py-3 border rounded-lg text-center font-mono text-lg uppercase tracking-wider"
          maxLength={19}
          autoComplete="off"
          inputMode="text"
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleApply}
            disabled={loading || !code || code.length < 19}
            className="flex-1"
            size="lg"
          >
            {loading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Checking...
              </>
            ) : (
              'Apply'
            )}
          </Button>

          <Button
            onClick={onCancel}
            variant="outline"
            disabled={loading}
            size="lg"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
