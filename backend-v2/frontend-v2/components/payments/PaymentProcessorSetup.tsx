/**
 * Payment Processor Setup Component
 * Allows barbers to connect their own payment processors (Square, Stripe, etc.)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface PaymentProcessor {
  type: string;
  display_name: string;
  features: {
    payments: boolean;
    refunds: boolean;
    recurring: boolean;
    webhooks: boolean;
    multi_currency: boolean;
  };
  required_config: string[];
  optional_config?: string[];
}

interface PaymentConnection {
  id: number;
  processor_type: string;
  account_name: string;
  status: string;
  supports_payments: boolean;
  supports_refunds: boolean;
  total_transactions: number;
  total_volume: number;
}

interface PaymentOptions {
  payment_mode: string;
  available_methods: Array<{
    type: string;
    processor: string;
    display_name: string;
    default: boolean;
  }>;
  external_connections: PaymentConnection[];
  fee_breakdown?: {
    amount: number;
    options: Array<{
      type: string;
      processing_fee: number;
      commission_fee: number;
      total_fees: number;
      net_amount: number;
    }>;
  };
}

export const PaymentProcessorSetup: React.FC = () => {
  const [processors, setProcessors] = useState<PaymentProcessor[]>([]);
  const [connections, setConnections] = useState<PaymentConnection[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selectedProcessor, setSelectedProcessor] = useState<string>('');
  const [connectionConfig, setConnectionConfig] = useState<Record<string, string>>({});
  const [showSetupForm, setShowSetupForm] = useState(false);

  // Load supported processors and existing connections
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load supported processors
      const processorsResponse = await fetch('/api/v2/external-payments/supported-processors');
      const processorsData = await processorsResponse.json();
      setProcessors(processorsData.supported_processors || []);

      // Load existing connections
      const connectionsResponse = await fetch('/api/v2/external-payments/connections');
      const connectionsData = await connectionsResponse.json();
      setConnections(connectionsData || []);

      // Load payment options
      const optionsResponse = await fetch('/api/v2/hybrid-payments/my-options?amount=50');
      const optionsData = await optionsResponse.json();
      setPaymentOptions(optionsData);

    } catch (error) {
      console.error('Failed to load payment data:', error);
      toast({
        title: "Error",
        description: "Failed to load payment processor information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const connectProcessor = async () => {
    if (!selectedProcessor) return;

    try {
      setConnecting(true);

      const response = await fetch('/api/v2/external-payments/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processor_type: selectedProcessor,
          account_name: connectionConfig.account_name || `My ${selectedProcessor} Account`,
          connection_config: connectionConfig
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Connection failed');
      }

      const result = await response.json();
      
      toast({
        title: "Success!",
        description: `Successfully connected ${selectedProcessor} payment processor`,
      });

      // Reload data and close form
      await loadData();
      setShowSetupForm(false);
      setSelectedProcessor('');
      setConnectionConfig({});

    } catch (error) {
      console.error('Failed to connect processor:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect payment processor",
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  };

  const disconnectProcessor = async (processorType: string) => {
    try {
      const response = await fetch(`/api/v2/external-payments/connections/${processorType}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Disconnection failed');
      }

      toast({
        title: "Disconnected",
        description: `Successfully disconnected ${processorType} payment processor`,
      });

      await loadData();

    } catch (error) {
      console.error('Failed to disconnect processor:', error);
      toast({
        title: "Disconnection Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect payment processor",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'default',
      pending: 'secondary',
      error: 'destructive',
      disconnected: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const getProcessorIcon = (type: string) => {
    const icons = {
      square: '⬜',
      stripe: '💳',
      paypal: '🅿️',
      clover: '🍀'
    };
    return icons[type as keyof typeof icons] || '💳';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Mode Overview */}
      {paymentOptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Configuration
            </CardTitle>
            <CardDescription>
              Your current payment mode and available processing options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Payment Mode</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="capitalize">
                    {paymentOptions.payment_mode}
                  </Badge>
                  {paymentOptions.payment_mode === 'decentralized' && (
                    <span className="text-sm text-muted-foreground">
                      You process payments directly through your own processors
                    </span>
                  )}
                </div>
              </div>

              {paymentOptions.fee_breakdown && (
                <div>
                  <Label className="text-sm font-medium">Fee Breakdown (for $50 service)</Label>
                  <div className="mt-2 space-y-2">
                    {paymentOptions.fee_breakdown.options.map((option, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div>
                          <span className="font-medium capitalize">{option.type}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            Processing: ${option.processing_fee.toFixed(2)} + 
                            Commission: ${option.commission_fee.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">Net: ${option.net_amount.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            Total fees: ${option.total_fees.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Processors */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Payment Processors</CardTitle>
          <CardDescription>
            Manage your external payment processor connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No payment processors connected. Connect a processor to enable decentralized payments.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProcessorIcon(connection.processor_type)}</span>
                    <div>
                      <div className="font-medium">{connection.account_name}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {connection.processor_type} • {connection.total_transactions} transactions • 
                        ${connection.total_volume.toFixed(2)} total volume
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(connection.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectProcessor(connection.processor_type)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Processor */}
      <Card>
        <CardHeader>
          <CardTitle>Add Payment Processor</CardTitle>
          <CardDescription>
            Connect a new payment processor to enable more payment options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showSetupForm ? (
            <Button onClick={() => setShowSetupForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Connect New Processor
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="processor">Payment Processor</Label>
                <Select value={selectedProcessor} onValueChange={setSelectedProcessor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment processor" />
                  </SelectTrigger>
                  <SelectContent>
                    {processors
                      .filter(p => !connections.some(c => c.processor_type === p.type))
                      .map((processor) => (
                        <SelectItem key={processor.type} value={processor.type}>
                          <div className="flex items-center gap-2">
                            <span>{getProcessorIcon(processor.type)}</span>
                            <span>{processor.display_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProcessor && (
                <>
                  <div>
                    <Label htmlFor="account_name">Account Name</Label>
                    <Input
                      id="account_name"
                      placeholder={`My ${selectedProcessor} Account`}
                      value={connectionConfig.account_name || ''}
                      onChange={(e) => setConnectionConfig({
                        ...connectionConfig,
                        account_name: e.target.value
                      })}
                    />
                  </div>

                  {processors.find(p => p.type === selectedProcessor)?.required_config.map((field) => (
                    <div key={field}>
                      <Label htmlFor={field} className="capitalize">
                        {field.replace(/_/g, ' ')}
                      </Label>
                      <Input
                        id={field}
                        type={field.includes('secret') || field.includes('token') ? 'password' : 'text'}
                        placeholder={`Enter your ${field.replace(/_/g, ' ')}`}
                        value={connectionConfig[field] || ''}
                        onChange={(e) => setConnectionConfig({
                          ...connectionConfig,
                          [field]: e.target.value
                        })}
                      />
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Button 
                      onClick={connectProcessor} 
                      disabled={connecting}
                      className="flex-1"
                    >
                      {connecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Connect {selectedProcessor}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowSetupForm(false);
                        setSelectedProcessor('');
                        setConnectionConfig({});
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supported Processors Info */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Payment Processors</CardTitle>
          <CardDescription>
            Available payment processors and their capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processors.map((processor) => (
              <div key={processor.type} className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{getProcessorIcon(processor.type)}</span>
                  <div>
                    <div className="font-medium">{processor.display_name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{processor.type}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(processor.features).map(([feature, supported]) => (
                      supported && (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature.replace(/_/g, ' ')}
                        </Badge>
                      )
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};