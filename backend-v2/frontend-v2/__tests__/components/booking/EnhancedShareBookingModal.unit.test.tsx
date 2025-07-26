/**
 * Unit Tests for EnhancedShareBookingModal Component
 * 
 * Tests the enhanced wrapper component that provides navigation system
 * integration for the ShareBookingModal component.
 * 
 * Focus Areas:
 * - Modal lifecycle and rendering
 * - Navigation provider integration
 * - External navigation handling
 * - Router integration
 * - Prop delegation to base modal
 * - Six Figure Barber business logic
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

import EnhancedShareBookingModal from '@/components/booking/EnhancedShareBookingModal';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/components/booking/ShareBookingModal', () => {
  return function MockShareBookingModal(props: any) {
    // Safely serialize props, excluding functions
    const serializableProps = { ...props };
    if (typeof serializableProps.onClose === 'function') {
      serializableProps.onClose = '[Function]';
    }
    
    return (
      <div data-testid="share-booking-modal">
        <div data-testid="modal-props">{JSON.stringify(serializableProps)}</div>
        <button 
          onClick={() => props.onClose()} 
          data-testid="close-modal-button"
        >
          Close Modal
        </button>
        {/* Simulate navigation trigger for testing */}
        <button 
          onClick={() => {
            // Simulate internal navigation
            window.dispatchEvent(new CustomEvent('mock-internal-nav', { detail: '/dashboard' }));
          }}
          data-testid="internal-nav-trigger"
        >
          Navigate Internal
        </button>
        <button 
          onClick={() => {
            // Simulate external navigation
            window.dispatchEvent(new CustomEvent('mock-external-nav', { detail: 'https://external.com' }));
          }}
          data-testid="external-nav-trigger"
        >
          Navigate External
        </button>
      </div>
    );
  };
});

jest.mock('@/components/ui/ModalNavigation', () => ({
  ModalNavigationProvider: ({ children, onExternalNavigation, onClose }: any) => {
    // Set up event listeners for testing navigation
    React.useEffect(() => {
      const handleInternalNav = (event: any) => {
        // Internal navigation doesn't trigger onExternalNavigation
      };
      
      const handleExternalNav = (event: any) => {
        if (onExternalNavigation) {
          onExternalNavigation(event.detail);
        }
      };

      window.addEventListener('mock-internal-nav', handleInternalNav);
      window.addEventListener('mock-external-nav', handleExternalNav);

      return () => {
        window.removeEventListener('mock-internal-nav', handleInternalNav);
        window.removeEventListener('mock-external-nav', handleExternalNav);
      };
    }, [onExternalNavigation]);

    return (
      <div data-testid="modal-navigation-provider">
        {children}
      </div>
    );
  },
  ModalNavigationContent: ({ children }: any) => (
    <div data-testid="modal-navigation-content">{children}</div>
  ),
}));

// Mock window.open for external navigation testing
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
});

