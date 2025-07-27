/**
 * Comprehensive unit tests for Six Figure Barber methodology frontend components.
 * Tests revenue optimization, client value tracking, and business efficiency interfaces.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';

// Import Six Figure Barber components
import { SixFigureAnalyticsDashboard } from '@/components/analytics/SixFigureAnalyticsDashboard';
import { SixFigureBarberDashboard } from '@/components/six-figure-barber/SixFigureBarberDashboard';
import { BusinessEfficiencyAnalytics } from '@/components/six-figure-barber/BusinessEfficiencyAnalytics';
import { ClientValueManagementInterface } from '@/components/six-figure-barber/ClientValueManagementInterface';
import { ProfessionalGrowthTracking } from '@/components/six-figure-barber/ProfessionalGrowthTracking';
import { ServiceExcellenceMonitoring } from '@/components/six-figure-barber/ServiceExcellenceMonitoring';
import { SixFigureGoalTracker } from '@/components/analytics/SixFigureGoalTracker';

// Mock API modules
jest.mock('@/lib/six-figure-barber-api', () => ({
  getSixFigureAnalytics: jest.fn(),
  updateSixFigureGoal: jest.fn(),
  getClientValueMetrics: jest.fn(),
  getRevenueOptimizationData: jest.fn(),
  getBusinessEfficiencyMetrics: jest.fn(),
  trackServiceExcellence: jest.fn(),
  getProfessionalGrowthData: jest.fn(),
}));

jest.mock('@/lib/six-figure-barber-crm-api', () => ({
  getClientJourneyData: jest.fn(),
  updateClientValueScore: jest.fn(),
  identifyRevenueOpportunities: jest.fn(),
  generateRetentionPlan: jest.fn(),
}));

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

// Mock data factories
const mockSixFigureAnalyticsData = {
  revenueMetrics: {
    monthlyRevenue: 12500,
    revenuePerHour: 125,
    yearToDateRevenue: 98750,
    goalProgress: 65.8,
  },
  clientMetrics: {
    totalClients: 145,
    retentionRate: 87.5,
    averageClientValue: 850,
    newClientsThisMonth: 12,
  },
  serviceExcellence: {
    satisfactionScore: 4.8,
    onTimePercentage: 95,
    rebookingRate: 88,
    referralRate: 22,
  },
  goals: {
    annualTarget: 150000,
    currentProgress: 98750,
    monthlyTarget: 12500,
    onTrackForGoal: true,
  },
};

const mockClientValueData = [
  {
    id: 1,
    name: 'John Doe',
    tier: 'PLATINUM',
    lifetimeValue: 2400,
    lastVisit: '2024-01-15',
    valueScore: 92,
    retentionProbability: 95,
  },
  {
    id: 2,
    name: 'Jane Smith',
    tier: 'GOLD',
    lifetimeValue: 1200,
    lastVisit: '2024-01-10',
    valueScore: 78,
    retentionProbability: 82,
  },
];

const mockBusinessEfficiencyData = {
  scheduleOptimization: {
    currentUtilization: 85,
    optimalUtilization: 92,
    revenueOpportunity: 875,
  },
  serviceEfficiency: {
    averageServiceTime: 45,
    targetServiceTime: 40,
    efficiencyScore: 88,
  },
  resourceUtilization: {
    chairUtilization: 78,
    productUsage: 92,
    timeManagement: 85,
  },
};

describe('SixFigureAnalyticsDashboard', () => {
  const mockGetSixFigureAnalytics = require('@/lib/six-figure-barber-api').getSixFigureAnalytics;

  beforeEach(() => {
    mockGetSixFigureAnalytics.mockResolvedValue(mockSixFigureAnalyticsData);
  });

  test('renders revenue metrics correctly', async () => {
    renderWithQueryClient(<SixFigureAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('$12,500')).toBeInTheDocument(); // Monthly revenue
      expect(screen.getByText('$125/hr')).toBeInTheDocument(); // Revenue per hour
      expect(screen.getByText('65.8%')).toBeInTheDocument(); // Goal progress
    });
  });

  test('displays client metrics dashboard', async () => {
    renderWithQueryClient(<SixFigureAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('145')).toBeInTheDocument(); // Total clients
      expect(screen.getByText('87.5%')).toBeInTheDocument(); // Retention rate
      expect(screen.getByText('$850')).toBeInTheDocument(); // Average client value
    });
  });

  test('shows service excellence metrics', async () => {
    renderWithQueryClient(<SixFigureAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('4.8')).toBeInTheDocument(); // Satisfaction score
      expect(screen.getByText('95%')).toBeInTheDocument(); // On-time percentage
      expect(screen.getByText('88%')).toBeInTheDocument(); // Rebooking rate
    });
  });

  test('handles loading state', () => {
    mockGetSixFigureAnalytics.mockReturnValue(new Promise(() => {})); // Never resolves
    renderWithQueryClient(<SixFigureAnalyticsDashboard />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('handles error state gracefully', async () => {
    mockGetSixFigureAnalytics.mockRejectedValue(new Error('API Error'));
    renderWithQueryClient(<SixFigureAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/error loading analytics/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  test('refreshes data when retry button clicked', async () => {
    mockGetSixFigureAnalytics.mockRejectedValueOnce(new Error('API Error'))
                             .mockResolvedValueOnce(mockSixFigureAnalyticsData);
    
    renderWithQueryClient(<SixFigureAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('$12,500')).toBeInTheDocument();
    });
  });
});

describe('SixFigureGoalTracker', () => {
  const mockUpdateSixFigureGoal = require('@/lib/six-figure-barber-api').updateSixFigureGoal;

  beforeEach(() => {
    mockUpdateSixFigureGoal.mockResolvedValue({ success: true });
  });

  test('displays current goal progress', () => {
    const goalData = {
      annualTarget: 150000,
      currentProgress: 98750,
      monthlyTarget: 12500,
      onTrackForGoal: true,
    };

    renderWithQueryClient(<SixFigureGoalTracker goalData={goalData} />);

    expect(screen.getByText('$150,000')).toBeInTheDocument(); // Annual target
    expect(screen.getByText('$98,750')).toBeInTheDocument(); // Current progress
    expect(screen.getByText('On Track')).toBeInTheDocument(); // Status
  });

  test('allows updating goal target', async () => {
    const user = userEvent.setup();
    const goalData = {
      annualTarget: 150000,
      currentProgress: 98750,
      monthlyTarget: 12500,
      onTrackForGoal: true,
    };

    renderWithQueryClient(<SixFigureGoalTracker goalData={goalData} />);

    // Click edit goal button
    const editButton = screen.getByRole('button', { name: /edit goal/i });
    await user.click(editButton);

    // Update goal in input field
    const goalInput = screen.getByLabelText(/annual target/i);
    await user.clear(goalInput);
    await user.type(goalInput, '175000');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateSixFigureGoal).toHaveBeenCalledWith({
        annualTarget: 175000,
      });
    });
  });

  test('validates goal input', async () => {
    const user = userEvent.setup();
    const goalData = {
      annualTarget: 150000,
      currentProgress: 98750,
      monthlyTarget: 12500,
      onTrackForGoal: true,
    };

    renderWithQueryClient(<SixFigureGoalTracker goalData={goalData} />);

    const editButton = screen.getByRole('button', { name: /edit goal/i });
    await user.click(editButton);

    // Try to set goal below Six Figure threshold
    const goalInput = screen.getByLabelText(/annual target/i);
    await user.clear(goalInput);
    await user.type(goalInput, '80000');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/minimum six figure amount/i)).toBeInTheDocument();
    });
  });
});

describe('ClientValueManagementInterface', () => {
  const mockGetClientValueMetrics = require('@/lib/six-figure-barber-api').getClientValueMetrics;
  const mockUpdateClientValueScore = require('@/lib/six-figure-barber-crm-api').updateClientValueScore;

  beforeEach(() => {
    mockGetClientValueMetrics.mockResolvedValue(mockClientValueData);
    mockUpdateClientValueScore.mockResolvedValue({ success: true });
  });

  test('displays client value metrics list', async () => {
    renderWithQueryClient(<ClientValueManagementInterface />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('PLATINUM')).toBeInTheDocument();
      expect(screen.getByText('$2,400')).toBeInTheDocument();
    });
  });

  test('filters clients by tier', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ClientValueManagementInterface />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Filter by PLATINUM tier
    const tierFilter = screen.getByRole('combobox', { name: /filter by tier/i });
    await user.selectOptions(tierFilter, 'PLATINUM');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  test('sorts clients by value score', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ClientValueManagementInterface />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const sortButton = screen.getByRole('button', { name: /sort by value/i });
    await user.click(sortButton);

    // Verify sorting order (highest value first)
    const clientItems = screen.getAllByRole('listitem');
    expect(within(clientItems[0]).getByText('John Doe')).toBeInTheDocument();
    expect(within(clientItems[1]).getByText('Jane Smith')).toBeInTheDocument();
  });

  test('shows client retention probability', async () => {
    renderWithQueryClient(<ClientValueManagementInterface />);

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument(); // John's retention
      expect(screen.getByText('82%')).toBeInTheDocument(); // Jane's retention
    });
  });
});

describe('BusinessEfficiencyAnalytics', () => {
  const mockGetBusinessEfficiencyMetrics = require('@/lib/six-figure-barber-api').getBusinessEfficiencyMetrics;

  beforeEach(() => {
    mockGetBusinessEfficiencyMetrics.mockResolvedValue(mockBusinessEfficiencyData);
  });

  test('displays schedule optimization metrics', async () => {
    renderWithQueryClient(<BusinessEfficiencyAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument(); // Current utilization
      expect(screen.getByText('92%')).toBeInTheDocument(); // Optimal utilization
      expect(screen.getByText('$875')).toBeInTheDocument(); // Revenue opportunity
    });
  });

  test('shows efficiency improvement recommendations', async () => {
    renderWithQueryClient(<BusinessEfficiencyAnalytics />);

    await waitFor(() => {
      expect(screen.getByText(/efficiency recommendations/i)).toBeInTheDocument();
      expect(screen.getByText(/optimize schedule/i)).toBeInTheDocument();
    });
  });

  test('calculates efficiency score correctly', async () => {
    renderWithQueryClient(<BusinessEfficiencyAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('88')).toBeInTheDocument(); // Efficiency score
    });
  });
});

describe('ServiceExcellenceMonitoring', () => {
  const mockTrackServiceExcellence = require('@/lib/six-figure-barber-api').trackServiceExcellence;

  beforeEach(() => {
    mockTrackServiceExcellence.mockResolvedValue({ success: true });
  });

  test('tracks service completion quality', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<ServiceExcellenceMonitoring />);

    // Rate service quality
    const excellentRating = screen.getByRole('button', { name: /excellent/i });
    await user.click(excellentRating);

    // Add notes
    const notesInput = screen.getByLabelText(/service notes/i);
    await user.type(notesInput, 'Client very satisfied with results');

    // Submit tracking
    const submitButton = screen.getByRole('button', { name: /track service/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockTrackServiceExcellence).toHaveBeenCalledWith({
        quality: 'EXCELLENT',
        notes: 'Client very satisfied with results',
        timestamp: expect.any(String),
      });
    });
  });

  test('displays service excellence trends', async () => {
    const trendData = {
      weeklyAverage: 4.7,
      monthlyAverage: 4.8,
      improvementTrend: 'IMPROVING',
    };

    renderWithQueryClient(
      <ServiceExcellenceMonitoring trendData={trendData} />
    );

    expect(screen.getByText('4.7')).toBeInTheDocument(); // Weekly average
    expect(screen.getByText('4.8')).toBeInTheDocument(); // Monthly average
    expect(screen.getByText(/improving/i)).toBeInTheDocument();
  });
});

describe('ProfessionalGrowthTracking', () => {
  const mockGetProfessionalGrowthData = require('@/lib/six-figure-barber-api').getProfessionalGrowthData;

  const growthData = {
    skills: [
      { name: 'Customer Service', level: 85, target: 90 },
      { name: 'Technical Skills', level: 92, target: 95 },
      { name: 'Business Acumen', level: 78, target: 85 },
    ],
    certifications: [
      { name: 'Advanced Cutting', completed: true, date: '2024-01-15' },
      { name: 'Color Specialist', completed: false, target: '2024-06-01' },
    ],
    milestones: [
      { achievement: 'Reached $100k Revenue', date: '2024-01-01' },
      { achievement: '90% Client Retention', date: '2024-02-15' },
    ],
  };

  beforeEach(() => {
    mockGetProfessionalGrowthData.mockResolvedValue(growthData);
  });

  test('displays skill progress tracking', async () => {
    renderWithQueryClient(<ProfessionalGrowthTracking />);

    await waitFor(() => {
      expect(screen.getByText('Customer Service')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Technical Skills')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
    });
  });

  test('shows certification status', async () => {
    renderWithQueryClient(<ProfessionalGrowthTracking />);

    await waitFor(() => {
      expect(screen.getByText('Advanced Cutting')).toBeInTheDocument();
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
      expect(screen.getByText('Color Specialist')).toBeInTheDocument();
      expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    });
  });

  test('displays achievement milestones', async () => {
    renderWithQueryClient(<ProfessionalGrowthTracking />);

    await waitFor(() => {
      expect(screen.getByText('Reached $100k Revenue')).toBeInTheDocument();
      expect(screen.getByText('90% Client Retention')).toBeInTheDocument();
    });
  });
});

// Performance tests
describe('Performance Tests', () => {
  test('SixFigureAnalyticsDashboard renders within acceptable time', async () => {
    const startTime = performance.now();
    
    renderWithQueryClient(<SixFigureAnalyticsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });

  test('Large client list renders efficiently', async () => {
    const largeClientList = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Client ${i}`,
      tier: 'SILVER',
      lifetimeValue: 800,
      valueScore: 70,
    }));

    const mockGetClientValueMetrics = require('@/lib/six-figure-barber-api').getClientValueMetrics;
    mockGetClientValueMetrics.mockResolvedValue(largeClientList);

    const startTime = performance.now();
    
    renderWithQueryClient(<ClientValueManagementInterface />);
    
    await waitFor(() => {
      expect(screen.getByText('Client 0')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should handle large lists efficiently
    expect(renderTime).toBeLessThan(500);
  });
});

// Edge case tests
describe('Edge Cases', () => {
  test('handles empty analytics data', async () => {
    const mockGetSixFigureAnalytics = require('@/lib/six-figure-barber-api').getSixFigureAnalytics;
    mockGetSixFigureAnalytics.mockResolvedValue({
      revenueMetrics: null,
      clientMetrics: null,
      serviceExcellence: null,
      goals: null,
    });

    renderWithQueryClient(<SixFigureAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/no data available/i)).toBeInTheDocument();
    });
  });

  test('handles zero revenue scenarios', async () => {
    const zeroRevenueData = {
      ...mockSixFigureAnalyticsData,
      revenueMetrics: {
        monthlyRevenue: 0,
        revenuePerHour: 0,
        yearToDateRevenue: 0,
        goalProgress: 0,
      },
    };

    const mockGetSixFigureAnalytics = require('@/lib/six-figure-barber-api').getSixFigureAnalytics;
    mockGetSixFigureAnalytics.mockResolvedValue(zeroRevenueData);

    renderWithQueryClient(<SixFigureAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText(/getting started/i)).toBeInTheDocument();
    });
  });

  test('handles network timeouts gracefully', async () => {
    const mockGetSixFigureAnalytics = require('@/lib/six-figure-barber-api').getSixFigureAnalytics;
    mockGetSixFigureAnalytics.mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 100)
      )
    );

    renderWithQueryClient(<SixFigureAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});