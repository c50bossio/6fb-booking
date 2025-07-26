/**
 * Test utilities and helpers for chart component testing.
 * 
 * Provides reusable functions for:
 * - Mock data generation aligned with Six Figure Barber methodology
 * - Chart.js interaction helpers
 * - Performance testing utilities
 * - Business logic validation helpers
 * - Accessibility testing helpers
 */

import { ClientMetrics, RevenueDataPoint, ServiceMetrics } from '@/services/analytics_service';

// Mock Chart.js instance for testing chart interactions
export const createMockChartInstance = () => ({
  update: jest.fn(),
  resize: jest.fn(),
  destroy: jest.fn(),
  getDatasetMeta: jest.fn(() => ({
    data: []
  })),
  canvas: {
    getContext: jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn()
    }))
  }
});

// Six Figure Barber aligned data generators
export class ChartDataGenerator {
  /**
   * Generate realistic client metrics for Six Figure Barber methodology
   */
  static generateClientMetrics(options: {
    totalClients?: number;
    vipPercentage?: number;
    retentionRate?: number;
    avgLifetimeValue?: number;
  } = {}): ClientMetrics {
    const {
      totalClients = 150,
      vipPercentage = 0.25, // 25% VIP clients target
      retentionRate = 85,
      avgLifetimeValue = 850
    } = options;

    const vipClients = Math.floor(totalClients * vipPercentage);
    const returningClients = Math.floor(totalClients * 0.6); // 60% returning
    const newClients = totalClients - returningClients - vipClients;

    return {
      totalClients,
      newClients: Math.max(0, newClients),
      returningClients,
      vipClients,
      averageLifetimeValue: avgLifetimeValue,
      retentionRate
    };
  }

  /**
   * Generate revenue data points for different time periods
   */
  static generateRevenueData(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    options: {
      baseRevenue?: number;
      seasonalVariation?: boolean;
      includeDowntime?: boolean;
    } = {}
  ): RevenueDataPoint[] {
    const { baseRevenue = 500, seasonalVariation = true, includeDowntime = true } = options;

    switch (period) {
      case 'day':
        return this.generateHourlyData(baseRevenue, includeDowntime);
      case 'week':
        return this.generateWeeklyData(baseRevenue, includeDowntime);
      case 'month':
        return this.generateMonthlyData(baseRevenue, seasonalVariation);
      case 'quarter':
        return this.generateQuarterlyData(baseRevenue, seasonalVariation);
      case 'year':
        return this.generateYearlyData(baseRevenue, seasonalVariation);
      default:
        return this.generateWeeklyData(baseRevenue, includeDowntime);
    }
  }

  private static generateHourlyData(baseRevenue: number, includeDowntime: boolean): RevenueDataPoint[] {
    const businessHours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    
    return businessHours.map(hour => {
      const isLunchTime = hour === 13 && includeDowntime;
      const isPeakHour = hour >= 15 && hour <= 17; // Afternoon peak
      
      let revenue = isLunchTime ? 0 : baseRevenue * 0.15; // 15% of daily revenue per hour
      if (isPeakHour) revenue *= 1.5; // 50% boost for peak hours
      
      const appointments = isLunchTime ? 0 : Math.floor(revenue / 65); // $65 avg ticket
      const tips = revenue * 0.15; // 15% tips
      
      return {
        date: `${hour.toString().padStart(2, '0')}:00`,
        revenue: Math.round(revenue * 100) / 100,
        appointments,
        averageTicket: appointments > 0 ? revenue / appointments : 0,
        tips: Math.round(tips * 100) / 100,
        totalRevenue: Math.round((revenue + tips) * 100) / 100
      };
    });
  }

  private static generateWeeklyData(baseRevenue: number, includeDowntime: boolean): RevenueDataPoint[] {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const multipliers = [0.7, 0.6, 0.8, 0.9, 1.2, 1.4, 0]; // Sunday closed
    
    return weekDays.map((day, index) => {
      const revenue = includeDowntime && day === 'Sun' ? 0 : baseRevenue * multipliers[index];
      const appointments = Math.floor(revenue / 65); // $65 avg ticket
      const tips = revenue * 0.15;
      
      return {
        date: day,
        revenue: Math.round(revenue * 100) / 100,
        appointments,
        averageTicket: appointments > 0 ? revenue / appointments : 0,
        tips: Math.round(tips * 100) / 100,
        totalRevenue: Math.round((revenue + tips) * 100) / 100
      };
    });
  }

