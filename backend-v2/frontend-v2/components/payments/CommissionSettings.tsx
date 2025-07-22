/**
 * Commission Settings Component
 * Allows barbers to configure commission collection preferences and schedules
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import { 
  DollarSign, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Shield,
  Lightbulb
} from 'lucide-react';

interface CommissionPreferences {
  collection_threshold: number;
  collection_frequency: 'weekly' | 'biweekly' | 'monthly' | 'threshold';
  auto_collection_enabled: boolean;
  preferred_collection_day: number;
  backup_payment_method: string | null;
  notification_preferences: {
    before_collection: boolean;
    after_collection: boolean;
    threshold_reached: boolean;
  };
  commission_rate: number;
  booth_rent: number;
  booth_rent_frequency: 'weekly' | 'monthly';
}

interface CommissionSettingsProps {
  currentSettings?: CommissionPreferences | null;
  onSettingsChange: (settings: Partial<CommissionPreferences>) => Promise<void>;
}

export const CommissionSettings: React.FC<CommissionSettingsProps> = ({
  currentSettings,
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<CommissionPreferences>(
    currentSettings || {
      collection_threshold: 50.0,
      collection_frequency: 'threshold',
      auto_collection_enabled: true,
      preferred_collection_day: 1, // Monday
      backup_payment_method: null,
      notification_preferences: {
        before_collection: true,
        after_collection: true,
        threshold_reached: true
      },
      commission_rate: 15.0,
      booth_rent: 0.0,
      booth_rent_frequency: 'weekly'
    }
  );
  
  const [saving, setSaving] = useState(false);

  const handleSettingChange = (key: keyof CommissionPreferences, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNotificationChange = (key: keyof CommissionPreferences['notification_preferences'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSettingsChange(settings);
      toast({
        title: "Settings Saved",
        description: "Your commission settings have been updated successfully"
      });
    } catch (error) {
      console.error('Failed to save commission settings:', error);
      toast({
        title: "Error",
        description: "Failed to save commission settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getDayName = (dayNumber: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Monday';
  };

  const getFrequencyDescription = () => {
    switch (settings.collection_frequency) {
      case 'weekly':
        return `Every ${getDayName(settings.preferred_collection_day)}`;
      case 'biweekly':
        return `Every other ${getDayName(settings.preferred_collection_day)}`;
      case 'monthly':
        return `Monthly on the ${settings.preferred_collection_day}${getOrdinalSuffix(settings.preferred_collection_day)}`;
      case 'threshold':
        return `When commission reaches $${settings.collection_threshold.toFixed(2)}`;
      default:
        return 'Custom schedule';
    }
  };

  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const estimateMonthlyCollection = () => {
    // Simple estimation based on commission rate and assumed monthly volume
    const assumedMonthlyVolume = 2000; // $2000 typical monthly volume for example
    const monthlyCommission = assumedMonthlyVolume * (settings.commission_rate / 100);
    const monthlyBoothRent = settings.booth_rent_frequency === 'monthly' 
      ? settings.booth_rent 
      : settings.booth_rent * 4.33; // weekly to monthly
    
    return monthlyCommission + monthlyBoothRent;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold">Commission Collection Settings</h3>
        <p className="text-muted-foreground mt-1">
          Configure how and when commission and booth rent are collected from your earnings
        </p>
      </div>

      {/* Six Figure Barber Insight */}
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          <strong>Six Figure Barber Tip:</strong> Smart commission settings help you plan cash flow 
          while ensuring the platform gets paid consistently. Set thresholds that work with your 
          payment schedule.
        </AlertDescription>
      </Alert>

      {/* Commission Rate and Booth Rent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Rate Configuration
          </CardTitle>
          <CardDescription>Set your commission rate and booth rental amounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Commission Rate */}
            <div className="space-y-3">
              <Label>Commission Rate</Label>
              <div className="space-y-2">
                <Slider
                  value={[settings.commission_rate]}
                  onValueChange={(value) => handleSettingChange('commission_rate', value[0])}
                  max={30}
                  min={5}
                  step={0.5}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>5%</span>
                  <span className="font-semibold">{settings.commission_rate}%</span>
                  <span>30%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Platform commission on each payment you receive
              </p>
            </div>

            {/* Booth Rent */}
            <div className="space-y-3">
              <Label>Booth Rent (Optional)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={settings.booth_rent}
                    onChange={(e) => handleSettingChange('booth_rent', parseFloat(e.target.value) || 0)}
                    className="pl-9"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <Select
                  value={settings.booth_rent_frequency}
                  onValueChange={(value) => handleSettingChange('booth_rent_frequency', value as 'weekly' | 'monthly')}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Fixed booth rental amount (if applicable)
              </p>
            </div>
          </div>

          {/* Estimated Monthly Collection */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm font-medium mb-2">Estimated Monthly Collection</div>
            <div className="text-2xl font-bold text-orange-600">
              ${estimateMonthlyCollection().toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on $2,000 monthly volume estimate
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Collection Schedule
          </CardTitle>
          <CardDescription>Configure when collections are automatically processed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Collection Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatic Collection</Label>
              <p className="text-sm text-muted-foreground">
                Automatically collect commission and rent based on schedule
              </p>
            </div>
            <Switch
              checked={settings.auto_collection_enabled}
              onCheckedChange={(checked) => handleSettingChange('auto_collection_enabled', checked)}
            />
          </div>

          {/* Collection Frequency */}
          <div className="space-y-3">
            <Label>Collection Frequency</Label>
            <Select
              value={settings.collection_frequency}
              onValueChange={(value) => handleSettingChange('collection_frequency', value as CommissionPreferences['collection_frequency'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="threshold">When threshold is reached</SelectItem>
                <SelectItem value="weekly">Weekly schedule</SelectItem>
                <SelectItem value="biweekly">Bi-weekly schedule</SelectItem>
                <SelectItem value="monthly">Monthly schedule</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Current schedule: {getFrequencyDescription()}
            </p>
          </div>

          {/* Threshold Setting */}
          {settings.collection_frequency === 'threshold' && (
            <div className="space-y-3">
              <Label>Collection Threshold</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={settings.collection_threshold}
                  onChange={(e) => handleSettingChange('collection_threshold', parseFloat(e.target.value) || 50)}
                  className="pl-9"
                  min="10"
                  step="5"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Minimum amount before automatic collection triggers
              </p>
            </div>
          )}

          {/* Preferred Day */}
          {settings.collection_frequency !== 'threshold' && (
            <div className="space-y-3">
              <Label>
                {settings.collection_frequency === 'monthly' ? 'Preferred Day of Month' : 'Preferred Day of Week'}
              </Label>
              <Select
                value={settings.preferred_collection_day.toString()}
                onValueChange={(value) => handleSettingChange('preferred_collection_day', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.collection_frequency === 'monthly' ? (
                    Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{getOrdinalSuffix(day)} of the month
                      </SelectItem>
                    ))
                  ) : (
                    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose when you want to be notified about collections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Before Collection</Label>
                <p className="text-sm text-muted-foreground">
                  Notify 24 hours before automatic collection
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.before_collection}
                onCheckedChange={(checked) => handleNotificationChange('before_collection', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>After Collection</Label>
                <p className="text-sm text-muted-foreground">
                  Confirm when collection is completed
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.after_collection}
                onCheckedChange={(checked) => handleNotificationChange('after_collection', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Threshold Reached</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when commission reaches collection threshold
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.threshold_reached}
                onCheckedChange={(checked) => handleNotificationChange('threshold_reached', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <div className="font-medium">Secure Collection Process</div>
              <div className="text-sm text-muted-foreground mt-1">
                Collections are processed via secure ACH transfers from your connected bank account. 
                You'll receive detailed receipts for all transactions. Collections are paused if 
                your payment method fails, with automatic retry after 3 days.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};