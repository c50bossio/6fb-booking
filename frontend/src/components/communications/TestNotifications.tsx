import React, { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react';

const EMAIL_TEMPLATES = [
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'appointment_confirmation', label: 'Appointment Confirmation' },
  { value: 'appointment_reminder', label: 'Appointment Reminder' },
  { value: 'appointment_cancellation', label: 'Appointment Cancellation' },
  { value: 'payment_receipt', label: 'Payment Receipt' },
  { value: 'password_reset', label: 'Password Reset' }
];

export const TestNotifications: React.FC = () => {
  const { user } = useAuth();
  const [emailTemplate, setEmailTemplate] = useState('welcome');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [smsResult, setSmsResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendTestEmail = async () => {
    setSendingEmail(true);
    setEmailResult(null);

    try {
      const response = await fetch('/api/v1/communications/test/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ template: emailTemplate })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send test email');
      }

      setEmailResult({
        success: true,
        message: data.message
      });
    } catch (err) {
      setEmailResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test email'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const sendTestSMS = async () => {
    setSendingSMS(true);
    setSmsResult(null);

    try {
      const response = await fetch('/api/v1/communications/test/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phone_number: phoneNumber || undefined })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send test SMS');
      }

      setSmsResult({
        success: true,
        message: data.message
      });
    } catch (err) {
      setSmsResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send test SMS'
      });
    } finally {
      setSendingSMS(false);
    }
  };

  // Only show this component to admins
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">You don't have permission to access this feature.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Test Notifications</h2>
      <p className="text-gray-600">Send test emails and SMS messages to verify the notification system is working correctly.</p>

      {/* Test Email */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Mail className="w-6 h-6 mr-2 text-blue-600" />
          <h3 className="text-xl font-semibold">Test Email</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Email Template
            </label>
            <select
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              {EMAIL_TEMPLATES.map((template) => (
                <option key={template.value} value={template.value}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-50 p-3 rounded text-sm">
            <p className="font-medium">Test email will be sent to:</p>
            <p className="text-gray-600">{user.email}</p>
          </div>

          <Button
            onClick={sendTestEmail}
            disabled={sendingEmail}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {sendingEmail ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⏳</span>
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Send className="w-4 h-4 mr-2" />
                Send Test Email
              </span>
            )}
          </Button>

          {emailResult && (
            <div className={`p-3 rounded flex items-start gap-2 ${
              emailResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {emailResult.success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{emailResult.message}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Test SMS */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <MessageSquare className="w-6 h-6 mr-2 text-green-600" />
          <h3 className="text-xl font-semibold">Test SMS</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number (optional)
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Leave empty to use your profile number"
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: +1234567890 or (123) 456-7890
            </p>
          </div>

          {!phoneNumber && user.phone && (
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p className="font-medium">SMS will be sent to your profile number:</p>
              <p className="text-gray-600">{user.phone}</p>
            </div>
          )}

          <Button
            onClick={sendTestSMS}
            disabled={sendingSMS || (!phoneNumber && !user.phone)}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {sendingSMS ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin mr-2">⏳</span>
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Send className="w-4 h-4 mr-2" />
                Send Test SMS
              </span>
            )}
          </Button>

          {!phoneNumber && !user.phone && (
            <p className="text-sm text-amber-600">
              Please enter a phone number or add one to your profile.
            </p>
          )}

          {smsResult && (
            <div className={`p-3 rounded flex items-start gap-2 ${
              smsResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {smsResult.success ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{smsResult.message}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Configuration Status */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-3">Configuration Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Email Service (SMTP)</span>
            <span className="text-green-600 font-medium">✓ Configured</span>
          </div>
          <div className="flex items-center justify-between">
            <span>SMS Service (Twilio)</span>
            <span className="text-green-600 font-medium">✓ Configured</span>
          </div>
        </div>
      </Card>
    </div>
  );
};