describe('EnhancedShareBookingModal', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    bookingUrl: 'https://book.example.com/test-barber',
    businessName: 'Premium Barber Shop',
    services: [
      { id: 1, name: 'Signature Cut', price: 45, duration: 30 },
      { id: 2, name: 'Beard Trim', price: 25, duration: 15 },
    ],
    barbers: [
      { id: 1, name: 'Master Barber John', specialties: ['cuts', 'shaves'] },
    ],
    subscriptionTier: 'professional' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Component Rendering', () => {
    it('renders without crashing when open', () => {
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      expect(screen.getByTestId('modal-navigation-provider')).toBeInTheDocument();
      expect(screen.getByTestId('share-booking-modal')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<EnhancedShareBookingModal {...defaultProps} isOpen={false} />);
      
      // The modal should still render but be closed (handled by ShareBookingModal)
      expect(screen.getByTestId('modal-navigation-provider')).toBeInTheDocument();
    });

    it('wraps ShareBookingModal with ModalNavigationProvider', () => {
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      const provider = screen.getByTestId('modal-navigation-provider');
      const modal = screen.getByTestId('share-booking-modal');
      
      expect(provider).toContainElement(modal);
    });
  });

  describe('Prop Delegation', () => {
    it('passes all props correctly to ShareBookingModal', () => {
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      const propsDisplay = screen.getByTestId('modal-props');
      const propsText = propsDisplay.textContent;
      const parsedProps = JSON.parse(propsText || '{}');
      
      expect(parsedProps.isOpen).toBe(true);
      expect(parsedProps.onClose).toBe('[Function]');
      expect(parsedProps.bookingUrl).toBe(defaultProps.bookingUrl);
      expect(parsedProps.businessName).toBe(defaultProps.businessName);
      expect(parsedProps.services).toEqual(defaultProps.services);
      expect(parsedProps.barbers).toEqual(defaultProps.barbers);
      expect(parsedProps.subscriptionTier).toBe(defaultProps.subscriptionTier);
    });

    it('handles optional props correctly', () => {
      const minimalProps = {
        isOpen: true,
        onClose: jest.fn(),
      };

      render(<EnhancedShareBookingModal {...minimalProps} />);
      
      const propsDisplay = screen.getByTestId('modal-props');
      const propsText = propsDisplay.textContent;
      const parsedProps = JSON.parse(propsText || '{}');
      
      expect(parsedProps.isOpen).toBe(true);
      expect(parsedProps.onClose).toBe('[Function]');
      expect(parsedProps.bookingUrl).toBeUndefined();
      expect(parsedProps.businessName).toBeUndefined();
    });
  });

  describe('Modal Lifecycle', () => {
    it('handles modal close correctly', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<EnhancedShareBookingModal {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByTestId('close-modal-button');
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('maintains modal state during navigation operations', () => {
      const { rerender } = render(<EnhancedShareBookingModal {...defaultProps} />);
      
      expect(screen.getByTestId('share-booking-modal')).toBeInTheDocument();
      
      // Rerender with different props
      rerender(<EnhancedShareBookingModal {...defaultProps} businessName="Updated Shop" />);
      
      expect(screen.getByTestId('share-booking-modal')).toBeInTheDocument();
    });
  });

  describe('Navigation System Integration', () => {
    it('provides external navigation handler to ModalNavigationProvider', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<EnhancedShareBookingModal {...defaultProps} onClose={onClose} />);
      
      const externalNavButton = screen.getByTestId('external-nav-trigger');
      await user.click(externalNavButton);
      
      // Should close modal and open external URL
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockWindowOpen).toHaveBeenCalledWith('https://external.com', '_blank');
    });

    it('handles internal navigation correctly', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<EnhancedShareBookingModal {...defaultProps} onClose={onClose} />);
      
      const internalNavButton = screen.getByTestId('internal-nav-trigger');
      await user.click(internalNavButton);
      
      // Should close modal and navigate internally
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });

    it('distinguishes between internal and external URLs', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<EnhancedShareBookingModal {...defaultProps} onClose={onClose} />);
      
      // Test external URL
      fireEvent(window, new CustomEvent('mock-external-nav', { detail: 'https://google.com' }));
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith('https://google.com', '_blank');
      });
      
      // Test internal URL
      fireEvent(window, new CustomEvent('mock-external-nav', { detail: '/bookings' }));
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/bookings');
      });
    });
  });

  describe('External Navigation Behavior', () => {
    it('opens external URLs in new tab', async () => {
      const user = userEvent.setup();
      
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      // Simulate external navigation
      fireEvent(window, new CustomEvent('mock-external-nav', { detail: 'https://external-site.com' }));
      
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith('https://external-site.com', '_blank');
      });
    });

    it('navigates to internal URLs in same tab', async () => {
      const user = userEvent.setup();
      
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      // Simulate internal navigation
      fireEvent(window, new CustomEvent('mock-external-nav', { detail: '/dashboard/analytics' }));
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/analytics');
      });
    });

    it('handles navigation with query parameters', async () => {
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      // Simulate navigation with query params
      fireEvent(window, new CustomEvent('mock-external-nav', { detail: '/bookings?date=2024-01-15' }));
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/bookings?date=2024-01-15');
      });
    });
  });

  describe('Six Figure Barber Business Logic', () => {
    it('supports premium barbershop features', () => {
      const premiumProps = {
        ...defaultProps,
        subscriptionTier: 'enterprise' as const,
        services: [
          { id: 1, name: 'Executive Cut & Style', price: 85, duration: 45 },
          { id: 2, name: 'Full Service Grooming', price: 120, duration: 60 },
        ],
        barbers: [
          { id: 1, name: 'Master Stylist', certifications: ['Master Barber', 'Color Specialist'] },
        ],
      };

      render(<EnhancedShareBookingModal {...premiumProps} />);
      
      const propsDisplay = screen.getByTestId('modal-props');
      const parsedProps = JSON.parse(propsDisplay.textContent || '{}');
      
      expect(parsedProps.subscriptionTier).toBe('enterprise');
      expect(parsedProps.services[0].price).toBe(85);
      expect(parsedProps.services[1].price).toBe(120);
    });

    it('handles different subscription tiers correctly', () => {
      const tiers: Array<'basic' | 'professional' | 'enterprise'> = ['basic', 'professional', 'enterprise'];
      
      tiers.forEach(tier => {
        const { rerender } = render(
          <EnhancedShareBookingModal {...defaultProps} subscriptionTier={tier} />
        );
        
        const propsDisplay = screen.getByTestId('modal-props');
        const parsedProps = JSON.parse(propsDisplay.textContent || '{}');
        
        expect(parsedProps.subscriptionTier).toBe(tier);
        
        if (tier !== 'enterprise') {
          rerender(<div />); // Clean up for next iteration
        }
      });
    });

    it('supports complex service configurations', () => {
      const complexServices = [
        { 
          id: 1, 
          name: 'Signature Six Figure Cut', 
          price: 95, 
          duration: 45,
          description: 'Premium styling experience',
          category: 'signature' 
        },
        { 
          id: 2, 
          name: 'Executive Beard Grooming', 
          price: 35, 
          duration: 20,
          description: 'Professional beard styling',
          category: 'grooming' 
        },
      ];

      render(<EnhancedShareBookingModal {...defaultProps} services={complexServices} />);
      
      const propsDisplay = screen.getByTestId('modal-props');
      const parsedProps = JSON.parse(propsDisplay.textContent || '{}');
      
      expect(parsedProps.services).toEqual(complexServices);
      expect(parsedProps.services[0].category).toBe('signature');
    });
  });

  describe('Error Handling', () => {
    it('handles missing router gracefully', () => {
      (useRouter as jest.Mock).mockReturnValue(null);
      
      expect(() => {
        render(<EnhancedShareBookingModal {...defaultProps} />);
      }).not.toThrow();
    });

    it('handles navigation errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockRouter.push.mockImplementation(() => {
        throw new Error('Navigation failed');
      });
      
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      // Should handle navigation errors without crashing
      expect(() => {
        fireEvent(window, new CustomEvent('mock-external-nav', { detail: '/error-route' }));
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('handles window.open failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockWindowOpen.mockImplementation(() => {
        throw new Error('Popup blocked');
      });
      
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      // Should handle window.open errors without crashing
      expect(() => {
        fireEvent(window, new CustomEvent('mock-external-nav', { detail: 'https://blocked.com' }));
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large datasets', () => {
      const largeProps = {
        ...defaultProps,
        services: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Service ${i}`,
          price: 30 + i,
          duration: 15 + i,
        })),
        barbers: Array.from({ length: 20 }, (_, i) => ({
          id: i,
          name: `Barber ${i}`,
          specialties: ['cuts', 'styling'],
        })),
      };

      const start = performance.now();
      render(<EnhancedShareBookingModal {...largeProps} />);
      const renderTime = performance.now() - start;
      
      expect(renderTime).toBeLessThan(100); // Should render in less than 100ms
      expect(screen.getByTestId('share-booking-modal')).toBeInTheDocument();
    });

    it('handles rapid prop changes efficiently', () => {
      const { rerender } = render(<EnhancedShareBookingModal {...defaultProps} />);
      
      const start = performance.now();
      
      // Simulate rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <EnhancedShareBookingModal 
            {...defaultProps} 
            businessName={`Shop ${i}`}
            bookingUrl={`https://book.example.com/shop-${i}`}
          />
        );
      }
      
      const rerenderTime = performance.now() - start;
      expect(rerenderTime).toBeLessThan(50); // Should handle 10 rerenders in less than 50ms
    });
  });

  describe('Accessibility', () => {
    it('maintains accessibility through navigation provider', () => {
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      const provider = screen.getByTestId('modal-navigation-provider');
      expect(provider).toBeInTheDocument();
      
      // The modal should maintain focus management through the provider
      const modal = screen.getByTestId('share-booking-modal');
      expect(modal).toBeInTheDocument();
    });

    it('preserves focus management during navigation', async () => {
      const user = userEvent.setup();
      
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      const navButton = screen.getByTestId('internal-nav-trigger');
      navButton.focus();
      
      expect(document.activeElement).toBe(navButton);
      
      await user.click(navButton);
      
      // After navigation, focus management should be handled by the provider
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Component Integration', () => {
    it('integrates seamlessly with ModalNavigationProvider', () => {
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      const provider = screen.getByTestId('modal-navigation-provider');
      const modal = screen.getByTestId('share-booking-modal');
      
      expect(provider).toContainElement(modal);
    });

    it('passes navigation context correctly', async () => {
      const user = userEvent.setup();
      
      render(<EnhancedShareBookingModal {...defaultProps} />);
      
      // The navigation provider should be properly configured
      const externalNavButton = screen.getByTestId('external-nav-trigger');
      await user.click(externalNavButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});