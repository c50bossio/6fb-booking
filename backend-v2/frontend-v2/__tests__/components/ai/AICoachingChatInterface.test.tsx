/**
 * Comprehensive tests for AICoachingChatInterface component
 * 
 * Tests cover:
 * - Component rendering and initialization
 * - Agent selection and switching
 * - Message sending and receiving
 * - AI response generation
 * - Suggestion handling
 * - Chat history management
 * - Error handling
 * - Accessibility
 * - Mobile responsiveness
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { AICoachingChatInterface } from '@/components/ai/AICoachingChatInterface';

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

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn()
}));

// Mock ScrollArea component
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  )
}));

describe('AICoachingChatInterface', () => {
  const mockBusinessInsights = {
    daily_revenue: 780,
    weekly_revenue: 4200,
    monthly_revenue: 16800,
    client_retention_rate: 85,
    average_booking_value: 65,
    optimization_opportunities: [
      'Consider raising premium service prices by 15%',
      'Tuesday 2-4 PM shows consistent availability - perfect for marketing push'
    ],
    calendar_insights: {
      calendar_utilization_rate: 75
    },
    service_tier_distribution: {
      premium: 20
    },
    total_appointments: 100
  };

  const mockActiveAgent = {
    id: 'financial_coach',
    name: 'Marcus',
    title: 'Financial Coach',
    description: 'Revenue optimization and pricing strategies',
    personality: 'analytical and data-driven',
    greeting: "Hi! I'm Marcus, your Financial Coach. I help optimize your revenue and pricing strategies."
  };

  const defaultProps = {
    activeAgent: mockActiveAgent,
    onAgentChange: jest.fn(),
    className: 'test-chat-interface',
    businessInsights: mockBusinessInsights
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('renders chat interface with header', () => {
      render(<AICoachingChatInterface {...defaultProps} />);
      
      expect(screen.getByText('AI Business Coaching Chat')).toBeInTheDocument();
      expect(screen.getByText('Live Chat')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const container = screen.getByTestId('scroll-area').closest('div');
      expect(container).toHaveClass('test-chat-interface');
    });

    it('renders agent selection buttons', () => {
      render(<AICoachingChatInterface {...defaultProps} />);
      
      expect(screen.getByText('Marcus')).toBeInTheDocument();
      expect(screen.getByText('Sofia')).toBeInTheDocument();
      expect(screen.getByText('Alex')).toBeInTheDocument();
      expect(screen.getByText('Isabella')).toBeInTheDocument();
    });

    it('shows active agent as selected', () => {
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const marcusButton = screen.getByText('Marcus').closest('button');
      expect(marcusButton).toHaveClass('bg-green-500');
    });

    it('displays welcome message from active agent', async () => {
      render(<AICoachingChatInterface {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(mockActiveAgent.greeting)).toBeInTheDocument();
      });
    });

    it('shows initial suggestions', async () => {
      render(<AICoachingChatInterface {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText("What's my current revenue performance?")).toBeInTheDocument();
        expect(screen.getByText("How can I improve my pricing strategy?")).toBeInTheDocument();
        expect(screen.getByText("Show me client retention insights")).toBeInTheDocument();
        expect(screen.getByText("Help me optimize my schedule")).toBeInTheDocument();
      });
    });
  });

  describe('Agent Selection', () => {
    it('allows switching between agents', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const sofiaButton = screen.getByText('Sofia').closest('button');
      await user.click(sofiaButton!);

      expect(defaultProps.onAgentChange).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'growth_strategist',
          name: 'Sofia'
        })
      );
    });

    it('updates UI when agent changes', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const alexButton = screen.getByText('Alex').closest('button');
      await user.click(alexButton!);

      // Should show Alex as active
      expect(alexButton).toHaveClass('bg-purple-500');
    });

    it('clears messages when switching agents', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      // Wait for initial message
      await waitFor(() => {
        expect(screen.getByText(mockActiveAgent.greeting)).toBeInTheDocument();
      });

      // Switch agent
      const sofiaButton = screen.getByText('Sofia').closest('button');
      await user.click(sofiaButton!);

      // Should show new agent's greeting
      await waitFor(() => {
        expect(screen.getByText(/Hello! I'm Sofia/)).toBeInTheDocument();
      });
    });

    it('shows different agent personalities in greetings', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      // Switch to Brand Developer (Isabella)
      const isabellaButton = screen.getByText('Isabella').closest('button');
      await user.click(isabellaButton!);

      await waitFor(() => {
        expect(screen.getByText(/Hi there! I'm Isabella/)).toBeInTheDocument();
        expect(screen.getByText(/Brand Developer/)).toBeInTheDocument();
      });
    });
  });

  describe('Message Sending', () => {
    it('allows typing in input field', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Hello, how can you help me?');
      
      expect(input).toHaveValue('Hello, how can you help me?');
    });

    it('sends message when send button is clicked', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      const sendButton = screen.getByRole('button', { name: '' }); // Send button with icon
      
      await user.type(input, 'Test message');
      await user.click(sendButton);
      
      // Should display user message
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
      
      // Input should be cleared
      expect(input).toHaveValue('');
    });

    it('sends message when Enter key is pressed', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      
      await user.type(input, 'Test message{enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const sendButton = screen.getByRole('button', { name: '' });
      
      // Button should be disabled when input is empty
      expect(sendButton).toBeDisabled();
      
      // Try to send empty message
      await user.click(sendButton);
      
      // Should not add any new messages
      const messages = screen.getAllByTestId(/message/);
      expect(messages).toHaveLength(0); // Only welcome message
    });

    it('prevents sending while typing indicator is active', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      const sendButton = screen.getByRole('button', { name: '' });
      
      await user.type(input, 'First message');
      await user.click(sendButton);
      
      // While AI is "typing", input should be disabled
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  describe('AI Response Generation', () => {
    it('shows typing indicator while generating response', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'What is my revenue?');
      await user.keyboard('{enter}');
      
      // Should show typing indicator
      expect(screen.getByTestId(/typing/)).toBeInTheDocument();
    });

    it('generates contextual responses based on agent type', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Tell me about my revenue');
      await user.keyboard('{enter}');
      
      // Fast-forward timers to simulate response delay
      jest.advanceTimersByTime(1500);
      
      await waitFor(() => {
        expect(screen.getByText(/Based on your recent data/)).toBeInTheDocument();
        expect(screen.getByText(/averaging \$65 per service/)).toBeInTheDocument();
      });
    });

    it('provides different responses for different agent types', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      // Switch to Growth Strategist
      const sofiaButton = screen.getByText('Sofia').closest('button');
      await user.click(sofiaButton!);
      
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Ask Sofia anything/);
        return user.type(input, 'How can I improve client retention?');
      });
      
      const input = screen.getByPlaceholderText(/Ask Sofia anything/);
      await user.keyboard('{enter}');
      
      jest.advanceTimersByTime(1500);
      
      await waitFor(() => {
        expect(screen.getByText(/Your current retention rate of 85%/)).toBeInTheDocument();
        expect(screen.getByText(/Client Journey Mapping/)).toBeInTheDocument();
      });
    });

    it('includes business insights in responses', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Tell me about pricing');
      await user.keyboard('{enter}');
      
      jest.advanceTimersByTime(1500);
      
      await waitFor(() => {
        expect(screen.getByText(/averaging \$65 per service/)).toBeInTheDocument();
        expect(screen.getByText(/Tuesday 2-4 PM/)).toBeInTheDocument();
      });
    });

    it('provides follow-up suggestions after responses', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Tell me about revenue');
      await user.keyboard('{enter}');
      
      jest.advanceTimersByTime(1500);
      
      await waitFor(() => {
        expect(screen.getByText('Tell me more about premium positioning')).toBeInTheDocument();
        expect(screen.getByText('How do I implement dynamic pricing?')).toBeInTheDocument();
        expect(screen.getByText('What bundles should I create?')).toBeInTheDocument();
      });
    });
  });

  describe('Suggestion Handling', () => {
    it('allows clicking on suggestions to send them as messages', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText("What's my current revenue performance?")).toBeInTheDocument();
      });
      
      const suggestion = screen.getByText("What's my current revenue performance?");
      await user.click(suggestion);
      
      // Should add suggestion as user message
      await waitFor(() => {
        expect(screen.getByText("What's my current revenue performance?")).toBeInTheDocument();
      });
    });

    it('shows relevant suggestions for each agent type', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      // Switch to Operations Optimizer
      const alexButton = screen.getByText('Alex').closest('button');
      await user.click(alexButton!);
      
      await waitFor(() => {
        expect(screen.getByText(/Hey! I'm Alex/)).toBeInTheDocument();
      });
      
      // Should show operations-focused suggestions
      expect(screen.getByText('Optimize my schedule')).toBeInTheDocument();
      expect(screen.getByText('Reduce service times')).toBeInTheDocument();
    });

    it('updates suggestions after AI responses', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Tell me about revenue');
      await user.keyboard('{enter}');
      
      jest.advanceTimersByTime(1500);
      
      await waitFor(() => {
        // New contextual suggestions should appear
        expect(screen.getByText('Tell me more about premium positioning')).toBeInTheDocument();
        expect(screen.getByText('How do I implement dynamic pricing?')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions', () => {
    it('shows quick action buttons', () => {
      render(<AICoachingChatInterface {...defaultProps} />);
      
      expect(screen.getByText('📊 Performance Overview')).toBeInTheDocument();
      expect(screen.getByText('⚡ Quick Wins')).toBeInTheDocument();
      expect(screen.getByText('🎯 Six FB Check')).toBeInTheDocument();
    });

    it('sends predefined messages when quick actions are clicked', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const performanceButton = screen.getByText('📊 Performance Overview');
      await user.click(performanceButton);
      
      await waitFor(() => {
        expect(screen.getByText("What's my current performance?")).toBeInTheDocument();
      });
    });

    it('works with Six Figure Barber methodology check', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const sixFbButton = screen.getByText('🎯 Six FB Check');
      await user.click(sixFbButton);
      
      await waitFor(() => {
        expect(screen.getByText(/How am I tracking against Six Figure Barber methodology/)).toBeInTheDocument();
      });
    });
  });

  describe('Message Display', () => {
    it('displays messages with correct styling for user and agent', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Test user message');
      await user.keyboard('{enter}');
      
      // User message should have blue styling
      const userMessage = screen.getByText('Test user message').closest('div');
      expect(userMessage).toHaveClass('bg-blue-500', 'text-white');
      
      jest.advanceTimersByTime(1500);
      
      // AI message should have gray styling
      await waitFor(() => {
        const aiMessage = screen.getByText(/I understand you're looking for financial guidance/).closest('div');
        expect(aiMessage).toHaveClass('bg-gray-100');
      });
    });

    it('shows timestamps for messages', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Test message');
      await user.keyboard('{enter}');
      
      await waitFor(() => {
        // Should show timestamp in HH:MM format
        expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
      });
    });

    it('displays agent avatars correctly', async () => {
      render(<AICoachingChatInterface {...defaultProps} />);
      
      await waitFor(() => {
        // Welcome message should show agent avatar
        const agentAvatar = screen.getByText(mockActiveAgent.greeting)
          .closest('div')?.querySelector('[data-testid="avatar"]');
        expect(agentAvatar).toBeInTheDocument();
      });
    });

    it('scrolls to bottom when new messages arrive', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      // Add multiple messages to trigger scrolling
      for (let i = 0; i < 5; i++) {
        const input = screen.getByPlaceholderText(/Ask Marcus anything/);
        await user.type(input, `Message ${i}`);
        await user.keyboard('{enter}');
        jest.advanceTimersByTime(100);
      }
      
      // Should scroll to show latest message
      const scrollArea = screen.getByTestId('scroll-area');
      expect(scrollArea.scrollTop).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles AI response generation errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock console.error to catch error logs
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Trigger error');
      await user.keyboard('{enter}');
      
      jest.advanceTimersByTime(1500);
      
      // Should show error toast
      const { toast } = require('@/components/ui/use-toast');
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "Communication Error",
          description: "Unable to connect with your AI coach. Please try again.",
          variant: "destructive"
        });
      });
      
      consoleSpy.mockRestore();
    });

    it('recovers gracefully from message processing errors', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      // Send a message that might cause processing error
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Test message');
      await user.keyboard('{enter}');
      
      // Even if AI response fails, user message should still be displayed
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons and inputs', () => {
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      expect(input).toHaveAttribute('aria-label');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('supports keyboard navigation between agent buttons', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const marcusButton = screen.getByText('Marcus').closest('button');
      const sofiaButton = screen.getByText('Sofia').closest('button');
      
      marcusButton?.focus();
      expect(document.activeElement).toBe(marcusButton);
      
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(sofiaButton);
    });

    it('announces new messages to screen readers', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      await user.type(input, 'Test message');
      await user.keyboard('{enter}');
      
      // Message should have appropriate ARIA attributes
      await waitFor(() => {
        const message = screen.getByText('Test message').closest('div');
        expect(message).toHaveAttribute('role', 'article');
      });
    });

    it('provides proper focus management in chat flow', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      
      // Focus should return to input after sending message
      await user.type(input, 'Test message');
      await user.keyboard('{enter}');
      
      expect(document.activeElement).toBe(input);
    });
  });

  describe('Responsive Design', () => {
    it('adapts agent selection layout for mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<AICoachingChatInterface {...defaultProps} />);

      // Check that agent buttons have appropriate mobile layout
      const agentGrid = screen.getByText('Marcus').closest('.grid');
      expect(agentGrid).toHaveClass('grid-cols-2');
    });

    it('adjusts message layout for small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<AICoachingChatInterface {...defaultProps} />);

      // Message bubbles should have appropriate max-width for mobile
      const welcomeMessage = screen.getByText(mockActiveAgent.greeting).closest('div');
      expect(welcomeMessage).toHaveClass('max-w-[80%]');
    });

    it('shows compact quick action buttons on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<AICoachingChatInterface {...defaultProps} />);

      const quickActions = screen.getByText('📊 Performance Overview').closest('div');
      expect(quickActions).toHaveClass('flex-wrap');
    });
  });

  describe('Performance', () => {
    it('efficiently handles message history', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      // Add many messages to test performance
      for (let i = 0; i < 20; i++) {
        const input = screen.getByPlaceholderText(/Ask Marcus anything/);
        await user.clear(input);
        await user.type(input, `Message ${i}`);
        await user.keyboard('{enter}');
        jest.advanceTimersByTime(50);
      }
      
      // Component should still be responsive
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      expect(input).toBeInTheDocument();
      expect(input).not.toBeDisabled();
    });

    it('debounces rapid typing in input field', async () => {
      const user = userEvent.setup();
      render(<AICoachingChatInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText(/Ask Marcus anything/);
      
      // Rapid typing should not cause performance issues
      await user.type(input, 'This is a very long message that is being typed rapidly');
      
      expect(input).toHaveValue('This is a very long message that is being typed rapidly');
    });
  });
});