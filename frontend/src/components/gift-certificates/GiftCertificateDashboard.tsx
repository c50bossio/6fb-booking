'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { AnimatedCard } from '@/components/ui/animated-card';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface GiftCertificate {
  id: number;
  code: string;
  original_amount: number;
  remaining_balance: number;
  sender_name: string;
  sender_email: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  expiry_date: string;
  created_at: string;
  message?: string;
}

export const GiftCertificateDashboard: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<GiftCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await api.get('/gift-certificates/my-certificates');
      setCertificates(response.data);
    } catch (error) {
      console.error('Failed to fetch gift certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const sentCertificates = certificates.filter(
    cert => cert.sender_email === user?.email
  );

  const receivedCertificates = certificates.filter(
    cert => cert.recipient_email === user?.email
  );

  const getStatusBadge = (status: string, expiryDate: string) => {
    const isExpired = new Date(expiryDate) < new Date();

    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'partially_used':
        return <Badge variant="secondary">Partially Used</Badge>;
      case 'fully_used':
        return <Badge variant="outline">Used</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gift Certificates</h2>
        <Button onClick={() => setShowPurchaseForm(true)}>
          Purchase Gift Certificate
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'received'
              ? 'bg-white text-primary font-medium shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Received ({receivedCertificates.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'sent'
              ? 'bg-white text-primary font-medium shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sent ({sentCertificates.length})
        </button>
      </div>

      {/* Certificates List */}
      <div className="grid gap-4">
        {activeTab === 'received' && (
          <>
            {receivedCertificates.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">You haven't received any gift certificates yet.</p>
              </Card>
            ) : (
              receivedCertificates.map((cert) => (
                <AnimatedCard key={cert.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        ${cert.remaining_balance.toFixed(2)} Available
                      </h3>
                      <p className="text-sm text-gray-600">
                        From {cert.sender_name} • {formatDate(cert.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(cert.status, cert.expiry_date)}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-1">Gift Certificate Code</p>
                    <p className="font-mono text-lg">{cert.code}</p>
                  </div>

                  {cert.message && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Message</p>
                      <p className="italic">&ldquo;{cert.message}&rdquo;</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">
                      Original: ${cert.original_amount.toFixed(2)}
                    </span>
                    <span className="text-gray-600">
                      Expires: {formatDate(cert.expiry_date)}
                    </span>
                  </div>

                  {cert.status === 'active' || cert.status === 'partially_used' ? (
                    <Button
                      className="mt-4 w-full"
                      onClick={() => window.location.href = '/book'}
                    >
                      Use Gift Certificate
                    </Button>
                  ) : null}
                </AnimatedCard>
              ))
            )}
          </>
        )}

        {activeTab === 'sent' && (
          <>
            {sentCertificates.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">You haven't sent any gift certificates yet.</p>
                <Button
                  className="mt-4"
                  onClick={() => setShowPurchaseForm(true)}
                >
                  Send Your First Gift
                </Button>
              </Card>
            ) : (
              sentCertificates.map((cert) => (
                <AnimatedCard key={cert.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        ${cert.original_amount.toFixed(2)} Gift Certificate
                      </h3>
                      <p className="text-sm text-gray-600">
                        To {cert.recipient_name} • {formatDate(cert.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(cert.status, cert.expiry_date)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Used</p>
                      <p className="font-semibold">
                        ${(cert.original_amount - cert.remaining_balance).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Remaining</p>
                      <p className="font-semibold">
                        ${cert.remaining_balance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>Code: <span className="font-mono">{cert.code}</span></p>
                    <p>Expires: {formatDate(cert.expiry_date)}</p>
                  </div>
                </AnimatedCard>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};
