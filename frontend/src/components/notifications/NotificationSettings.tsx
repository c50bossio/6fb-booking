'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/components/AuthProvider';
import {
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Moon,
  Settings,
  Save,
  TestTube,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { notificationService, NotificationPreferences } from '@/lib/notifications/notification-service';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchPreferences();
    }
  }, [user?.id]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const prefs = await notificationService.getNotificationPreferences(user!.id);
      setPreferences(prefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences || !user?.id) return;

    try {
      setSaving(true);
      setError(null);
      const updatedPrefs = await notificationService.updateNotificationPreferences(user.id, preferences);
      setPreferences(updatedPrefs);
      setSuccess('Preferences saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async (type: 'email' | 'sms') => {
    if (!user) return;

    try {
      setTesting(type);
      setError(null);

      const recipient = type === 'email' ? user.email : user.phone;
      if (!recipient) {
        setError(`No ${type} address found for testing`);
        return;
      }

      await notificationService.testNotification(type, recipient, 'test_notification');
      setSuccess(`Test ${type} sent successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to send test ${type}`);
    } finally {
      setTesting(null);
    }
  };

  const updatePreference = (section: keyof NotificationPreferences, key: string, value: any) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      [section]: {
        ...preferences[section],
        [key]: value
      }
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchPreferences} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-gray-600">No preferences found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Settings</h2>
          <p className="text-gray-600">Customize how and when you receive notifications</p>
        </div>
        <Button
          onClick={savePreferences}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <LoadingSpinner className="w-4 h-4 mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-6 h-6 mr-2 text-blue-600" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Appointment Confirmations</p>
              <p className="text-sm text-gray-600">Receive email when appointments are booked</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email.appointment_confirmation}
                onChange={(e) => updatePreference('email', 'appointment_confirmation', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Appointment Reminders</p>
              <p className="text-sm text-gray-600">Receive email reminders before appointments</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email.appointment_reminder}
                onChange={(e) => updatePreference('email', 'appointment_reminder', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Cancellation Notifications</p>
              <p className="text-sm text-gray-600">Receive email when appointments are cancelled</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email.appointment_cancellation}
                onChange={(e) => updatePreference('email', 'appointment_cancellation', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payment Receipts</p>
              <p className="text-sm text-gray-600">Receive email receipts for payments</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email.payment_receipt}
                onChange={(e) => updatePreference('email', 'payment_receipt', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Marketing & Promotions</p>
              <p className="text-sm text-gray-600">Receive promotional emails and special offers</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.email.marketing}
                onChange={(e) => updatePreference('email', 'marketing', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          {user?.role !== 'client' && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Performance Reports</p>
                  <p className="text-sm text-gray-600">Receive weekly performance summaries</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.email.performance_reports || false}
                    onChange={(e) => updatePreference('email', 'performance_reports', e.target.checked)}
                    className="toggle"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Team Updates</p>
                  <p className="text-sm text-gray-600">Receive notifications about team changes</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.email.team_updates || false}
                    onChange={(e) => updatePreference('email', 'team_updates', e.target.checked)}
                    className="toggle"
                  />
                </label>
              </div>
            </>
          )}

          <div className="pt-4 border-t">
            <Button
              onClick={() => testNotification('email')}
              variant="outline"
              size="sm"
              disabled={testing === 'email'}
            >
              {testing === 'email' ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-6 h-6 mr-2 text-green-600" />
            SMS Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Appointment Confirmations</p>
              <p className="text-sm text-gray-600">Receive SMS when appointments are booked</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.sms.appointment_confirmation}
                onChange={(e) => updatePreference('sms', 'appointment_confirmation', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Appointment Reminders</p>
              <p className="text-sm text-gray-600">Receive SMS reminders before appointments</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.sms.appointment_reminder}
                onChange={(e) => updatePreference('sms', 'appointment_reminder', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Cancellation Notifications</p>
              <p className="text-sm text-gray-600">Receive SMS when appointments are cancelled</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.sms.appointment_cancellation}
                onChange={(e) => updatePreference('sms', 'appointment_cancellation', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payment Confirmations</p>
              <p className="text-sm text-gray-600">Receive SMS for payment confirmations</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.sms.payment_confirmation}
                onChange={(e) => updatePreference('sms', 'payment_confirmation', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Marketing & Promotions</p>
              <p className="text-sm text-gray-600">Receive promotional SMS messages</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.sms.marketing}
                onChange={(e) => updatePreference('sms', 'marketing', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => testNotification('sms')}
              variant="outline"
              size="sm"
              disabled={testing === 'sms'}
            >
              {testing === 'sms' ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Test SMS
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-6 h-6 mr-2 text-purple-600" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Push Notifications</p>
              <p className="text-sm text-gray-600">Allow push notifications in your browser</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.push.enabled}
                onChange={(e) => updatePreference('push', 'enabled', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          {preferences.push.enabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Appointment Updates</p>
                  <p className="text-sm text-gray-600">Get push notifications for appointment changes</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.push.appointment_updates}
                    onChange={(e) => updatePreference('push', 'appointment_updates', e.target.checked)}
                    className="toggle"
                  />
                </label>
              </div>

              {user?.role !== 'client' && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Performance Alerts</p>
                      <p className="text-sm text-gray-600">Get alerts for important performance metrics</p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.push.performance_alerts || false}
                        onChange={(e) => updatePreference('push', 'performance_alerts', e.target.checked)}
                        className="toggle"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Team Updates</p>
                      <p className="text-sm text-gray-600">Get push notifications for team changes</p>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.push.team_updates || false}
                        onChange={(e) => updatePreference('push', 'team_updates', e.target.checked)}
                        className="toggle"
                      />
                    </label>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Reminder Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-6 h-6 mr-2 text-orange-600" />
            Reminder Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              First reminder (hours before appointment)
            </label>
            <select
              value={preferences.reminders.hours_before}
              onChange={(e) => updatePreference('reminders', 'hours_before', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Second reminder (hours before appointment)
            </label>
            <select
              value={preferences.reminders.second_reminder_hours}
              onChange={(e) => updatePreference('reminders', 'second_reminder_hours', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={4}>4 hours</option>
              <option value={6}>6 hours</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Moon className="w-6 h-6 mr-2 text-slate-600" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Quiet Hours</p>
              <p className="text-sm text-gray-600">Don't send notifications during specified hours</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.quiet_hours.enabled}
                onChange={(e) => updatePreference('quiet_hours', 'enabled', e.target.checked)}
                className="toggle"
              />
            </label>
          </div>

          {preferences.quiet_hours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Time
                </label>
                <select
                  value={preferences.quiet_hours.start}
                  onChange={(e) => updatePreference('quiet_hours', 'start', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  End Time
                </label>
                <select
                  value={preferences.quiet_hours.end}
                  onChange={(e) => updatePreference('quiet_hours', 'end', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </CardContent>
      </Card>
    </div>
  );
};
