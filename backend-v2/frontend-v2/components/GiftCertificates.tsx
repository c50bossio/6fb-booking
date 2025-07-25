'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import { format, parseISO, addMonths } from 'date-fns';
import { Gift, Plus, Search, Download, Mail, Copy, CheckCircle, AlertCircle, X } from 'lucide-react';

interface GiftCertificate {
  id: number;
  code: string;
  amount: number;
  balance: number;
  status: string;
  purchaser_name: string;
  purchaser_email: string;
  recipient_name?: string;
  recipient_email?: string;
  message?: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
  used_at?: string;
}

interface GiftCertificatesProps {
  onClose?: () => void;
}

export default function GiftCertificates({ onClose }: GiftCertificatesProps) {
  const [certificates, setCertificates] = useState<GiftCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCertificate, setSelectedCertificate] = useState<GiftCertificate | null>(null);
  
  // Create form state
  const [formData, setFormData] = useState({
    amount: '',
    purchaser_name: '',
    purchaser_email: '',
    recipient_name: '',
    recipient_email: '',
    message: '',
    validity_months: '12',
    quantity: '1',
  });
  
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetchAPI('/api/v2/payments/gift-certificates');
      setCertificates(response);
    } catch (error) {
      console.error('Error fetching gift certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    
    try {
      setCreating(true);
      
      const quantity = parseInt(formData.quantity);
      const createdCertificates = [];
      
      for (let i = 0; i < quantity; i++) {
        const response = await fetchAPI('/api/v2/payments/gift-certificates', {
          method: 'POST',
          body: JSON.stringify({
            amount: parseFloat(formData.amount),
            purchaser_name: formData.purchaser_name,
            purchaser_email: formData.purchaser_email,
            recipient_name: formData.recipient_name || undefined,
            recipient_email: formData.recipient_email || undefined,
            message: formData.message || undefined,
            validity_months: parseInt(formData.validity_months),
          }),
        });
        createdCertificates.push(response);
      }
      
      // Reset form
      setFormData({
        amount: '',
        purchaser_name: '',
        purchaser_email: '',
        recipient_name: '',
        recipient_email: '',
        message: '',
        validity_months: '12',
        quantity: '1',
      });
      
      setShowCreateForm(false);
      fetchCertificates();
      
      // Show created certificates
      if (createdCertificates.length === 1) {
        setSelectedCertificate(createdCertificates[0]);
      }
    } catch (error: any) {
      setCreateError(error.message || 'Failed to create gift certificate');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleSendEmail = async (certificate: GiftCertificate) => {
    try {
      await fetchAPI(`/api/v2/payments/gift-certificates/${certificate.id}/send`, {
        method: 'POST',
      });
      alert('Gift certificate email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    }
  };

  const exportCertificates = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v2/payments/gift-certificates/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `gift_certificates_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting certificates:', error);
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    if (statusFilter !== 'all' && cert.status !== statusFilter) return false;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        cert.code.toLowerCase().includes(search) ||
        cert.purchaser_name.toLowerCase().includes(search) ||
        cert.purchaser_email.toLowerCase().includes(search) ||
        cert.recipient_name?.toLowerCase().includes(search) ||
        cert.recipient_email?.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'used': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'partially_used': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="h-6 w-6 text-purple-600" />
            Gift Certificates
          </h2>
          <p className="mt-1 text-gray-600">Create and manage gift certificates</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={exportCertificates}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Certificate
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by code, purchaser, or recipient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="partially_used">Partially Used</option>
            <option value="used">Fully Used</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Certificates List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount / Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchaser
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recipient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valid Until
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCertificates.map((certificate) => (
              <tr key={certificate.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {certificate.code}
                    </code>
                    <button
                      onClick={() => handleCopyCode(certificate.code)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {copiedCode === certificate.code ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">${certificate.amount.toFixed(2)}</div>
                    <div className="text-gray-500">Balance: ${certificate.balance.toFixed(2)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{certificate.purchaser_name}</div>
                    <div className="text-gray-500">{certificate.purchaser_email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{certificate.recipient_name || '-'}</div>
                    <div className="text-gray-500">{certificate.recipient_email || '-'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(parseISO(certificate.valid_until), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(certificate.status)}`}>
                    {certificate.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedCertificate(certificate)}
                      className="text-teal-600 hover:text-teal-900"
                    >
                      View
                    </button>
                    {certificate.status === 'active' && certificate.recipient_email && (
                      <button
                        onClick={() => handleSendEmail(certificate)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredCertificates.length === 0 && (
          <div className="text-center py-12">
            <Gift className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">No gift certificates found</p>
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create Gift Certificate</h3>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="space-y-4">
                {/* Amount and Quantity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Purchaser Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Purchaser Information</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Purchaser Name"
                      required
                      value={formData.purchaser_name}
                      onChange={(e) => setFormData({ ...formData, purchaser_name: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="Purchaser Email"
                      required
                      value={formData.purchaser_email}
                      onChange={(e) => setFormData({ ...formData, purchaser_email: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Recipient Info (Optional) */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recipient Information (Optional)</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Recipient Name"
                      value={formData.recipient_name}
                      onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="Recipient Email"
                      value={formData.recipient_email}
                      onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter a personal message for the recipient..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                {/* Validity Period */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Validity Period
                  </label>
                  <select
                    value={formData.validity_months}
                    onChange={(e) => setFormData({ ...formData, validity_months: e.target.value })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                    <option value="60">60 months</option>
                  </select>
                </div>
                
                {createError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                    {createError}
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : `Create ${formData.quantity} Certificate${parseInt(formData.quantity) > 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Certificate Details Modal */}
      {selectedCertificate && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Gift Certificate Details</h3>
              <button
                onClick={() => setSelectedCertificate(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 rounded-lg p-6 text-center">
                <Gift className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                <code className="text-2xl font-mono font-bold text-purple-800">{selectedCertificate.code}</code>
                <p className="mt-2 text-3xl font-bold text-gray-900">${selectedCertificate.amount.toFixed(2)}</p>
                <p className="text-gray-600">Balance: ${selectedCertificate.balance.toFixed(2)}</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Purchaser</p>
                  <p className="font-medium">{selectedCertificate.purchaser_name}</p>
                  <p className="text-sm text-gray-600">{selectedCertificate.purchaser_email}</p>
                </div>
                
                {selectedCertificate.recipient_name && (
                  <div>
                    <p className="text-sm text-gray-600">Recipient</p>
                    <p className="font-medium">{selectedCertificate.recipient_name}</p>
                    {selectedCertificate.recipient_email && (
                      <p className="text-sm text-gray-600">{selectedCertificate.recipient_email}</p>
                    )}
                  </div>
                )}
                
                {selectedCertificate.message && (
                  <div>
                    <p className="text-sm text-gray-600">Message</p>
                    <p className="text-gray-900">{selectedCertificate.message}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Valid From</p>
                    <p className="font-medium">{format(parseISO(selectedCertificate.valid_from), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valid Until</p>
                    <p className="font-medium">{format(parseISO(selectedCertificate.valid_until), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCertificate.status)}`}>
                    {selectedCertificate.status.replace('_', ' ')}
                  </span>
                </div>
                
                {selectedCertificate.used_at && (
                  <div>
                    <p className="text-sm text-gray-600">Used On</p>
                    <p className="font-medium">{format(parseISO(selectedCertificate.used_at), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleCopyCode(selectedCertificate.code)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Code
                </button>
                
                {selectedCertificate.status === 'active' && selectedCertificate.recipient_email && (
                  <button
                    onClick={() => handleSendEmail(selectedCertificate)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send Email
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}