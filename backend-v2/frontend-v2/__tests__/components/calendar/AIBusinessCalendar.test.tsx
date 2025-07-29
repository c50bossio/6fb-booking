/**
 * Comprehensive tests for AIBusinessCalendar component
 * 
 * Tests cover:
 * - Component rendering and initialization
 * - Agent selection and switching
 * - Business insights display
 * - Calendar integration
 * - Chat modal functionality
 * - API integrations
 * - Error handling
 * - Accessibility
 * - Mobile responsiveness
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { AIBusinessCalendar } from '@/components/calendar/AIBusinessCalendar';

// Mock dependencies
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      role: 'barber'
    }
  })
}));

jest.mock('@/hooks/useRealtimeCalendar', () => ({
  useRealtimeCalendar: () => ({
    isConnected: true,
    events: [],
    connectionStatus: 'connected'
  })
}));

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn()
}));

// Mock child components
jest.mock('@/components/calendar/CalendarWithBookingModal', () => ({
  CalendarWithBookingModal: ({ onAppointmentClick, appointments }) => (
    <div data-testid="calendar-with-booking-modal">
      <div>Mock Calendar</div>
      {appointments.map((apt) => (
        <button 
          key={apt.id}
          data-testid={`appointment-${apt.id}`}
          onClick={() => onAppointmentClick(apt)}
        >
          {apt.service_name} - {apt.client_name}
        </button>
      ))}
    </div>
  )
}));

jest.mock('@/components/calendar/AppointmentModal', () => ({
  AppointmentModal: ({ appointment, isOpen, onClose, onSave }) => isOpen ? (
    <div data-testid="appointment-modal">
      <h2>Appointment Details</h2>
      <p>{appointment.service_name}</p>
      <button data-testid="close-modal" onClick={onClose}>Close</button>
      <button data-testid="save-appointment" onClick={() => onSave(appointment)}>Save</button>
    </div>
  ) : null
}));

jest.mock('@/components/calendar/AIInsightsSidebar', () => ({
  AIInsightsSidebar: ({ activeAgent, businessInsights, onAgentMessage }) => (
    <div data-testid="ai-insights-sidebar">
      <div>AI Insights Sidebar</div>
      {activeAgent && <div data-testid="active-agent">{activeAgent.name}</div>}
      {businessInsights && (
        <div data-testid="business-insights">
          <span>Revenue: ${businessInsights.daily_revenue}</span>
        </div>
      )}
      <button 
        data-testid="trigger-agent-message"
        onClick={() => onAgentMessage && onAgentMessage('Test insight message')}
      >
        Send Test Message
      </button>
    </div>
  )
}));

jest.mock('@/components/ai/AICoachingChatInterface', () => ({
  AICoachingChatInterface: ({ activeAgent, onAgentChange, businessInsights }) => (
    <div data-testid="ai-coaching-chat-interface">
      <div>AI Coaching Chat</div>
      {activeAgent && <div data-testid="chat-active-agent">{activeAgent.name}</div>}
      <div data-testid="agent-selector">
        <button 
          data-testid="select-financial-coach"
          onClick={() => onAgentChange({ id: 'financial_coach', name: 'Marcus' })}
        >
          Select Financial Coach
        </button>
        <button 
          data-testid="select-growth-strategist"
          onClick={() => onAgentChange({ id: 'growth_strategist', name: 'Sofia' })}
        >
          Select Growth Strategist
        </button>
      </div>
    </div>
  )
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('AIBusinessCalendar', () => {
  const defaultProps = {
    className: 'test-calendar',
    showAIInsights: true,
    enableGoogleSync: true
  };

  const mockAppointments = [
    {
      id: 1,
      service_name: 'Premium Haircut',
      client_name: 'John Smith',
      start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      price: 85
    },
    {
      id: 2,
      service_name: 'Beard Trim',
      client_name: 'Mike Wilson',
      start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      price: 45
    }
  ];

  const mockBusinessInsights = {
    daily_revenue: 780,
    weekly_revenue: 4200,
    monthly_revenue: 16800,
    client_retention_rate: 85,
    average_booking_value: 65,
    optimization_opportunities: [
      'Consider raising premium service prices by 15%',
      'Tuesday 2-4 PM shows consistent availability - perfect for marketing push',
      'Your highest-value clients prefer morning slots - block more 9-11 AM times'
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses by default
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/v2/appointments/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ appointments: mockAppointments })
        });
      }
      
      if (url.includes('/api/v2/google-calendar/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: [] })
        });
      }
      
      if (url.includes('/api/v2/agents/analytics')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBusinessInsights)
        });
      }
      
      return Promise.resolve({
        ok: false,
        status: 404
      });
    });
  });

  describe('Initial Rendering', () => {
    it('renders loading state initially', () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      expect(screen.getByTestId(/loading/i)).toBeInTheDocument();
    });

    it('renders main components after loading', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Business Calendar')).toBeInTheDocument();
      });

      expect(screen.getByTestId('calendar-with-booking-modal')).toBeInTheDocument();
      expect(screen.getByTestId('ai-insights-sidebar')).toBeInTheDocument();
    });

    it('applies custom className', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        const container = screen.getByText('AI Business Calendar').closest('div');
        expect(container).toHaveClass('test-calendar');
      });
    });

    it('shows Google Calendar sync badge when enabled', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Google Calendar Synced')).toBeInTheDocument();
      });
    });

    it('hides AI insights when disabled', async () => {
      render(<AIBusinessCalendar {...defaultProps} showAIInsights={false} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('ai-insights-sidebar')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('loads appointments from API', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v2/appointments/');
      });

      await waitFor(() => {
        expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
        expect(screen.getByText('Premium Haircut - John Smith')).toBeInTheDocument();
      });
    });

    it('loads Google Calendar events when sync is enabled', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v2/google-calendar/events');
      });
    });

    it('skips Google Calendar when sync is disabled', async () => {
      render(<AIBusinessCalendar {...defaultProps} enableGoogleSync={false} />);
      
      await waitFor(() => {
        expect(global.fetch).not.toHaveBeenCalledWith('/api/v2/google-calendar/events');
      });
    });

    it('loads business insights for AI features', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/v2/agents/analytics');
      });
    });

    it('handles API errors gracefully with demo data', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        // Should still show content with demo data
        expect(screen.getByText('AI Business Calendar')).toBeInTheDocument();
      });
    });
  });

  describe('Business Insights Display', () => {
    it('displays quick insights cards', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText("Today's Revenue")).toBeInTheDocument();
        expect(screen.getByText('$780')).toBeInTheDocument();
        expect(screen.getByText('Weekly Revenue')).toBeInTheDocument();
        expect(screen.getByText('$4200')).toBeInTheDocument();
        expect(screen.getByText('Retention Rate')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('Avg Booking')).toBeInTheDocument();
        expect(screen.getByText('$65')).toBeInTheDocument();
      });
    });

    it('shows AI agent panels', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Business Coaches')).toBeInTheDocument();
        expect(screen.getByText('Financial Coach')).toBeInTheDocument();
        expect(screen.getByText('Growth Strategist')).toBeInTheDocument();
        expect(screen.getByText('Operations Optimizer')).toBeInTheDocument();
        expect(screen.getByText('Brand Developer')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Selection', () => {
    it('allows selecting AI agents', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Financial Coach')).toBeInTheDocument();
      });

      const financialCoach = screen.getByText('Financial Coach').closest('div');
      await user.click(financialCoach!);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('shows toast notification when agent is selected', async () => {
      const { toast } = require('@/components/ui/use-toast');
      const user = userEvent.setup();
      
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Financial Coach')).toBeInTheDocument();
      });

      const financialCoach = screen.getByText('Financial Coach').closest('div');
      await user.click(financialCoach!);

      expect(toast).toHaveBeenCalledWith({
        title: 'Financial Coach Activated',
        description: expect.stringContaining('revenue optimization')
      });
    });

    it('updates active agent in sidebar', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Financial Coach')).toBeInTheDocument();
      });

      const financialCoach = screen.getByText('Financial Coach').closest('div');
      await user.click(financialCoach!);

      await waitFor(() => {
        expect(screen.getByTestId('active-agent')).toHaveTextContent('Financial Coach');
      });
    });

    it('allows clicking chat button to open AI chat', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Financial Coach')).toBeInTheDocument();
      });

      const chatButton = screen.getAllByText('Chat')[0];
      await user.click(chatButton);

      expect(screen.getByTestId('ai-coaching-chat-interface')).toBeInTheDocument();
    });
  });

  describe('AI Chat Interface', () => {
    it('opens AI chat modal when button is clicked', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Chat')).toBeInTheDocument();
      });

      const aiChatButton = screen.getByText('AI Chat');
      await user.click(aiChatButton);

      expect(screen.getByTestId('ai-coaching-chat-interface')).toBeInTheDocument();
      expect(screen.getByText('AI Business Coaching')).toBeInTheDocument();
    });

    it('closes AI chat modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Chat')).toBeInTheDocument();
      });

      // Open chat
      const aiChatButton = screen.getByText('AI Chat');
      await user.click(aiChatButton);

      expect(screen.getByTestId('ai-coaching-chat-interface')).toBeInTheDocument();

      // Close chat
      const closeButton = screen.getByText('✕');
      await user.click(closeButton);

      expect(screen.queryByTestId('ai-coaching-chat-interface')).not.toBeInTheDocument();
    });

    it('sets default agent when opening chat for first time', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Chat')).toBeInTheDocument();
      });

      const aiChatButton = screen.getByText('AI Chat');
      await user.click(aiChatButton);

      // Should show default agent (first in list)
      expect(screen.getByTestId('chat-active-agent')).toBeInTheDocument();
    });

    it('allows changing agents from within chat interface', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Chat')).toBeInTheDocument();
      });

      const aiChatButton = screen.getByText('AI Chat');
      await user.click(aiChatButton);

      const selectButton = screen.getByTestId('select-growth-strategist');
      await user.click(selectButton);

      expect(screen.getByTestId('chat-active-agent')).toHaveTextContent('Sofia');
    });
  });

  describe('Appointment Interactions', () => {
    it('opens appointment modal when appointment is clicked', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
      });

      const appointment = screen.getByTestId('appointment-1');
      await user.click(appointment);

      expect(screen.getByTestId('appointment-modal')).toBeInTheDocument();
      expect(screen.getByText('Premium Haircut')).toBeInTheDocument();
    });

    it('closes appointment modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
      });

      // Open modal
      const appointment = screen.getByTestId('appointment-1');
      await user.click(appointment);

      expect(screen.getByTestId('appointment-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByTestId('close-modal');
      await user.click(closeButton);

      expect(screen.queryByTestId('appointment-modal')).not.toBeInTheDocument();
    });

    it('updates appointment when save is clicked', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
      });

      // Open modal and save
      const appointment = screen.getByTestId('appointment-1');
      await user.click(appointment);

      const saveButton = screen.getByTestId('save-appointment');
      await user.click(saveButton);

      // Modal should close after save
      expect(screen.queryByTestId('appointment-modal')).not.toBeInTheDocument();
    });
  });

  describe('UI Actions', () => {
    it('refreshes data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Refresh Data')).toBeInTheDocument();
      });

      // Clear mock calls
      jest.clearAllMocks();

      const refreshButton = screen.getByText('Refresh Data');
      await user.click(refreshButton);

      // Should reload the page (mocked as window.location.reload)
      expect(global.location.reload).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles appointment API error gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/v2/appointments/')) {
          return Promise.reject(new Error('Appointments API error'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<AIBusinessCalendar {...defaultProps} />);
      
      // Should not crash and should show demo data
      await waitFor(() => {
        expect(screen.getByText('AI Business Calendar')).toBeInTheDocument();
      });
    });

    it('handles Google Calendar API error gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/v2/google-calendar/events')) {
          return Promise.reject(new Error('Google Calendar API error'));
        }
        if (url.includes('/api/v2/appointments/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ appointments: mockAppointments })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Business Calendar')).toBeInTheDocument();
      });
    });

    it('handles business insights API error gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/api/v2/agents/analytics')) {
          return Promise.reject(new Error('Analytics API error'));
        }
        if (url.includes('/api/v2/appointments/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ appointments: mockAppointments })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<AIBusinessCalendar {...defaultProps} />);
      
      // Should show demo insights
      await waitFor(() => {
        expect(screen.getByText('AI Business Calendar')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for main sections', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ai chat/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh data/i })).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation for agent selection', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Financial Coach')).toBeInTheDocument();
      });

      const financialCoachCard = screen.getByText('Financial Coach').closest('div');
      
      // Should be focusable
      financialCoachCard?.focus();
      expect(document.activeElement).toBe(financialCoachCard);

      // Should activate on Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('announces agent messages to screen readers', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('trigger-agent-message')).toBeInTheDocument();
      });

      const triggerButton = screen.getByTestId('trigger-agent-message');
      await user.click(triggerButton);

      const { toast } = require('@/components/ui/use-toast');
      expect(toast).toHaveBeenCalledWith({
        title: expect.any(String),
        description: 'Test insight message',
        duration: 5000
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<AIBusinessCalendar {...defaultProps} />);

      // Check that the layout classes are appropriate for mobile
      const container = screen.getByText('AI Business Calendar').closest('div');
      expect(container).toHaveClass('space-y-6');
    });

    it('shows appropriate grid layout for different screen sizes', async () => {
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Business Calendar')).toBeInTheDocument();
      });

      // Check grid layout classes are present
      const insightsGrid = screen.getByText("Today's Revenue").closest('.grid');
      expect(insightsGrid).toHaveClass('grid-cols-2', 'lg:grid-cols-4');
    });
  });

  describe('Performance', () => {
    it('memoizes expensive callbacks', async () => {
      const { rerender } = render(<AIBusinessCalendar {...defaultProps} />);
      
      // Re-render with same props
      rerender(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('AI Business Calendar')).toBeInTheDocument();
      });

      // API should only be called once due to memoization
      expect(global.fetch).toHaveBeenCalledTimes(3); // appointments, calendar, insights
    });

    it('debounces rapid agent selections', async () => {
      const user = userEvent.setup();
      render(<AIBusinessCalendar {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Financial Coach')).toBeInTheDocument();
      });

      const financialCoach = screen.getByText('Financial Coach').closest('div');
      
      // Rapid clicks should be debounced
      await user.click(financialCoach!);
      await user.click(financialCoach!);
      await user.click(financialCoach!);

      const { toast } = require('@/components/ui/use-toast');
      
      // Should only toast once due to debouncing
      await waitFor(() => {
        expect(toast).toHaveBeenCalledTimes(1);
      });
    });
  });
});