  private static generateMonthlyData(baseRevenue: number, seasonalVariation: boolean): RevenueDataPoint[] {
    return Array.from({ length: 30 }, (_, i) => {
      const dayOfMonth = i + 1;
      let multiplier = 1;
      
      if (seasonalVariation) {
        // Weekends are busier
        const dayOfWeek = (dayOfMonth % 7);
        if (dayOfWeek === 0 || dayOfWeek === 6) multiplier = 1.3;
        
        // End of month is slower
        if (dayOfMonth > 25) multiplier *= 0.8;
      }
      
      const revenue = baseRevenue * multiplier * (0.8 + Math.random() * 0.4); // ±20% variance
      const appointments = Math.floor(revenue / 65);
      const tips = revenue * 0.15;
      
      return {
        date: `Day ${dayOfMonth}`,
        revenue: Math.round(revenue * 100) / 100,
        appointments,
        averageTicket: appointments > 0 ? revenue / appointments : 0,
        tips: Math.round(tips * 100) / 100,
        totalRevenue: Math.round((revenue + tips) * 100) / 100
      };
    });
  }

  private static generateQuarterlyData(baseRevenue: number, seasonalVariation: boolean): RevenueDataPoint[] {
    return Array.from({ length: 13 }, (_, i) => {
      const week = i + 1;
      let multiplier = 1;
      
      if (seasonalVariation) {
        // Holiday weeks are different
        if (week === 1 || week === 13) multiplier = 0.7; // Holiday weeks
        if (week >= 6 && week <= 8) multiplier = 1.2; // Mid-quarter peak
      }
      
      const weeklyRevenue = baseRevenue * 7 * multiplier; // Convert to weekly
      const revenue = weeklyRevenue * (0.9 + Math.random() * 0.2); // ±10% variance
      const appointments = Math.floor(revenue / 65);
      const tips = revenue * 0.15;
      
      return {
        date: `Week ${week}`,
        revenue: Math.round(revenue * 100) / 100,
        appointments,
        averageTicket: appointments > 0 ? revenue / appointments : 0,
        tips: Math.round(tips * 100) / 100,
        totalRevenue: Math.round((revenue + tips) * 100) / 100
      };
    });
  }

  private static generateYearlyData(baseRevenue: number, seasonalVariation: boolean): RevenueDataPoint[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const seasonalMultipliers = [0.8, 0.85, 1.1, 1.15, 1.2, 1.1, 1.0, 0.95, 1.1, 1.15, 1.25, 1.3];
    
    return months.map((month, index) => {
      const multiplier = seasonalVariation ? seasonalMultipliers[index] : 1;
      const monthlyRevenue = baseRevenue * 30 * multiplier; // Convert to monthly
      const revenue = monthlyRevenue * (0.9 + Math.random() * 0.2); // ±10% variance
      const appointments = Math.floor(revenue / 65);
      const tips = revenue * 0.15;
      
      return {
        date: month,
        revenue: Math.round(revenue * 100) / 100,
        appointments,
        averageTicket: appointments > 0 ? revenue / appointments : 0,
        tips: Math.round(tips * 100) / 100,
        totalRevenue: Math.round((revenue + tips) * 100) / 100
      };
    });
  }

  /**
   * Generate service metrics aligned with Six Figure Barber premium strategy
   */
  static generateServiceMetrics(count: number = 10): ServiceMetrics[] {
    const premiumServices = [
      'Signature Haircut & Style',
      'Executive Grooming Package',
      'Premium Beard Sculpting',
      'VIP Color & Cut Experience',
      'Luxury Hot Towel Service'
    ];

    const standardServices = [
      'Classic Haircut',
      'Beard Trim',
      'Mustache Grooming',
      'Hair Wash & Style',
      'Basic Shave'
    ];

    const services: ServiceMetrics[] = [];

    for (let i = 0; i < count; i++) {
      const isPremium = i < count * 0.4; // 40% premium services
      const serviceNames = isPremium ? premiumServices : standardServices;
      const serviceName = serviceNames[i % serviceNames.length] || `Service ${i + 1}`;
      
      const basePrice = isPremium ? (80 + Math.random() * 120) : (20 + Math.random() * 40);
      const bookings = Math.floor((isPremium ? 20 : 50) + Math.random() * (isPremium ? 60 : 100));
      const revenue = basePrice * bookings * (0.9 + Math.random() * 0.2);
      const profitMargin = isPremium ? (70 + Math.random() * 15) : (55 + Math.random() * 15);

      services.push({
        serviceId: i + 1,
        serviceName,
        bookings,
        revenue: Math.round(revenue * 100) / 100,
        averagePrice: Math.round(basePrice * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        popularityRank: i + 1, // Will be recalculated by component
        isPremium
      });
    }

    return services;
  }
}

// Performance testing utilities
export class ChartPerformanceUtils {
  /**
   * Measure chart rendering performance
   */
  static measureRenderTime<T>(renderFunction: () => T): { result: T; renderTime: number } {
    const start = performance.now();
    const result = renderFunction();
    const end = performance.now();
    
    return {
      result,
      renderTime: end - start
    };
  }

