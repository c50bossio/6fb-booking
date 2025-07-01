import { Page, APIRequestContext } from '@playwright/test';

/**
 * API interaction helpers for Playwright tests
 */

export interface APIResponse<T = any> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
}

export class APIHelpers {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(
    private page: Page,
    private apiContext?: APIRequestContext
  ) {
    this.baseURL = process.env.PLAYWRIGHT_API_URL || 'http://localhost:8000';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set authorization token for API requests
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Make authenticated API request
   */
  async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    let response;
    if (this.apiContext) {
      // Use Playwright's API context for better control
      response = await this.apiContext.request({
        method,
        url,
        headers: requestHeaders,
        data: data ? JSON.stringify(data) : undefined,
      });
    } else {
      // Fallback to page evaluate for browser context
      response = await this.page.evaluate(
        async ({ method, url, headers, body }) => {
          const res = await fetch(url, {
            method,
            headers,
            body,
          });
          
          const responseData = await res.text();
          let parsedData;
          try {
            parsedData = JSON.parse(responseData);
          } catch {
            parsedData = responseData;
          }

          return {
            status: res.status,
            statusText: res.statusText,
            data: parsedData,
            headers: Object.fromEntries(res.headers.entries()),
          };
        },
        {
          method,
          url,
          headers: requestHeaders,
          body: data ? JSON.stringify(data) : undefined,
        }
      );
    }

    return {
      status: response.status(),
      statusText: response.statusText(),
      data: await response.json().catch(() => await response.text()),
      headers: Object.fromEntries(Object.entries(response.headers())),
    };
  }

  /**
   * Authentication endpoints
   */
  async login(email: string, password: string): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/auth/login', {
      email,
      password,
    });
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: string;
  }): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/auth/register', userData);
  }

  async refreshToken(refreshToken: string): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });
  }

  async logout(): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/auth/logout');
  }

  /**
   * User management endpoints
   */
  async getCurrentUser(): Promise<APIResponse> {
    return this.makeRequest('GET', '/api/v1/users/me');
  }

  async updateProfile(userData: Record<string, any>): Promise<APIResponse> {
    return this.makeRequest('PUT', '/api/v1/users/me', userData);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/users/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  /**
   * Booking endpoints
   */
  async getAvailableSlots(date: string, serviceId?: string): Promise<APIResponse> {
    const params = new URLSearchParams({ date });
    if (serviceId) params.append('service_id', serviceId);
    
    return this.makeRequest('GET', `/api/v1/appointments/slots?${params}`);
  }

  async createBooking(bookingData: {
    service_id: string;
    barber_id: string;
    appointment_time: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    notes?: string;
  }): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/appointments', bookingData);
  }

  async getBookings(params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<APIResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return this.makeRequest('GET', `/api/v1/appointments?${queryParams}`);
  }

  async updateBooking(bookingId: string, updateData: Record<string, any>): Promise<APIResponse> {
    return this.makeRequest('PUT', `/api/v1/appointments/${bookingId}`, updateData);
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<APIResponse> {
    return this.makeRequest('POST', `/api/v1/appointments/${bookingId}/cancel`, {
      reason,
    });
  }

  /**
   * Payment endpoints
   */
  async createPaymentIntent(amount: number, bookingId: string): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/payments/create-intent', {
      amount,
      booking_id: bookingId,
    });
  }

  async confirmPayment(paymentIntentId: string): Promise<APIResponse> {
    return this.makeRequest('POST', `/api/v1/payments/${paymentIntentId}/confirm`);
  }

  async getPaymentHistory(): Promise<APIResponse> {
    return this.makeRequest('GET', '/api/v1/payments/history');
  }

  /**
   * Service endpoints
   */
  async getServices(): Promise<APIResponse> {
    return this.makeRequest('GET', '/api/v1/services');
  }

  async createService(serviceData: {
    name: string;
    description?: string;
    duration_minutes: number;
    price: number;
    category?: string;
  }): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/services', serviceData);
  }

  /**
   * Analytics endpoints
   */
  async getAnalytics(params?: {
    start_date?: string;
    end_date?: string;
    metric?: string;
  }): Promise<APIResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return this.makeRequest('GET', `/api/v1/analytics?${queryParams}`);
  }

  /**
   * Admin endpoints
   */
  async getUsers(params?: {
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<APIResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return this.makeRequest('GET', `/api/v1/admin/users?${queryParams}`);
  }

  async updateUserRole(userId: string, role: string): Promise<APIResponse> {
    return this.makeRequest('PUT', `/api/v1/admin/users/${userId}/role`, { role });
  }

  async deactivateUser(userId: string): Promise<APIResponse> {
    return this.makeRequest('POST', `/api/v1/admin/users/${userId}/deactivate`);
  }

  /**
   * Test data management
   */
  async createTestUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
  }): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/test/users', userData);
  }

  async createTestBooking(bookingData: Record<string, any>): Promise<APIResponse> {
    return this.makeRequest('POST', '/api/v1/test/bookings', bookingData);
  }

  async cleanupTestData(): Promise<APIResponse> {
    return this.makeRequest('DELETE', '/api/v1/test/cleanup');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<APIResponse> {
    return this.makeRequest('GET', '/health');
  }

  /**
   * Wait for API to be ready
   */
  async waitForAPIReady(maxAttempts = 30, delayMs = 1000): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.healthCheck();
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        console.log(`API health check attempt ${attempt}/${maxAttempts} failed:`, error);
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return false;
  }

  /**
   * Mock API responses for testing
   */
  async mockAPIResponse(
    urlPattern: string | RegExp,
    responseData: any,
    status = 200,
    delay = 0
  ): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData),
      });
    });
  }

  /**
   * Intercept and inspect API calls
   */
  async interceptAPICall(urlPattern: string | RegExp): Promise<any[]> {
    const interceptedCalls: any[] = [];
    
    await this.page.route(urlPattern, async (route) => {
      const request = route.request();
      interceptedCalls.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date().toISOString(),
      });
      
      // Continue with the original request
      await route.continue();
    });
    
    return interceptedCalls;
  }

  /**
   * Simulate network failures
   */
  async simulateNetworkFailure(urlPattern: string | RegExp, failureType: 'timeout' | 'error' | 'slow' = 'error'): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      switch (failureType) {
        case 'timeout':
          // Don't respond, let it timeout
          break;
        case 'error':
          await route.abort('failed');
          break;
        case 'slow':
          await new Promise(resolve => setTimeout(resolve, 5000));
          await route.continue();
          break;
      }
    });
  }
}