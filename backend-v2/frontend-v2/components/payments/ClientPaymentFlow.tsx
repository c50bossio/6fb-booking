/**
 * Client Payment Flow Component
 * Handles the complete payment flow for clients booking appointments
 * Integrates with the hybrid payment system for optimal routing
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { 
  CreditCard, 
  Lock, 
  CheckCircle, 
  Loader2, 
  Shield, 
  Clock,
  DollarSign,
  AlertCircle,
  Apple,
  Smartphone,
  Building
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'apple_pay' | 'google_pay' | 'ach' | 'buy_now_pay_later';
  display_name: string;
  icon: React.ReactNode;
  description: string;
  processing_fee: number;
  available: boolean;
  recommended?: boolean;
}

interface AppointmentDetails {
  id: number;
  barber_name: string;
  service_name: string;
  service_price: number;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
}

interface PricingBreakdown {
  service_amount: number;
  processing_fee: number;
  tax_amount: number;
  tip_amount: number;
  total_amount: number;
}

interface ClientPaymentFlowProps {
  appointment: AppointmentDetails;
  onPaymentComplete: (paymentResult: any) => void;
  onPaymentCancel: () => void;
}

export const ClientPaymentFlow: React.FC<ClientPaymentFlowProps> = ({
  appointment,
  onPaymentComplete,
  onPaymentCancel
}) => {
  const [step, setStep] = useState<'methods' | 'details' | 'processing' | 'complete'>('methods');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Payment form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [tipAmount, setTipAmount] = useState(0);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  useEffect(() => {
    loadPaymentOptions();
  }, [appointment.id]);

  const loadPaymentOptions = async () => {
    try {
      setLoading(true);
      
      // Load available payment methods and pricing
      const response = await fetch(`/api/v2/hybrid-payments/client-options?appointment_id=${appointment.id}`);
      if (response.ok) {
        const data = await response.json();
        
        // Set up payment methods with proper icons
        const methods: PaymentMethod[] = [
          {
            id: 'card',
            type: 'card',
            display_name: 'Credit/Debit Card',
            icon: <CreditCard className="h-5 w-5" />,
            description: 'Visa, Mastercard, American Express',
            processing_fee: 2.9,
            available: true,
            recommended: true
          },
          {
            id: 'apple_pay',
            type: 'apple_pay',
            display_name: 'Apple Pay',
            icon: <Apple className="h-5 w-5" />,
            description: 'Touch ID or Face ID',
            processing_fee: 2.9,
            available: data.apple_pay_available || false
          },
          {
            id: 'google_pay',
            type: 'google_pay',
            display_name: 'Google Pay',
            icon: <Smartphone className="h-5 w-5" />,
            description: 'Quick and secure payment',
            processing_fee: 2.9,
            available: data.google_pay_available || false
          },
          {
            id: 'ach',
            type: 'ach',
            display_name: 'Bank Account (ACH)',
            icon: <Building className="h-5 w-5" />,
            description: 'Direct bank transfer (2-3 business days)',
            processing_fee: 0.8,
            available: data.ach_available || false
          }
        ];
        
        setPaymentMethods(methods.filter(m => m.available));
        
        // Set default method
        const defaultMethod = methods.find(m => m.available && m.recommended);
        if (defaultMethod) {
          setSelectedMethod(defaultMethod.id);
        }
        
        // Calculate pricing
        calculatePricing(appointment.service_price, tipAmount);
      }
    } catch (error) {
      console.error('Failed to load payment options:', error);
      toast({
        title: "Error",
        description: "Failed to load payment options",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = (serviceAmount: number, tip: number = 0) => {
    const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);
    const processingFeePercent = selectedMethodData?.processing_fee || 2.9;
    
    const subtotal = serviceAmount + tip;
    const processingFee = subtotal * (processingFeePercent / 100);
    const taxAmount = subtotal * 0.08; // 8% tax (would be calculated based on location)
    const totalAmount = subtotal + processingFee + taxAmount;

    setPricing({
      service_amount: serviceAmount,
      processing_fee: processingFee,
      tax_amount: taxAmount,
      tip_amount: tip,
      total_amount: totalAmount
    });
  };

  const handleTipChange = (amount: number) => {
    setTipAmount(amount);
    calculatePricing(appointment.service_price, amount);
  };

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    calculatePricing(appointment.service_price, tipAmount);
  };

  const processPayment = async () => {
    try {
      setProcessing(true);
      setStep('processing');

      // In a real implementation, this would integrate with the actual payment processor
      const paymentData = {
        appointment_id: appointment.id,
        amount: pricing?.total_amount || 0,
        payment_method_type: selectedMethod,
        payment_method_data: {
          card_number: cardNumber,
          expiry_date: expiryDate,
          cvv: cvv,
          cardholder_name: cardholderName,
          billing_zip: billingZip
        },
        tip_amount: tipAmount,
        save_payment_method: savePaymentMethod
      };

      const response = await fetch('/api/v2/hybrid-payments/process-client-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Payment processing failed');
      }

      const result = await response.json();
      
      toast({
        title: "Payment Successful!",
        description: `Your payment of $${pricing?.total_amount.toFixed(2)} has been processed`,
      });

      setStep('complete');
      onPaymentComplete(result);

    } catch (error) {
      console.error('Payment processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });

      setStep('details');
    } finally {
      setProcessing(false);
    }
  };

  const renderPaymentMethods = () => (
    <div className="space-y-6">
      {/* Appointment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Barber:</span>
              <span className="font-medium">{appointment.barber_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service:</span>
              <span className="font-medium">{appointment.service_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date & Time:</span>
              <span className="font-medium">
                {appointment.appointment_date} at {appointment.appointment_time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{appointment.duration_minutes} minutes</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-medium">Service Price:</span>
              <span className="font-bold">${appointment.service_price.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tip Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Add Tip (Optional)</CardTitle>
          <CardDescription>Show your appreciation for great service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[15, 18, 20, 25].map((percent) => {
              const amount = appointment.service_price * (percent / 100);
              return (
                <Button
                  key={percent}
                  variant={tipAmount === amount ? "default" : "outline"}
                  onClick={() => handleTipChange(amount)}
                  className="text-sm"
                >
                  {percent}%<br/>${amount.toFixed(2)}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="custom-tip">Custom amount:</Label>
            <Input
              id="custom-tip"
              type="number"
              placeholder="0.00"
              value={tipAmount > 0 ? tipAmount.toString() : ''}
              onChange={(e) => handleTipChange(parseFloat(e.target.value) || 0)}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Payment Method</CardTitle>
          <CardDescription>Select how you'd like to pay</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedMethod} onValueChange={handleMethodSelect}>
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-2">
                <RadioGroupItem value={method.id} id={method.id} />
                <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted">
                    <div className="flex items-center gap-3">
                      {method.icon}
                      <div>
                        <div className="font-medium">{method.display_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {method.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        {method.processing_fee}% fee
                      </div>
                      {method.recommended && (
                        <Badge variant="secondary" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Pricing Breakdown */}
      {pricing && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Service:</span>
                <span>${pricing.service_amount.toFixed(2)}</span>
              </div>
              {pricing.tip_amount > 0 && (
                <div className="flex justify-between">
                  <span>Tip:</span>
                  <span>${pricing.tip_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Processing Fee:</span>
                <span>${pricing.processing_fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${pricing.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-lg">
                <span>Total:</span>
                <span>${pricing.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={() => setStep('details')} className="flex-1">
          Continue to Payment Details
        </Button>
        <Button variant="outline" onClick={onPaymentCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderPaymentDetails = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Payment Details
          </CardTitle>
          <CardDescription>
            Your payment information is secure and encrypted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedMethod === 'card' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="cardholder-name">Cardholder Name</Label>
                  <Input
                    id="cardholder-name"
                    placeholder="John Doe"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="billing-zip">Billing ZIP Code</Label>
                  <Input
                    id="billing-zip"
                    placeholder="12345"
                    value={billingZip}
                    onChange={(e) => setBillingZip(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-payment"
                  checked={savePaymentMethod}
                  onCheckedChange={(checked) => setSavePaymentMethod(checked as boolean)}
                />
                <Label htmlFor="save-payment" className="text-sm">
                  Save this payment method for future bookings
                </Label>
              </div>
            </div>
          )}

          {selectedMethod === 'apple_pay' && (
            <div className="text-center py-8">
              <Apple className="h-12 w-12 mx-auto mb-4" />
              <Button className="bg-black text-white hover:bg-gray-800">
                Pay with Apple Pay
              </Button>
            </div>
          )}

          {selectedMethod === 'google_pay' && (
            <div className="text-center py-8">
              <Smartphone className="h-12 w-12 mx-auto mb-4" />
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                Pay with Google Pay
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your payment is protected by bank-level security. We never store your complete card details.
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <Button 
          onClick={processPayment} 
          disabled={processing}
          className="flex-1"
        >
          {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Pay ${pricing?.total_amount.toFixed(2) || '0.00'}
        </Button>
        <Button variant="outline" onClick={() => setStep('methods')}>
          Back
        </Button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <Card>
      <CardContent className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" />
          <div className="text-xl font-semibold">Processing Payment...</div>
          <div className="text-muted-foreground">
            Please don't close this window. This may take a few moments.
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderComplete = () => (
    <Card>
      <CardContent className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <div className="text-2xl font-bold">Payment Successful!</div>
          <div className="text-muted-foreground">
            Your appointment is confirmed and you'll receive a confirmation email shortly.
          </div>
          <div className="text-lg font-semibold">
            Total Paid: ${pricing?.total_amount.toFixed(2)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <div>Loading payment options...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  switch (step) {
    case 'methods':
      return renderPaymentMethods();
    case 'details':
      return renderPaymentDetails();
    case 'processing':
      return renderProcessing();
    case 'complete':
      return renderComplete();
    default:
      return renderPaymentMethods();
  }
};