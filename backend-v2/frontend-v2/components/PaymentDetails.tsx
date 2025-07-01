'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X, DollarSign, Calendar, User, CreditCard, Gift, AlertCircle, Mail, Printer } from 'lucide-react';
import { fetchAPI } from '@/lib/api';

interface PaymentDetailsProps {
  payment: {
    id: number;
    amount: number;
    status: string;
    stripe_payment_intent_id?: string;
    platform_fee: number;
    barber_amount: number;
    commission_rate: number;
    refund_amount: number;
    gift_certificate_amount_used: number;
    created_at: string;
    appointment?: {
      id: number;
      service_name: string;
      start_time: string;
      duration_minutes?: number;
      user?: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
      };
      barber?: {
        id: number;
        first_name: string;
        last_name: string;
        email?: string;
      };
    };
  };
  onClose: () => void;
  onRefund: () => void;
}

export default function PaymentDetails({ payment, onClose, onRefund }: PaymentDetailsProps) {
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);

  const handleSendReceipt = async () => {
    try {
      setSendingReceipt(true);
      await fetchAPI(`/api/v1/payments/${payment.id}/receipt`, {
        method: 'POST',
      });
      setReceiptSent(true);
      setTimeout(() => setReceiptSent(false), 3000);
    } catch (error) {
      console.error('Error sending receipt:', error);
    } finally {
      setSendingReceipt(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const netAmount = payment.amount - payment.refund_amount;
  const paymentMethod = payment.gift_certificate_amount_used > 0 
    ? payment.gift_certificate_amount_used >= payment.amount
      ? 'Gift Certificate'
      : 'Credit Card + Gift Certificate'
    : 'Credit Card';

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Status Banner */}
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            payment.status === 'succeeded' ? 'bg-green-50 text-green-800' :
            payment.status === 'pending' ? 'bg-yellow-50 text-yellow-800' :
            payment.status === 'failed' ? 'bg-red-50 text-red-800' :
            payment.status === 'refunded' ? 'bg-gray-50 text-gray-800' :
            payment.status === 'partially_refunded' ? 'bg-orange-50 text-orange-800' :
            'bg-gray-50 text-gray-800'
          }`}>
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Payment {payment.status.replace('_', ' ')}</p>
              {payment.stripe_payment_intent_id && (
                <p className="text-sm mt-1">Stripe ID: {payment.stripe_payment_intent_id}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Transaction ID</span>
                  <span className="text-sm font-medium text-gray-900">#{payment.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Date & Time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {format(parseISO(payment.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment Method</span>
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    {paymentMethod === 'Gift Certificate' ? (
                      <Gift className="h-4 w-4" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    {paymentMethod}
                  </span>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Amount Breakdown</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Original Amount</span>
                    <span className="text-sm font-medium text-gray-900">${payment.amount.toFixed(2)}</span>
                  </div>
                  
                  {payment.gift_certificate_amount_used > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span className="text-sm">Gift Certificate Applied</span>
                      <span className="text-sm font-medium">-${payment.gift_certificate_amount_used.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {payment.refund_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="text-sm">Refunded Amount</span>
                      <span className="text-sm font-medium">-${payment.refund_amount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-900">Net Amount</span>
                      <span className="text-lg font-bold text-gray-900">${netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission Split */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Commission Split</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Platform Fee ({(payment.commission_rate * 100).toFixed(0)}%)</span>
                    <span className="text-sm font-medium text-gray-900">${payment.platform_fee.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Barber Amount</span>
                    <span className="text-sm font-medium text-gray-900">${payment.barber_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Appointment Details</h3>
              
              {payment.appointment && (
                <>
                  {/* Service Info */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-gray-900">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{payment.appointment.service_name}</p>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(payment.appointment.start_time), 'MMM d, yyyy h:mm a')}
                        </p>
                        {payment.appointment.duration_minutes && (
                          <p className="text-sm text-gray-600">
                            Duration: {payment.appointment.duration_minutes} minutes
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-gray-900">Client Information</h4>
                    {payment.appointment.user && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {payment.appointment.user.first_name} {payment.appointment.user.last_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{payment.appointment.user.email}</span>
                        </div>
                        {payment.appointment.user.phone && (
                          <div className="text-sm text-gray-600">
                            Phone: {payment.appointment.user.phone}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Barber Info */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-gray-900">Barber Information</h4>
                    {payment.appointment.barber && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {payment.appointment.barber.first_name} {payment.appointment.barber.last_name}
                          </span>
                        </div>
                        {payment.appointment.barber.email && (
                          <div className="text-sm text-gray-600">
                            Email: {payment.appointment.barber.email}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {receiptSent ? (
                <div className="text-green-600 text-sm flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Receipt sent successfully!
                </div>
              ) : (
                <>
                  <button
                    onClick={handleSendReceipt}
                    disabled={sendingReceipt}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {sendingReceipt ? 'Sending...' : 'Send Receipt'}
                  </button>
                  
                  <button
                    onClick={handlePrintReceipt}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Receipt
                  </button>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              {payment.status === 'succeeded' && payment.refund_amount < payment.amount && (
                <button
                  onClick={onRefund}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Process Refund
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}