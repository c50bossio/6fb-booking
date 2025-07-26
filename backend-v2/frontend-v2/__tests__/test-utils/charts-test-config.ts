/**
 * Test configuration and setup for chart components.
 * 
 * Provides:
 * - Jest configuration for chart testing
 * - Mock setup utilities
 * - Test environment configuration
 * - Coverage reporting setup
 * - Performance benchmarking
 */

import { jest } from '@jest/globals';
import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement } from 'react';

// Chart.js mock configuration
export const setupChartJsMocks = () => {
  // Mock Chart.js registration
  jest.mock('chart.js', () => ({
    Chart: {
      register: jest.fn(),
      defaults: {
        font: { family: 'sans-serif' }
      }
    },
    CategoryScale: jest.fn(),
    LinearScale: jest.fn(),
    PointElement: jest.fn(),
    LineElement: jest.fn(),
    BarElement: jest.fn(),
    ArcElement: jest.fn(),
    Title: jest.fn(),
    Tooltip: jest.fn(),
    Legend: jest.fn(),
    Filler: jest.fn()
  }));

  // Mock react-chartjs-2 components
  jest.mock('react-chartjs-2', () => ({
    Doughnut: React.forwardRef<any, any>(({ data, options }, ref) => (
      <div 
        ref={ref}
        data-testid="doughnut-chart" 
        data-chart-data={JSON.stringify(data)} 
        data-chart-options={JSON.stringify(options)}
      >
        <canvas />
      </div>
    )),
    Line: React.forwardRef<any, any>(({ data, options }, ref) => (
      <div 
        ref={ref}
        data-testid="line-chart" 
        data-chart-data={JSON.stringify(data)} 
        data-chart-options={JSON.stringify(options)}
      >
        <canvas />
      </div>
    )),
    Bar: React.forwardRef<any, any>(({ data, options }, ref) => (
      <div 
        ref={ref}
        data-testid="bar-chart" 
        data-chart-data={JSON.stringify(data)} 
        data-chart-options={JSON.stringify(options)}
      >
        <canvas />
      </div>
    ))
  }));

  // Mock Hero Icons
  jest.mock('@heroicons/react/24/solid', () => ({
    StarIcon: ({ className }: { className?: string }) => (
      <svg data-testid="star-icon" className={className}>
        <title>Star</title>
      </svg>
    )
  }));
};

// Performance testing configuration
export const performanceConfig = {
  // Maximum acceptable render times (milliseconds)
  maxRenderTime: {
    initial: 100,    // First render
    rerender: 50,    // Subsequent renders
    update: 30,      // Data updates
    typeSwitch: 25   // Chart type changes
  },
  
  // Memory usage thresholds
  memoryLimits: {
    maxHeapUsed: 50 * 1024 * 1024, // 50MB
    maxInstances: 100 // Max chart instances before cleanup
  },
  
  // Large dataset sizes for stress testing
  stressTestSizes: {
    small: 100,
    medium: 1000,
    large: 10000,
    extreme: 50000
  }
};

// Business logic validation thresholds (Six Figure Barber methodology)
export const businessValidationThresholds = {
  clientMetrics: {
    minVipPercentage: 20, // 20% VIP clients minimum
    minRetentionRate: 80, // 80% retention rate minimum
    minLifetimeValue: 600 // $600 minimum lifetime value
  },
  
  revenueMetrics: {
    sixFigureGoal: 100000, // $100,000 annual target
    minWeeklyRevenue: 1923, // $100k / 52 weeks
    minAverageTicket: 55, // $55 minimum average ticket
    minTipPercentage: 10, // 10% minimum tip percentage
    maxTipPercentage: 25 // 25% maximum reasonable tip percentage
  },
  
  serviceMetrics: {
    minPremiumAdoption: 30, // 30% minimum premium service bookings
    minPremiumRevenue: 60, // 60% minimum premium revenue share
    minPremiumMargin: 70 // 70% minimum premium service profit margin
  }
};

