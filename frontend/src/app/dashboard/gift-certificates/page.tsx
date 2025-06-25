'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { giftCertificatesApi } from '@/lib/api/gift-certificates';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/hooks/useAuth';

interface Statistics {
  counts: {
    active: number;
    partially_used: number;
    fully_used: number;
    expired: number;
    cancelled: number;
    total: number;
  };
  values: {
    total_issued: number;
    total_used: number;
    total_remaining: number;
  };
}

export default function AdminGiftCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [selectedCertificate, setSelectedCertificate] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [certs, stats] = await Promise.all([
        giftCertificatesApi.admin.getAll(0, 100, filter),
        giftCertificatesApi.admin.getStatistics()
      ]);
      setCertificates(certs);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedCertificate || !cancelReason.trim()) return;

    try {
      setCancelling(true);
      await giftCertificatesApi.admin.cancel(selectedCertificate.id, cancelReason);
      setSelectedCertificate(null);
      setCancelReason('');
      fetchData();
    } catch (error) {
      console.error('Failed to cancel certificate:', error);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'partially_used':
        return <Badge variant="secondary">Partially Used</Badge>;
      case 'fully_used':
        return <Badge variant="outline">Used</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gift Certificates Management</h1>
          <Button onClick={() => window.location.href = '/gift-certificates/purchase'}>
            Create New
          </Button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Total Issued</h3>
              <p className="text-3xl font-bold text-primary">
                ${statistics.values.total_issued.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {statistics.counts.total} certificates
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Total Used</h3>
              <p className="text-3xl font-bold text-green-600">
                ${statistics.values.total_used.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {((statistics.values.total_used / statistics.values.total_issued) * 100).toFixed(1)}% redemption rate
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Outstanding Balance</h3>
              <p className="text-3xl font-bold text-orange-600">
                ${statistics.values.total_remaining.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {statistics.counts.active + statistics.counts.partially_used} active certificates
              </p>
            </Card>
          </div>
        )}

        {/* Status Breakdown */}
        {statistics && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Status Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{statistics.counts.active}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{statistics.counts.partially_used}</p>
                <p className="text-sm text-gray-600">Partially Used</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">{statistics.counts.fully_used}</p>
                <p className="text-sm text-gray-600">Fully Used</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{statistics.counts.expired}</p>
                <p className="text-sm text-gray-600">Expired</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-800">{statistics.counts.cancelled}</p>
                <p className="text-sm text-gray-600">Cancelled</p>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === undefined ? 'default' : 'outline'}
            onClick={() => setFilter(undefined)}
          >
            All
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={filter === 'partially_used' ? 'default' : 'outline'}
            onClick={() => setFilter('partially_used')}
          >
            Partially Used
          </Button>
          <Button
            variant={filter === 'expired' ? 'default' : 'outline'}
            onClick={() => setFilter('expired')}
          >
            Expired
          </Button>
        </div>

        {/* Certificates Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{cert.code}</td>
                    <td className="px-6 py-4">${cert.original_amount.toFixed(2)}</td>
                    <td className="px-6 py-4">${cert.remaining_balance.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">{cert.sender_name}</td>
                    <td className="px-6 py-4 text-sm">{cert.recipient_name}</td>
                    <td className="px-6 py-4">{getStatusBadge(cert.status)}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(cert.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {cert.status === 'active' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedCertificate(cert)}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Cancel Modal */}
        {selectedCertificate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Cancel Gift Certificate</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to cancel certificate {selectedCertificate.code}?
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full px-3 py-2 border rounded-lg mb-4"
                rows={3}
                required
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelling || !cancelReason.trim()}
                  className="flex-1"
                >
                  {cancelling ? <LoadingSpinner /> : 'Cancel Certificate'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCertificate(null);
                    setCancelReason('');
                  }}
                  disabled={cancelling}
                >
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
