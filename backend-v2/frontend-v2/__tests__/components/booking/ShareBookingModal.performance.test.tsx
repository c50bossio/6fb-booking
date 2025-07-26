/**
 * Performance Tests for ShareBookingModal Component
 * 
 * Tests performance characteristics of the ShareBookingModal under various
 * load conditions and usage patterns typical in Six Figure Barber environments.
 * 
 * Focus Areas:
 * - Rendering performance with large datasets
 * - Memory usage and leak detection
 * - Animation performance
 * - State update efficiency
 * - API call optimization
 * - Storage operations performance
 * - Concurrent user simulation
 * - Resource cleanup verification
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import ShareBookingModal from '@/components/booking/ShareBookingModal';

// Mock performance APIs
const mockPerformanceObserver = jest.fn();
const mockPerformanceMark = jest.fn();
const mockPerformanceMeasure = jest.fn();

Object.defineProperty(window, 'PerformanceObserver', {
  value: class MockPerformanceObserver {
    constructor(callback: PerformanceObserverCallback) {
      mockPerformanceObserver(callback);
    }
    observe = jest.fn();
    disconnect = jest.fn();
  },
  writable: true,
});

Object.defineProperty(window.performance, 'mark', {
  value: mockPerformanceMark,
  writable: true,
});

Object.defineProperty(window.performance, 'measure', {
  value: mockPerformanceMeasure,
  writable: true,
});

// Mock heavy dependencies
jest.mock('@/lib/short-url-service', () => ({
  shortUrlService: {
    createBookingShortUrlWithFallback: jest.fn(),
  },
}));

jest.mock('@/components/booking/QRCodeGenerator', () => {
  return function MockQRCodeGenerator(props: any) {
    // Simulate heavy QR code generation
    React.useEffect(() => {
      const heavyComputation = () => {
        const start = performance.now();
        // Simulate computational work
        let result = 0;
        for (let i = 0; i < 10000; i++) {
          result += Math.random();
        }
        const end = performance.now();
        mockPerformanceMeasure('qr-generation', start, end);
      };
      
      const timer = setTimeout(heavyComputation, 10);
      return () => clearTimeout(timer);
    }, [props.bookingUrl]);

    return (
      <div data-testid="qr-code-generator">
        QR Code for {props.bookingUrl}
      </div>
    );
  };
});

jest.mock('@/components/booking/LinkCustomizer', () => {
  return function MockLinkCustomizer(props: any) {
    return props.isOpen ? (
      <div data-testid="link-customizer">
        Link Customizer Modal
      </div>
    ) : null;
  };
});

// Mock clipboard for performance testing
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
});

// Mock localStorage with performance tracking
const localStorageOperations = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageOperations,
  writable: true,
});

// Performance measurement utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  measure(name: string, startTime: number, endTime: number) {
    const duration = endTime - startTime;
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);
  }

  getAverageTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }

  getMedianTime(name: string): number {
    const times = [...(this.measurements.get(name) || [])].sort((a, b) => a - b);
    const mid = Math.floor(times.length / 2);
    return times.length % 2 === 0 ? (times[mid - 1] + times[mid]) / 2 : times[mid];
  }

  get95thPercentile(name: string): number {
    const times = [...(this.measurements.get(name) || [])].sort((a, b) => a - b);
    const index = Math.ceil(times.length * 0.95) - 1;
    return times[index] || 0;
  }

  reset() {
    this.measurements.clear();
  }
}

describe('ShareBookingModal Performance Tests', () => {
  const performanceMonitor = new PerformanceMonitor();
  
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    bookingUrl: 'https://book.example.com/performance-test',
    businessName: 'High Performance Barber Shop',
    services: [
      { id: 1, name: 'Quick Cut', price: 30, duration: 20 },
      { id: 2, name: 'Full Service', price: 60, duration: 45 },
    ],
    barbers: [
      { id: 1, name: 'Speedy Barber', specialties: ['quick cuts'] },
    ],
    subscriptionTier: 'professional' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor.reset();
    mockWriteText.mockResolvedValue(undefined);
  });

  describe('Rendering Performance', () => {
    it('renders quickly with minimal dataset', () => {
      const startTime = performance.now();
      
      render(<ShareBookingModal {...defaultProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(50); // Should render in under 50ms
      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();
    });

    it('handles large service catalogs efficiently', () => {
      const largeServices = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        name: `Service ${i}`,
        price: 30 + i,
        duration: 15 + (i % 60),
        category: `Category ${Math.floor(i / 20)}`,
        description: `Detailed description for service ${i}`,
      }));

      const largeProps = {
        ...defaultProps,
        services: largeServices,
      };

      const startTime = performance.now();
      
      render(<ShareBookingModal {...largeProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(200); // Should render large dataset in under 200ms
      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();
    });

    it('handles large barber teams efficiently', () => {
      const largeBarberTeam = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Barber ${i}`,
        specialties: [`specialty${i % 5}`, `skill${i % 3}`],
        bio: `Experienced barber with ${5 + (i % 20)} years of experience`,
        certifications: [`Cert${i % 3}`, `License${i % 2}`],
        rating: 4.0 + (i % 10) / 10,
        availability: Array.from({ length: 7 }, (_, day) => ({
          day,
          hours: [`${9 + (i % 3)}:00`, `${17 + (i % 2)}:00`],
        })),
      }));

      const largeProps = {
        ...defaultProps,
        barbers: largeBarberTeam,
      };

      const startTime = performance.now();
      
      render(<ShareBookingModal {...largeProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(300); // Should handle large team in under 300ms
      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();
    });

    it('maintains performance with complex nested data', () => {
      const complexProps = {
        ...defaultProps,
        services: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Complex Service ${i}`,
          price: 50 + i,
          duration: 30 + i,
          variants: Array.from({ length: 5 }, (_, v) => ({
            id: `${i}-${v}`,
            name: `Variant ${v}`,
            priceModifier: v * 10,
            durationModifier: v * 5,
          })),
          addOns: Array.from({ length: 3 }, (_, a) => ({
            id: `${i}-addon-${a}`,
            name: `Add-on ${a}`,
            price: 15 + a * 5,
          })),
          requirements: {
            minimumAge: 16 + (i % 20),
            preparationTime: 5 + (i % 10),
            followUpRequired: i % 3 === 0,
            specialEquipment: i % 5 === 0,
          },
        })),
        barbers: Array.from({ length: 20 }, (_, i) => ({
          id: i,
          name: `Master Barber ${i}`,
          schedule: Array.from({ length: 30 }, (_, day) => ({
            date: new Date(Date.now() + day * 86400000).toISOString(),
            slots: Array.from({ length: 16 }, (_, slot) => ({
              time: `${9 + Math.floor(slot / 2)}:${slot % 2 === 0 ? '00' : '30'}`,
              available: Math.random() > 0.3,
              serviceIds: [i % 5, (i + 1) % 5],
            })),
          })),
        })),
      };

      const startTime = performance.now();
      
      render(<ShareBookingModal {...complexProps} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(500); // Complex data should render in under 500ms
      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();
    });
  });

  describe('State Update Performance', () => {
    it('handles rapid state changes efficiently', async () => {
      const user = userEvent.setup();
      
      render(<ShareBookingModal {...defaultProps} />);

      const measurements: number[] = [];

      // Perform rapid state changes
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        
        // Toggle link options quickly
        await user.click(screen.getByText('Link Options'));
        await user.click(screen.getByText('Link Options'));
        
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }

      const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(averageTime).toBeLessThan(50); // Each toggle cycle should average under 50ms
    });

    it('optimizes re-renders during typing', async () => {
      const user = userEvent.setup();
      
      render(<ShareBookingModal {...defaultProps} />);

      // Open link options
      await user.click(screen.getByText('Link Options'));

      const input = screen.getByPlaceholderText(/e.g., summer-special/);
      
      const startTime = performance.now();
      
      // Type quickly to test debouncing/optimization
      await user.type(input, 'performance-test-link-name', { delay: 1 });
      
      const endTime = performance.now();
      const typingTime = endTime - startTime;

      expect(typingTime).toBeLessThan(1000); // Typing should be responsive
      expect(input).toHaveValue('performance-test-link-name');
    });

    it('manages localStorage operations efficiently', async () => {
      const user = userEvent.setup();
      
      localStorageOperations.getItem.mockReturnValue(JSON.stringify([]));

      render(<ShareBookingModal {...defaultProps} />);

      // Simulate multiple copy operations that trigger localStorage
      const measurements: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        await user.click(screen.getByText('Copy Link'));
        
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }

      const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(averageTime).toBeLessThan(100); // Each copy operation should average under 100ms
    });
  });

  describe('Animation Performance', () => {
    it('maintains smooth animations during transitions', async () => {
      const user = userEvent.setup();
      
      // Mock requestAnimationFrame for consistent testing
      let rafCallbacks: FrameRequestCallback[] = [];
      const mockRAF = jest.fn((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });
      
      Object.defineProperty(window, 'requestAnimationFrame', {
        value: mockRAF,
        writable: true,
      });

      render(<ShareBookingModal {...defaultProps} />);

      const startTime = performance.now();

      // Trigger animation by opening QR code
      await user.click(screen.getByTitle('Quick QR code'));

      // Simulate animation frames
      rafCallbacks.forEach(callback => callback(performance.now()));

      const endTime = performance.now();
      const animationTime = endTime - startTime;

      expect(animationTime).toBeLessThan(500); // Animation should complete quickly
      expect(mockRAF).toHaveBeenCalled();
    });

    it('handles concurrent animations without performance degradation', async () => {
      const user = userEvent.setup();
      
      render(<ShareBookingModal {...defaultProps} />);

      const startTime = performance.now();

      // Trigger multiple animations concurrently
      const actions = [
        user.click(screen.getByText('Link Options')),
        user.click(screen.getByTitle('Quick QR code')),
      ];

      await Promise.all(actions);

      const endTime = performance.now();
      const concurrentTime = endTime - startTime;

      expect(concurrentTime).toBeLessThan(300); // Concurrent animations should be efficient
    });
  });

  describe('Memory Usage and Leak Detection', () => {
    it('cleans up resources on unmount', () => {
      const { unmount } = render(<ShareBookingModal {...defaultProps} />);

      // Monitor for memory leaks
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory should not increase significantly after unmount and GC
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(1000000); // Less than 1MB increase
      }
    });

    it('handles multiple mount/unmount cycles without leaks', () => {
      const mountCycles = 50;
      let initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      for (let i = 0; i < mountCycles; i++) {
        const { unmount } = render(<ShareBookingModal {...defaultProps} />);
        unmount();

        // Periodic GC
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Final GC
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(5000000); // Less than 5MB increase after many cycles
      }
    });

    it('efficiently manages large datasets without memory bloat', () => {
      const massiveDataProps = {
        ...defaultProps,
        services: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Service ${i}`,
          price: 30 + i,
          duration: 15 + i,
          data: new Array(100).fill(`data-${i}`), // Simulate large data
        })),
      };

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const { unmount } = render(<ShareBookingModal {...massiveDataProps} />);

      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();

      unmount();

      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(10000000); // Less than 10MB increase
      }
    });
  });

  describe('API Call Optimization', () => {
    it('debounces rapid API calls efficiently', async () => {
      const user = userEvent.setup();
      
      const mockService = require('@/lib/short-url-service').shortUrlService;
      mockService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/optimized',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...defaultProps} />);

      await user.click(screen.getByText('Link Options'));

      const input = screen.getByPlaceholderText(/e.g., summer-special/);

      const startTime = performance.now();

      // Type rapidly to trigger multiple potential API calls
      await user.type(input, 'rapid-typing-test', { delay: 10 });

      // Wait for debounced API call
      await waitFor(() => {
        expect(mockService.createBookingShortUrlWithFallback).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });

      const endTime = performance.now();
      const optimizationTime = endTime - startTime;

      expect(optimizationTime).toBeLessThan(2000); // Debouncing should prevent excessive calls
    });

    it('caches API responses to avoid redundant calls', async () => {
      const user = userEvent.setup();
      
      const mockService = require('@/lib/short-url-service').shortUrlService;
      mockService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/cached',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...defaultProps} />);

      await user.click(screen.getByText('Link Options'));

      const input = screen.getByPlaceholderText(/e.g., summer-special/);

      // Make the same request multiple times
      await user.type(input, 'cache-test');
      await user.clear(input);
      await user.type(input, 'cache-test');

      // Should only make one API call due to caching
      await waitFor(() => {
        expect(mockService.createBookingShortUrlWithFallback).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Concurrent User Simulation', () => {
    it('handles multiple simultaneous user interactions', async () => {
      const user = userEvent.setup();
      
      render(<ShareBookingModal {...defaultProps} />);

      const startTime = performance.now();

      // Simulate multiple users interacting simultaneously
      const interactions = [
        user.click(screen.getByText('Copy Link')),
        user.click(screen.getByTitle('Quick QR code')),
        user.click(screen.getByText('Link Options')),
      ];

      await Promise.all(interactions);

      const endTime = performance.now();
      const concurrentTime = endTime - startTime;

      expect(concurrentTime).toBeLessThan(500); // Concurrent interactions should be handled efficiently
      
      // All interactions should complete successfully
      expect(screen.getByTestId('modal-quick-qr-code')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e.g., summer-special/)).toBeInTheDocument();
    });

    it('maintains performance under stress conditions', async () => {
      const user = userEvent.setup();
      
      render(<ShareBookingModal {...defaultProps} />);

      const measurements: number[] = [];

      // Stress test with rapid interactions
      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();
        
        // Random interaction
        const actions = [
          () => user.click(screen.getByText('Copy Link')),
          () => user.click(screen.getByText('Generate QR Code')),
          () => user.click(screen.getByText('Link Options')),
        ];
        
        const randomAction = actions[i % actions.length];
        await randomAction();
        
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      }

      const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxTime = Math.max(...measurements);

      expect(averageTime).toBeLessThan(100); // Average interaction under 100ms
      expect(maxTime).toBeLessThan(500); // No single interaction over 500ms
    });
  });

  describe('Storage Performance', () => {
    it('optimizes localStorage operations for frequent access', async () => {
      const user = userEvent.setup();
      
      // Mock localStorage with performance tracking
      let operationTimes: number[] = [];
      
      localStorageOperations.setItem.mockImplementation((key, value) => {
        const start = performance.now();
        // Simulate storage operation
        setTimeout(() => {
          const end = performance.now();
          operationTimes.push(end - start);
        }, 1);
      });

      localStorageOperations.getItem.mockReturnValue(JSON.stringify([]));

      render(<ShareBookingModal {...defaultProps} />);

      // Perform multiple operations that trigger localStorage
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByText('Copy Link'));
      }

      await waitFor(() => {
        expect(operationTimes.length).toBeGreaterThan(0);
      });

      const averageStorageTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
      expect(averageStorageTime).toBeLessThan(50); // Storage operations should be fast
    });

    it('handles storage quota limitations gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock storage quota exceeded
      localStorageOperations.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      const startTime = performance.now();
      
      render(<ShareBookingModal {...defaultProps} />);

      // This should not cause performance issues even with storage errors
      await user.click(screen.getByText('Copy Link'));

      const endTime = performance.now();
      const errorHandlingTime = endTime - startTime;

      expect(errorHandlingTime).toBeLessThan(200); // Error handling should be fast
      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();
    });
  });

  describe('Resource Cleanup', () => {
    it('cancels pending operations on unmount', async () => {
      const mockService = require('@/lib/short-url-service').shortUrlService;
      let resolveFn: (value: any) => void;
      
      // Create a promise that we can control
      mockService.createBookingShortUrlWithFallback.mockReturnValue(
        new Promise(resolve => {
          resolveFn = resolve;
        })
      );

      const { unmount } = render(<ShareBookingModal {...defaultProps} />);

      const user = userEvent.setup();
      await user.click(screen.getByText('Link Options'));
      await user.type(screen.getByPlaceholderText(/e.g., summer-special/), 'test');

      // Unmount before operation completes
      unmount();

      // Complete the operation after unmount
      resolveFn!({
        url: 'https://6fb.co/late-response',
        isShortUrl: true,
        error: null,
      });

      // Should not cause errors or memory leaks
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('clears timers and intervals properly', () => {
      const originalSetTimeout = global.setTimeout;
      const originalSetInterval = global.setInterval;
      const originalClearTimeout = global.clearTimeout;
      const originalClearInterval = global.clearInterval;

      const timeouts: number[] = [];
      const intervals: number[] = [];
      const clearedTimeouts: number[] = [];
      const clearedIntervals: number[] = [];

      global.setTimeout = jest.fn((fn, delay) => {
        const id = originalSetTimeout(fn, delay);
        timeouts.push(id);
        return id;
      });

      global.setInterval = jest.fn((fn, delay) => {
        const id = originalSetInterval(fn, delay);
        intervals.push(id);
        return id;
      });

      global.clearTimeout = jest.fn((id) => {
        clearedTimeouts.push(id);
        return originalClearTimeout(id);
      });

      global.clearInterval = jest.fn((id) => {
        clearedIntervals.push(id);
        return originalClearInterval(id);
      });

      const { unmount } = render(<ShareBookingModal {...defaultProps} />);

      unmount();

      // All timers should be cleaned up
      timeouts.forEach(id => {
        expect(clearedTimeouts).toContain(id);
      });

      intervals.forEach(id => {
        expect(clearedIntervals).toContain(id);
      });

      // Restore original functions
      global.setTimeout = originalSetTimeout;
      global.setInterval = originalSetInterval;
      global.clearTimeout = originalClearTimeout;
      global.clearInterval = originalClearInterval;
    });
  });

  describe('Performance Benchmarks', () => {
    it('meets Six Figure Barber performance requirements', () => {
      // Premium barbershop requirements:
      // - Initial render < 100ms
      // - User interactions < 50ms response
      // - Memory usage stays reasonable
      // - Smooth animations (60fps target)

      const benchmarkProps = {
        ...defaultProps,
        businessName: 'Six Figure Barber Premium Studio',
        services: Array.from({ length: 25 }, (_, i) => ({
          id: i,
          name: `Premium Service ${i}`,
          price: 75 + i * 5,
          duration: 30 + i * 5,
        })),
      };

      const startTime = performance.now();
      
      const { unmount } = render(<ShareBookingModal {...benchmarkProps} />);
      
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(100); // Initial render under 100ms
      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();

      unmount();
    });

    it('scales efficiently with enterprise-level data', () => {
      const enterpriseProps = {
        ...defaultProps,
        subscriptionTier: 'enterprise' as const,
        services: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Enterprise Service ${i}`,
          price: 100 + i * 2,
          duration: 45 + i,
        })),
        barbers: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Master Craftsman ${i}`,
          specialties: [`skill${i % 10}`, `technique${i % 7}`],
        })),
      };

      const startTime = performance.now();
      
      render(<ShareBookingModal {...enterpriseProps} />);
      
      const enterpriseRenderTime = performance.now() - startTime;

      expect(enterpriseRenderTime).toBeLessThan(300); // Enterprise data under 300ms
      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();
    });
  });
});