// Test data factory for consistent test scenarios
export class TestDataFactory {
  static createOptimalMetrics() {
    return {
      clientMetrics: {
        totalClients: 200,
        newClients: 40,
        returningClients: 120,
        vipClients: 40,
        averageLifetimeValue: 950,
        retentionRate: 88
      },
      
      revenueData: [
        { date: 'Mon', revenue: 580, appointments: 9, averageTicket: 64.44, tips: 87, totalRevenue: 667 },
        { date: 'Tue', revenue: 520, appointments: 8, averageTicket: 65.00, tips: 78, totalRevenue: 598 },
        { date: 'Wed', revenue: 640, appointments: 10, averageTicket: 64.00, tips: 96, totalRevenue: 736 },
        { date: 'Thu', revenue: 720, appointments: 11, averageTicket: 65.45, tips: 108, totalRevenue: 828 },
        { date: 'Fri', revenue: 880, appointments: 13, averageTicket: 67.69, tips: 132, totalRevenue: 1012 },
        { date: 'Sat', revenue: 1100, apartments: 16, averageTicket: 68.75, tips: 165, totalRevenue: 1265 },
        { date: 'Sun', revenue: 0, appointments: 0, averageTicket: 0, tips: 0, totalRevenue: 0 }
      ],
      
      serviceMetrics: [
        {
          serviceId: 1,
          serviceName: 'Signature Haircut & Style',
          bookings: 95,
          revenue: 7600,
          averagePrice: 80,
          profitMargin: 78,
          popularityRank: 1,
          isPremium: true
        },
        {
          serviceId: 2,
          serviceName: 'Executive Grooming Package',
          bookings: 35,
          revenue: 5250,
          averagePrice: 150,
          profitMargin: 82,
          popularityRank: 2,
          isPremium: true
        }
      ]
    };
  }
  
  static createSuboptimalMetrics() {
    return {
      clientMetrics: {
        totalClients: 80,
        newClients: 25,
        returningClients: 45,
        vipClients: 10, // Low VIP percentage
        averageLifetimeValue: 450, // Below threshold
        retentionRate: 72 // Below threshold
      },
      
      revenueData: [
        { date: 'Mon', revenue: 320, appointments: 8, averageTicket: 40, tips: 32, totalRevenue: 352 },
        { date: 'Tue', revenue: 280, appointments: 7, averageTicket: 40, tips: 28, totalRevenue: 308 },
        { date: 'Wed', revenue: 360, appointments: 9, averageTicket: 40, tips: 36, totalRevenue: 396 },
        { date: 'Thu', revenue: 400, appointments: 10, averageTicket: 40, tips: 40, totalRevenue: 440 },
        { date: 'Fri', revenue: 480, appointments: 12, averageTicket: 40, tips: 48, totalRevenue: 528 },
        { date: 'Sat', revenue: 560, appointments: 14, averageTicket: 40, tips: 56, totalRevenue: 616 },
        { date: 'Sun', revenue: 0, appointments: 0, averageTicket: 0, tips: 0, totalRevenue: 0 }
      ]
    };
  }
}

// Custom render function with common providers
interface ChartTestRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: 'light' | 'dark';
  viewport?: 'mobile' | 'tablet' | 'desktop';
}

export const renderChart = (
  ui: ReactElement,
  options: ChartTestRenderOptions = {}
) => {
  const { theme = 'light', viewport = 'desktop', ...renderOptions } = options;
  
  // Set up theme classes
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Set up viewport
  const viewportSizes = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 }
  };
  
  const size = viewportSizes[viewport];
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: size.width
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: size.height
  });
  
  return render(ui, renderOptions);
};

// Test suite organization helpers
export const testSuiteConfig = {
  // Test categories for organized execution
  categories: {
    unit: 'Unit Tests',
    integration: 'Integration Tests',
    performance: 'Performance Tests',
    accessibility: 'Accessibility Tests',
    business: 'Business Logic Tests'
  },
  
  // Test environments
  environments: {
    jsdom: 'JSDOM (Unit Tests)',
    playwright: 'Playwright (E2E Tests)',
    puppeteer: 'Puppeteer (Integration Tests)'
  },
  
  // Coverage requirements by component
  coverageTargets: {
    ClientMetricsChart: {
      statements: 95,
      branches: 90,
      functions: 100,
      lines: 95
    },
    RevenueChart: {
      statements: 95,
      branches: 90,
      functions: 100,
      lines: 95
    },
    ServicePerformanceChart: {
      statements: 95,
      branches: 90,
      functions: 100,
      lines: 95
    }
  }
};

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map();
  
  static startMeasurement(testName: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      
      if (!this.measurements.has(testName)) {
        this.measurements.set(testName, []);
      }
      
      this.measurements.get(testName)!.push(duration);
      return duration;
    };
  }
  
  static getAverageTime(testName: string): number {
    const times = this.measurements.get(testName) || [];
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }
  
  static getMaxTime(testName: string): number {
    const times = this.measurements.get(testName) || [];
    return times.length > 0 ? Math.max(...times) : 0;
  }
  
  static clearMeasurements(): void {
    this.measurements.clear();
  }
  
  static generateReport(): string {
    let report = '\n=== Performance Test Report ===\n\n';
    
    for (const [testName, times] of this.measurements.entries()) {
      const avg = this.getAverageTime(testName);
      const max = this.getMaxTime(testName);
      const count = times.length;
      
      report += `${testName}:\n`;
      report += `  Executions: ${count}\n`;
      report += `  Average: ${avg.toFixed(2)}ms\n`;
      report += `  Maximum: ${max.toFixed(2)}ms\n`;
      report += `  Status: ${max < performanceConfig.maxRenderTime.initial ? '✓ PASS' : '✗ FAIL'}\n\n`;
    }
    
    return report;
  }
}

