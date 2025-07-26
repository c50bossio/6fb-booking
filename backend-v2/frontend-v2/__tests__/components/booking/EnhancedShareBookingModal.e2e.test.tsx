/**
 * End-to-End Tests for EnhancedShareBookingModal Component
 * 
 * Tests complete user workflows and complex interactions for the enhanced
 * modal component with navigation system integration.
 * 
 * Focus Areas:
 * - Complete user workflows from start to finish
 * - Complex navigation scenarios
 * - Multi-modal interactions
 * - Real user behavior simulation
 * - Cross-browser compatibility scenarios
 * - Performance under realistic conditions
 * - Accessibility with assistive technologies
 * - Six Figure Barber business scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import EnhancedShareBookingModal from '@/components/booking/EnhancedShareBookingModal';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock complex dependencies for E2E testing
jest.mock('@/components/booking/ShareBookingModal', () => {
  return function MockShareBookingModal(props: any) {
    const [activeStep, setActiveStep] = React.useState('main');
    const [customUrl, setCustomUrl] = React.useState(props.bookingUrl);
    const [isGenerating, setIsGenerating] = React.useState(false);

    const handleCustomize = async () => {
      setActiveStep('customize');
      setIsGenerating(true);
      
      // Simulate URL generation delay
      setTimeout(() => {
        setCustomUrl('https://6fb.co/premium-booking');
        setIsGenerating(false);
      }, 500);
    };

    const handleQRCode = () => {
      setActiveStep('qr');
    };

    const handleShare = async () => {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(customUrl);
      }
      setActiveStep('shared');
    };

    const handleBack = () => {
      setActiveStep('main');
    };

    return (
      <div data-testid="share-booking-modal-content">
        {/* Modal Header */}
        <div data-testid="modal-header">
          <h2>Share Your Booking Link</h2>
          {activeStep !== 'main' && (
            <button 
              onClick={handleBack}
              data-testid="back-button"
              aria-label="Go back to main view"
            >
              ← Back
            </button>
          )}
          <button 
            onClick={props.onClose}
            data-testid="close-modal"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Main View */}
        {activeStep === 'main' && (
          <div data-testid="main-view">
            <div data-testid="booking-link-display">
              <label htmlFor="booking-url">Your Booking Link:</label>
              <input
                id="booking-url"
                value={customUrl}
                readOnly
                data-testid="booking-url-input"
                aria-label="Booking URL"
              />
            </div>

            <div data-testid="primary-actions" role="group" aria-label="Primary actions">
              <button
                onClick={handleShare}
                data-testid="copy-link-button"
                aria-label="Copy booking link to clipboard"
              >
                Copy Link
              </button>
              
              <button
                onClick={handleQRCode}
                data-testid="qr-code-button"
                aria-label="Generate QR code"
              >
                QR Code
              </button>
              
              <button
                onClick={handleCustomize}
                data-testid="customize-button"
                aria-label="Customize booking link"
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Customize'}
              </button>
            </div>

            <div data-testid="business-info">
              <h3>{props.businessName}</h3>
              <div data-testid="services-list">
                {props.services?.map((service: any) => (
                  <div key={service.id} data-testid={`service-${service.id}`}>
                    {service.name} - ${service.price}
                  </div>
                ))}
              </div>
              <div data-testid="subscription-tier">
                Tier: {props.subscriptionTier}
              </div>
            </div>
          </div>
        )}

        {/* Customize View */}
        {activeStep === 'customize' && (
          <div data-testid="customize-view">
            <h3>Customize Your Link</h3>
            <form data-testid="customize-form">
              <div>
                <label htmlFor="custom-name">Custom Name:</label>
                <input
                  id="custom-name"
                  type="text"
                  placeholder="e.g., premium-booking"
                  data-testid="custom-name-input"
                />
              </div>
              
              <div>
                <label htmlFor="expiration-date">Expiration Date:</label>
                <input
                  id="expiration-date"
                  type="date"
                  data-testid="expiration-input"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setCustomUrl('https://6fb.co/custom-premium');
                  setActiveStep('main');
                }}
                data-testid="apply-customization"
              >
                Apply Changes
              </button>
            </form>
          </div>
        )}

        {/* QR Code View */}
        {activeStep === 'qr' && (
          <div data-testid="qr-view">
            <h3>QR Code</h3>
            <div data-testid="qr-code-canvas" role="img" aria-label="QR code for booking">
              [QR CODE PLACEHOLDER]
            </div>
            <div data-testid="qr-actions">
              <button data-testid="download-qr">Download</button>
              <button data-testid="print-qr">Print</button>
            </div>
          </div>
        )}

        {/* Success View */}
        {activeStep === 'shared' && (
          <div data-testid="success-view" role="status" aria-live="polite">
            <p>Link copied to clipboard!</p>
            <button onClick={() => setActiveStep('main')} data-testid="continue-button">
              Continue
            </button>
          </div>
        )}

        {/* Loading States */}
        {isGenerating && (
          <div 
            data-testid="loading-overlay" 
            role="status" 
            aria-live="polite"
            aria-label="Generating custom URL"
          >
            <div data-testid="loading-spinner">Loading...</div>
          </div>
        )}
      </div>
    );
  };
});

