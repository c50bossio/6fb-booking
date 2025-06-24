'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  TestTube,
  Mail,
  MessageSquare,
  Bell,
  Send,
  CheckCircle,
  AlertCircle,
  Code,
  Eye,
  Settings
} from 'lucide-react';
import { notificationService } from '@/lib/notifications/notification-service';
import { emailTemplates, TemplateData } from '@/lib/notifications/email-templates';
import { smsTemplates, SMSTemplateData } from '@/lib/notifications/sms-templates';

interface NotificationTestingProps {
  className?: string;
}

const testBookingData = {
  id: 'test-123',
  confirmationNumber: 'TEST-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
  service: {
    name: 'Premium Haircut & Styling',
    duration: 60,
    price: 85
  },
  barber: {
    name: 'John Smith',
    email: 'john.smith@barbershop.com',
    phone: '+1 (555) 123-4567'
  },
  location: {
    name: 'Downtown Barbershop',
    address: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    phone: '+1 (555) 987-6543'
  },
  appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  appointmentTime: '14:30',
  status: 'confirmed' as const,
  paymentStatus: 'paid' as const,
  clientInfo: {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 (555) 555-0123'
  },
  notes: 'Test appointment for notification system',
  createdAt: new Date().toISOString()
};

export const NotificationTesting: React.FC<NotificationTestingProps> = ({ className }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('appointment_confirmation');
  const [selectedType, setSelectedType] = useState<'email' | 'sms'>('email');
  const [testRecipient, setTestRecipient] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState<'html' | 'text' | 'sms'>('html');
  const [error, setError] = useState<string | null>(null);

  const templateOptions = [
    { value: 'appointment_confirmation', label: 'Appointment Confirmation' },
    { value: 'appointment_reminder', label: 'Appointment Reminder' },
    { value: 'appointment_cancellation', label: 'Appointment Cancellation' },
    { value: 'payment_receipt', label: 'Payment Receipt' }
  ];

  const sendTestNotification = async () => {
    if (!testRecipient.trim()) {
      setError('Please enter a recipient');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      const result = await notificationService.testNotification(
        selectedType,
        testRecipient,
        selectedTemplate
      );

      setResults(prev => [{
        id: Date.now(),
        type: selectedType,
        template: selectedTemplate,
        recipient: testRecipient,
        result,
        timestamp: new Date().toISOString()
      }, ...prev]);

      setTestRecipient('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  const generatePreview = () => {
    try {
      if (selectedType === 'email') {
        const templateData: TemplateData = {
          clientName: testBookingData.clientInfo.name,
          clientEmail: testBookingData.clientInfo.email,
          barberName: testBookingData.barber.name,
          serviceName: testBookingData.service.name,
          appointmentDate: new Date(testBookingData.appointmentDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          appointmentTime: testBookingData.appointmentTime,
          duration: testBookingData.service.duration,
          price: testBookingData.service.price,
          locationName: testBookingData.location.name,
          locationAddress: `${testBookingData.location.address}, ${testBookingData.location.city}, ${testBookingData.location.state} ${testBookingData.location.zip}`,
          confirmationNumber: testBookingData.confirmationNumber,
          businessPhone: testBookingData.location.phone
        };

        switch (selectedTemplate) {
          case 'appointment_confirmation':
            return emailTemplates.appointmentConfirmation(templateData);
          case 'appointment_reminder':
            return emailTemplates.appointmentReminder({ ...templateData, hoursUntil: 24 });
          case 'appointment_cancellation':
            return emailTemplates.appointmentCancellation(templateData);
          case 'payment_receipt':
            return emailTemplates.paymentReceipt({
              ...templateData,
              paymentId: 'PAY_' + Math.random().toString(36).substr(2, 8),
              paymentMethod: 'Credit Card'
            });
          default:
            return { subject: '', html: '', text: '' };
        }
      } else {
        const smsData: SMSTemplateData = {
          clientName: testBookingData.clientInfo.name.split(' ')[0],
          barberName: testBookingData.barber.name,
          serviceName: testBookingData.service.name,
          appointmentDate: new Date(testBookingData.appointmentDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          appointmentTime: testBookingData.appointmentTime,
          locationName: testBookingData.location.name,
          confirmationNumber: testBookingData.confirmationNumber,
          businessPhone: testBookingData.location.phone
        };

        switch (selectedTemplate) {
          case 'appointment_confirmation':
            return smsTemplates.appointmentConfirmation(smsData);
          case 'appointment_reminder':
            return smsTemplates.appointmentReminder24h(smsData);
          case 'appointment_cancellation':
            return smsTemplates.appointmentCancellation(smsData);
          case 'payment_receipt':
            return smsTemplates.paymentConfirmation({ ...smsData, amount: testBookingData.service.price });
          default:
            return { message: '', maxLength: 160 };
        }
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      return selectedType === 'email'
        ? { subject: 'Error', html: 'Failed to generate preview', text: 'Failed to generate preview' }
        : { message: 'Failed to generate preview', maxLength: 160 };
    }
  };

  const preview = generatePreview();
  const isEmail = selectedType === 'email';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Notification Testing</h2>
        <p className="text-gray-600">Test email and SMS notifications with sample data</p>
      </div>

      {/* Test Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TestTube className="w-6 h-6 mr-2 text-blue-600" />
            Test Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Notification Type
              </label>
              <div className="flex space-x-2">
                <Button
                  variant={selectedType === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('email')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant={selectedType === 'sms' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('sms')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  SMS
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {templateOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Test Recipient ({selectedType === 'email' ? 'Email Address' : 'Phone Number'})
            </label>
            <div className="flex space-x-2">
              <input
                type={selectedType === 'email' ? 'email' : 'tel'}
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={selectedType === 'email' ? 'test@example.com' : '+1 (555) 123-4567'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                onClick={sendTestNotification}
                disabled={testing || !testRecipient.trim()}
              >
                {testing ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Test
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Eye className="w-6 h-6 mr-2 text-green-600" />
              Template Preview
            </div>
            {isEmail && (
              <div className="flex space-x-2">
                <Button
                  variant={previewMode === 'html' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('html')}
                >
                  HTML
                </Button>
                <Button
                  variant={previewMode === 'text' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('text')}
                >
                  Text
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEmail ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <div className="p-3 bg-gray-50 border rounded-md">
                  {(preview as any).subject}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                {previewMode === 'html' ? (
                  <div
                    className="p-4 bg-white border rounded-md min-h-[400px] overflow-auto"
                    dangerouslySetInnerHTML={{ __html: (preview as any).html }}
                  />
                ) : (
                  <pre className="p-4 bg-gray-50 border rounded-md whitespace-pre-wrap text-sm overflow-auto max-h-[400px]">
                    {(preview as any).text}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Message Length:</span>
                <Badge variant={(preview as any).message?.length > (preview as any).maxLength ? 'destructive' : 'default'}>
                  {(preview as any).message?.length || 0} / {(preview as any).maxLength} chars
                </Badge>
              </div>
              <div className="p-4 bg-gray-50 border rounded-md">
                <p className="whitespace-pre-wrap">{(preview as any).message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {result.type === 'email' ? (
                      <Mail className="w-4 h-4 text-blue-500" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {templateOptions.find(t => t.value === result.template)?.label}
                      </p>
                      <p className="text-sm text-gray-600">
                        To: {result.recipient}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      className={
                        result.result.status === 'sent'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {result.result.status}
                    </Badge>
                    {result.result.status === 'sent' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {result.result.status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Data Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Code className="w-6 h-6 mr-2 text-purple-600" />
            Sample Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Tests use the following sample booking data:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Client:</strong> {testBookingData.clientInfo.name}</p>
              <p><strong>Service:</strong> {testBookingData.service.name}</p>
              <p><strong>Barber:</strong> {testBookingData.barber.name}</p>
              <p><strong>Price:</strong> ${testBookingData.service.price}</p>
            </div>
            <div>
              <p><strong>Date:</strong> {new Date(testBookingData.appointmentDate).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {testBookingData.appointmentTime}</p>
              <p><strong>Location:</strong> {testBookingData.location.name}</p>
              <p><strong>Confirmation:</strong> {testBookingData.confirmationNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
