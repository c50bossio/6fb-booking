/**
 * Dashboard API services for role-specific data fetching
 * 
 * This module provides API functions for fetching dashboard data
 * scoped appropriately for each user role type.
 */

import { getUserUnifiedRole, getDashboardType, type UnifiedUserRole, type UserWithRole } from '@/lib/roleUtils'
import { getAccessToken } from '../tokenManager'

// Base API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Generic API request function with error handling
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken()
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Error ${response.status}: ${errorText}`)
  }

  return response.json()
}

// Client Portal Data Types
export interface ClientPortalData {
  upcomingAppointments: Array<{
    id: number
    service_name: string
    start_time: string
    end_time: string
    barber_name: string
    barbershop_name: string
    status: 'scheduled' | 'completed' | 'cancelled'
    can_reschedule: boolean
    can_cancel: boolean
  }>
  recentAppointments: Array<{
    id: number
    service_name: string
    start_time: string
    end_time: string
    barber_name: string
    barbershop_name: string
    status: 'scheduled' | 'completed' | 'cancelled'
    can_reschedule: boolean
    can_cancel: boolean
  }>
  savedPaymentMethods: number
  profileComplete: boolean
  loyaltyPoints?: number
}

// Individual Barber Data Types
export interface IndividualBarberData {
  businessMetrics: {
    monthlyRevenue: number
    monthlyGoal: number
    totalClients: number
    newClientsThisMonth: number
    retentionRate: number
    averageTicket: number
    appointmentsThisMonth: number
    utilizationRate: number
  }
  todaySchedule: {
    totalAppointments: number
    completedAppointments: number
    revenue: number
    nextAppointment?: {
      id: number
      clientName: string
      serviceName: string
      startTime: string
      duration: number
    }
  }
  goals: Array<{
    id: string
    title: string
    target: number
    current: number
    unit: string
    deadline: string
    category: 'revenue' | 'clients' | 'appointments'
  }>
  recentClients: Array<{
    id: number
    name: string
    lastVisit: string
    totalSpent: number
    visits: number
  }>
}

// Shop Owner Data Types
export interface ShopOwnerData {
  shopMetrics: {
    monthlyRevenue: number
    monthlyGoal: number
    dailyRevenue: number
    totalStaff: number
    activeBarbers: number
    totalClients: number
    newClientsThisMonth: number
    appointmentsToday: number
    utilizationRate: number
    customerSatisfaction: number
  }
  staffMembers: Array<{
    id: number
    name: string
    role: string
    todayAppointments: number
    todayRevenue: number
    utilizationRate: number
    rating: number
    status: 'active' | 'off' | 'break'
  }>
  recentBookings: Array<{
    id: number
    clientName: string
    barberName: string
    serviceName: string
    startTime: string
    revenue: number
    status: 'scheduled' | 'completed' | 'cancelled'
  }>
  topServices: Array<{
    name: string
    bookings: number
    revenue: number
  }>
}

// Enterprise Data Types  
export interface EnterpriseData {
  enterpriseMetrics: {
    totalRevenue: number
    monthlyGrowth: number
    totalLocations: number
    activeLocations: number
    totalStaff: number
    totalClients: number
    averageLocationRevenue: number
    enterpriseUtilization: number
    brandConsistencyScore: number
  }
  locationPerformance: Array<{
    id: number
    name: string
    address: string
    monthlyRevenue: number
    dailyRevenue: number
    staffCount: number
    clientCount: number
    utilizationRate: number
    customerRating: number
    status: 'active' | 'inactive' | 'maintenance'
    manager: string
  }>
  crossLocationMetrics: Array<{
    metric: string
    topLocation: { name: string; value: number }
    bottomLocation: { name: string; value: number }
    average: number
  }>
  expansionOpportunities: Array<{
    id: string
    area: string
    marketSize: number
    estimatedRevenue: number
    competitionLevel: 'low' | 'medium' | 'high'
    investmentRequired: number
  }>
  topPerformers: Array<{
    type: 'location' | 'manager' | 'service'
    name: string
    metric: string
    value: number
  }>
}

// Admin Data Types
export interface AdminData {
  platformMetrics: {
    totalUsers: number
    activeOrganizations: number
    monthlyRevenue: number
    systemHealth: number
    supportTickets: number
  }
  systemStats: {
    uptime: number
    responseTime: number
    errorRate: number
    activeConnections: number
  }
  recentActivity: Array<{
    id: string
    type: 'user_signup' | 'organization_created' | 'payment_processed' | 'error_occurred'
    description: string
    timestamp: string
    userId?: number
    organizationId?: number
  }>
}

/**
 * Get dashboard data for a specific user based on their role
 */
export async function getDashboardData(user: UserWithRole): Promise<ClientPortalData | IndividualBarberData | ShopOwnerData | EnterpriseData | AdminData> {
  const dashboardType = getDashboardType(user)
  
  switch (dashboardType) {
    case 'client-portal':
      return getClientPortalData(user.id)
    
    case 'individual-barber':
      return getIndividualBarberData(user.id)
    
    case 'shop-owner':
      return getShopOwnerData(user.id, user.organization_id || user.primary_organization_id)
    
    case 'enterprise':
      return getEnterpriseData(user.id)
    
    case 'admin':
      return getAdminData()
    
    default:
      throw new Error(`Unknown dashboard type: ${dashboardType}`)
  }
}

/**
 * Client Portal API - Simple appointment management data
 */
export async function getClientPortalData(userId: number): Promise<ClientPortalData> {
  try {
    // This will be the actual API call when backend endpoints are implemented
    const data = await apiRequest<ClientPortalData>(`/api/v1/dashboard/client/${userId}`)
    return data
  } catch (error) {
    console.error('Error fetching client portal data:', error)
    
    // Return mock data for development
    return {
      upcomingAppointments: [
        {
          id: 1,
          service_name: "Haircut & Beard Trim",
          start_time: "2025-07-18T10:00:00Z",
          end_time: "2025-07-18T10:45:00Z",
          barber_name: "Mike Johnson",
          barbershop_name: "Elite Cuts Downtown",
          status: "scheduled",
          can_reschedule: true,
          can_cancel: true
        }
      ],
      recentAppointments: [
        {
          id: 2,
          service_name: "Classic Haircut",
          start_time: "2025-07-10T16:00:00Z",
          end_time: "2025-07-10T16:30:00Z",
          barber_name: "Sarah Davis",
          barbershop_name: "Elite Cuts Downtown",
          status: "completed",
          can_reschedule: false,
          can_cancel: false
        }
      ],
      savedPaymentMethods: 1,
      profileComplete: true,
      loyaltyPoints: 150
    }
  }
}

/**
 * Individual Barber API - Solo business management data
 */
export async function getIndividualBarberData(userId: number): Promise<IndividualBarberData> {
  try {
    const data = await apiRequest<IndividualBarberData>(`/api/v1/dashboard/barber/${userId}`)
    return data
  } catch (error) {
    console.error('Error fetching individual barber data:', error)
    
    // Mock data for development
    return {
      businessMetrics: {
        monthlyRevenue: 8750,
        monthlyGoal: 10000,
        totalClients: 125,
        newClientsThisMonth: 12,
        retentionRate: 78,
        averageTicket: 45,
        appointmentsThisMonth: 194,
        utilizationRate: 87
      },
      todaySchedule: {
        totalAppointments: 8,
        completedAppointments: 5,
        revenue: 360,
        nextAppointment: {
          id: 1,
          clientName: "John Davis",
          serviceName: "Haircut & Beard Trim", 
          startTime: "2025-07-15T15:30:00Z",
          duration: 45
        }
      },
      goals: [
        {
          id: "1",
          title: "Monthly Revenue Goal",
          target: 10000,
          current: 8750,
          unit: "$",
          deadline: "2025-07-31",
          category: "revenue"
        }
      ],
      recentClients: [
        {
          id: 1,
          name: "Michael Brown",
          lastVisit: "2025-07-14T10:00:00Z",
          totalSpent: 450,
          visits: 10
        }
      ]
    }
  }
}

/**
 * Shop Owner API - Single location management data
 */
export async function getShopOwnerData(userId: number, organizationId?: number): Promise<ShopOwnerData> {
  try {
    const endpoint = organizationId 
      ? `/api/v1/dashboard/shop/${organizationId}` 
      : `/api/v1/dashboard/shop/user/${userId}`
    
    const data = await apiRequest<ShopOwnerData>(endpoint)
    return data
  } catch (error) {
    console.error('Error fetching shop owner data:', error)
    
    // Mock data for development
    return {
      shopMetrics: {
        monthlyRevenue: 28500,
        monthlyGoal: 35000,
        dailyRevenue: 1450,
        totalStaff: 6,
        activeBarbers: 4,
        totalClients: 324,
        newClientsThisMonth: 28,
        appointmentsToday: 22,
        utilizationRate: 84,
        customerSatisfaction: 4.7
      },
      staffMembers: [
        {
          id: 1,
          name: "Mike Johnson",
          role: "Senior Barber",
          todayAppointments: 8,
          todayRevenue: 420,
          utilizationRate: 95,
          rating: 4.9,
          status: "active"
        }
      ],
      recentBookings: [
        {
          id: 1,
          clientName: "John Smith",
          barberName: "Mike Johnson",
          serviceName: "Premium Haircut",
          startTime: "2025-07-15T14:30:00Z",
          revenue: 65,
          status: "completed"
        }
      ],
      topServices: [
        { name: "Classic Haircut", bookings: 145, revenue: 5800 },
        { name: "Haircut & Beard", bookings: 89, revenue: 4895 }
      ]
    }
  }
}

/**
 * Enterprise API - Multi-location business data
 */
export async function getEnterpriseData(userId: number): Promise<EnterpriseData> {
  try {
    const data = await apiRequest<EnterpriseData>(`/api/v1/dashboard/enterprise/${userId}`)
    return data
  } catch (error) {
    console.error('Error fetching enterprise data:', error)
    
    // Mock data for development
    return {
      enterpriseMetrics: {
        totalRevenue: 142500,
        monthlyGrowth: 8.5,
        totalLocations: 5,
        activeLocations: 5,
        totalStaff: 28,
        totalClients: 1250,
        averageLocationRevenue: 28500,
        enterpriseUtilization: 79,
        brandConsistencyScore: 87
      },
      locationPerformance: [
        {
          id: 1,
          name: "Downtown Location",
          address: "123 Main St, Downtown",
          monthlyRevenue: 35200,
          dailyRevenue: 1640,
          staffCount: 7,
          clientCount: 310,
          utilizationRate: 89,
          customerRating: 4.8,
          status: "active",
          manager: "Sarah Johnson"
        }
      ],
      crossLocationMetrics: [
        {
          metric: "Customer Satisfaction",
          topLocation: { name: "Downtown Location", value: 4.8 },
          bottomLocation: { name: "Airport Terminal", value: 4.2 },
          average: 4.5
        }
      ],
      expansionOpportunities: [
        {
          id: "1",
          area: "Eastside District",
          marketSize: 45000,
          estimatedRevenue: 28000,
          competitionLevel: "medium",
          investmentRequired: 85000
        }
      ],
      topPerformers: [
        {
          type: "location",
          name: "Downtown Location",
          metric: "Monthly Revenue",
          value: 35200
        }
      ]
    }
  }
}

/**
 * Admin API - Platform management data
 */
export async function getAdminData(): Promise<AdminData> {
  try {
    const data = await apiRequest<AdminData>('/api/v1/dashboard/admin')
    return data
  } catch (error) {
    console.error('Error fetching admin data:', error)
    
    // Mock data for development
    return {
      platformMetrics: {
        totalUsers: 2450,
        activeOrganizations: 145,
        monthlyRevenue: 89000,
        systemHealth: 98,
        supportTickets: 12
      },
      systemStats: {
        uptime: 99.9,
        responseTime: 125,
        errorRate: 0.02,
        activeConnections: 1250
      },
      recentActivity: [
        {
          id: "1",
          type: "user_signup",
          description: "New user registration: john@example.com",
          timestamp: "2025-07-15T14:30:00Z",
          userId: 1234
        }
      ]
    }
  }
}

/**
 * Update dashboard preferences for a user
 */
export async function updateDashboardPreferences(
  userId: number,
  preferences: {
    defaultView?: string
    refreshInterval?: number
    showMetrics?: string[]
    chartType?: string
  }
): Promise<void> {
  await apiRequest(`/api/v1/dashboard/preferences/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(preferences)
  })
}

