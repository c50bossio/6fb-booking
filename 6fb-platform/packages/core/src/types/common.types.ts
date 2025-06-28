// Common types used across the platform

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD';

export interface Money {
  amount: number;
  currency: Currency;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: Address;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface BusinessHours {
  dayOfWeek: number; // 0-6, Sunday-Saturday
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
  isOpen: boolean;
}