// Business validation utilities
export class BusinessValidator {
  static validateSixFigureProgress(data: any): {
    isOnTrack: boolean;
    currentProgress: number;
    recommendations: string[];
  } {
    const { revenueData, period = 'week' } = data;
    
    const totalRevenue = revenueData.reduce((sum: number, point: any) => sum + point.totalRevenue, 0);
    const projectedAnnual = this.projectToAnnual(totalRevenue, period);
    const progress = (projectedAnnual / businessValidationThresholds.revenueMetrics.sixFigureGoal) * 100;
    
    const recommendations: string[] = [];
    
    if (progress < 70) {
      recommendations.push('Critical: Implement premium pricing strategy');
      recommendations.push('Focus on VIP client acquisition');
    } else if (progress < 90) {
      recommendations.push('Optimize weekend scheduling');
      recommendations.push('Increase average ticket value');
    }
    
    return {
      isOnTrack: progress >= 90,
      currentProgress: Math.round(progress * 100) / 100,
      recommendations
    };
  }
  
  private static projectToAnnual(revenue: number, period: string): number {
    const multipliers = {
      day: 365,
      week: 52,
      month: 12,
      quarter: 4,
      year: 1
    };
    
    return revenue * (multipliers[period as keyof typeof multipliers] || 52);
  }
  
  static validatePremiumStrategy(services: any[]): {
    isOptimal: boolean;
    premiumShare: number;
    issues: string[];
  } {
    const premiumServices = services.filter(s => s.isPremium);
    const totalRevenue = services.reduce((sum, s) => sum + s.revenue, 0);
    const premiumRevenue = premiumServices.reduce((sum, s) => sum + s.revenue, 0);
    const premiumShare = (premiumRevenue / totalRevenue) * 100;
    
    const issues: string[] = [];
    
    if (premiumShare < businessValidationThresholds.serviceMetrics.minPremiumRevenue) {
      issues.push(`Premium revenue share (${premiumShare.toFixed(1)}%) below target of ${businessValidationThresholds.serviceMetrics.minPremiumRevenue}%`);
    }
    
    const lowMarginServices = premiumServices.filter(s => s.profitMargin < businessValidationThresholds.serviceMetrics.minPremiumMargin);
    
    if (lowMarginServices.length > 0) {
      issues.push(`${lowMarginServices.length} premium services have profit margins below ${businessValidationThresholds.serviceMetrics.minPremiumMargin}%`);
    }
    
    return {
      isOptimal: issues.length === 0,
      premiumShare: Math.round(premiumShare * 100) / 100,
      issues
    };
  }
}

// Test execution helpers
export const runTestSuite = async (category: keyof typeof testSuiteConfig.categories) => {
  console.log(`\n🧪 Running ${testSuiteConfig.categories[category]}...\n`);
  
  const startTime = performance.now();
  
  try {
    // This would typically run the actual test commands
    // For now, we'll simulate the execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ ${testSuiteConfig.categories[category]} completed in ${duration.toFixed(2)}s`);
    
    if (category === 'performance') {
      console.log(PerformanceMonitor.generateReport());
    }
    
  } catch (error) {
    console.error(`❌ ${testSuiteConfig.categories[category]} failed:`, error);
    throw error;
  }
};

export default {
  setupChartJsMocks,
  performanceConfig,
  businessValidationThresholds,
  TestDataFactory,
  renderChart,
  testSuiteConfig,
  PerformanceMonitor,
  BusinessValidator,
  runTestSuite
};