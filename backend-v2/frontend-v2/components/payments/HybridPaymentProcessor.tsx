/**
 * Hybrid Payment Processor Component
 * Handles payment processing with automatic routing based on barber's payment mode
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Info, DollarSign } from 'lucide-react';

interface PaymentMethod {
  type: string;
  processor: string;
  display_name: string;
  default: boolean;
  supports_cards?: boolean;
  supports_ach?: boolean;
}

interface RoutingInfo {
  routing_decision: string;
  recommended_processor: string;
  routing_details: Record<string, any>;
  estimated_fees: {
    processing_fee: number;
    commission_fee: number;
    total_fees: number;
    net_amount: number;
  };
  processing_time_estimate: string;
}

interface PaymentResult {
  payment_id: string;
  payment_type: string;
  status: string;
  amount: number;
  currency: string;
  processing_fee: number;
  net_amount: number;
  routing_decision: string;
  external_processor?: string;
}

interface HybridPaymentProcessorProps {
  appointmentId: number;
  amount: number;
  currency?: string;
  onPaymentComplete?: (result: PaymentResult) => void;
  onPaymentError?: (error: string) => void;
}

export const HybridPaymentProcessor: React.FC<HybridPaymentProcessorProps> = ({
  appointmentId,
  amount,
  currency = 'USD',
  onPaymentComplete,
  onPaymentError
}) => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [routingInfo, setRoutingInfo] = useState<RoutingInfo | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [paymentMethodData, setPaymentMethodData] = useState<any>(null);
  const [step, setStep] = useState<'loading' | 'routing' | 'method' | 'processing' | 'complete'>('loading');

  useEffect(() => {
    loadPaymentInfo();
  }, [appointmentId, amount]);

  const loadPaymentInfo = async () => {
    try {
      setLoading(true);
      setStep('loading');

      // Get payment routing information
      const routingResponse = await fetch('/api/v2/hybrid-payments/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          amount: amount,
          currency: currency
        })
      });

      if (!routingResponse.ok) {
        throw new Error('Failed to get payment routing information');
      }

      const routingData = await routingResponse.json();
      setRoutingInfo(routingData);

      // Get available payment methods
      const optionsResponse = await fetch(`/api/v2/hybrid-payments/my-options?amount=${amount}`);
      if (optionsResponse.ok) {
        const optionsData = await optionsResponse.json();
        setPaymentMethods(optionsData.available_methods || []);
        
        // Set default method
        const defaultMethod = optionsData.available_methods?.find((m: PaymentMethod) => m.default);
        if (defaultMethod) {
          setSelectedMethod(`${defaultMethod.type}-${defaultMethod.processor}`);
        }
      }

      setStep('routing');

    } catch (error) {
      console.error('Failed to load payment info:', error);
      toast({
        title: "Error",
        description: "Failed to load payment information",
        variant: "destructive"
      });
      onPaymentError?.('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    try {
      setProcessing(true);
      setStep('processing');

      const response = await fetch('/api/v2/hybrid-payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          amount: amount,
          currency: currency,
          payment_method_data: paymentMethodData,
          client_preference: selectedMethod.split('-')[0] // 'platform' or 'external'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Payment processing failed');
      }

      const result = await response.json();
      
      toast({
        title: "Payment Successful!",
        description: `Payment of $${amount} processed successfully via ${result.external_processor || 'platform'}`,
      });

      setStep('complete');
      onPaymentComplete?.(result);

    } catch (error) {
      console.error('Payment processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });

      onPaymentError?.(errorMessage);
      setStep('method');
    } finally {
      setProcessing(false);
    }
  };

  const getRoutingDecisionInfo = (decision: string) => {
    const info = {
      centralized: {
        title: 'Platform Payment',
        description: 'Payment will be processed through the platform\'s secure payment system',
        icon: '🏢',
        color: 'blue'
      },
      external: {
        title: 'Direct Processor',
        description: 'Payment will be processed through your connected payment processor',
        icon: '💳',
        color: 'green'
      },
      fallback: {
        title: 'Fallback Mode',
        description: 'Will try your processor first, fallback to platform if needed',
        icon: '🔄',
        color: 'yellow'
      },
      hybrid: {
        title: 'Smart Routing',
        description: 'Intelligent routing based on amount, time, and other factors',
        icon: '🧠',
        color: 'purple'
      }
    };

    return info[decision as keyof typeof info] || info.centralized;
  };

  const renderLoadingStep = () => (
    <Card>
      <CardContent className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <div>Loading payment information...</div>
        </div>
      </CardContent>
    </Card>
  );

  const renderRoutingStep = () => {
    if (!routingInfo) return null;

    const routingDecision = getRoutingDecisionInfo(routingInfo.routing_decision);

    return (
      <div className="space-y-4">
        {/* Payment Amount */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${amount.toFixed(2)} {currency}</div>
            <div className="text-sm text-muted-foreground">Appointment #{appointmentId}</div>
          </CardContent>
        </Card>

        {/* Routing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">{routingDecision.icon}</span>
              {routingDecision.title}
            </CardTitle>
            <CardDescription>{routingDecision.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Recommended Processor</span>
                <Badge variant="outline" className="capitalize">
                  {routingInfo.recommended_processor}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Processing Time</span>
                <span className="text-sm font-medium">{routingInfo.processing_time_estimate}</span>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Fee Breakdown</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Service Amount:</span>
                    <span>${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Fee:</span>
                    <span>${routingInfo.estimated_fees.processing_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commission:</span>
                    <span>${routingInfo.estimated_fees.commission_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>Net Amount:</span>
                    <span>${routingInfo.estimated_fees.net_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        {paymentMethods.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Choose how you want to process this payment</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
                {paymentMethods.map((method) => (
                  <div key={`${method.type}-${method.processor}`} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={`${method.type}-${method.processor}`} 
                      id={`${method.type}-${method.processor}`} 
                    />
                    <Label htmlFor={`${method.type}-${method.processor}`} className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{method.display_name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {method.type} • {method.processor}
                          </div>
                        </div>
                        {method.default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={() => setStep('method')} className="flex-1">
            Continue to Payment
          </Button>
          <Button variant="outline" onClick={loadPaymentInfo}>
            Refresh
          </Button>
        </div>
      </div>
    );
  };

  const renderMethodStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
        <CardDescription>
          Enter your payment details to complete the transaction
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              In a real implementation, this would show a payment form for card details,
              Apple Pay, Google Pay, or other payment methods based on the selected processor.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Label>Payment Details</Label>
            <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground">
              Payment form would appear here
              <br />
              (Card input, Apple Pay button, etc.)
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={processPayment}
              disabled={processing}
              className="flex-1"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Process Payment ${amount.toFixed(2)}
            </Button>
            <Button variant="outline" onClick={() => setStep('routing')}>
              Back
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderProcessingStep = () => (
    <Card>
      <CardContent className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <div>Processing your payment...</div>
          <div className="text-sm text-muted-foreground">
            Please don't close this window
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompleteStep = () => (
    <Card>
      <CardContent className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <div>
            <div className="text-xl font-semibold">Payment Successful!</div>
            <div className="text-sm text-muted-foreground">
              Your payment of ${amount.toFixed(2)} has been processed
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render based on current step
  switch (step) {
    case 'loading':
      return renderLoadingStep();
    case 'routing':
      return renderRoutingStep();
    case 'method':
      return renderMethodStep();
    case 'processing':
      return renderProcessingStep();
    case 'complete':
      return renderCompleteStep();
    default:
      return renderLoadingStep();
  }
};