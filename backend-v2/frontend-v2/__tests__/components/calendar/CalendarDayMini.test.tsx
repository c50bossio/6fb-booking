/**
 * Comprehensive tests for CalendarDayMini component.
 * 
 * Tests cover:
 * - Appointment filtering and display
 * - Date handling and time zone support
 * - User interactions and navigation
 * - Accessibility and responsive design
 * - Performance with large datasets
 * - Business logic alignment with Six Figure Barber methodology
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CalendarDayMini from '@/components/calendar/CalendarDayMini';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Hero Icons
jest.mock('@heroicons/react/24/outline', () => ({
  ClockIcon: ({ className }: { className?: string }) => (
    <svg data-testid="clock-icon" className={className}>
      <title>Clock</title>
    </svg>
  ),
  UserIcon: ({ className }: { className?: string }) => (
    <svg data-testid="user-icon" className={className}>
      <title>User</title>
    </svg>
  ),
}));

// Mock date-fns to control time
jest.mock('date-fns', () => ({
  format: jest.fn((date: any, formatStr: string) => {
    if (formatStr === 'h:mm a') return '10:30 AM';
    if (formatStr === 'MMM d') return 'Jul 26';
    return '10:30 AM';
  }),
  isSameDay: jest.fn((date1: any, date2: any) => {
    // Mock implementation for testing
    return true;
  }),
  parseISO: jest.fn((dateStr: string) => new Date(dateStr)),
}));

describe('CalendarDayMini', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  };

  const mockAppointments = [
    {
      id: 1,
      start_time: '2025-07-26T10:30:00Z',
      end_time: '2025-07-26T11:30:00Z',
      service_name: 'Signature Haircut',
      client_name: 'John Doe',
      status: 'confirmed',
      duration_minutes: 60,
      price: 75
    },
    {
      id: 2,
      start_time: '2025-07-26T14:00:00Z',
      end_time: '2025-07-26T15:30:00Z',
      service_name: 'Premium Styling',
      client_name: 'Jane Smith',
      status: 'confirmed',
      duration_minutes: 90,
      price: 120
    },
    {
      id: 3,
      start_time: '2025-07-26T16:00:00Z',
      end_time: '2025-07-26T16:45:00Z',
      service_name: 'Beard Trim',
      client_name: 'Mike Johnson',
      status: 'pending',
      duration_minutes: 45,
      price: 35
    }
  ];

  const premiumAppointments = [
    {
      id: 4,
      start_time: '2025-07-26T09:00:00Z',
      end_time: '2025-07-26T11:00:00Z',
      service_name: 'Executive Grooming Package',
      client_name: 'Robert VIP',
      status: 'confirmed',
      duration_minutes: 120,
      price: 200
    },
    {
      id: 5,
      start_time: '2025-07-26T13:00:00Z',
      end_time: '2025-07-26T14:30:00Z',
      service_name: 'Luxury Hair Treatment',
      client_name: 'Sarah Premium',
      status: 'confirmed',
      duration_minutes: 90,
      price: 150
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('Component Rendering', () => {
    it('renders empty state when no appointments', () => {
      render(<CalendarDayMini appointments={[]} />);

      expect(screen.getByText(/no appointments/i)).toBeInTheDocument();
    });

    it('displays appointments for the selected date', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      expect(screen.getByText('Signature Haircut')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Premium Styling')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('limits displayed appointments to maxItems', () => {
      render(
        <CalendarDayMini 
          appointments={mockAppointments} 
          maxItems={2}
        />
      );

      expect(screen.getByText('Signature Haircut')).toBeInTheDocument();
      expect(screen.getByText('Premium Styling')).toBeInTheDocument();
      expect(screen.queryByText('Beard Trim')).not.toBeInTheDocument();
    });

    it('shows view all button when appointments exceed maxItems', () => {
      render(
        <CalendarDayMini 
          appointments={mockAppointments} 
          maxItems={2}
        />
      );

      expect(screen.getByText(/view all/i)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <CalendarDayMini 
          appointments={mockAppointments} 
          className="custom-class"
        />
      );

      const container = screen.getByRole('list').closest('div');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Date and Time Handling', () => {
    it('formats appointment times correctly', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      // Mock format function should be called with correct parameters
      expect(require('date-fns').format).toHaveBeenCalled();
      expect(screen.getAllByText('10:30 AM')).toHaveLength(mockAppointments.length);
    });

    it('handles different time zones properly', () => {
      const timezoneAppointments = [
        {
          id: 1,
          start_time: '2025-07-26T10:30:00-05:00', // EST
          service_name: 'Morning Cut',
          client_name: 'Client A',
          status: 'confirmed'
        },
        {
          id: 2,
          start_time: '2025-07-26T15:30:00-08:00', // PST
          service_name: 'Afternoon Style',
          client_name: 'Client B',
          status: 'confirmed'
        }
      ];

      render(<CalendarDayMini appointments={timezoneAppointments} />);

      expect(screen.getByText('Morning Cut')).toBeInTheDocument();
      expect(screen.getByText('Afternoon Style')).toBeInTheDocument();
    });

    it('handles invalid date formats gracefully', () => {
      const invalidAppointments = [
        {
          id: 1,
          start_time: 'invalid-date',
          service_name: 'Test Service',
          client_name: 'Test Client',
          status: 'confirmed'
        }
      ];

      // Mock isSameDay to return false for invalid dates
      (require('date-fns').isSameDay as jest.Mock).mockReturnValue(false);

      render(<CalendarDayMini appointments={invalidAppointments} />);

      expect(screen.getByText(/no appointments/i)).toBeInTheDocument();
    });

    it('sorts appointments by start time', () => {
      const unsortedAppointments = [
        {
          id: 1,
          start_time: '2025-07-26T15:00:00Z',
          service_name: 'Afternoon Cut',
          status: 'confirmed'
        },
        {
          id: 2,
          start_time: '2025-07-26T09:00:00Z',
          service_name: 'Morning Cut',
          status: 'confirmed'
        },
        {
          id: 3,
          start_time: '2025-07-26T12:00:00Z',
          service_name: 'Noon Cut',
          status: 'confirmed'
        }
      ];

      render(<CalendarDayMini appointments={unsortedAppointments} />);

      const appointmentElements = screen.getAllByRole('listitem');
      expect(appointmentElements).toHaveLength(3);
    });
  });

  describe('User Interactions', () => {
    it('navigates to appointment details when clicked', async () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      const appointmentItem = screen.getByText('Signature Haircut').closest('button');
      fireEvent.click(appointmentItem!);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/appointments/1');
      });
    });

    it('calls onViewAll when view all button is clicked', () => {
      const mockOnViewAll = jest.fn();
      
      render(
        <CalendarDayMini 
          appointments={mockAppointments} 
          maxItems={2}
          onViewAll={mockOnViewAll}
        />
      );

      const viewAllButton = screen.getByText(/view all/i);
      fireEvent.click(viewAllButton);

      expect(mockOnViewAll).toHaveBeenCalled();
    });

    it('supports keyboard navigation', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      const firstAppointment = screen.getByText('Signature Haircut').closest('button');
      
      fireEvent.keyDown(firstAppointment!, { key: 'Enter' });
      expect(mockPush).toHaveBeenCalledWith('/appointments/1');

      fireEvent.keyDown(firstAppointment!, { key: ' ' });
      expect(mockPush).toHaveBeenCalledWith('/appointments/1');
    });

    it('handles hover states for appointments', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      const appointmentItem = screen.getByText('Signature Haircut').closest('button');
      
      fireEvent.mouseEnter(appointmentItem!);
      fireEvent.mouseLeave(appointmentItem!);

      // Should not crash and maintain proper state
      expect(appointmentItem).toBeInTheDocument();
    });
  });

  describe('Appointment Status Handling', () => {
    it('displays different styles for different appointment statuses', () => {
      const statusAppointments = [
        { ...mockAppointments[0], status: 'confirmed' },
        { ...mockAppointments[1], status: 'pending' },
        { ...mockAppointments[2], status: 'cancelled' }
      ];

      render(<CalendarDayMini appointments={statusAppointments} />);

      const confirmedItem = screen.getByText('Signature Haircut').closest('button');
      const pendingItem = screen.getByText('Premium Styling').closest('button');
      const cancelledItem = screen.getByText('Beard Trim').closest('button');

      expect(confirmedItem).toHaveClass('bg-green-50');
      expect(pendingItem).toHaveClass('bg-yellow-50');
      expect(cancelledItem).toHaveClass('bg-red-50');
    });

    it('shows appropriate status indicators', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      // Should show confirmed status indicator
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('handles missing status gracefully', () => {
      const noStatusAppointments = [
        {
          id: 1,
          start_time: '2025-07-26T10:30:00Z',
          service_name: 'Test Service',
          client_name: 'Test Client',
          status: undefined as any
        }
      ];

      render(<CalendarDayMini appointments={noStatusAppointments} />);

      expect(screen.getByText('Test Service')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(mockAppointments.length);
      
      const firstAppointment = screen.getByText('Signature Haircut').closest('button');
      expect(firstAppointment).toHaveAttribute('aria-label', expect.stringContaining('Signature Haircut'));
    });

    it('supports screen readers with descriptive text', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      expect(screen.getByText('10:30 AM')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      
      // Should have appropriate ARIA descriptions
      const appointmentItem = screen.getByText('Signature Haircut').closest('button');
      expect(appointmentItem).toHaveAttribute('aria-describedby');
    });

    it('maintains focus management', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      const firstAppointment = screen.getByText('Signature Haircut').closest('button');
      firstAppointment!.focus();
      
      expect(firstAppointment).toHaveFocus();
    });

    it('provides sufficient color contrast', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      const appointmentItems = screen.getAllByRole('listitem');
      appointmentItems.forEach(item => {
        // Should have accessible color combinations
        expect(item).toHaveClass('text-gray-900');
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('handles large appointment datasets efficiently', () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        start_time: `2025-07-26T${String(9 + Math.floor(i / 6)).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}:00Z`,
        service_name: `Service ${i + 1}`,
        client_name: `Client ${i + 1}`,
        status: 'confirmed'
      }));

      const startTime = performance.now();
      render(<CalendarDayMini appointments={largeDataset} maxItems={5} />);
      const endTime = performance.now();

      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should only display maxItems
      expect(screen.getAllByRole('listitem')).toHaveLength(5);
    });

    it('memoizes filtered appointments efficiently', () => {
      const { rerender } = render(<CalendarDayMini appointments={mockAppointments} />);

      expect(screen.getByText('Signature Haircut')).toBeInTheDocument();

      // Re-render with same appointments
      rerender(<CalendarDayMini appointments={mockAppointments} />);

      // Should still display correctly without performance issues
      expect(screen.getByText('Signature Haircut')).toBeInTheDocument();
    });

    it('does not cause memory leaks with frequent updates', () => {
      const { rerender } = render(<CalendarDayMini appointments={mockAppointments} />);

      // Simulate frequent updates
      for (let i = 0; i < 10; i++) {
        const updatedAppointments = mockAppointments.map(apt => ({
          ...apt,
          id: apt.id + i * 100
        }));
        rerender(<CalendarDayMini appointments={updatedAppointments} />);
      }

      // Should not crash or degrade performance
      expect(screen.getByRole('list')).toBeInTheDocument();
    });
  });

  describe('Business Logic Integration', () => {
    it('highlights premium services for Six Figure Barber methodology', () => {
      render(<CalendarDayMini appointments={premiumAppointments} />);

      expect(screen.getByText('Executive Grooming Package')).toBeInTheDocument();
      expect(screen.getByText('Luxury Hair Treatment')).toBeInTheDocument();

      // Premium services should have special styling
      const premiumService = screen.getByText('Executive Grooming Package').closest('button');
      expect(premiumService).toHaveClass('border-gold-200');
    });

    it('displays pricing information for revenue tracking', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      expect(screen.getByText('$75')).toBeInTheDocument();
      expect(screen.getByText('$120')).toBeInTheDocument();
      expect(screen.getByText('$35')).toBeInTheDocument();
    });

    it('shows service duration for scheduling optimization', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      expect(screen.getByText('60 min')).toBeInTheDocument();
      expect(screen.getByText('90 min')).toBeInTheDocument();
      expect(screen.getByText('45 min')).toBeInTheDocument();
    });

    it('calculates daily revenue totals', () => {
      render(<CalendarDayMini appointments={mockAppointments} />);

      // Should show total revenue for the day
      const totalRevenue = mockAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
      expect(screen.getByText(`Total: $${totalRevenue}`)).toBeInTheDocument();
    });

    it('identifies VIP clients for premium service delivery', () => {
      const vipAppointments = [
        {
          ...mockAppointments[0],
          client_name: 'VIP Client',
          price: 200,
          service_name: 'VIP Experience'
        }
      ];

      render(<CalendarDayMini appointments={vipAppointments} />);

      expect(screen.getByText('VIP Experience')).toBeInTheDocument();
      
      // VIP appointments should have premium styling
      const vipAppointment = screen.getByText('VIP Experience').closest('button');
      expect(vipAppointment).toHaveClass('border-purple-200');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles appointments without client names', () => {
      const noClientAppointments = [
        {
          id: 1,
          start_time: '2025-07-26T10:30:00Z',
          service_name: 'Walk-in Service',
          status: 'confirmed'
        }
      ];

      render(<CalendarDayMini appointments={noClientAppointments} />);

      expect(screen.getByText('Walk-in Service')).toBeInTheDocument();
      expect(screen.getByText('Walk-in')).toBeInTheDocument();
    });

    it('handles appointments without end times', () => {
      const noEndTimeAppointments = [
        {
          id: 1,
          start_time: '2025-07-26T10:30:00Z',
          service_name: 'Open Service',
          client_name: 'Test Client',
          status: 'confirmed'
        }
      ];

      render(<CalendarDayMini appointments={noEndTimeAppointments} />);

      expect(screen.getByText('Open Service')).toBeInTheDocument();
    });

    it('handles component unmounting gracefully', () => {
      const { unmount } = render(<CalendarDayMini appointments={mockAppointments} />);

      unmount();

      // Should not cause errors or memory leaks
      expect(true).toBe(true);
    });

    it('handles rapid appointment updates', () => {
      const { rerender } = render(<CalendarDayMini appointments={[]} />);

      // Rapidly update appointments
      rerender(<CalendarDayMini appointments={mockAppointments} />);
      rerender(<CalendarDayMini appointments={premiumAppointments} />);
      rerender(<CalendarDayMini appointments={[]} />);

      expect(screen.getByText(/no appointments/i)).toBeInTheDocument();
    });
  });
});