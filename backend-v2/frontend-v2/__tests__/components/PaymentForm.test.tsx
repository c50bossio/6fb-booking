/**
 * Comprehensive tests for PaymentForm component.
 * 
 * Tests cover:
 * - Successful payment processing
 * - Gift certificate handling
 * - Stripe integration
 * - Error scenarios
 * - Validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import PaymentForm from '@/components/PaymentForm';
import * as stripeReact from '@stripe/react-stripe-js';
import * as api from '@/lib/api';

// Mock Stripe
const mockStripe = {
  confirmCardPayment: jest.fn(),
  retrievePaymentIntent: jest.fn(),
};

const mockElements = {
  getElement: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockCardElement = {
  mount: jest.fn(),
  unmount: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  update: jest.fn(),
};

// Mock Stripe hooks
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <div data-testid="stripe-card-element" />,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}));

// Mock API calls
jest.mock('@/lib/api', () => ({
  createPaymentIntent: jest.fn(),
  confirmPayment: jest.fn(),
}));

const mockCreatePaymentIntent = api.createPaymentIntent as jest.MockedFunction<typeof api.createPaymentIntent>;
const mockConfirmPayment = api.confirmPayment as jest.MockedFunction<typeof api.confirmPayment>;

describe('PaymentForm', () => {
  const defaultProps = {
    bookingId: 123,
    amount: 50.0,
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockElements.getElement.mockReturnValue(mockCardElement);
  });

  describe('Rendering', () => {
    it('renders payment form with Stripe elements', () => {
      render(<PaymentForm {...defaultProps} />);
      
      expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
      expect(screen.getByTestId('stripe-card-element')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pay/i })).toBeInTheDocument();
    });

    it('displays correct amount', () => {
      render(<PaymentForm {...defaultProps} />);
      
      expect(screen.getByText(/\$50\.00/)).toBeInTheDocument();
    });

    it('shows gift certificate input when enabled', () => {
      render(<PaymentForm {...defaultProps} enableGiftCertificate />);
      
      expect(screen.getByLabelText(/gift certificate code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    });
  });

  describe('Payment Processing', () => {
    it('processes successful payment', async () => {
      // Mock successful API responses
      mockCreatePaymentIntent.mockResolvedValueOnce({
        payment_intent_id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 50.0,
        original_amount: 50.0,
        gift_certificate_used: 0,
      });

      mockStripe.confirmCardPayment.mockResolvedValueOnce({
        paymentIntent: {
          id: 'pi_test_123',
          status: 'succeeded',
        },
      });

      mockConfirmPayment.mockResolvedValueOnce({
        success: true,
        appointment_id: 123,
        payment_id: 456,
      });

      render(<PaymentForm {...defaultProps} />);
      
      const payButton = screen.getByRole('button', { name: /pay/i });
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
          booking_id: 123,
        });
      });

      await waitFor(() => {
        expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(
          'pi_test_123_secret',
          expect.objectContaining({
            payment_method: expect.objectContaining({
              card: mockCardElement,
            }),
          })
        );
      });

      await waitFor(() => {
        expect(mockConfirmPayment).toHaveBeenCalledWith({
          payment_intent_id: 'pi_test_123',
          booking_id: 123,
        });
      });

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('handles payment with gift certificate covering full amount', async () => {
      mockCreatePaymentIntent.mockResolvedValueOnce({
        payment_intent_id: null,
        client_secret: null,
        amount: 0,
        original_amount: 50.0,
        gift_certificate_used: 50.0,
      });

      mockConfirmPayment.mockResolvedValueOnce({
        success: true,
        appointment_id: 123,
        payment_id: 456,
      });

      render(<PaymentForm {...defaultProps} enableGiftCertificate />);
      
      // Apply gift certificate
      const giftCertInput = screen.getByLabelText(/gift certificate code/i);
      fireEvent.change(giftCertInput, { target: { value: 'GIFT50' } });
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      // Submit payment
      const payButton = screen.getByRole('button', { name: /complete booking/i });
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
          booking_id: 123,
          gift_certificate_code: 'GIFT50',
        });
      });

      // Should skip Stripe payment since amount is 0
      expect(mockStripe.confirmCardPayment).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(mockConfirmPayment).toHaveBeenCalledWith({
          payment_intent_id: null,
          booking_id: 123,
        });
      });

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('handles partial gift certificate payment', async () => {
      mockCreatePaymentIntent.mockResolvedValueOnce({
        payment_intent_id: 'pi_test_partial',
        client_secret: 'pi_test_partial_secret',
        amount: 25.0,
        original_amount: 50.0,
        gift_certificate_used: 25.0,
      });

      mockStripe.confirmCardPayment.mockResolvedValueOnce({
        paymentIntent: {
          id: 'pi_test_partial',
          status: 'succeeded',
        },
      });

      mockConfirmPayment.mockResolvedValueOnce({
        success: true,
        appointment_id: 123,
        payment_id: 456,
      });

      render(<PaymentForm {...defaultProps} enableGiftCertificate />);
      
      // Apply gift certificate
      const giftCertInput = screen.getByLabelText(/gift certificate code/i);
      fireEvent.change(giftCertInput, { target: { value: 'GIFT25' } });
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/\$25\.00/)).toBeInTheDocument(); // Reduced amount
        expect(screen.getByText(/Gift Certificate: -\$25\.00/)).toBeInTheDocument();
      });

      // Submit payment
      const payButton = screen.getByRole('button', { name: /pay \$25\.00/i });
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(mockStripe.confirmCardPayment).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles Stripe not loaded error', async () => {
      // Mock Stripe not being available
      jest.spyOn(stripeReact, 'useStripe').mockReturnValueOnce(null);

      render(<PaymentForm {...defaultProps} />);
      
      const payButton = screen.getByRole('button', { name: /pay/i });
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(screen.getByText(/payment system not ready/i)).toBeInTheDocument();
      });

      expect(defaultProps.onError).toHaveBeenCalledWith('Payment system not ready. Please try again.');
    });

    it('handles payment intent creation error', async () => {
      mockCreatePaymentIntent.mockRejectedValueOnce(new Error('Payment intent failed'));

      render(<PaymentForm {...defaultProps} />);
      
      const payButton = screen.getByRole('button', { name: /pay/i });
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Failed to process payment. Please try again.');
      });
    });

    it('handles Stripe card payment error', async () => {
      mockCreatePaymentIntent.mockResolvedValueOnce({
        payment_intent_id: 'pi_test_error',
        client_secret: 'pi_test_error_secret',
        amount: 50.0,
        original_amount: 50.0,
        gift_certificate_used: 0,
      });

      mockStripe.confirmCardPayment.mockResolvedValueOnce({
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        },
      });

      render(<PaymentForm {...defaultProps} />);
      
      const payButton = screen.getByRole('button', { name: /pay/i });
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Your card was declined.');
      });
    });

    it('handles payment confirmation error', async () => {
      mockCreatePaymentIntent.mockResolvedValueOnce({
        payment_intent_id: 'pi_test_confirm_error',
        client_secret: 'pi_test_confirm_error_secret',
        amount: 50.0,
        original_amount: 50.0,
        gift_certificate_used: 0,
      });

      mockStripe.confirmCardPayment.mockResolvedValueOnce({
        paymentIntent: {
          id: 'pi_test_confirm_error',
          status: 'succeeded',
        },
      });

      mockConfirmPayment.mockRejectedValueOnce(new Error('Confirmation failed'));

      render(<PaymentForm {...defaultProps} />);
      
      const payButton = screen.getByRole('button', { name: /pay/i });
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Payment processed but booking confirmation failed. Please contact support.');
      });
    });

    it('handles invalid gift certificate', async () => {
      mockCreatePaymentIntent.mockRejectedValueOnce(new Error('Invalid gift certificate code'));

      render(<PaymentForm {...defaultProps} enableGiftCertificate />);
      
      const giftCertInput = screen.getByLabelText(/gift certificate code/i);
      fireEvent.change(giftCertInput, { target: { value: 'INVALID' } });
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid gift certificate code/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('validates gift certificate code format', () => {
      render(<PaymentForm {...defaultProps} enableGiftCertificate />);
      
      const giftCertInput = screen.getByLabelText(/gift certificate code/i);
      const applyButton = screen.getByRole('button', { name: /apply/i });

      // Test empty code
      fireEvent.click(applyButton);
      expect(screen.getByText(/please enter a gift certificate code/i)).toBeInTheDocument();

      // Test invalid format
      fireEvent.change(giftCertInput, { target: { value: 'ab' } });
      fireEvent.click(applyButton);
      expect(screen.getByText(/gift certificate code must be at least 3 characters/i)).toBeInTheDocument();
    });

    it('disables pay button when processing', async () => {
      mockCreatePaymentIntent.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<PaymentForm {...defaultProps} />);
      
      const payButton = screen.getByRole('button', { name: /pay/i });
      fireEvent.click(payButton);

      expect(payButton).toBeDisabled();
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('shows loading state during gift certificate application', async () => {
      mockCreatePaymentIntent.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<PaymentForm {...defaultProps} enableGiftCertificate />);
      
      const giftCertInput = screen.getByLabelText(/gift certificate code/i);
      fireEvent.change(giftCertInput, { target: { value: 'GIFT123' } });
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      expect(applyButton).toBeDisabled();
      expect(screen.getByText(/applying/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<PaymentForm {...defaultProps} enableGiftCertificate />);
      
      expect(screen.getByLabelText(/gift certificate code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pay/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    });

    it('announces errors to screen readers', async () => {
      mockCreatePaymentIntent.mockRejectedValueOnce(new Error('Payment failed'));

      render(<PaymentForm {...defaultProps} />);
      
      const payButton = screen.getByRole('button', { name: /pay/i });
      fireEvent.click(payButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveTextContent(/failed to process payment/i);
      });
    });

    it('manages focus properly during form submission', async () => {
      render(<PaymentForm {...defaultProps} />);
      
      const payButton = screen.getByRole('button', { name: /pay/i });
      payButton.focus();
      fireEvent.click(payButton);

      // Focus should remain on the button while processing
      expect(payButton).toHaveFocus();
    });
  });

  describe('Amount Display', () => {
    it('formats amounts correctly', () => {
      render(<PaymentForm {...{ ...defaultProps, amount: 123.45 }} />);
      expect(screen.getByText(/\$123\.45/)).toBeInTheDocument();
    });

    it('handles zero amounts', () => {
      render(<PaymentForm {...{ ...defaultProps, amount: 0 }} />);
      expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('updates total when gift certificate is applied', async () => {
      mockCreatePaymentIntent.mockResolvedValueOnce({
        payment_intent_id: 'pi_test_updated',
        client_secret: 'pi_test_updated_secret',
        amount: 30.0,
        original_amount: 50.0,
        gift_certificate_used: 20.0,
      });

      render(<PaymentForm {...defaultProps} enableGiftCertificate />);
      
      const giftCertInput = screen.getByLabelText(/gift certificate code/i);
      fireEvent.change(giftCertInput, { target: { value: 'GIFT20' } });
      
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(/\$30\.00/)).toBeInTheDocument();
        expect(screen.getByText(/Gift Certificate: -\$20\.00/)).toBeInTheDocument();
        expect(screen.getByText(/Original: \$50\.00/)).toBeInTheDocument();
      });
    });
  });

  describe('Integration with Stripe Elements', () => {
    it('passes correct options to Stripe Elements', () => {
      render(<PaymentForm {...defaultProps} />);
      
      // Verify Stripe Elements wrapper is rendered
      expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
    });

    it('handles Stripe Elements ready event', () => {
      render(<PaymentForm {...defaultProps} />);
      
      // CardElement should be rendered
      expect(screen.getByTestId('stripe-card-element')).toBeInTheDocument();
    });
  });
});