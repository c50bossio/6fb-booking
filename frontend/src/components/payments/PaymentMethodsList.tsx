/**
 * Payment methods list component
 */
import React from 'react';
import { Plus } from 'lucide-react';
import { PaymentMethodCard } from './PaymentMethodCard';
import { Button } from '@/components/ui/button';
import { usePaymentMethods } from '@/hooks/usePayments';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface PaymentMethodsListProps {
  onAddNew?: () => void;
  selectable?: boolean;
  selectedId?: number;
  onSelect?: (id: number) => void;
}

export function PaymentMethodsList({
  onAddNew,
  selectable = false,
  selectedId,
  onSelect,
}: PaymentMethodsListProps) {
  const {
    paymentMethods,
    loading,
    error,
    setDefaultPaymentMethod,
    removePaymentMethod,
  } = usePaymentMethods();

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultPaymentMethod(id);
    } catch (err) {
      console.error('Failed to set default payment method:', err);
    }
  };

  const handleRemove = async (id: number) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      try {
        await removePaymentMethod(id);
      } catch (err) {
        console.error('Failed to remove payment method:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No payment methods saved</p>
          {onAddNew && (
            <Button onClick={onAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                paymentMethod={method}
                onSetDefault={!selectable ? handleSetDefault : undefined}
                onRemove={!selectable ? handleRemove : undefined}
                isSelectable={selectable}
                isSelected={selectedId === method.id}
                onSelect={onSelect}
              />
            ))}
          </div>
          {onAddNew && !selectable && (
            <Button onClick={onAddNew} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Payment Method
            </Button>
          )}
        </>
      )}
    </div>
  );
}
