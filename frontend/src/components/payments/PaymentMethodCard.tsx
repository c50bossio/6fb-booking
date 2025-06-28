/**
 * Payment method card component
 */
import React from 'react';
import { CreditCard, Building, Smartphone, Trash2, Star } from 'lucide-react';
import { PaymentMethod, PaymentMethodType } from '@/lib/api/payments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
  onSetDefault?: (id: number) => void;
  onRemove?: (id: number) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
}

export function PaymentMethodCard({
  paymentMethod,
  onSetDefault,
  onRemove,
  isSelectable = false,
  isSelected = false,
  onSelect,
}: PaymentMethodCardProps) {
  const getIcon = (type: PaymentMethodType) => {
    switch (type) {
      case 'card':
        return <CreditCard className="h-5 w-5" />;
      case 'bank_account':
        return <Building className="h-5 w-5" />;
      case 'apple_pay':
      case 'google_pay':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getDisplayName = () => {
    if (paymentMethod.type === 'card') {
      return `${paymentMethod.brand} •••• ${paymentMethod.last_four}`;
    } else if (paymentMethod.type === 'bank_account') {
      return `${paymentMethod.bank_name} •••• ${paymentMethod.account_last_four}`;
    } else {
      return paymentMethod.type.replace('_', ' ').toUpperCase();
    }
  };

  const getExpiryDisplay = () => {
    if (paymentMethod.type === 'card' && paymentMethod.exp_month && paymentMethod.exp_year) {
      return `Expires ${paymentMethod.exp_month.toString().padStart(2, '0')}/${paymentMethod.exp_year}`;
    }
    return null;
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        isSelectable ? 'cursor-pointer hover:border-primary' : ''
      } ${isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
      onClick={() => isSelectable && onSelect && onSelect(paymentMethod.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-1">{getIcon(paymentMethod.type)}</div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="font-medium">{getDisplayName()}</p>
              {paymentMethod.is_default && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>
            {getExpiryDisplay() && (
              <p className="text-sm text-gray-500 mt-1">{getExpiryDisplay()}</p>
            )}
          </div>
        </div>

        {!isSelectable && (
          <div className="flex items-center space-x-2">
            {!paymentMethod.is_default && onSetDefault && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSetDefault(paymentMethod.id)}
              >
                Set as Default
              </Button>
            )}
            {onRemove && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(paymentMethod.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
