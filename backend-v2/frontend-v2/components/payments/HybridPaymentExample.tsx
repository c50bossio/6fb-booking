/**
 * Hybrid Payment System Integration Example
 * Demonstrates how to use all the hybrid payment components together
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Settings, 
  BarChart3, 
  Users, 
  DollarSign,
  CheckCircle,
  Info,
  ArrowRight,
  Zap
} from 'lucide-react';

// Import hybrid payment components
import { PaymentSettingsDashboard } from './PaymentSettingsDashboard';
import { PaymentModeSelector } from './PaymentModeSelector';
import { PaymentProcessorSetup } from './PaymentProcessorSetup';
import { HybridPaymentProcessor } from './HybridPaymentProcessor';
import { ClientPaymentFlow } from './ClientPaymentFlow';
import { UnifiedPaymentDashboard } from '../analytics/UnifiedPaymentDashboard';

// Import hooks
import { 
  usePaymentOptions, 
  usePaymentConnections, 
  usePaymentStats, 
  useSystemHealth 
} from '@/hooks/useHybridPayments';

// Mock data for demonstration
const mockAppointment = {
  id: 12345,
  barber_name: "Marcus Johnson",
  service_name: "Signature Cut & Style",
  service_price: 75.00,
  appointment_date: "2025-01-15",
  appointment_time: "2:30 PM",
  duration_minutes: 45
};

export const HybridPaymentExample: React.FC = () => {
  const [activeExample, setActiveExample] = useState<string>('overview');
  const [showClientFlow, setShowClientFlow] = useState(false);
  const [showBarberFlow, setShowBarberFlow] = useState(false);

  // Use hooks to get real data
  const { options: paymentOptions, loading: optionsLoading } = usePaymentOptions(75);
  const { connections, loading: connectionsLoading } = usePaymentConnections();
  const { stats, loading: statsLoading } = usePaymentStats();
  const { health, loading: healthLoading } = useSystemHealth();

  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Hybrid Payment System Overview
          </CardTitle>
          <CardDescription>
            Complete payment solution supporting multiple processing modes and processors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Payment Modes */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Payment Modes
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm">Centralized</span>
                  <Badge variant="outline">Platform</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm">Decentralized</span>
                  <Badge variant="outline">External</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <span className="text-sm">Hybrid</span>
                  <Badge variant="outline">Smart Routing</Badge>
                </div>
              </div>
            </div>

            {/* Supported Processors */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Processors
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span>⬜</span>
                  <span className="text-sm">Square</span>
                  <Badge variant="secondary" className="ml-auto text-xs">POS</Badge>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span>💳</span>
                  <span className="text-sm">Stripe</span>
                  <Badge variant="secondary" className="ml-auto text-xs">Online</Badge>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span>🅿️</span>
                  <span className="text-sm">PayPal</span>
                  <Badge variant="secondary" className="ml-auto text-xs">Business</Badge>
                </div>
              </div>
            </div>

            {/* Key Features */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Key Features
              </h4>
              <div className="space-y-2">
                {[
                  'Intelligent Payment Routing',
                  'Automated Commission Collection',
                  'Unified Analytics Dashboard',
                  'Real-time Fee Optimization',
                  'Fallback Protection',
                  'Six Figure Barber Integration'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total_transactions}</div>
                <div className="text-sm text-muted-foreground">Total Transactions</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">${stats.total_volume.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Volume</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.success_rate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">${stats.commission_owed.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Commission Owed</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health */}
      {!healthLoading && health && (
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Real-time status of all payment system components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <Badge variant={health.overall_status === 'healthy' ? 'default' : 'destructive'}>
                  {health.overall_status}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Overall System</div>
              </div>
              <div className="text-center">
                <Badge variant={health.platform_status === 'healthy' ? 'default' : 'destructive'}>
                  {health.platform_status}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Platform Payments</div>
              </div>
              <div className="text-center">
                <Badge variant={health.webhook_status === 'healthy' ? 'default' : 'destructive'}>
                  {health.webhook_status}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Webhooks</div>
              </div>
              <div className="text-center">
                <Badge variant="secondary">
                  {Object.keys(health.processor_statuses || {}).length}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Connected Processors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Example Workflows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Payment Experience
            </CardTitle>
            <CardDescription>
              See how clients experience the payment flow with automatic routing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Experience the complete client payment journey with tip options, 
                multiple payment methods, and intelligent routing.
              </div>
              <Button 
                onClick={() => setShowClientFlow(true)}
                className="w-full"
              >
                Try Client Payment Flow
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Barber Configuration
            </CardTitle>
            <CardDescription>
              Explore barber-facing payment configuration and management tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Configure payment modes, connect external processors, and view 
                comprehensive analytics and insights.
              </div>
              <Button 
                onClick={() => setShowBarberFlow(true)}
                variant="outline"
                className="w-full"
              >
                Open Barber Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderComponents = () => (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This tab demonstrates individual components of the hybrid payment system. 
          In production, these would be integrated into specific pages and workflows.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="mode-selector" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mode-selector">Payment Mode</TabsTrigger>
          <TabsTrigger value="processor-setup">Processors</TabsTrigger>
          <TabsTrigger value="payment-flow">Payment Flow</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="mode-selector" className="space-y-4">
          <PaymentModeSelector
            currentMode="centralized"
            onModeChange={async (mode) => {
              console.log('Payment mode changed to:', mode);
            }}
          />
        </TabsContent>

        <TabsContent value="processor-setup" className="space-y-4">
          <PaymentProcessorSetup />
        </TabsContent>

        <TabsContent value="payment-flow" className="space-y-4">
          <HybridPaymentProcessor
            appointmentId={mockAppointment.id}
            amount={mockAppointment.service_price}
            onPaymentComplete={(result) => {
              console.log('Payment completed:', result);
            }}
            onPaymentError={(error) => {
              console.error('Payment error:', error);
            }}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <UnifiedPaymentDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderIntegration = () => (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This shows how to integrate the hybrid payment system into your existing application
          using the provided hooks and API client.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Integration Code Examples</CardTitle>
          <CardDescription>
            Copy these examples to integrate hybrid payments into your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* React Hook Example */}
            <div>
              <h4 className="font-semibold mb-2">Using React Hooks</h4>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
{`import { usePaymentOptions, usePaymentProcessing } from '@/hooks/useHybridPayments';

function PaymentComponent() {
  const { options, loading } = usePaymentOptions(75.00);
  const { processPayment, processing } = usePaymentProcessing();

  const handlePayment = async () => {
    const result = await processPayment({
      appointment_id: 123,
      amount: 75.00,
      payment_method_data: { /* card data */ }
    });
    
    if (result) {
      console.log('Payment successful:', result);
    }
  };

  return (
    <div>
      {loading ? 'Loading...' : (
        <button onClick={handlePayment} disabled={processing}>
          {processing ? 'Processing...' : 'Pay Now'}
        </button>
      )}
    </div>
  );
}`}
              </pre>
            </div>

            {/* API Client Example */}
            <div>
              <h4 className="font-semibold mb-2">Using API Client Directly</h4>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
{`import { hybridPaymentsAPI } from '@/lib/api/hybrid-payments';

// Get payment options
const options = await hybridPaymentsAPI.getPaymentOptions(75.00);

// Process payment
const result = await hybridPaymentsAPI.processPayment({
  appointment_id: 123,
  amount: 75.00,
  currency: 'USD',
  payment_method_data: {
    card_number: '4242424242424242',
    expiry_date: '12/25',
    cvv: '123'
  }
});

// Update payment mode
await hybridPaymentsAPI.updatePaymentMode('hybrid');

// Get analytics
const analytics = await hybridPaymentsAPI.getUnifiedAnalytics({
  start_date: '2025-01-01',
  end_date: '2025-01-31'
});`}
              </pre>
            </div>

            {/* Component Integration Example */}
            <div>
              <h4 className="font-semibold mb-2">Component Integration</h4>
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
{`import { ClientPaymentFlow } from '@/components/payments/ClientPaymentFlow';
import { PaymentSettingsDashboard } from '@/components/payments/PaymentSettingsDashboard';

// Client payment flow
<ClientPaymentFlow
  appointment={appointmentData}
  onPaymentComplete={(result) => {
    // Handle successful payment
    router.push('/confirmation');
  }}
  onPaymentCancel={() => {
    // Handle cancellation
    router.back();
  }}
/>

// Barber settings dashboard
<PaymentSettingsDashboard />`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Hybrid Payment System</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive payment solution with intelligent routing, multiple processors, and unified analytics
        </p>
      </div>

      {/* Navigation */}
      <Tabs value={activeExample} onValueChange={setActiveExample}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="components">
          {renderComponents()}
        </TabsContent>

        <TabsContent value="integration">
          {renderIntegration()}
        </TabsContent>
      </Tabs>

      {/* Client Payment Flow Modal */}
      {showClientFlow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Client Payment Flow Demo</h2>
              <Button variant="outline" onClick={() => setShowClientFlow(false)}>
                Close
              </Button>
            </div>
            <ClientPaymentFlow
              appointment={mockAppointment}
              onPaymentComplete={(result) => {
                console.log('Demo payment completed:', result);
                setShowClientFlow(false);
              }}
              onPaymentCancel={() => setShowClientFlow(false)}
            />
          </div>
        </div>
      )}

      {/* Barber Dashboard Modal */}
      {showBarberFlow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Barber Payment Dashboard Demo</h2>
              <Button variant="outline" onClick={() => setShowBarberFlow(false)}>
                Close
              </Button>
            </div>
            <PaymentSettingsDashboard />
          </div>
        </div>
      )}
    </div>
  );
};