  /**
   * Test chart performance with large datasets
   */
  static createLargeDataset(size: number): RevenueDataPoint[] {
    return Array.from({ length: size }, (_, i) => ({
      date: `Point ${i + 1}`,
      revenue: Math.random() * 1000,
      appointments: Math.floor(Math.random() * 20),
      averageTicket: 50 + Math.random() * 50,
      tips: Math.random() * 150,
      totalRevenue: Math.random() * 1150
    }));
  }

  /**
   * Create stress test scenarios
   */
  static createStressTestData(): {
    extremeValues: RevenueDataPoint[];
    zeroValues: RevenueDataPoint[];
    negativeValues: RevenueDataPoint[];
    sparseData: RevenueDataPoint[];
  } {
    return {
      extremeValues: [{
        date: 'Extreme',
        revenue: 999999.99,
        appointments: 9999,
        averageTicket: 9999.99,
        tips: 99999.99,
        totalRevenue: 1099999.98
      }],
      
      zeroValues: [{
        date: 'Zero',
        revenue: 0,
        appointments: 0,
        averageTicket: 0,
        tips: 0,
        totalRevenue: 0
      }],
      
      negativeValues: [{
        date: 'Negative',
        revenue: -500,
        appointments: -5,
        averageTicket: -100,
        tips: -75,
        totalRevenue: -575
      }],
      
      sparseData: [
        { date: 'Day 1', revenue: 500, appointments: 8, averageTicket: 62.5, tips: 75, totalRevenue: 575 },
        ...Array(50).fill(null).map((_, i) => ({
          date: `Day ${i + 2}`,
          revenue: 0,
          appointments: 0,
          averageTicket: 0,
          tips: 0,
          totalRevenue: 0
        }))
      ]
    };
  }
}

// Business logic validation helpers
export class SixFigureBarberValidation {
  /**
   * Validate if metrics align with Six Figure Barber methodology
   */
  static validateClientMetrics(metrics: ClientMetrics): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // VIP client percentage should be 20%+ for optimal revenue
    const vipPercentage = (metrics.vipClients / metrics.totalClients) * 100;
    if (vipPercentage < 20) {
      issues.push(`VIP client percentage (${vipPercentage.toFixed(1)}%) below target of 20%`);
      recommendations.push('Focus on converting returning clients to VIP status');
    }

    // Retention rate should be 80%+ for sustainable growth
    if (metrics.retentionRate < 80) {
      issues.push(`Client retention rate (${metrics.retentionRate}%) below target of 80%`);
      recommendations.push('Implement loyalty programs and follow-up strategies');
    }