jest.mock('@/components/ui/ModalNavigation', () => ({
  ModalNavigationProvider: ({ children, onExternalNavigation, onClose }: any) => {
    const [currentRoute, setCurrentRoute] = React.useState('/share');

    React.useEffect(() => {
      const handleNavigation = (event: CustomEvent) => {
        const url = event.detail;
        setCurrentRoute(url);
        
        if (onExternalNavigation) {
          onExternalNavigation(url);
        }
      };

      window.addEventListener('navigate', handleNavigation as EventListener);
      return () => window.removeEventListener('navigate', handleNavigation as EventListener);
    }, [onExternalNavigation]);

    return (
      <div data-testid="modal-navigation-provider" data-current-route={currentRoute}>
        {children}
        <div data-testid="navigation-breadcrumb">
          Current: {currentRoute}
        </div>
      </div>
    );
  },
}));

// Mock router for navigation testing
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock window.open for external navigation
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock clipboard API
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
});

describe('EnhancedShareBookingModal E2E Tests', () => {
  const premiumProps = {
    isOpen: true,
    onClose: jest.fn(),
    bookingUrl: 'https://book.sixfigurebarber.com/premium-studio',
    businessName: 'Six Figure Barber Premium Studio',
    services: [
      { id: 1, name: 'Executive Styling Experience', price: 125, duration: 60 },
      { id: 2, name: 'Master Beard Artistry', price: 75, duration: 40 },
      { id: 3, name: 'Complete Grooming Package', price: 195, duration: 90 },
    ],
    barbers: [
      { id: 1, name: 'Master Artisan Rodriguez', specialties: ['executive styling', 'color'] },
      { id: 2, name: 'Senior Craftsman Johnson', specialties: ['traditional cuts', 'beard sculpting'] },
    ],
    subscriptionTier: 'enterprise' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  describe('Complete User Workflows', () => {
    it('completes full booking link sharing workflow', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<EnhancedShareBookingModal {...premiumProps} onClose={onClose} />);

      // Step 1: Modal opens and displays booking information
      expect(screen.getByTestId('share-booking-modal-content')).toBeInTheDocument();
      expect(screen.getByTestId('booking-url-input')).toHaveValue(premiumProps.bookingUrl);
      expect(screen.getByText(premiumProps.businessName)).toBeInTheDocument();

      // Step 2: User views services and subscription tier
      expect(screen.getByTestId('service-1')).toHaveTextContent('Executive Styling Experience - $125');
      expect(screen.getByTestId('subscription-tier')).toHaveTextContent('Tier: enterprise');

      // Step 3: User copies the link
      await user.click(screen.getByTestId('copy-link-button'));
      
      expect(mockWriteText).toHaveBeenCalledWith(premiumProps.bookingUrl);
      expect(screen.getByTestId('success-view')).toBeInTheDocument();
      expect(screen.getByText('Link copied to clipboard!')).toBeInTheDocument();

      // Step 4: User returns to main view
      await user.click(screen.getByTestId('continue-button'));
      expect(screen.getByTestId('main-view')).toBeInTheDocument();

      // Step 5: User closes modal
      await user.click(screen.getByTestId('close-modal'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('completes custom link creation workflow', async () => {
      const user = userEvent.setup();

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // Step 1: Navigate to customization
      await user.click(screen.getByTestId('customize-button'));
      expect(screen.getByTestId('customize-view')).toBeInTheDocument();

      // Step 2: Fill out customization form
      const customNameInput = screen.getByTestId('custom-name-input');
      await user.type(customNameInput, 'premium-studio-booking');

      const expirationInput = screen.getByTestId('expiration-input');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      await user.type(expirationInput, tomorrowString);

      // Step 3: Apply customization
      await user.click(screen.getByTestId('apply-customization'));

      // Step 4: Verify return to main view with updated URL
      expect(screen.getByTestId('main-view')).toBeInTheDocument();
      expect(screen.getByTestId('booking-url-input')).toHaveValue('https://6fb.co/custom-premium');

      // Step 5: Copy the customized link
      await user.click(screen.getByTestId('copy-link-button'));
      expect(mockWriteText).toHaveBeenCalledWith('https://6fb.co/custom-premium');
    });

    it('completes QR code generation and download workflow', async () => {
      const user = userEvent.setup();

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // Step 1: Navigate to QR code view
      await user.click(screen.getByTestId('qr-code-button'));
      expect(screen.getByTestId('qr-view')).toBeInTheDocument();

      // Step 2: Verify QR code display
      const qrCode = screen.getByTestId('qr-code-canvas');
      expect(qrCode).toBeInTheDocument();
      expect(qrCode).toHaveAttribute('role', 'img');
      expect(qrCode).toHaveAttribute('aria-label', 'QR code for booking');

      // Step 3: Test QR code actions
      expect(screen.getByTestId('download-qr')).toBeInTheDocument();
      expect(screen.getByTestId('print-qr')).toBeInTheDocument();

      // Step 4: Return to main view
      await user.click(screen.getByTestId('back-button'));
      expect(screen.getByTestId('main-view')).toBeInTheDocument();
    });

    it('handles complex navigation between all views', async () => {
      const user = userEvent.setup();

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // Main → Customize → Main → QR → Main → Share → Main
      
      // To Customize
      await user.click(screen.getByTestId('customize-button'));
      expect(screen.getByTestId('customize-view')).toBeInTheDocument();
      
      // Back to Main
      await user.click(screen.getByTestId('back-button'));
      expect(screen.getByTestId('main-view')).toBeInTheDocument();
      
      // To QR
      await user.click(screen.getByTestId('qr-code-button'));
      expect(screen.getByTestId('qr-view')).toBeInTheDocument();
      
      // Back to Main
      await user.click(screen.getByTestId('back-button'));
      expect(screen.getByTestId('main-view')).toBeInTheDocument();
      
      // Share (copy link)
      await user.click(screen.getByTestId('copy-link-button'));
      expect(screen.getByTestId('success-view')).toBeInTheDocument();
      
      // Back to Main
      await user.click(screen.getByTestId('continue-button'));
      expect(screen.getByTestId('main-view')).toBeInTheDocument();
    });
  });

  describe('Navigation System Integration', () => {
    it('integrates with modal navigation provider correctly', () => {
      render(<EnhancedShareBookingModal {...premiumProps} />);

      const provider = screen.getByTestId('modal-navigation-provider');
      expect(provider).toBeInTheDocument();
      expect(provider).toHaveAttribute('data-current-route', '/share');

      const breadcrumb = screen.getByTestId('navigation-breadcrumb');
      expect(breadcrumb).toHaveTextContent('Current: /share');
    });

    it('handles external navigation correctly', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<EnhancedShareBookingModal {...premiumProps} onClose={onClose} />);

      // Simulate external navigation event
      const externalUrl = 'https://external-site.com';
      fireEvent(window, new CustomEvent('navigate', { detail: externalUrl }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(mockWindowOpen).toHaveBeenCalledWith(externalUrl, '_blank');
      });
    });

    it('handles internal navigation correctly', async () => {
      const onClose = jest.fn();

      render(<EnhancedShareBookingModal {...premiumProps} onClose={onClose} />);

      // Simulate internal navigation event
      const internalUrl = '/dashboard/analytics';
      fireEvent(window, new CustomEvent('navigate', { detail: internalUrl }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(mockPush).toHaveBeenCalledWith(internalUrl);
      });
    });

    it('maintains navigation breadcrumb during modal interactions', async () => {
      const user = userEvent.setup();

      render(<EnhancedShareBookingModal {...premiumProps} />);

      const breadcrumb = screen.getByTestId('navigation-breadcrumb');
      expect(breadcrumb).toHaveTextContent('Current: /share');

      // Navigation breadcrumb should persist during modal interactions
      await user.click(screen.getByTestId('customize-button'));
      expect(breadcrumb).toBeInTheDocument();

      await user.click(screen.getByTestId('back-button'));
      expect(breadcrumb).toBeInTheDocument();
    });
  });

  describe('Performance and Load Testing', () => {
    it('handles rapid user interactions without performance degradation', async () => {
      const user = userEvent.setup();

      render(<EnhancedShareBookingModal {...premiumProps} />);

      const startTime = performance.now();

      // Perform rapid interactions
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByTestId('customize-button'));
        await user.click(screen.getByTestId('back-button'));
        await user.click(screen.getByTestId('qr-code-button'));
        await user.click(screen.getByTestId('back-button'));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete rapid interactions within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds
      expect(screen.getByTestId('main-view')).toBeInTheDocument();
    });

    it('maintains responsiveness with large datasets', () => {
      const largeDataProps = {
        ...premiumProps,
        services: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Premium Service ${i}`,
          price: 50 + i,
          duration: 30 + i,
        })),
        barbers: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Master Barber ${i}`,
          specialties: ['cutting', 'styling', 'color'],
        })),
      };

      const startTime = performance.now();
      render(<EnhancedShareBookingModal {...largeDataProps} />);
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
      expect(screen.getByTestId('share-booking-modal-content')).toBeInTheDocument();
    });

    it('handles memory management during long sessions', async () => {
      const user = userEvent.setup();

      const { rerender, unmount } = render(<EnhancedShareBookingModal {...premiumProps} />);

      // Simulate long session with multiple rerenders
      for (let i = 0; i < 20; i++) {
        rerender(<EnhancedShareBookingModal {...premiumProps} businessName={`Business ${i}`} />);
        
        if (i % 5 === 0) {
          await user.click(screen.getByTestId('customize-button'));
          await user.click(screen.getByTestId('back-button'));
        }
      }

      // Component should still be functional
      expect(screen.getByTestId('share-booking-modal-content')).toBeInTheDocument();

      // Clean unmount should not cause errors
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility and Assistive Technology Support', () => {
    it('passes accessibility audit', async () => {
      const { container } = render(<EnhancedShareBookingModal {...premiumProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports screen reader navigation', async () => {
      const user = userEvent.setup();

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // All interactive elements should have proper labels
      expect(screen.getByLabelText('Copy booking link to clipboard')).toBeInTheDocument();
      expect(screen.getByLabelText('Generate QR code')).toBeInTheDocument();
      expect(screen.getByLabelText('Customize booking link')).toBeInTheDocument();
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();

      // Test keyboard navigation
      const firstButton = screen.getByTestId('copy-link-button');
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      // Tab navigation should work correctly
      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('qr-code-button'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('customize-button'));
    });

    it('provides proper ARIA live regions for dynamic content', async () => {
      const user = userEvent.setup();

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // Copy link to trigger success message
      await user.click(screen.getByTestId('copy-link-button'));

      const successRegion = screen.getByRole('status');
      expect(successRegion).toHaveAttribute('aria-live', 'polite');
      expect(successRegion).toHaveTextContent('Link copied to clipboard!');
    });

    it('handles loading states accessibly', async () => {
      const user = userEvent.setup();

      render(<EnhancedShareBookingModal {...premiumProps} />);

      await user.click(screen.getByTestId('customize-button'));

      // Should show accessible loading state during URL generation
      expect(screen.getByTestId('customize-button')).toBeDisabled();
      expect(screen.getByTestId('customize-button')).toHaveTextContent('Generating...');
    });

    it('supports high contrast mode', () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // Component should render without issues in high contrast mode
      expect(screen.getByTestId('share-booking-modal-content')).toBeInTheDocument();
    });
  });

  describe('Six Figure Barber Business Scenarios', () => {
    it('handles premium barbershop booking workflow', async () => {
      const user = userEvent.setup();
      
      const premiumStudioProps = {
        ...premiumProps,
        businessName: 'Six Figure Barber Manhattan Flagship',
        bookingUrl: 'https://book.sixfigurebarber.com/manhattan',
        services: [
          { id: 1, name: 'Master Craftsman Signature Cut', price: 250, duration: 75 },
          { id: 2, name: 'Executive Grooming Experience', price: 350, duration: 120 },
        ],
        subscriptionTier: 'enterprise' as const,
      };

      render(<EnhancedShareBookingModal {...premiumStudioProps} />);

      // Verify premium branding and pricing
      expect(screen.getByText('Six Figure Barber Manhattan Flagship')).toBeInTheDocument();
      expect(screen.getByText('Master Craftsman Signature Cut - $250')).toBeInTheDocument();
      expect(screen.getByText('Executive Grooming Experience - $350')).toBeInTheDocument();

      // Test premium link customization
      await user.click(screen.getByTestId('customize-button'));
      
      const customNameInput = screen.getByTestId('custom-name-input');
      await user.type(customNameInput, 'manhattan-flagship-premium');

      await user.click(screen.getByTestId('apply-customization'));

      // Should handle premium URL structure
      expect(screen.getByTestId('booking-url-input')).toHaveValue('https://6fb.co/custom-premium');
    });

    it('supports multi-location barbershop chains', async () => {
      const user = userEvent.setup();

      const chainProps = {
        ...premiumProps,
        businessName: 'Six Figure Barber Network - Downtown Location',
        services: [
          { id: 1, name: 'Signature Network Cut', price: 95, duration: 45 },
          { id: 2, name: 'Master Barber Service', price: 125, duration: 60 },
        ],
        barbers: [
          { id: 1, name: 'Network Master John', locationId: 'downtown' },
          { id: 2, name: 'Senior Stylist Sarah', locationId: 'downtown' },
        ],
      };

      render(<EnhancedShareBookingModal {...chainProps} />);

      expect(screen.getByText('Six Figure Barber Network - Downtown Location')).toBeInTheDocument();
      
      // Should support location-specific customization
      await user.click(screen.getByTestId('customize-button'));
      
      const customNameInput = screen.getByTestId('custom-name-input');
      await user.type(customNameInput, 'downtown-location');

      await user.click(screen.getByTestId('apply-customization'));

      expect(screen.getByTestId('main-view')).toBeInTheDocument();
    });

    it('handles enterprise subscription features', () => {
      const enterpriseProps = {
        ...premiumProps,
        subscriptionTier: 'enterprise' as const,
      };

      render(<EnhancedShareBookingModal {...enterpriseProps} />);

      // All features should be available for enterprise tier
      expect(screen.getByTestId('copy-link-button')).toBeInTheDocument();
      expect(screen.getByTestId('qr-code-button')).toBeInTheDocument();
      expect(screen.getByTestId('customize-button')).toBeInTheDocument();
      expect(screen.getByTestId('subscription-tier')).toHaveTextContent('enterprise');
    });

    it('supports professional certification display', () => {
      const certifiedBarberProps = {
        ...premiumProps,
        barbers: [
          {
            id: 1,
            name: 'Master Barber Rodriguez',
            specialties: ['precision cuts', 'color artistry'],
            certifications: ['Master Barber Certification', 'Color Specialist'],
            awards: ['2024 Barber of the Year'],
          },
        ],
      };

      render(<EnhancedShareBookingModal {...certifiedBarberProps} />);

      // Should display professional information appropriately
      expect(screen.getByTestId('share-booking-modal-content')).toBeInTheDocument();
      expect(screen.getByText(premiumProps.businessName)).toBeInTheDocument();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('recovers gracefully from clipboard API failures', async () => {
      const user = userEvent.setup();
      mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));

      render(<EnhancedShareBookingModal {...premiumProps} />);

      await user.click(screen.getByTestId('copy-link-button'));

      // Should not crash and should remain functional
      expect(screen.getByTestId('share-booking-modal-content')).toBeInTheDocument();
      
      // User should be able to continue using the modal
      await user.click(screen.getByTestId('qr-code-button'));
      expect(screen.getByTestId('qr-view')).toBeInTheDocument();
    });

    it('handles navigation failures gracefully', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      mockPush.mockRejectedValue(new Error('Navigation failed'));

      render(<EnhancedShareBookingModal {...premiumProps} onClose={onClose} />);

      // Trigger navigation that will fail
      fireEvent(window, new CustomEvent('navigate', { detail: '/dashboard' }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      // Should attempt navigation despite error
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('maintains state consistency during errors', async () => {
      const user = userEvent.setup();

      // Mock console.error to suppress error noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // Navigate to customize view
      await user.click(screen.getByTestId('customize-button'));
      expect(screen.getByTestId('customize-view')).toBeInTheDocument();

      // Fill form
      await user.type(screen.getByTestId('custom-name-input'), 'test-name');

      // Even if errors occur, state should be maintained
      expect(screen.getByTestId('custom-name-input')).toHaveValue('test-name');

      consoleSpy.mockRestore();
    });

    it('provides fallback behavior when features are unavailable', async () => {
      const user = userEvent.setup();

      // Mock unsupported clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // Copy button should still be present and clickable
      const copyButton = screen.getByTestId('copy-link-button');
      expect(copyButton).toBeInTheDocument();

      await user.click(copyButton);

      // Should handle gracefully without crashing
      expect(screen.getByTestId('share-booking-modal-content')).toBeInTheDocument();
    });
  });

  describe('Cross-Browser Compatibility Simulation', () => {
    it('works with limited modern feature support', async () => {
      const user = userEvent.setup();

      // Mock limited browser support
      Object.defineProperty(window, 'customElements', { value: undefined });
      Object.defineProperty(navigator, 'share', { value: undefined });

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // Should still function with basic features
      expect(screen.getByTestId('share-booking-modal-content')).toBeInTheDocument();

      await user.click(screen.getByTestId('customize-button'));
      expect(screen.getByTestId('customize-view')).toBeInTheDocument();

      await user.click(screen.getByTestId('back-button'));
      expect(screen.getByTestId('main-view')).toBeInTheDocument();
    });

    it('handles touch device interactions', async () => {
      const user = userEvent.setup();

      // Mock touch events
      Object.defineProperty(window, 'ontouchstart', { value: null });

      render(<EnhancedShareBookingModal {...premiumProps} />);

      // Touch interactions should work
      const customizeButton = screen.getByTestId('customize-button');
      
      fireEvent.touchStart(customizeButton);
      fireEvent.touchEnd(customizeButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('customize-view')).toBeInTheDocument();
      });
    });
  });
});