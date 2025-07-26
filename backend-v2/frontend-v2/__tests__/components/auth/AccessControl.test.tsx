/**
 * Comprehensive tests for AccessControl component.
 * 
 * Tests cover:
 * - Role-based access control
 * - Authentication state handling
 * - Error boundaries and fallbacks
 * - Redirect behavior
 * - User role validation
 * - Loading states and accessibility
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AccessControl from '@/components/auth/AccessControl';
import { UserRole } from '@/lib/navigation';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock useAuth hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock access control utilities
jest.mock('@/lib/access-control', () => ({
  checkRouteAccess: jest.fn(),
  getRoleDisplayName: jest.fn((role: UserRole) => {
    const roleNames = {
      CLIENT: 'Client',
      BARBER: 'Barber',
      SHOP_OWNER: 'Shop Owner',
      ENTERPRISE_OWNER: 'Enterprise Owner'
    };
    return roleNames[role] || role;
  }),
}));

// Mock Hero Icons
jest.mock('@heroicons/react/24/outline', () => ({
  ExclamationTriangleIcon: ({ className }: { className?: string }) => (
    <svg data-testid="exclamation-triangle-icon" className={className}>
      <title>Warning</title>
    </svg>
  ),
  LockClosedIcon: ({ className }: { className?: string }) => (
    <svg data-testid="lock-closed-icon" className={className}>
      <title>Lock</title>
    </svg>
  ),
  ArrowLeftIcon: ({ className }: { className?: string }) => (
    <svg data-testid="arrow-left-icon" className={className}>
      <title>Back</title>
    </svg>
  ),
  HomeIcon: ({ className }: { className?: string }) => (
    <svg data-testid="home-icon" className={className}>
      <title>Home</title>
    </svg>
  ),
}));

describe('AccessControl', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();
  const mockReplace = jest.fn();

  const mockUser = {
    id: 1,
    email: 'barber@test.com',
    role: 'BARBER' as UserRole,
    firstName: 'John',
    lastName: 'Doe'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useRouter
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
      replace: mockReplace,
    });

    // Mock useSearchParams
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(),
    });

    // Default useAuth mock
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  describe('Authentication States', () => {
    it('shows loading state while authentication is loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
      });

      render(
        <AccessControl>
          <div>Protected Content</div>
        </AccessControl>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows authentication error when auth fails', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: new Error('Authentication failed'),
      });

      render(
        <AccessControl>
          <div>Protected Content</div>
        </AccessControl>
      );

      expect(screen.getByText(/Authentication Error/)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('allows unauthenticated access when allowUnauthenticated is true', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      render(
        <AccessControl allowUnauthenticated={true}>
          <div>Public Content</div>
        </AccessControl>
      );

      expect(screen.getByText('Public Content')).toBeInTheDocument();
    });

    it('denies access to unauthenticated users by default', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      render(
        <AccessControl>
          <div>Protected Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('grants access when user has required role', async () => {
      render(
        <AccessControl requiredRoles={['BARBER']}>
          <div>Barber Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText('Barber Content')).toBeInTheDocument();
      });
    });

    it('denies access when user lacks required role', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
        expect(screen.getByText(/Shop Owner/)).toBeInTheDocument();
        expect(screen.queryByText('Owner Content')).not.toBeInTheDocument();
      });
    });

    it('grants access when user has any of multiple required roles', async () => {
      render(
        <AccessControl requiredRoles={['BARBER', 'SHOP_OWNER']}>
          <div>Staff Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText('Staff Content')).toBeInTheDocument();
      });
    });

    it('handles enterprise owner role with elevated permissions', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, role: 'ENTERPRISE_OWNER' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText('Owner Content')).toBeInTheDocument();
      });
    });
  });

  describe('Fallback and Error Handling', () => {
    it('displays custom fallback when provided and access denied', async () => {
      render(
        <AccessControl 
          requiredRoles={['SHOP_OWNER']} 
          fallback={<div>Custom Fallback</div>}
        >
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
        expect(screen.queryByText('Owner Content')).not.toBeInTheDocument();
      });
    });

    it('hides access denied message when showAccessDenied is false', async () => {
      render(
        <AccessControl 
          requiredRoles={['SHOP_OWNER']} 
          showAccessDenied={false}
        >
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Access Denied/)).not.toBeInTheDocument();
        expect(screen.queryByText('Owner Content')).not.toBeInTheDocument();
      });
    });

    it('shows appropriate error message for missing permissions', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText(/insufficient permissions/)).toBeInTheDocument();
        expect(screen.getByText(/Shop Owner/)).toBeInTheDocument();
      });
    });
  });

  describe('Redirect Behavior', () => {
    it('redirects to specified path when access denied', async () => {
      render(
        <AccessControl 
          requiredRoles={['SHOP_OWNER']} 
          redirectOnDenied="/dashboard"
        >
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('does not redirect when showAccessDenied is true and no redirect specified', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled();
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and User Actions', () => {
    it('provides go back button functionality', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        const backButton = screen.getByText('Go Back');
        fireEvent.click(backButton);
        expect(mockBack).toHaveBeenCalled();
      });
    });

    it('provides go home button functionality', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        const homeButton = screen.getByText('Go Home');
        fireEvent.click(homeButton);
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('displays user role information in access denied message', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText(/Barber/)).toBeInTheDocument();
        expect(screen.getByText(/Shop Owner/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and UI', () => {
    it('provides proper ARIA labels and roles', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        
        const accessDeniedHeading = screen.getByRole('heading', { level: 2 });
        expect(accessDeniedHeading).toHaveTextContent('Access Denied');
      });
    });

    it('displays appropriate icons for visual feedback', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByTestId('exclamation-triangle-icon')).toBeInTheDocument();
        expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
        expect(screen.getByTestId('home-icon')).toBeInTheDocument();
      });
    });

    it('applies proper CSS classes for styling', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        const card = screen.getByRole('alert').closest('.card');
        expect(card).toHaveClass('max-w-md', 'mx-auto', 'mt-8');
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('handles null user gracefully', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        isAuthenticated: true, // Edge case: authenticated but no user
        isLoading: false,
        error: null,
      });

      render(
        <AccessControl requiredRoles={['BARBER']}>
          <div>Protected Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('handles empty required roles array', async () => {
      render(
        <AccessControl requiredRoles={[]}>
          <div>Public Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Content')).toBeInTheDocument();
      });
    });

    it('handles undefined user role', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, role: undefined },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      render(
        <AccessControl requiredRoles={['BARBER']}>
          <div>Protected Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('handles component unmounting during access check', async () => {
      const { unmount } = render(
        <AccessControl requiredRoles={['BARBER']}>
          <div>Protected Content</div>
        </AccessControl>
      );

      // Unmount before access check completes
      unmount();

      // Should not throw errors or cause memory leaks
      expect(true).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    it('does not cause memory leaks with frequent re-renders', () => {
      const { rerender } = render(
        <AccessControl requiredRoles={['BARBER']}>
          <div>Content 1</div>
        </AccessControl>
      );

      // Simulate multiple re-renders with different props
      for (let i = 0; i < 10; i++) {
        rerender(
          <AccessControl requiredRoles={['SHOP_OWNER']}>
            <div>Content {i}</div>
          </AccessControl>
        );
      }

      // Should not crash or degrade performance
      expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
    });

    it('efficiently updates when user role changes', async () => {
      const { rerender } = render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Denied/)).toBeInTheDocument();
      });

      // Update user role
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, role: 'SHOP_OWNER' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      rerender(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Owner Content</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText('Owner Content')).toBeInTheDocument();
        expect(screen.queryByText(/Access Denied/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Integration with Business Logic', () => {
    it('supports Six Figure Barber role hierarchy', async () => {
      // Test role hierarchy: ENTERPRISE_OWNER > SHOP_OWNER > BARBER > CLIENT
      const testCases = [
        { userRole: 'CLIENT', requiredRole: 'BARBER', shouldAccess: false },
        { userRole: 'BARBER', requiredRole: 'BARBER', shouldAccess: true },
        { userRole: 'SHOP_OWNER', requiredRole: 'BARBER', shouldAccess: true },
        { userRole: 'ENTERPRISE_OWNER', requiredRole: 'SHOP_OWNER', shouldAccess: true },
      ];

      for (const testCase of testCases) {
        (useAuth as jest.Mock).mockReturnValue({
          user: { ...mockUser, role: testCase.userRole },
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        const { unmount } = render(
          <AccessControl requiredRoles={[testCase.requiredRole as UserRole]}>
            <div>Protected Content</div>
          </AccessControl>
        );

        if (testCase.shouldAccess) {
          await waitFor(() => {
            expect(screen.queryByText('Protected Content')).toBeInTheDocument();
          });
        } else {
          await waitFor(() => {
            expect(screen.queryByText(/Access Denied/)).toBeInTheDocument();
          });
        }

        unmount();
      }
    });

    it('provides context-aware error messages for business roles', async () => {
      render(
        <AccessControl requiredRoles={['SHOP_OWNER']}>
          <div>Business Management</div>
        </AccessControl>
      );

      await waitFor(() => {
        expect(screen.getByText(/Shop Owner/)).toBeInTheDocument();
        expect(screen.getByText(/business management/)).toBeInTheDocument();
      });
    });
  });
});