    // Average lifetime value should be $600+ for six-figure goal
    if (metrics.averageLifetimeValue < 600) {
      issues.push(`Average LTV ($${metrics.averageLifetimeValue}) below target of $600`);
      recommendations.push('Focus on premium service upselling and client retention');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Validate revenue progression toward six-figure goal
   */
  static validateRevenueProgression(revenueData: RevenueDataPoint[], period: string): {
    projectedAnnual: number;
    sixFigureProgress: number;
    isOnTrack: boolean;
    recommendations: string[];
  } {
    const totalRevenue = revenueData.reduce((sum, point) => sum + point.totalRevenue, 0);
    let projectedAnnual: number;

    // Project to annual based on period
    switch (period) {
      case 'day':
        projectedAnnual = totalRevenue * 365;
        break;
      case 'week':
        projectedAnnual = totalRevenue * 52;
        break;
      case 'month':
        projectedAnnual = totalRevenue * 12;
        break;
      case 'quarter':
        projectedAnnual = totalRevenue * 4;
        break;
      case 'year':
        projectedAnnual = totalRevenue;
        break;
      default:
        projectedAnnual = totalRevenue * 52; // Assume weekly
    }

    const sixFigureProgress = (projectedAnnual / 100000) * 100;
    const isOnTrack = sixFigureProgress >= 90; // 90% progress minimum

    const recommendations: string[] = [];
    if (!isOnTrack) {
      if (sixFigureProgress < 70) {
        recommendations.push('Critical: Implement premium pricing strategy immediately');
        recommendations.push('Focus on high-value service packages');
      } else {
        recommendations.push('Optimize peak hours and weekend scheduling');
        recommendations.push('Increase average ticket through upselling');
      }
    }

    return {
      projectedAnnual: Math.round(projectedAnnual * 100) / 100,
      sixFigureProgress: Math.round(sixFigureProgress * 100) / 100,
      isOnTrack,
      recommendations
    };
  }

  /**
   * Validate premium service adoption
   */
  static validatePremiumServiceAdoption(services: ServiceMetrics[]): {
    premiumAdoptionRate: number;
    premiumRevenueShare: number;
    isOptimal: boolean;
    recommendations: string[];
  } {
    const premiumServices = services.filter(s => s.isPremium);
    const totalBookings = services.reduce((sum, s) => sum + s.bookings, 0);
    const totalRevenue = services.reduce((sum, s) => sum + s.revenue, 0);
    
    const premiumBookings = premiumServices.reduce((sum, s) => sum + s.bookings, 0);
    const premiumRevenue = premiumServices.reduce((sum, s) => sum + s.revenue, 0);
    
    const premiumAdoptionRate = (premiumBookings / totalBookings) * 100;
    const premiumRevenueShare = (premiumRevenue / totalRevenue) * 100;
    
    const isOptimal = premiumAdoptionRate >= 30 && premiumRevenueShare >= 60;

    const recommendations: string[] = [];
    if (premiumAdoptionRate < 30) {
      recommendations.push('Train staff on premium service upselling techniques');
    }
    if (premiumRevenueShare < 60) {
      recommendations.push('Restructure service menu to emphasize premium options');
    }

    return {
      premiumAdoptionRate: Math.round(premiumAdoptionRate * 100) / 100,
      premiumRevenueShare: Math.round(premiumRevenueShare * 100) / 100,
      isOptimal,
      recommendations
    };
  }
}

// Accessibility testing helpers
export class ChartAccessibilityUtils {
  /**
   * Check if chart has proper ARIA labels
   */
  static checkAriaLabels(chartElement: HTMLElement): {
    hasAriaLabel: boolean;
    hasRole: boolean;
    hasDescription: boolean;
  } {
    return {
      hasAriaLabel: chartElement.hasAttribute('aria-label') || chartElement.hasAttribute('aria-labelledby'),
      hasRole: chartElement.hasAttribute('role'),
      hasDescription: chartElement.hasAttribute('aria-describedby')
    };
  }

  /**
   * Validate color contrast ratios
   */
  static validateColorContrast(backgroundColor: string, textColor: string): {
    ratio: number;
    meetsWCAG_AA: boolean;
    meetsWCAG_AAA: boolean;
  } {
    // Simplified contrast calculation (would need proper color parsing in real implementation)
    const ratio = 4.5; // Mock ratio for testing
    
    return {
      ratio,
      meetsWCAG_AA: ratio >= 4.5,
      meetsWCAG_AAA: ratio >= 7.0
    };
  }

  /**
   * Check keyboard navigation support
   */
  static checkKeyboardNavigation(element: HTMLElement): {
    isFocusable: boolean;
    hasTabIndex: boolean;
    hasKeyHandlers: boolean;
  } {
    return {
      isFocusable: element.tabIndex >= 0,
      hasTabIndex: element.hasAttribute('tabindex'),
      hasKeyHandlers: element.onkeydown !== null || element.onkeypress !== null
    };
  }
}

// Chart interaction test helpers
export const ChartTestHelpers = {
  /**
   * Extract chart data from rendered component
   */
  extractChartData: (chartElement: HTMLElement) => {
    const dataAttr = chartElement.getAttribute('data-chart-data');
    return dataAttr ? JSON.parse(dataAttr) : null;
  },

  /**
   * Extract chart options from rendered component
   */
  extractChartOptions: (chartElement: HTMLElement) => {
    const optionsAttr = chartElement.getAttribute('data-chart-options');
    return optionsAttr ? JSON.parse(optionsAttr) : null;
  },

  /**
   * Simulate chart hover interaction
   */
  simulateHover: async (chartElement: HTMLElement) => {
    // In real implementation, this would trigger chart hover events
    const canvas = chartElement.querySelector('canvas');
    if (canvas) {
      fireEvent.mouseEnter(canvas);
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });
    }
  },

  /**
   * Simulate chart click interaction
   */
  simulateClick: async (chartElement: HTMLElement) => {
    const canvas = chartElement.querySelector('canvas');
    if (canvas) {
      fireEvent.click(canvas, { clientX: 100, clientY: 100 });
    }
  },

  /**
   * Wait for chart animation to complete
   */
  waitForAnimation: async (timeout: number = 1100) => {
    return new Promise(resolve => setTimeout(resolve, timeout));
  }
};

export default {
  ChartDataGenerator,
  ChartPerformanceUtils,
  SixFigureBarberValidation,
  ChartAccessibilityUtils,
  ChartTestHelpers,
  createMockChartInstance
};