/**
 * Email Campaign Management API Client
 */
import apiClient from './client'

// TypeScript interfaces for Email Campaign API
export interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content?: string
  campaign_type: string
  personalization_fields: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailCampaign {
  id: string
  name: string
  description?: string
  campaign_type: string
  template_id: string
  status: string
  target_audience: Record<string, any>
  scheduling: Record<string, any>
  automation_triggers: Array<Record<string, any>>
  personalization_rules: Record<string, any>
  analytics_tracking: Record<string, any>
  send_count: number
  open_rate: number
  click_rate: number
  created_at: string
  updated_at: string
}

export interface EmailPreferences {
  client_id: number
  email_address: string
  is_subscribed: boolean
  frequency_preference: string
  campaign_preferences: Record<string, boolean>
  timezone: string
  last_updated: string
}

export interface CampaignAnalytics {
  campaign_id: string
  send_count: number
  delivered_count: number
  open_count: number
  click_count: number
  bounce_count: number
  unsubscribe_count: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  unsubscribe_rate: number
  engagement_score: number
  performance_trend: string
  top_performing_content: string[]
  demographics: Record<string, any>
  time_series_data: Array<{
    date: string
    opens: number
    clicks: number
    conversions: number
  }>
}

export interface OverallAnalytics {
  total_campaigns: number
  total_sends: number
  overall_open_rate: number
  overall_click_rate: number
  top_performing_campaigns: Array<{
    id: string
    name: string
    open_rate: number
    click_rate: number
  }>
  recent_performance: Array<{
    date: string
    sends: number
    opens: number
    clicks: number
  }>
}

// Template Management
export const templateAPI = {
  async createTemplate(templateData: Omit<EmailTemplate, 'created_at' | 'updated_at'>) {
    const response = await apiClient.post('/email-campaigns/templates', templateData)
    return response.data
  },

  async getTemplates(campaignType?: string): Promise<{ success: boolean; templates: EmailTemplate[] }> {
    const params = campaignType ? { campaign_type: campaignType } : {}
    const response = await apiClient.get('/email-campaigns/templates', { params })
    return response.data
  },

  async getTemplate(templateId: string): Promise<{ success: boolean; template: EmailTemplate }> {
    const response = await apiClient.get(`/email-campaigns/templates/${templateId}`)
    return response.data
  },

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>) {
    const response = await apiClient.put(`/email-campaigns/templates/${templateId}`, updates)
    return response.data
  },

  async deleteTemplate(templateId: string) {
    const response = await apiClient.delete(`/email-campaigns/templates/${templateId}`)
    return response.data
  }
}

// Campaign Management
export const campaignAPI = {
  async createCampaign(campaignData: Omit<EmailCampaign, 'created_at' | 'updated_at' | 'send_count' | 'open_rate' | 'click_rate'>) {
    const response = await apiClient.post('/email-campaigns/campaigns', campaignData)
    return response.data
  },

  async getCampaigns(campaignType?: string, status?: string): Promise<{ success: boolean; campaigns: EmailCampaign[] }> {
    const params: Record<string, string> = {}
    if (campaignType) params.campaign_type = campaignType
    if (status) params.status = status

    const response = await apiClient.get('/email-campaigns/campaigns', { params })
    return response.data
  },

  async getCampaign(campaignId: string): Promise<{ success: boolean; campaign: EmailCampaign }> {
    const response = await apiClient.get(`/email-campaigns/campaigns/${campaignId}`)
    return response.data
  },

  async updateCampaign(campaignId: string, updates: Partial<EmailCampaign>) {
    const response = await apiClient.put(`/email-campaigns/campaigns/${campaignId}`, updates)
    return response.data
  },

  async activateCampaign(campaignId: string) {
    const response = await apiClient.post(`/email-campaigns/campaigns/${campaignId}/activate`)
    return response.data
  },

  async pauseCampaign(campaignId: string) {
    const response = await apiClient.post(`/email-campaigns/campaigns/${campaignId}/pause`)
    return response.data
  }
}

