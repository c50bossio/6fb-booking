import { BaseEntity, ContactInfo } from './common.types';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  SHOP_OWNER = 'shop_owner',
  BARBER = 'barber',
  CLIENT = 'client',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  contactInfo?: ContactInfo;
  profileImage?: string;
  lastLoginAt?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: {
    appointments: boolean;
    marketing: boolean;
    reminders: boolean;
  };
  sms: {
    appointments: boolean;
    reminders: boolean;
  };
  push: {
    enabled: boolean;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}
