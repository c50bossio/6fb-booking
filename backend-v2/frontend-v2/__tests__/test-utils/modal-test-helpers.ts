/**
 * Test Utilities for Modal Components
 * 
 * Comprehensive testing utilities and helpers for modal components
 * in the Six Figure Barber booking system. Provides reusable functions
 * for common modal testing patterns, accessibility verification,
 * and performance monitoring.
 * 
 * Used by:
 * - EnhancedShareBookingModal tests
 * - ModalNavigation tests
 * - ShareBookingModal tests
 * - Any other modal component tests
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Modal test configuration interface
 */
export interface ModalTestConfig {
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * Performance benchmark thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  INITIAL_RENDER: 100,      // milliseconds
  USER_INTERACTION: 50,     // milliseconds
  ANIMATION_COMPLETE: 300,  // milliseconds
  API_RESPONSE: 1000,       // milliseconds
  MEMORY_INCREASE: 5000000, // bytes (5MB)
};

/**
 * Accessibility test configuration
 */
export const ACCESSIBILITY_CONFIG = {
  skipViolations: [], // Can be used to skip specific axe rules if needed
  context: {
    include: [],
    exclude: [],
  },
};

/**
 * Modal Test Wrapper - provides common modal testing context
 */
export const ModalTestWrapper: React.FC<{
  children: React.ReactNode;
  config?: ModalTestConfig;
}> = ({ children, config = {} }) => {
  React.useEffect(() => {
    // Mock modal root for testing
    const modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);

    return () => {
      const existingRoot = document.getElementById('modal-root');
      if (existingRoot) {
        document.body.removeChild(existingRoot);
      }
    };
  }, []);

  return <div data-testid="modal-test-wrapper">{children}</div>;
};

/**
 * Render modal with common test setup
 */
export const renderModal = (
  component: React.ReactElement,
  options: {
    config?: ModalTestConfig;
    wrapper?: React.ComponentType;
  } = {}
): RenderResult => {
  const { config, wrapper } = options;

  const TestWrapper = wrapper || (({ children }) => (
    <ModalTestWrapper config={config}>
      {children}
    </ModalTestWrapper>
  ));

  return render(component, { wrapper: TestWrapper });
};

/**
 * Wait for modal to be fully rendered and animated
 */