/**
 * Get dashboard configuration for a specific role
 */
export async function getDashboardConfig(role: UnifiedUserRole): Promise<{
  availableWidgets: string[]
  defaultLayout: string
  refreshInterval: number
  features: string[]
}> {
  try {
    const data = await apiRequest(`/api/v1/dashboard/config/${role}`)
    return data as {
      availableWidgets: string[]
      defaultLayout: string
      refreshInterval: number
      features: string[]
    }
  } catch (error) {
    console.error('Error fetching dashboard config:', error)
    
    // Return default config based on role
    const defaultConfigs = {
      client: {
        availableWidgets: ['upcoming-appointments', 'recent-history', 'profile-status'],
        defaultLayout: 'single-column',
        refreshInterval: 300000, // 5 minutes
        features: ['booking', 'rescheduling', 'profile-management']
      },
      individual_barber: {
        availableWidgets: ['revenue-metrics', 'schedule', 'goals', 'client-list'],
        defaultLayout: 'grid',
        refreshInterval: 60000, // 1 minute
        features: ['analytics', 'goal-tracking', 'client-management']
      },
      shop_owner: {
        availableWidgets: ['shop-metrics', 'staff-performance', 'bookings', 'services'],
        defaultLayout: 'dashboard',
        refreshInterval: 60000,
        features: ['staff-management', 'analytics', 'marketing', 'financial-reports']
      },
      enterprise_owner: {
        availableWidgets: ['enterprise-metrics', 'location-performance', 'cross-metrics', 'expansion'],
        defaultLayout: 'executive',
        refreshInterval: 300000,
        features: ['multi-location-analytics', 'expansion-planning', 'brand-management']
      }
    }
    
    return defaultConfigs[role as keyof typeof defaultConfigs] || defaultConfigs.client
  }
}

/**
 * Export dashboard data for reporting
 */
export async function exportDashboardData(
  userId: number,
  dateRange: { start: string; end: string },
  format: 'csv' | 'pdf' | 'excel' = 'csv'
): Promise<Blob> {
  const response = await fetch(`${API_URL}/api/v1/dashboard/export/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ dateRange, format })
  })
  
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`)
  }
  
  return response.blob()
}