// Email Sending
export const emailAPI = {
  async sendTestEmail(templateId: string, testEmail: string, testData?: Record<string, any>) {
    const response = await apiClient.post('/email-campaigns/send-test', {
      template_id: templateId,
      test_email: testEmail,
      test_data: testData
    })
    return response.data
  },

  async sendTestEmailWithConfig(
    templateId: string,
    testEmail: string,
    configName?: string,
    customOfferDetails?: string,
    customPromoCode?: string,
    customOfferExpiry?: string
  ) {
    const response = await apiClient.post('/email-campaigns/send-test-with-config', {
      template_id: templateId,
      test_email: testEmail,
      config_name: configName,
      custom_offer_details: customOfferDetails,
      custom_promo_code: customPromoCode,
      custom_offer_expiry: customOfferExpiry
    })
    return response.data
  },

  async sendBulkEmails(
    templateId: string,
    recipientEmails: string[],
    personalizationData?: Record<string, any>,
    campaignId?: string
  ) {
    const response = await apiClient.post('/email-campaigns/send-bulk', {
      template_id: templateId,
      recipient_emails: recipientEmails,
      personalization_data: personalizationData,
      campaign_id: campaignId
    })
    return response.data
  }
}

// Analytics
export const analyticsAPI = {
  async getCampaignAnalytics(campaignId: string): Promise<{ success: boolean; analytics: CampaignAnalytics }> {
    const response = await apiClient.get(`/email-campaigns/campaigns/${campaignId}/analytics`)
    return response.data
  },

  async getOverallAnalytics(): Promise<{ success: boolean; analytics: OverallAnalytics }> {
    const response = await apiClient.get('/email-campaigns/analytics/overview')
    return response.data
  }
}

// Email Preferences
export const preferencesAPI = {
  async updateEmailPreferences(clientId: number, preferences: Partial<EmailPreferences>) {
    const response = await apiClient.put(`/email-campaigns/preferences/${clientId}`, preferences)
    return response.data
  },

  async getEmailPreferences(clientId: number): Promise<{ success: boolean; preferences: EmailPreferences }> {
    const response = await apiClient.get(`/email-campaigns/preferences/${clientId}`)
    return response.data
  },

  async unsubscribeClient(token: string) {
    const response = await apiClient.post(`/email-campaigns/unsubscribe/${token}`)
    return response.data
  }
}

// Automation Triggers
export const automationAPI = {
  async triggerWelcomeSeries(clientId: number) {
    const response = await apiClient.post(`/email-campaigns/triggers/welcome/${clientId}`)
    return response.data
  },

  async triggerReengagement(clientId: number) {
    const response = await apiClient.post(`/email-campaigns/triggers/reengagement/${clientId}`)
    return response.data
  },

  async triggerPostAppointmentEmails(appointmentId: number) {
    const response = await apiClient.post(`/email-campaigns/triggers/post-appointment/${appointmentId}`)
    return response.data
  },

  async triggerBirthdayCheck() {
    const response = await apiClient.post('/email-campaigns/triggers/birthday-check')
    return response.data
  },

  async triggerSeasonalPromotion() {
    const response = await apiClient.post('/email-campaigns/triggers/seasonal-promotion')
    return response.data
  }
}

// Health Check
export const healthAPI = {
  async checkEmailCampaignsHealth() {
    const response = await apiClient.get('/email-campaigns/health')
    return response.data
  }
}

// Campaign Types and Statuses Constants
export const CAMPAIGN_TYPES = {
  WELCOME: 'welcome',
  PROMOTIONAL: 'promotional',
  REENGAGEMENT: 'reengagement',
  POST_APPOINTMENT: 'post_appointment',
  BIRTHDAY: 'birthday',
  SEASONAL: 'seasonal',
  NEWSLETTER: 'newsletter',
  ABANDONED_BOOKING: 'abandoned_booking'
} as const

export const CAMPAIGN_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const

export const EMAIL_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICKED: 'clicked',
  BOUNCED: 'bounced',
  UNSUBSCRIBED: 'unsubscribed',
  FAILED: 'failed'
} as const

export type CampaignType = typeof CAMPAIGN_TYPES[keyof typeof CAMPAIGN_TYPES]
export type CampaignStatus = typeof CAMPAIGN_STATUSES[keyof typeof CAMPAIGN_STATUSES]
export type EmailStatus = typeof EMAIL_STATUSES[keyof typeof EMAIL_STATUSES]
