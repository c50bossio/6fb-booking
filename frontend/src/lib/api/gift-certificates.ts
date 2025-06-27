import apiClient from './client';

export interface GiftCertificatePurchaseData {
  recipient_name: string;
  recipient_email: string;
  amount: number;
  payment_method_id: string;
  message?: string;
  sender_name?: string;
  sender_email?: string;
}

export interface GiftCertificateValidationData {
  code: string;
  amount_to_use?: number;
}

export interface GiftCertificateRedemptionData {
  code: string;
  appointment_id: number;
  amount_to_use: number;
}

export interface GiftCertificate {
  id: number;
  code: string;
  original_amount: number;
  remaining_balance: number;
  currency: string;
  sender_name: string;
  sender_email: string;
  recipient_name: string;
  recipient_email: string;
  message?: string;
  status: 'active' | 'partially_used' | 'fully_used' | 'expired' | 'cancelled';
  is_active: boolean;
  created_at: string;
  expiry_date: string;
  used_date?: string;
}

export const giftCertificatesApi = {
  // Purchase a gift certificate
  purchase: async (data: GiftCertificatePurchaseData) => {
    const response = await apiClient.post<GiftCertificate>('/gift-certificates/purchase', data);
    return response.data;
  },

  // Validate a gift certificate code
  validate: async (code: string, amountToUse?: number) => {
    const params = amountToUse ? { amount_to_use: amountToUse } : {};
    const response = await apiClient.get(`/gift-certificates/validate/${code}`, { params });
    return response.data;
  },

  // Redeem a gift certificate
  redeem: async (data: GiftCertificateRedemptionData) => {
    const response = await apiClient.post('/gift-certificates/redeem', data);
    return response.data;
  },

  // Get user's gift certificates
  getMyCertificates: async (includeSent = true, includeReceived = true, activeOnly = false) => {
    const response = await apiClient.get<GiftCertificate[]>('/gift-certificates/my-certificates', {
      params: {
        include_sent: includeSent,
        include_received: includeReceived,
        active_only: activeOnly
      }
    });
    return response.data;
  },

  // Admin endpoints
  admin: {
    // Get all gift certificates
    getAll: async (skip = 0, limit = 100, status?: string) => {
      const response = await apiClient.get('/gift-certificates/admin/all', {
        params: { skip, limit, status }
      });
      return response.data;
    },

    // Cancel a gift certificate
    cancel: async (certificateId: number, reason: string) => {
      const response = await apiClient.post(`/gift-certificates/admin/${certificateId}/cancel`, {
        reason
      });
      return response.data;
    },

    // Get statistics
    getStatistics: async () => {
      const response = await apiClient.get('/gift-certificates/admin/statistics');
      return response.data;
    }
  }
};
