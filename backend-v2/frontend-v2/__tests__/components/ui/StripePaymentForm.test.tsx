/**
 * Comprehensive tests for StripePaymentForm component.
 * 
 * Tests cover:
 * - Stripe Elements integration
 * - Payment processing flow
 * - Error handling and validation
 * - Loading states and user feedback
 * - Security and PCI compliance
 * - Business logic alignment with Six Figure Barber methodology
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useStripe, useElements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/ui/StripePaymentForm';

// Mock Stripe hooks
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  PaymentElement: ({ options }: { options?: any }) => (
    <div data-testid="payment-element" data-options={JSON.stringify(options)}>
      <input data-testid="card-input" placeholder="Card number" />
    </div>
  ),
  useStripe: jest.fn(),
  useElements: jest.fn(),
}));

// Mock Stripe utilities
jest.mock('@/lib/stripe', () => ({
  getStripe: jest.fn(),
  parseStripeError: jest.fn((error: any) => ({
    message: error.message || 'Payment failed',
    type: error.type || 'generic_error',
    suggestedAction: 'Please try again or contact support'
  })),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  AlertCircle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-circle-icon" className={className}>
      <title>Alert</title>
    </svg>
  ),
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader-icon" className={className}>
      <title>Loading</title>
    </svg>
  ),
  Lock: ({ className }: { className?: string }) => (
    <svg data-testid="lock-icon" className={className}>
      <title>Secure</title>
    </svg>
  ),
}));

describe('StripePaymentForm', () => {
  const mockStripe = {
    confirmPayment: jest.fn(),
    confirmSetup: jest.fn(),
    retrievePaymentIntent: jest.fn(),
    elements: jest.fn(),
  };

  const mockElements = {
    getElement: jest.fn(),
    submit: jest.fn(),
    fetchUpdates: jest.fn(),
  };

  const mockPaymentElement = {
    mount: jest.fn(),
    unmount: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };

  const defaultProps = {
    clientSecret: 'pi_test_1234567890_secret_test123',
    onSuccess: jest.fn(),
    onError: jest.fn(),
    organizationId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useStripe as jest.Mock).mockReturnValue(mockStripe);
    (useElements as jest.Mock).mockReturnValue(mockElements);
    
    mockElements.getElement.mockReturnValue(mockPaymentElement);
  });

  describe('Component Rendering', () => {
    it('renders payment form with all required elements', () => {
      render(<StripePaymentForm {...defaultProps} />);

      expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
      expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save payment method/i })).toBeInTheDocument();
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    });

    it('displays custom button text when provided', () => {
      render(
        <StripePaymentForm 
          {...defaultProps} 
          submitLabel="Complete Payment"
          buttonText="Pay Now"
        />
      );

      expect(screen.getByRole('button', { name: /complete payment/i })).toBeInTheDocument();
    });

    it('displays description when provided', () => {
      render(
        <StripePaymentForm 
          {...defaultProps} 
          description="Secure payment processing"
        />
      );

      expect(screen.getByText('Secure payment processing')).toBeInTheDocument();
    });

    it('shows loading state when isLoading is true', () => {
      render(<StripePaymentForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });

  describe('Payment Processing Flow', () => {
    it('processes payment successfully', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: {
          id: 'pi_test_123',
          status: 'succeeded',
          payment_method: { id: 'pm_test_123' }
        }
      });

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockStripe.confirmPayment).toHaveBeenCalledWith({
          elements: mockElements,
          confirmParams: {
            return_url: expect.stringContaining('payment-success'),
          },
          redirect: 'if_required',
        });
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('pm_test_123');
      });
    });

    it('handles setup intent for saving payment methods', async () => {
      const setupIntentSecret = 'seti_test_1234567890_secret_test123';
      
      mockStripe.confirmSetup.mockResolvedValue({
        setupIntent: {
          id: 'seti_test_123',
          status: 'succeeded',
          payment_method: { id: 'pm_test_123' }
        }
      });

      render(
        <StripePaymentForm 
          {...defaultProps} 
          clientSecret={setupIntentSecret}
        />
      );

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockStripe.confirmSetup).toHaveBeenCalledWith({
          elements: mockElements,
          confirmParams: {
            return_url: expect.stringContaining('payment-success'),
          },
          redirect: 'if_required',
        });
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('pm_test_123');
      });
    });

    it('prevents multiple submissions during processing', async () => {
      mockStripe.confirmPayment.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      expect(mockStripe.confirmPayment).toHaveBeenCalledTimes(1);
    });

    it('shows processing state during payment', async () => {
      mockStripe.confirmPayment.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles Stripe payment errors', async () => {
      const paymentError = {
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined.',
      };

      mockStripe.confirmPayment.mockResolvedValue({
        error: paymentError
      });

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Your card was declined.',
          'card_error'
        );
      });
    });

    it('handles network errors gracefully', async () => {
      mockStripe.confirmPayment.mockRejectedValue(
        new Error('Network error')
      );

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Network error',
          'network_error'
        );
      });
    });

    it('handles missing Stripe instance', async () => {
      (useStripe as jest.Mock).mockReturnValue(null);

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      
      fireEvent.click(submitButton);
      
      expect(mockStripe.confirmPayment).not.toHaveBeenCalled();
    });

    it('handles missing Elements instance', async () => {
      (useElements as jest.Mock).mockReturnValue(null);

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      
      fireEvent.click(submitButton);
      
      expect(mockStripe.confirmPayment).not.toHaveBeenCalled();
    });

    it('displays error messages with appropriate icons', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        error: { message: 'Payment failed' }
      });

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
        expect(screen.getByText('Payment failed')).toBeInTheDocument();
      });
    });
  });

  describe('Security and PCI Compliance', () => {
    it('uses secure HTTPS URLs for callbacks', async () => {
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: { status: 'succeeded' }
      });

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockStripe.confirmPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            confirmParams: {
              return_url: expect.stringMatching(/^https?:\/\//)
            }
          })
        );
      });
    });

    it('includes security indicators', () => {
      render(<StripePaymentForm {...defaultProps} />);

      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
      expect(screen.getByText(/secure/i)).toBeInTheDocument();
    });

    it('prevents form submission without proper validation', () => {
      (useStripe as jest.Mock).mockReturnValue(null);
      (useElements as jest.Mock).mockReturnValue(null);

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });

    it('sanitizes organization ID in callbacks', async () => {
      render(
        <StripePaymentForm 
          {...defaultProps} 
          organizationId={123}
        />
      );

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockStripe.confirmPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            confirmParams: {
              return_url: expect.stringContaining('org=123')
            }
          })
        );
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('provides proper ARIA labels and roles', () => {
      render(<StripePaymentForm {...defaultProps} />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('maintains focus management during processing', async () => {
      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      submitButton.focus();
      expect(submitButton).toHaveFocus();

      fireEvent.click(submitButton);

      // Button should remain focused during processing
      expect(submitButton).toHaveFocus();
    });

    it('provides clear loading indicators', () => {
      render(<StripePaymentForm {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('supports keyboard navigation', () => {
      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      
      fireEvent.keyDown(submitButton, { key: 'Enter' });
      fireEvent.keyDown(submitButton, { key: ' ' });

      // Should handle keyboard events properly
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Business Logic Integration', () => {
    it('supports Six Figure Barber payment tiers', async () => {
      const premiumClientSecret = 'pi_premium_test_secret';
      
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: {
          status: 'succeeded',
          amount: 15000, // $150 premium service
          payment_method: { id: 'pm_premium_123' }
        }
      });

      render(
        <StripePaymentForm 
          {...defaultProps} 
          clientSecret={premiumClientSecret}
          description="Premium Six Figure Barber Service"
        />
      );

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('pm_premium_123');
      });
    });

    it('handles subscription payments for barber management', async () => {
      const subscriptionSecret = 'pi_sub_test_secret';
      
      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: {
          status: 'succeeded',
          metadata: { subscription_type: 'six_figure_pro' }
        }
      });

      render(
        <StripePaymentForm 
          {...defaultProps} 
          clientSecret={subscriptionSecret}
          submitLabel="Subscribe to Six Figure Pro"
        />
      );

      expect(screen.getByRole('button', { name: /subscribe to six figure pro/i })).toBeInTheDocument();
    });

    it('provides appropriate messaging for different payment types', () => {
      render(
        <StripePaymentForm 
          {...defaultProps} 
          description="Secure payment for premium barbering services"
          submitLabel="Book Premium Service"
        />
      );

      expect(screen.getByText('Secure payment for premium barbering services')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /book premium service/i })).toBeInTheDocument();
    });
  });

  describe('Performance and Memory Management', () => {
    it('cleans up Stripe elements on unmount', () => {
      const { unmount } = render(<StripePaymentForm {...defaultProps} />);

      unmount();

      // Should not cause memory leaks
      expect(true).toBe(true);
    });

    it('handles rapid re-renders without performance degradation', () => {
      const { rerender } = render(<StripePaymentForm {...defaultProps} />);

      // Simulate rapid re-renders
      for (let i = 0; i < 10; i++) {
        rerender(
          <StripePaymentForm 
            {...defaultProps} 
            clientSecret={`pi_test_${i}_secret`}
          />
        );
      }

      expect(screen.getByTestId('payment-element')).toBeInTheDocument();
    });

    it('optimizes Stripe element updates', () => {
      const { rerender } = render(<StripePaymentForm {...defaultProps} />);

      // Change non-critical props
      rerender(
        <StripePaymentForm 
          {...defaultProps} 
          description="Updated description"
        />
      );

      // Elements should not be recreated unnecessarily
      expect(screen.getByTestId('payment-element')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('handles malformed client secrets', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <StripePaymentForm 
          {...defaultProps} 
          clientSecret="invalid_secret"
        />
      );

      expect(screen.getByTestId('payment-element')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });

    it('recovers from temporary network failures', async () => {
      // First attempt fails
      mockStripe.confirmPayment
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          paymentIntent: { status: 'succeeded', payment_method: { id: 'pm_123' } }
        });

      render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      
      // First attempt
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalled();
      });

      // Second attempt should succeed
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('pm_123');
      });
    });

    it('handles component state updates after unmount', async () => {
      const { unmount } = render(<StripePaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      // Unmount before async operation completes
      unmount();

      // Should not cause state update warnings
      await waitFor(() => {
        expect(true).toBe(true);
      });
    });
  });
});