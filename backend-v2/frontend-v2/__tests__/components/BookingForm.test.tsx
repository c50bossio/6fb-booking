/**
 * Comprehensive tests for BookingForm component.
 * 
 * Tests cover:
 * - Service selection
 * - Time slot selection
 * - Client information
 * - Form validation
 * - Booking submission
 * - Error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { BookingForm } from '@/components/BookingForm';
import * as api from '@/lib/api';

// Mock API calls
jest.mock('@/lib/api', () => ({
  getServices: jest.fn(),
  getAvailableTimeSlots: jest.fn(),
  createAppointment: jest.fn(),
  validateBookingRules: jest.fn(),
}));

const mockGetServices = api.getServices as jest.MockedFunction<typeof api.getServices>;
const mockGetAvailableTimeSlots = api.getAvailableTimeSlots as jest.MockedFunction<typeof api.getAvailableTimeSlots>;
const mockCreateAppointment = api.createAppointment as jest.MockedFunction<typeof api.createAppointment>;
const mockValidateBookingRules = api.validateBookingRules as jest.MockedFunction<typeof api.validateBookingRules>;

// Mock services data
const mockServices = [
  {
    id: 1,
    name: 'Haircut',
    description: 'Professional haircut',
    price: 30.0,
    duration_minutes: 30,
    category: 'HAIRCUT',
    is_bookable_online: true,
  },
  {
    id: 2,
    name: 'Beard Trim',
    description: 'Beard trimming and styling',
    price: 20.0,
    duration_minutes: 20,
    category: 'BEARD',
    is_bookable_online: true,
  },
  {
    id: 3,
    name: 'Hair Color',
    description: 'Professional hair coloring',
    price: 80.0,
    duration_minutes: 120,
    category: 'COLOR',
    is_bookable_online: false, // Not bookable online
  },
];

// Mock time slots data
const mockTimeSlots = [
  {
    time: '09:00',
    available: true,
    barber_id: 1,
    barber_name: 'John Doe',
  },
  {
    time: '09:30',
    available: true,
    barber_id: 1,
    barber_name: 'John Doe',
  },
  {
    time: '10:00',
    available: false,
    barber_id: 1,
    barber_name: 'John Doe',
  },
  {
    time: '10:30',
    available: true,
    barber_id: 2,
    barber_name: 'Jane Smith',
  },
];

describe('BookingForm', () => {
  const defaultProps = {
    onBookingSuccess: jest.fn(),
    onBookingError: jest.fn(),
    initialDate: new Date('2024-01-15'),
    barberId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServices.mockResolvedValue(mockServices);
    mockGetAvailableTimeSlots.mockResolvedValue(mockTimeSlots);
    mockValidateBookingRules.mockResolvedValue({ valid: true, violations: [] });
  });

  describe('Initial Rendering', () => {
    it('renders all form sections', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/select service/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/choose date & time/i)).toBeInTheDocument();
      expect(screen.getByText(/your information/i)).toBeInTheDocument();
    });

    it('loads services on mount', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetServices).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
        expect(screen.getByText('Beard Trim')).toBeInTheDocument();
      });

      // Should not show non-bookable services
      expect(screen.queryByText('Hair Color')).not.toBeInTheDocument();
    });

    it('shows loading state while fetching services', () => {
      mockGetServices.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<BookingForm {...defaultProps} />);

      expect(screen.getByText(/loading services/i)).toBeInTheDocument();
    });
  });

  describe('Service Selection', () => {
    it('allows selecting a service', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      const haircutService = screen.getByText('Haircut');
      fireEvent.click(haircutService);

      expect(haircutService.closest('div')).toHaveClass('selected');
      expect(screen.getByText('$30.00')).toBeInTheDocument();
      expect(screen.getByText('30 minutes')).toBeInTheDocument();
    });

    it('loads time slots when service is selected', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      const haircutService = screen.getByText('Haircut');
      fireEvent.click(haircutService);

      await waitFor(() => {
        expect(mockGetAvailableTimeSlots).toHaveBeenCalledWith({
          date: '2024-01-15',
          service_id: 1,
          barber_id: 1,
        });
      });
    });

    it('displays service information correctly', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      const serviceCard = screen.getByText('Haircut').closest('div');
      expect(within(serviceCard!).getByText('Professional haircut')).toBeInTheDocument();
      expect(within(serviceCard!).getByText('$30.00')).toBeInTheDocument();
      expect(within(serviceCard!).getByText('30 min')).toBeInTheDocument();
    });

    it('handles service selection change', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      // Select first service
      fireEvent.click(screen.getByText('Haircut'));

      await waitFor(() => {
        expect(mockGetAvailableTimeSlots).toHaveBeenCalledWith(
          expect.objectContaining({ service_id: 1 })
        );
      });

      jest.clearAllMocks();

      // Select different service
      fireEvent.click(screen.getByText('Beard Trim'));

      await waitFor(() => {
        expect(mockGetAvailableTimeSlots).toHaveBeenCalledWith(
          expect.objectContaining({ service_id: 2 })
        );
      });
    });
  });

  describe('Date and Time Selection', () => {
    beforeEach(async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      // Select a service to enable time selection
      fireEvent.click(screen.getByText('Haircut'));
    });

    it('displays available time slots', async () => {
      await waitFor(() => {
        expect(screen.getByText('9:00 AM')).toBeInTheDocument();
        expect(screen.getByText('9:30 AM')).toBeInTheDocument();
        expect(screen.getByText('10:30 AM')).toBeInTheDocument();
      });
    });

    it('disables unavailable time slots', async () => {
      await waitFor(() => {
        const unavailableSlot = screen.getByText('10:00 AM');
        expect(unavailableSlot.closest('button')).toBeDisabled();
      });
    });

    it('allows selecting available time slots', async () => {
      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.click(timeSlot);
        expect(timeSlot.closest('button')).toHaveClass('selected');
      });
    });

    it('shows barber information for selected time', async () => {
      await waitFor(() => {
        const timeSlot = screen.getByText('9:00 AM');
        fireEvent.click(timeSlot);
      });

      expect(screen.getByText('with John Doe')).toBeInTheDocument();
    });

    it('handles date change', async () => {
      const datePicker = screen.getByDisplayValue('2024-01-15');
      fireEvent.change(datePicker, { target: { value: '2024-01-16' } });

      await waitFor(() => {
        expect(mockGetAvailableTimeSlots).toHaveBeenCalledWith(
          expect.objectContaining({ date: '2024-01-16' })
        );
      });
    });

    it('validates date selection', async () => {
      const datePicker = screen.getByDisplayValue('2024-01-15');
      
      // Try to select past date
      fireEvent.change(datePicker, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(screen.getByText(/cannot select past dates/i)).toBeInTheDocument();
      });
    });
  });

  describe('Client Information', () => {
    beforeEach(async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      // Select service and time
      fireEvent.click(screen.getByText('Haircut'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('9:00 AM'));
      });
    });

    it('renders client information form', () => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      const bookButton = screen.getByRole('button', { name: /book appointment/i });
      
      await user.click(bookButton);

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/phone is required/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      const emailInput = screen.getByLabelText(/email/i);
      
      await user.type(emailInput, 'invalid-email');
      await user.tab(); // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('validates phone format', async () => {
      const user = userEvent.setup();
      const phoneInput = screen.getByLabelText(/phone/i);
      
      await user.type(phoneInput, '123');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument();
      });
    });

    it('formats phone number automatically', async () => {
      const user = userEvent.setup();
      const phoneInput = screen.getByLabelText(/phone/i);
      
      await user.type(phoneInput, '5551234567');

      expect(phoneInput).toHaveValue('(555) 123-4567');
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      // Complete form
      fireEvent.click(screen.getByText('Haircut'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('9:00 AM'));
      });

      // Fill client information
      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '(555) 123-4567' } });
    });

    it('submits booking successfully', async () => {
      mockCreateAppointment.mockResolvedValueOnce({
        id: 123,
        status: 'pending',
        start_time: '2024-01-15T09:00:00Z',
        service_name: 'Haircut',
        price: 30.0,
      });

      const bookButton = screen.getByRole('button', { name: /book appointment/i });
      fireEvent.click(bookButton);

      await waitFor(() => {
        expect(mockValidateBookingRules).toHaveBeenCalledWith({
          service_id: 1,
          date: '2024-01-15',
          time: '09:00',
          client_email: 'john@example.com',
        });
      });

      await waitFor(() => {
        expect(mockCreateAppointment).toHaveBeenCalledWith({
          service_id: 1,
          barber_id: 1,
          date: '2024-01-15',
          time: '09:00',
          client_first_name: 'John',
          client_last_name: 'Doe',
          client_email: 'john@example.com',
          client_phone: '(555) 123-4567',
          notes: '',
        });
      });

      await waitFor(() => {
        expect(defaultProps.onBookingSuccess).toHaveBeenCalledWith({
          id: 123,
          status: 'pending',
          start_time: '2024-01-15T09:00:00Z',
          service_name: 'Haircut',
          price: 30.0,
        });
      });
    });

    it('handles booking rule violations', async () => {
      mockValidateBookingRules.mockResolvedValueOnce({
        valid: false,
        violations: ['Service requires consultation first', 'Minimum 24 hours advance booking required'],
      });

      const bookButton = screen.getByRole('button', { name: /book appointment/i });
      fireEvent.click(bookButton);

      await waitFor(() => {
        expect(screen.getByText(/service requires consultation first/i)).toBeInTheDocument();
        expect(screen.getByText(/minimum 24 hours advance booking required/i)).toBeInTheDocument();
      });

      // Should not create appointment
      expect(mockCreateAppointment).not.toHaveBeenCalled();
    });

    it('handles appointment creation error', async () => {
      mockCreateAppointment.mockRejectedValueOnce(new Error('Booking failed'));

      const bookButton = screen.getByRole('button', { name: /book appointment/i });
      fireEvent.click(bookButton);

      await waitFor(() => {
        expect(defaultProps.onBookingError).toHaveBeenCalledWith('Failed to create booking. Please try again.');
      });
    });

    it('shows loading state during submission', async () => {
      mockCreateAppointment.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const bookButton = screen.getByRole('button', { name: /book appointment/i });
      fireEvent.click(bookButton);

      expect(bookButton).toBeDisabled();
      expect(screen.getByText(/creating booking/i)).toBeInTheDocument();
    });

    it('includes notes when provided', async () => {
      const notesTextarea = screen.getByLabelText(/notes/i);
      fireEvent.change(notesTextarea, { target: { value: 'Please use gate A' } });

      mockCreateAppointment.mockResolvedValueOnce({
        id: 123,
        status: 'pending',
      });

      const bookButton = screen.getByRole('button', { name: /book appointment/i });
      fireEvent.click(bookButton);

      await waitFor(() => {
        expect(mockCreateAppointment).toHaveBeenCalledWith(
          expect.objectContaining({
            notes: 'Please use gate A',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('handles service loading error', async () => {
      mockGetServices.mockRejectedValueOnce(new Error('Failed to load services'));

      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load services/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('handles time slots loading error', async () => {
      mockGetAvailableTimeSlots.mockRejectedValueOnce(new Error('Failed to load time slots'));

      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Haircut'));

      await waitFor(() => {
        expect(screen.getByText(/failed to load available times/i)).toBeInTheDocument();
      });
    });

    it('retries loading on error', async () => {
      mockGetServices
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockServices);

      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Haircut'));

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      });
    });

    it('announces form progress to screen readers', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        const progressIndicator = screen.getByRole('progressbar');
        expect(progressIndicator).toBeInTheDocument();
        expect(progressIndicator).toHaveAttribute('aria-valuenow', '1');
        expect(progressIndicator).toHaveAttribute('aria-valuemax', '3');
      });
    });

    it('manages focus properly through form steps', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Haircut'));

      // Focus should move to time selection section
      await waitFor(() => {
        const timeSection = screen.getByText(/choose date & time/i);
        expect(timeSection).toBeInTheDocument();
      });
    });

    it('provides error feedback for screen readers', async () => {
      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Haircut')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Haircut'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('9:00 AM'));
      });

      const bookButton = screen.getByRole('button', { name: /book appointment/i });
      fireEvent.click(bookButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<BookingForm {...defaultProps} />);

      const container = screen.getByTestId('booking-form');
      expect(container).toHaveClass('mobile-layout');
    });

    it('shows compact service cards on mobile', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<BookingForm {...defaultProps} />);

      await waitFor(() => {
        const serviceCard = screen.getByText('Haircut').closest('div');
        expect(serviceCard).toHaveClass('compact');
      });
    });
  });
});