export const waitForModalReady = async (modalTestId?: string): Promise<HTMLElement> => {
  const modal = await waitFor(() => {
    const element = modalTestId 
      ? screen.getByTestId(modalTestId)
      : screen.getByRole('dialog', { hidden: true }) || screen.getByTestId(/modal/);
    expect(element).toBeInTheDocument();
    return element;
  });

  // Wait for any entrance animations to complete
  await waitFor(() => {
    // Check if modal has finished animating (common class patterns)
    const hasAnimationClasses = modal.classList.contains('animate-in') || 
                               modal.classList.contains('animate-enter') ||
                               modal.classList.contains('transition');
    
    if (hasAnimationClasses) {
      // Wait a bit longer for animations
      return new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  return modal;
};

/**
 * Test modal keyboard navigation
 */
export const testModalKeyboardNavigation = async (modalElement: HTMLElement) => {
  const user = userEvent.setup();

  // Get all focusable elements within modal
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) {
    throw new Error('Modal has no focusable elements');
  }

  // Test Tab navigation forward
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  firstElement.focus();
  expect(document.activeElement).toBe(firstElement);

  // Tab through all elements
  for (let i = 1; i < focusableElements.length; i++) {
    await user.tab();
    expect(document.activeElement).toBe(focusableElements[i]);
  }

  // Tab from last element should cycle to first (focus trap)
  await user.tab();
  expect(document.activeElement).toBe(firstElement);

  // Test Shift+Tab navigation backward
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(lastElement);

  return {
    firstElement,
    lastElement,
    focusableElements: Array.from(focusableElements) as HTMLElement[],
  };
};

/**
 * Test modal close behavior
 */
export const testModalCloseBehavior = async (
  onClose: jest.Mock,
  config: ModalTestConfig = {}
) => {
  const user = userEvent.setup();
  const {
    closeOnEscape = true,
    closeOnOverlayClick = true,
  } = config;

  const modal = await waitForModalReady();

  // Test Escape key
  if (closeOnEscape) {
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
  }

  // Test overlay click
  if (closeOnOverlayClick) {
    const overlay = screen.getByTestId('modal-overlay') || 
                   modal.querySelector('[data-testid*="overlay"]') ||
                   modal.parentElement; // Fallback to parent

    if (overlay) {
      await user.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
      jest.clearAllMocks();
    }
  }

  // Test close button if present
  const closeButton = screen.queryByLabelText(/close/i) || 
                     screen.queryByRole('button', { name: /close/i });
  
  if (closeButton) {
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  }
};

/**
 * Test modal accessibility compliance
 */
export const testModalAccessibility = async (
  container: HTMLElement,
  config: ModalTestConfig = {}
) => {
  const {
    ariaLabel,
    ariaDescribedBy,
  } = config;

  // Run axe accessibility audit
  const results = await axe(container, {
    rules: {
      // Skip specific rules if needed
      ...ACCESSIBILITY_CONFIG.skipViolations.reduce((acc, rule) => {
        acc[rule] = { enabled: false };
        return acc;
      }, {} as any),
    },
  });

  expect(results).toHaveNoViolations();

  // Test modal role and ARIA attributes
  const modal = container.querySelector('[role="dialog"]') ||
                container.querySelector('[role="alertdialog"]');

  if (modal) {
    // Should have proper role
    expect(modal).toHaveAttribute('role');

    // Should have aria-modal
    expect(modal).toHaveAttribute('aria-modal', 'true');

    // Should have aria-label or aria-labelledby
    const hasLabel = modal.hasAttribute('aria-label') || 
                    modal.hasAttribute('aria-labelledby');
    expect(hasLabel).toBe(true);

    // Check specific ARIA attributes if provided
    if (ariaLabel) {
      expect(modal).toHaveAttribute('aria-label', ariaLabel);
    }

    if (ariaDescribedBy) {
      expect(modal).toHaveAttribute('aria-describedby', ariaDescribedBy);
    }
  }

  return results;
};

/**
 * Test focus management
 */
export const testFocusManagement = async (
  modalElement: HTMLElement,
  config: ModalTestConfig = {}
) => {
  const {
    autoFocus = true,
    trapFocus = true,
    restoreFocus = true,
  } = config;

  // Store the element that was focused before modal opened
  const previouslyFocused = document.activeElement as HTMLElement;

  if (autoFocus) {
    // Modal should focus first focusable element or itself
    await waitFor(() => {
      const focusedElement = document.activeElement;
      const isInModal = modalElement.contains(focusedElement);
      expect(isInModal).toBe(true);
    });
  }

  if (trapFocus) {
    await testModalKeyboardNavigation(modalElement);
  }

  // Test focus restoration (would need to simulate modal close)
  if (restoreFocus && previouslyFocused) {
    // This would be tested in the actual close behavior test
    return { previouslyFocused };
  }

  return { previouslyFocused };
};

/**
 * Performance measurement utility
 */
export class ModalPerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(name: string): () => number {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
      
      return duration;
    };
  }

  getStats(name: string) {
    const times = this.measurements.get(name) || [];
    if (times.length === 0) {
      return { average: 0, median: 0, min: 0, max: 0, count: 0 };
    }

    const sorted = [...times].sort((a, b) => a - b);
    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: Math.min(...times),
      max: Math.max(...times),
      count: times.length,
    };
  }

  reset() {
    this.measurements.clear();
  }

  assertPerformance(name: string, threshold: number) {
    const stats = this.getStats(name);
    expect(stats.average).toBeLessThan(threshold);
    return stats;
  }
}

/**
 * Test modal performance
 */
export const testModalPerformance = async (
  renderFn: () => RenderResult,
  iterations: number = 10
) => {
  const monitor = new ModalPerformanceMonitor();
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const endMeasurement = monitor.startMeasurement('render');
    const { unmount } = renderFn();
    const renderTime = endMeasurement();
    
    unmount();
    results.push(renderTime);

    // Brief pause between iterations
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  const stats = monitor.getStats('render');
  
  // Assert performance meets thresholds
  expect(stats.average).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_RENDER);
  expect(stats.max).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_RENDER * 2);

  return stats;
};

/**
 * Mock modal-specific APIs for testing
 */
export const mockModalAPIs = () => {
  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock MutationObserver
  global.MutationObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock clipboard API
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn().mockResolvedValue(undefined),
      readText: jest.fn().mockResolvedValue(''),
    },
    writable: true,
  });

  // Mock web share API
  Object.defineProperty(navigator, 'share', {
    value: jest.fn().mockResolvedValue(undefined),
    writable: true,
  });

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  return {
    ResizeObserver: global.ResizeObserver,
    IntersectionObserver: global.IntersectionObserver,
    MutationObserver: global.MutationObserver,
    clipboard: navigator.clipboard,
    share: navigator.share,
    matchMedia: window.matchMedia,
  };
};

/**
 * Create mock Six Figure Barber data for testing
 */
