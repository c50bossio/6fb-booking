/**
 * Payment Settings Dashboard Component
 * Main interface for barbers to configure their payment modes and processors
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { 
  CreditCard, 
  DollarSign, 
  Settings, 
  Zap, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  Shield,
  Clock,
  BarChart3
} from 'lucide-react';

import { PaymentModeSelector } from './PaymentModeSelector';
import { PaymentProcessorSetup } from './PaymentProcessorSetup';
import { CommissionSettings } from './CommissionSettings';
import { PaymentAnalytics } from './PaymentAnalytics';
import { CollectionHistory } from './CollectionHistory';

interface PaymentSettings {
  payment_mode: string;
  external_payment_processor: string | null;
  external_account_config: any;
  collection_preferences: any;
}

interface PaymentStats {
  total_transactions: number;
  total_volume: number;
  commission_owed: number;
  success_rate: number;
  last_30_days: {
    transactions: number;
    volume: number;
    commission_collected: number;
  };
}

export const PaymentSettingsDashboard: React.FC = () => {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPaymentSettings();
    loadPaymentStats();
  }, []);

  const loadPaymentSettings = async () => {
    try {
      const response = await fetch('/api/v2/users/me');
      if (response.ok) {
        const userData = await response.json();
        setSettings({
          payment_mode: userData.payment_mode || 'centralized',
          external_payment_processor: userData.external_payment_processor,
          external_account_config: userData.external_account_config,
          collection_preferences: userData.collection_preferences
        });
      }
    } catch (error) {
      console.error('Failed to load payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to load payment settings",
        variant: "destructive"
      });
    }
  };

  const loadPaymentStats = async () => {
    try {
      const response = await fetch('/api/v2/external-payments/stats');
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load payment stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = async (newSettings: Partial<PaymentSettings>) => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/v2/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        setSettings(prev => ({ ...prev, ...newSettings } as PaymentSettings));
        toast({
          title: "Settings Updated",
          description: "Your payment settings have been saved successfully"
        });
        
        // Reload stats after settings change
        await loadPaymentStats();
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update payment settings:', error);
      toast({
        title: "Error",
        description: "Failed to update payment settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getPaymentModeInfo = (mode: string) => {
    const modeInfo = {
      centralized: {
        title: 'Centralized Payments',
        description: 'Platform processes all payments and pays you out',
        icon: <CreditCard className="h-5 w-5" />,
        color: 'blue',
        benefits: [
          'No setup required',
          'Guaranteed payment processing',
          'Unified analytics',
          'No processor fees'
        ]
      },
      decentralized: {
        title: 'Own Your Payments',
        description: 'Use your own payment processor and keep more money',
        icon: <Zap className="h-5 w-5" />,
        color: 'green',
        benefits: [
          'Keep 85%+ of payments',
          'Your choice of processor',
          'Lower platform fees',
          'Direct deposit to your account'
        ]
      },
      hybrid: {
        title: 'Smart Hybrid',
        description: 'Intelligent routing based on amount and preferences',
        icon: <BarChart3 className="h-5 w-5" />,
        color: 'purple',
        benefits: [
          'Best of both worlds',
          'Automatic optimization',
          'Fallback protection',
          'Dynamic routing'
        ]
      }
    };

    return modeInfo[mode as keyof typeof modeInfo] || modeInfo.centralized;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <div>Loading payment settings...</div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load payment settings. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  const modeInfo = getPaymentModeInfo(settings.payment_mode);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Payment Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure how you receive payments and manage your financial settings
        </p>
      </div>

      {/* Current Mode Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {modeInfo.icon}
            Current Payment Mode: {modeInfo.title}
          </CardTitle>
          <CardDescription>{modeInfo.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Payment Mode Badge */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Payment Mode</div>
              <Badge variant="outline" className="capitalize">
                {settings.payment_mode}
              </Badge>
            </div>

            {/* External Processor */}
            <div className="space-y-2">
              <div className="text-sm font-medium">External Processor</div>
              <div className="text-sm text-muted-foreground">
                {settings.external_payment_processor ? (
                  <Badge variant="secondary" className="capitalize">
                    {settings.external_payment_processor}
                  </Badge>
                ) : (
                  'None configured'
                )}
              </div>
            </div>

            {/* Quick Stats */}
            {stats && (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Success Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.success_rate.toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Commission Owed</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ${stats.commission_owed.toFixed(2)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Benefits */}
          <div className="mt-6">
            <div className="text-sm font-medium mb-3">Current Benefits</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {modeInfo.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Six Figure Barber Insight */}
      {settings.payment_mode === 'decentralized' && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            <strong>Six Figure Barber Insight:</strong> Decentralized payment mode aligns with the 
            "Own the Chair" philosophy. You're keeping more of your earnings while building your 
            independent barber business.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mode">Payment Mode</TabsTrigger>
          <TabsTrigger value="processors">Processors</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Change Payment Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Switch between centralized, decentralized, or hybrid payment processing
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('mode')}
                  className="w-full"
                >
                  Configure Mode
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Connect Processor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect Square, Stripe, or PayPal to process your own payments
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('processors')}
                  className="w-full"
                >
                  Manage Processors
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  View Collections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Review commission collections and booth rent payments
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('collections')}
                  className="w-full"
                >
                  View History
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your payment activity in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{stats.last_30_days.transactions}</div>
                    <div className="text-sm text-muted-foreground">Transactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">${stats.last_30_days.volume.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Total Volume</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">${stats.last_30_days.commission_collected.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Commission Paid</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mode">
          <PaymentModeSelector
            currentMode={settings.payment_mode}
            onModeChange={(mode) => handleSettingsChange({ payment_mode: mode })}
            loading={saving}
          />
        </TabsContent>

        <TabsContent value="processors">
          <PaymentProcessorSetup />
        </TabsContent>

        <TabsContent value="collections">
          <div className="space-y-6">
            <CommissionSettings 
              currentSettings={settings.collection_preferences}
              onSettingsChange={(prefs) => handleSettingsChange({ collection_preferences: prefs })}
            />
            <CollectionHistory />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <PaymentAnalytics />
        </TabsContent>
      </Tabs>

      {/* Security Notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <div className="font-medium">Security & Compliance</div>
              <div className="text-sm text-muted-foreground mt-1">
                All payment processors use bank-level security. Your payment data is encrypted 
                and never stored on our servers. Commission collections are processed via secure 
                ACH transfers from your connected bank account.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};