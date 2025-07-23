/**
 * Payment Mode Selector Component
 * Allows barbers to choose between centralized, decentralized, or hybrid payment modes
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Zap, 
  BarChart3, 
  CheckCircle, 
  TrendingUp, 
  DollarSign,
  Shield,
  Clock,
  Users,
  Lightbulb
} from 'lucide-react';

interface PaymentMode {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple';
  benefits: string[];
  drawbacks: string[];
  idealFor: string[];
  revenueImpact: {
    keepPercentage: string;
    platformFee: string;
    processingFee: string;
  };
  sixFigureAlignment: string;
}

interface PaymentModeSelectorProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
  loading?: boolean;
}

export const PaymentModeSelector: React.FC<PaymentModeSelectorProps> = ({
  currentMode,
  onModeChange,
  loading = false
}) => {
  const [selectedMode, setSelectedMode] = useState(currentMode);
  const [showComparison, setShowComparison] = useState(false);

  const paymentModes: PaymentMode[] = [
    {
      id: 'centralized',
      title: 'Centralized Payments',
      subtitle: 'Platform Managed',
      description: 'BookedBarber processes all payments and pays you out. Simple and guaranteed.',
      icon: <CreditCard className="h-6 w-6" />,
      color: 'blue',
      benefits: [
        'No setup or maintenance required',
        'Guaranteed payment processing',
        'Built-in fraud protection',
        'Unified reporting and analytics',
        'No processor account needed',
        'Instant dispute handling'
      ],
      drawbacks: [
        'Standard platform commission',
        'Less control over payment flow',
        'Funds held by platform briefly'
      ],
      idealFor: [
        'New barbers getting started',
        'Those who want simplicity',
        'Barbers focusing on service over admin'
      ],
      revenueImpact: {
        keepPercentage: '85%',
        platformFee: '15%',
        processingFee: 'Included'
      },
      sixFigureAlignment: 'Perfect for building your brand while the platform handles the business side.'
    },
    {
      id: 'decentralized',
      title: 'Own Your Payments',
      subtitle: 'Direct Processing',
      description: 'Use your own Stripe, Square, or PayPal account. Keep more money, own your data.',
      icon: <Zap className="h-6 w-6" />,
      color: 'green',
      benefits: [
        'Keep 85%+ of every payment',
        'Direct deposit to your account',
        'Your choice of payment processor',
        'Own your customer payment data',
        'Lower overall platform fees',
        'Build payment processor relationship'
      ],
      drawbacks: [
        'Setup and maintenance required',
        'Handle your own disputes',
        'Separate processor fees apply',
        'Commission tracking via ACH'
      ],
      idealFor: [
        'Established barbers',
        'High-volume service providers',
        'Barbers wanting maximum control'
      ],
      revenueImpact: {
        keepPercentage: '87%',
        platformFee: '10% + ACH',
        processingFee: '2.9% + 30¢'
      },
      sixFigureAlignment: 'Aligns with "Own the Chair" philosophy - maximize your earnings and independence.'
    },
    {
      id: 'hybrid',
      title: 'Smart Hybrid',
      subtitle: 'Intelligent Routing',
      description: 'Automatically route payments based on amount, customer, or your preferences.',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'purple',
      benefits: [
        'Best of both payment modes',
        'Intelligent payment routing',
        'Automatic optimization',
        'Fallback protection',
        'Dynamic fee optimization',
        'Maximum revenue potential'
      ],
      drawbacks: [
        'More complex setup',
        'Requires both integrations',
        'Split reporting initially'
      ],
      idealFor: [
        'Advanced barbers',
        'Those with complex pricing',
        'Revenue optimization focused'
      ],
      revenueImpact: {
        keepPercentage: '85-87%',
        platformFee: 'Variable',
        processingFee: 'Optimized'
      },
      sixFigureAlignment: 'Advanced strategy for maximizing revenue through intelligent payment optimization.'
    }
  ];

  const selectedModeData = paymentModes.find(mode => mode.id === selectedMode);

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode);
  };

  const handleSaveMode = async () => {
    await onModeChange(selectedMode);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Choose Your Payment Mode</h2>
        <p className="text-muted-foreground mt-2">
          Select how you want to receive payments from your clients. You can change this anytime.
        </p>
      </div>

      {/* Six Figure Barber Insight */}
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          <strong>Six Figure Barber Strategy:</strong> Your payment mode directly impacts your path to six figures. 
          Choose based on your business stage: Centralized for simplicity, Decentralized for maximum earnings, 
          or Hybrid for optimization.
        </AlertDescription>
      </Alert>

      {/* Payment Mode Selection */}
      <RadioGroup value={selectedMode} onValueChange={handleModeChange}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {paymentModes.map((mode) => (
            <div key={mode.id} className="relative">
              <Label htmlFor={mode.id} className="cursor-pointer">
                <Card className={`transition-all hover:shadow-lg ${
                  selectedMode === mode.id 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'hover:border-gray-300'
                }`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          mode.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                          mode.color === 'green' ? 'bg-green-100 text-green-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          {mode.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{mode.title}</CardTitle>
                          <CardDescription>{mode.subtitle}</CardDescription>
                        </div>
                      </div>
                      <RadioGroupItem value={mode.id} id={mode.id} />
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {mode.description}
                    </p>

                    {/* Revenue Impact */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm font-medium mb-2">Revenue Impact</div>
                      <div className="grid grid-cols-1 gap-1 text-sm">
                        <div className="flex justify-between">
                          <span>You Keep:</span>
                          <span className="font-semibold text-green-600">
                            {mode.revenueImpact.keepPercentage}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform Fee:</span>
                          <span>{mode.revenueImpact.platformFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Processing:</span>
                          <span>{mode.revenueImpact.processingFee}</span>
                        </div>
                      </div>
                    </div>

                    {/* Key Benefits */}
                    <div>
                      <div className="text-sm font-medium mb-2">Key Benefits</div>
                      <div className="space-y-1">
                        {mode.benefits.slice(0, 3).map((benefit, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Current Mode Badge */}
                    {currentMode === mode.id && (
                      <Badge variant="secondary" className="w-full justify-center">
                        Current Mode
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>

      {/* Selected Mode Details */}
      {selectedModeData && selectedMode !== currentMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedModeData.icon}
              {selectedModeData.title} - Detailed Overview
            </CardTitle>
            <CardDescription>
              {selectedModeData.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Six Figure Barber Alignment */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Six Figure Barber Alignment</div>
                  <div className="text-sm text-blue-700 mt-1">
                    {selectedModeData.sixFigureAlignment}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Benefits */}
              <div>
                <h4 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Benefits
                </h4>
                <ul className="space-y-2">
                  {selectedModeData.benefits.map((benefit, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Considerations */}
              <div>
                <h4 className="font-medium text-orange-700 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Considerations
                </h4>
                <ul className="space-y-2">
                  {selectedModeData.drawbacks.map((drawback, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <Clock className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span>{drawback}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ideal For */}
              <div>
                <h4 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Ideal For
                </h4>
                <ul className="space-y-2">
                  {selectedModeData.idealFor.map((ideal, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <Users className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{ideal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setShowComparison(!showComparison)}
        >
          {showComparison ? 'Hide' : 'Show'} Detailed Comparison
        </Button>

        <div className="flex items-center gap-3">
          {selectedMode !== currentMode && (
            <div className="text-sm text-muted-foreground">
              Changes will take effect immediately
            </div>
          )}
          <Button
            onClick={handleSaveMode}
            disabled={selectedMode === currentMode || loading}
            className="min-w-[120px]"
          >
            {loading ? 'Saving...' : 
             selectedMode === currentMode ? 'Current Mode' : 'Switch Mode'}
          </Button>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Mode Comparison</CardTitle>
            <CardDescription>
              Compare all payment modes side by side to make the best choice for your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Feature</th>
                    <th className="text-center p-3 font-medium">Centralized</th>
                    <th className="text-center p-3 font-medium">Decentralized</th>
                    <th className="text-center p-3 font-medium">Hybrid</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-medium">You Keep</td>
                    <td className="p-3 text-center">85%</td>
                    <td className="p-3 text-center text-green-600 font-semibold">87%</td>
                    <td className="p-3 text-center">85-87%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Setup Required</td>
                    <td className="p-3 text-center text-green-600">None</td>
                    <td className="p-3 text-center">Payment Account</td>
                    <td className="p-3 text-center">Both Accounts</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Deposit Speed</td>
                    <td className="p-3 text-center">Weekly</td>
                    <td className="p-3 text-center text-green-600">Next Day</td>
                    <td className="p-3 text-center">Variable</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Dispute Handling</td>
                    <td className="p-3 text-center text-green-600">Automated</td>
                    <td className="p-3 text-center">Manual</td>
                    <td className="p-3 text-center">Mixed</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Six Figure Fit</td>
                    <td className="p-3 text-center">Getting Started</td>
                    <td className="p-3 text-center text-green-600">Scaling Up</td>
                    <td className="p-3 text-center">Optimizing</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};