export const createMockSixFigureBarberData = (scale: 'small' | 'medium' | 'large' = 'small') => {
  const scales = {
    small: { services: 5, barbers: 3, locations: 1 },
    medium: { services: 20, barbers: 10, locations: 3 },
    large: { services: 100, barbers: 50, locations: 10 },
  };

  const config = scales[scale];

  return {
    businessName: 'Six Figure Barber Premium Studio',
    subscriptionTier: 'enterprise' as const,
    bookingUrl: 'https://book.sixfigurebarber.com/premium-studio',
    
    services: Array.from({ length: config.services }, (_, i) => ({
      id: i,
      name: `Premium Service ${i + 1}`,
      price: 50 + (i * 10),
      duration: 30 + (i * 5),
      category: `Category ${Math.floor(i / 5) + 1}`,
      description: `Professional Six Figure Barber service ${i + 1}`,
      premiumFeatures: {
        consultationIncluded: true,
        hotTowelService: i % 2 === 0,
        beardTrim: i % 3 === 0,
        styling: true,
      },
    })),

    barbers: Array.from({ length: config.barbers }, (_, i) => ({
      id: i,
      name: `Master Barber ${String.fromCharCode(65 + i)}`,
      specialties: [`specialty${i % 5}`, `technique${i % 3}`],
      certifications: [`Master Barber Cert`, `Premium Styling`],
      yearsExperience: 5 + (i % 15),
      rating: 4.5 + (i % 5) / 10,
      bio: `Expert barber with ${5 + (i % 15)} years of Six Figure Barber training`,
    })),

    locations: Array.from({ length: config.locations }, (_, i) => ({
      id: i,
      name: `Premium Location ${i + 1}`,
      address: `${100 + i} Premium Street, Six Figure City`,
      amenities: ['Premium seating', 'Complimentary beverages', 'Wi-Fi'],
    })),
  };
};

/**
 * Simulate network conditions for testing
 */
export const simulateNetworkConditions = (
  condition: 'fast' | 'slow' | 'offline' | 'unstable'
) => {
  const conditions = {
    fast: { delay: 50, failureRate: 0 },
    slow: { delay: 2000, failureRate: 0 },
    offline: { delay: 0, failureRate: 1 },
    unstable: { delay: 500, failureRate: 0.3 },
  };

  const config = conditions[condition];

  // Mock fetch with network simulation
  const originalFetch = global.fetch;
  
  global.fetch = jest.fn().mockImplementation(async (...args) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, config.delay));

    // Simulate failure rate
    if (Math.random() < config.failureRate) {
      throw new Error('Network error');
    }

    // Call original fetch or return mock response
    if (originalFetch) {
      return originalFetch(...args);
    } else {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      });
    }
  });

  return () => {
    global.fetch = originalFetch;
  };
};

/**
 * Comprehensive modal test suite runner
 */
export const runModalTestSuite = async (
  component: React.ReactElement,
  options: {
    config?: ModalTestConfig;
    performance?: boolean;
    accessibility?: boolean;
    keyboardNavigation?: boolean;
    focusManagement?: boolean;
    customTests?: Array<(container: HTMLElement) => Promise<void>>;
  } = {}
) => {
  const {
    config = {},
    performance = true,
    accessibility = true,
    keyboardNavigation = true,
    focusManagement = true,
    customTests = [],
  } = options;

  const results = {
    performance: null as any,
    accessibility: null as any,
    keyboardNavigation: null as any,
    focusManagement: null as any,
    customTests: [] as any[],
  };

  // Performance testing
  if (performance) {
    results.performance = await testModalPerformance(
      () => renderModal(component, { config })
    );
  }

  // Render for other tests
  const { container } = renderModal(component, { config });
  const modal = await waitForModalReady();

  // Accessibility testing
  if (accessibility) {
    results.accessibility = await testModalAccessibility(container, config);
  }

  // Keyboard navigation testing
  if (keyboardNavigation) {
    results.keyboardNavigation = await testModalKeyboardNavigation(modal);
  }

  // Focus management testing
  if (focusManagement) {
    results.focusManagement = await testFocusManagement(modal, config);
  }

  // Custom tests
  for (let i = 0; i < customTests.length; i++) {
    try {
      await customTests[i](container);
      results.customTests.push({ index: i, success: true });
    } catch (error) {
      results.customTests.push({ index: i, success: false, error });
    }
  }

  return results;
};

/**
 * Export all utilities as default object for easy importing
 */
export default {
  ModalTestWrapper,
  renderModal,
  waitForModalReady,
  testModalKeyboardNavigation,
  testModalCloseBehavior,
  testModalAccessibility,
  testFocusManagement,
  ModalPerformanceMonitor,
  testModalPerformance,
  mockModalAPIs,
  createMockSixFigureBarberData,
  simulateNetworkConditions,
  runModalTestSuite,
  PERFORMANCE_THRESHOLDS,
  ACCESSIBILITY_CONFIG,
};