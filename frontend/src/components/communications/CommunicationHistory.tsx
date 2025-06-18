import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, Check, X, Clock, AlertCircle, Eye } from 'lucide-react';

interface EmailLog {
  id: number;
  recipient: string;
  subject: string;
  template: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface SMSLog {
  id: number;
  recipient: string;
  message: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  twilio_sid: string | null;
  cost: number | null;
  created_at: string;
}

export const CommunicationHistory: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('email');
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalEmail, setTotalEmail] = useState(0);
  const [totalSMS, setTotalSMS] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailHistory();
    } else {
      fetchSMSHistory();
    }
  }, [activeTab, page]);

  const fetchEmailHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/communications/email/history?limit=${limit}&offset=${page * limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch email history');
      }

      const data = await response.json();
      setEmailLogs(data.emails);
      setTotalEmail(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email history');
    } finally {
      setLoading(false);
    }
  };

  const fetchSMSHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/communications/sms/history?limit=${limit}&offset=${page * limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch SMS history');
      }

      const data = await response.json();
      setSmsLogs(data.messages);
      setTotalSMS(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SMS history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      sent: { color: 'blue', icon: <Check className="w-3 h-3" /> },
      delivered: { color: 'green', icon: <Check className="w-3 h-3" /> },
      opened: { color: 'purple', icon: <Eye className="w-3 h-3" /> },
      clicked: { color: 'indigo', icon: <Check className="w-3 h-3" /> },
      failed: { color: 'red', icon: <X className="w-3 h-3" /> },
      bounced: { color: 'orange', icon: <AlertCircle className="w-3 h-3" /> },
      spam: { color: 'gray', icon: <X className="w-3 h-3" /> },
      undelivered: { color: 'red', icon: <X className="w-3 h-3" /> }
    };

    const config = statusConfig[status] || { color: 'gray', icon: <Clock className="w-3 h-3" /> };

    return (
      <Badge className={`bg-${config.color}-100 text-${config.color}-800`}>
        <span className="flex items-center gap-1">
          {config.icon}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatPhone = (phone: string) => {
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const tabItems = [
    {
      value: 'email',
      label: (
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Email ({totalEmail})
        </div>
      ),
      content: (
        <div className="space-y-4">
          {emailLogs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold">{log.subject}</h4>
                  <p className="text-sm text-gray-600">To: {log.recipient}</p>
                  <p className="text-sm text-gray-500">Template: {log.template}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(log.status)}
                  <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                </div>
              </div>

              {log.error_message && (
                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
                  Error: {log.error_message}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                {log.sent_at && <span>Sent: {formatDate(log.sent_at)}</span>}
                {log.delivered_at && <span>Delivered: {formatDate(log.delivered_at)}</span>}
                {log.opened_at && <span>Opened: {formatDate(log.opened_at)}</span>}
                {log.clicked_at && <span>Clicked: {formatDate(log.clicked_at)}</span>}
                {log.bounced_at && <span>Bounced: {formatDate(log.bounced_at)}</span>}
              </div>
            </Card>
          ))}
        </div>
      )
    },
    {
      value: 'sms',
      label: (
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          SMS ({totalSMS})
        </div>
      ),
      content: (
        <div className="space-y-4">
          {smsLogs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-semibold">To: {formatPhone(log.recipient)}</p>
                  <p className="text-sm text-gray-600 mt-1">{log.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(log.status)}
                  <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                </div>
              </div>

              {log.error_message && (
                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
                  Error: {log.error_message}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                {log.sent_at && <span>Sent: {formatDate(log.sent_at)}</span>}
                {log.delivered_at && <span>Delivered: {formatDate(log.delivered_at)}</span>}
                {log.cost && <span>Cost: ${log.cost.toFixed(3)}</span>}
                {log.twilio_sid && <span>ID: {log.twilio_sid}</span>}
              </div>
            </Card>
          ))}
        </div>
      )
    }
  ];

  if (loading && (emailLogs.length === 0 || smsLogs.length === 0)) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-red-600 p-4">
        Error: {error}
      </div>
    );
  }

  const totalPages = activeTab === 'email' 
    ? Math.ceil(totalEmail / limit) 
    : Math.ceil(totalSMS / limit);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Communication History</h2>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={tabItems}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Previous
          </button>
          
          <span className="px-3 py-1">
            Page {page + 1} of {totalPages}
          </span>
          
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};