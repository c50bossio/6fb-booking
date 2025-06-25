import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Bell, Mail, MessageSquare, Clock, Moon } from 'lucide-react';

interface NotificationPreference {
  id: number;
  user_id: number;
  email: {
    appointment_confirmation: boolean;
    appointment_reminder: boolean;
    appointment_cancellation: boolean;
    payment_receipt: boolean;
    marketing: boolean;
    performance_reports: boolean;
    team_updates: boolean;
  };
  sms: {
    appointment_confirmation: boolean;
    appointment_reminder: boolean;
    appointment_cancellation: boolean;
    payment_confirmation: boolean;
    marketing: boolean;
  };
  push: {
    enabled: boolean;
    appointment_updates: boolean;
    performance_alerts: boolean;
    team_updates: boolean;
  };
  reminders: {
    hours_before: number;
    second_reminder_hours: number;
  };
  quiet_hours: {
    enabled: boolean;
    start: number;
    end: number;
  };
  updated_at: string;
}

export const NotificationPreferences: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { corsAwareFetch } = await import('@/lib/api/corsHelper')
      const response = await corsAwareFetch('/communications/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    setError(null);

    try {
      const { corsAwareFetch } = await import('@/lib/api/corsHelper')
      const response = await corsAwareFetch('/communications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      const data = await response.json();
      setPreferences(data);
      // Show success message
      alert('Preferences saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (category: string, subcategory: string, value: any) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      [category]: {
        ...preferences[category as keyof NotificationPreference],
        [subcategory]: value
      }
    });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-red-600 p-4">
        Error: {error}
      </div>
    );
  }

  if (!preferences) {
    return <div>No preferences found</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Notification Preferences</h2>

      {/* Email Notifications */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Mail className="w-6 h-6 mr-2 text-blue-600" />
          <h3 className="text-xl font-semibold">Email Notifications</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span>Appointment Confirmations</span>
            <input
              type="checkbox"
              checked={preferences.email.appointment_confirmation}
              onChange={(e) => updatePreference('email', 'appointment_confirmation', e.target.checked)}
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between">
            <span>Appointment Reminders</span>
            <input
              type="checkbox"
              checked={preferences.email.appointment_reminder}
              onChange={(e) => updatePreference('email', 'appointment_reminder', e.target.checked)}
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between">
            <span>Cancellations</span>
            <input
              type="checkbox"
              checked={preferences.email.appointment_cancellation}
              onChange={(e) => updatePreference('email', 'appointment_cancellation', e.target.checked)}
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between">
            <span>Payment Receipts</span>
            <input
              type="checkbox"
              checked={preferences.email.payment_receipt}
              onChange={(e) => updatePreference('email', 'payment_receipt', e.target.checked)}
              className="toggle"
            />
          </label>

          {user?.role !== 'client' && (
            <>
              <label className="flex items-center justify-between">
                <span>Performance Reports</span>
                <input
                  type="checkbox"
                  checked={preferences.email.performance_reports}
                  onChange={(e) => updatePreference('email', 'performance_reports', e.target.checked)}
                  className="toggle"
                />
              </label>

              <label className="flex items-center justify-between">
                <span>Team Updates</span>
                <input
                  type="checkbox"
                  checked={preferences.email.team_updates}
                  onChange={(e) => updatePreference('email', 'team_updates', e.target.checked)}
                  className="toggle"
                />
              </label>
            </>
          )}

          <label className="flex items-center justify-between">
            <span>Marketing & Promotions</span>
            <input
              type="checkbox"
              checked={preferences.email.marketing}
              onChange={(e) => updatePreference('email', 'marketing', e.target.checked)}
              className="toggle"
            />
          </label>
        </div>
      </Card>

      {/* SMS Notifications */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <MessageSquare className="w-6 h-6 mr-2 text-green-600" />
          <h3 className="text-xl font-semibold">SMS Notifications</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span>Appointment Confirmations</span>
            <input
              type="checkbox"
              checked={preferences.sms.appointment_confirmation}
              onChange={(e) => updatePreference('sms', 'appointment_confirmation', e.target.checked)}
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between">
            <span>Appointment Reminders</span>
            <input
              type="checkbox"
              checked={preferences.sms.appointment_reminder}
              onChange={(e) => updatePreference('sms', 'appointment_reminder', e.target.checked)}
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between">
            <span>Cancellations</span>
            <input
              type="checkbox"
              checked={preferences.sms.appointment_cancellation}
              onChange={(e) => updatePreference('sms', 'appointment_cancellation', e.target.checked)}
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between">
            <span>Payment Confirmations</span>
            <input
              type="checkbox"
              checked={preferences.sms.payment_confirmation}
              onChange={(e) => updatePreference('sms', 'payment_confirmation', e.target.checked)}
              className="toggle"
            />
          </label>

          <label className="flex items-center justify-between">
            <span>Marketing & Promotions</span>
            <input
              type="checkbox"
              checked={preferences.sms.marketing}
              onChange={(e) => updatePreference('sms', 'marketing', e.target.checked)}
              className="toggle"
            />
          </label>
        </div>
      </Card>

      {/* Push Notifications */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Bell className="w-6 h-6 mr-2 text-teal-600" />
          <h3 className="text-xl font-semibold">Push Notifications</h3>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span>Enable Push Notifications</span>
            <input
              type="checkbox"
              checked={preferences.push.enabled}
              onChange={(e) => updatePreference('push', 'enabled', e.target.checked)}
              className="toggle"
            />
          </label>

          {preferences.push.enabled && (
            <>
              <label className="flex items-center justify-between">
                <span>Appointment Updates</span>
                <input
                  type="checkbox"
                  checked={preferences.push.appointment_updates}
                  onChange={(e) => updatePreference('push', 'appointment_updates', e.target.checked)}
                  className="toggle"
                />
              </label>

              {user?.role !== 'client' && (
                <>
                  <label className="flex items-center justify-between">
                    <span>Performance Alerts</span>
                    <input
                      type="checkbox"
                      checked={preferences.push.performance_alerts}
                      onChange={(e) => updatePreference('push', 'performance_alerts', e.target.checked)}
                      className="toggle"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span>Team Updates</span>
                    <input
                      type="checkbox"
                      checked={preferences.push.team_updates}
                      onChange={(e) => updatePreference('push', 'team_updates', e.target.checked)}
                      className="toggle"
                    />
                  </label>
                </>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Reminder Settings */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Clock className="w-6 h-6 mr-2 text-orange-600" />
          <h3 className="text-xl font-semibold">Reminder Timing</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              First reminder (hours before appointment)
            </label>
            <select
              value={preferences.reminders.hours_before}
              onChange={(e) => updatePreference('reminders', 'hours_before', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Second reminder (hours before appointment)
            </label>
            <select
              value={preferences.reminders.second_reminder_hours}
              onChange={(e) => updatePreference('reminders', 'second_reminder_hours', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={4}>4 hours</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Moon className="w-6 h-6 mr-2 text-slate-600" />
          <h3 className="text-xl font-semibold">Quiet Hours</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span>Enable Quiet Hours</span>
            <input
              type="checkbox"
              checked={preferences.quiet_hours.enabled}
              onChange={(e) => updatePreference('quiet_hours', 'enabled', e.target.checked)}
              className="toggle"
            />
          </label>

          {preferences.quiet_hours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Time
                </label>
                <select
                  value={preferences.quiet_hours.start}
                  onChange={(e) => updatePreference('quiet_hours', 'start', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  End Time
                </label>
                <select
                  value={preferences.quiet_hours.end}
                  onChange={(e) => updatePreference('quiet_hours', 'end', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};
