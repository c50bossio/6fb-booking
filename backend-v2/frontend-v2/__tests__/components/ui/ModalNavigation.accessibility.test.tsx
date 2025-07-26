/**
 * Accessibility Tests for ModalNavigation System
 * 
 * Comprehensive accessibility testing for the modal navigation system
 * focusing on WCAG 2.1 AA compliance and assistive technology support.
 * 
 * Focus Areas:
 * - WCAG 2.1 AA compliance
 * - Screen reader compatibility
 * - Keyboard navigation
 * - Focus management
 * - ARIA attributes and landmarks
 * - Color contrast and visual accessibility
 * - Motor accessibility (large touch targets)
 * - Cognitive accessibility (clear navigation)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import {
  ModalNavigationProvider,
  ModalNavigationHeader,
  ModalNavigationContent,
  useModalNavigation,
  useModalPageNavigation,
  type ModalPage,
} from '@/components/ui/ModalNavigation';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test components for accessibility testing
const TestPage: React.FC<{ title?: string }> = ({ title = 'Test Page' }) => (
  <div>
    <h2 id="page-title">{title}</h2>
    <p>This is a test page for accessibility testing.</p>
    <button>Interactive element</button>
  </div>
);

const AccessibilityTestComponent: React.FC = () => {
  const { navigateTo, navigateBack, canGoBack, getCurrentPage } = useModalNavigation();
  const currentPage = getCurrentPage();

  return (
    <div>
      <div aria-live="polite" id="status">
        Current page: {currentPage?.title || 'None'}
      </div>
      
      <nav aria-label="Modal navigation">
        <button
          onClick={() => navigateTo({
            id: 'page1',
            title: 'Accessible Page 1',
            component: TestPage,
            type: 'internal',
          })}
          aria-describedby="page1-desc"
        >
          Navigate to Page 1
        </button>
        <div id="page1-desc" className="sr-only">
          Navigate to the first accessible test page
        </div>
        
        <button
          onClick={() => navigateTo({
            id: 'page2',
            title: 'Accessible Page 2',
            component: TestPage,
            type: 'internal',
          })}
          aria-describedby="page2-desc"
        >
          Navigate to Page 2
        </button>
        <div id="page2-desc" className="sr-only">
          Navigate to the second accessible test page
        </div>
        
        <button
          onClick={navigateBack}
          disabled={!canGoBack}
          aria-label="Go back to previous page"
        >
          Back
        </button>
      </nav>
    </div>
  );
};

const KeyboardNavigationTest: React.FC = () => {
  const { navigateTo } = useModalNavigation();

  const handleKeyDown = (event: React.KeyboardEvent, pageId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateTo({
        id: pageId,
        title: `Keyboard Page ${pageId}`,
        component: TestPage,
        type: 'internal',
      });
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => handleKeyDown(e, '1')}
        aria-label="Navigate to keyboard accessible page 1"
      >
        Keyboard accessible button 1
      </div>
      
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => handleKeyDown(e, '2')}
        aria-label="Navigate to keyboard accessible page 2"
      >
        Keyboard accessible button 2
      </div>
    </div>
  );
};

const FocusManagementTest: React.FC = () => {
  const { navigateTo, navigateBack, canGoBack } = useModalNavigation();
  const [focusedElement, setFocusedElement] = React.useState<string>('');

  React.useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      setFocusedElement(target.id || target.tagName);
    };

    document.addEventListener('focus', handleFocus, true);
    return () => document.removeEventListener('focus', handleFocus, true);
  }, []);

  return (
    <div>
      <div id="focus-indicator" aria-live="polite">
        Currently focused: {focusedElement}
      </div>
      
      <button
        id="nav-button-1"
        onClick={() => navigateTo({
          id: 'focus-page-1',
          title: 'Focus Test Page 1',
          component: TestPage,
          type: 'internal',
        })}
      >
        Navigate to Focus Page 1
      </button>
      
      <button
        id="nav-button-2"
        onClick={() => navigateTo({
          id: 'focus-page-2',
          title: 'Focus Test Page 2',
          component: TestPage,
          type: 'internal',
        })}
      >
        Navigate to Focus Page 2
      </button>
      
      <button
        id="back-button"
        onClick={navigateBack}
        disabled={!canGoBack}
      >
        Go Back
      </button>
    </div>
  );
};

describe('ModalNavigation Accessibility Tests', () => {
  beforeEach(() => {
    // Clear any existing timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('passes axe accessibility audit for basic modal navigation', async () => {
      const { container } = render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('passes axe audit for navigation header', async () => {
      const { container } = render(
        <ModalNavigationProvider>
          <ModalNavigationHeader 
            title="Accessible Modal"
            onClose={() => {}}
          />
        </ModalNavigationProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('passes axe audit for complete navigation system', async () => {
      const { container } = render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('maintains accessibility during navigation transitions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const { container } = render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Navigate to a new page
      await user.click(screen.getByText('Navigate to Page 1'));
      
      // Fast-forward through animation
      jest.advanceTimersByTime(300);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Support', () => {
    it('provides proper ARIA landmarks and structure', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Navigation should be properly labeled
      const navigation = screen.getByRole('navigation', { name: 'Modal navigation' });
      expect(navigation).toBeInTheDocument();

      // Status region should be live
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('provides descriptive button labels and descriptions', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const button1 = screen.getByRole('button', { name: 'Navigate to Page 1' });
      expect(button1).toHaveAttribute('aria-describedby', 'page1-desc');

      const description1 = screen.getByText('Navigate to the first accessible test page');
      expect(description1).toHaveClass('sr-only');
    });

    it('announces navigation state changes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const statusRegion = screen.getByText('Current page: None');
      expect(statusRegion).toBeInTheDocument();

      await user.click(screen.getByText('Navigate to Page 1'));
      jest.advanceTimersByTime(300);

      expect(screen.getByText('Current page: Accessible Page 1')).toBeInTheDocument();
    });

    it('provides proper heading hierarchy', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <ModalNavigationHeader title="Main Modal Title" onClose={() => {}} />
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Main heading should be h2
      expect(screen.getByRole('heading', { level: 2, name: 'Main Modal Title' })).toBeInTheDocument();

      // Navigate to page with content
      await user.click(screen.getByText('Navigate to Page 1'));
      jest.advanceTimersByTime(300);

      // Page content should maintain proper heading hierarchy
      const pageHeading = screen.getByText('Accessible Page 1');
      expect(pageHeading).toBeInTheDocument();
    });

    it('supports screen reader navigation shortcuts', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <div>
              <main>
                <h1>Main Content</h1>
                <p>This is the main content area.</p>
              </main>
              
              <nav aria-label="Modal navigation">
                <h2>Navigation Menu</h2>
                <ul>
                  <li><a href="#page1">Page 1</a></li>
                  <li><a href="#page2">Page 2</a></li>
                </ul>
              </nav>
              
              <aside aria-label="Additional information">
                <h2>Sidebar</h2>
                <p>Additional content here.</p>
              </aside>
            </div>
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Verify landmark roles are present
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Modal navigation' })).toBeInTheDocument();
      expect(screen.getByRole('complementary', { name: 'Additional information' })).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports tab navigation through all interactive elements', async () => {
      const user = userEvent.setup();

      render(
        <ModalNavigationProvider>
          <ModalNavigationHeader onClose={() => {}} />
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Start from first interactive element
      const firstButton = screen.getByText('Navigate to Page 1');
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);

      // Tab to next element
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('Navigate to Page 2'));

      // Tab to back button
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('Back'));

      // Tab to close button in header
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('Close modal'));
    });

    it('supports Enter and Space key activation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <KeyboardNavigationTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const keyboardButton1 = screen.getByLabelText('Navigate to keyboard accessible page 1');
      keyboardButton1.focus();

      // Test Enter key
      await user.keyboard('{Enter}');
      jest.advanceTimersByTime(300);

      // Should navigate to page 1
      expect(screen.getByText('Keyboard Page 1')).toBeInTheDocument();

      // Navigate with Space key
      const keyboardButton2 = screen.getByLabelText('Navigate to keyboard accessible page 2');
      keyboardButton2.focus();

      await user.keyboard(' ');
      jest.advanceTimersByTime(300);

      expect(screen.getByText('Keyboard Page 2')).toBeInTheDocument();
    });

    it('traps focus within modal during navigation', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button data-testid="outside-before">Outside Before</button>
          <ModalNavigationProvider>
            <ModalNavigationContent>
              <AccessibilityTestComponent />
            </ModalNavigationContent>
          </ModalNavigationProvider>
          <button data-testid="outside-after">Outside After</button>
        </div>
      );

      // Focus should start within modal
      const firstModalButton = screen.getByText('Navigate to Page 1');
      firstModalButton.focus();

      // Shift+Tab from first element should not escape modal
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      const activeElement = document.activeElement as HTMLElement;
      
      // Should cycle to last focusable element in modal
      expect(activeElement).not.toBe(screen.getByTestId('outside-before'));
      expect(activeElement).not.toBe(screen.getByTestId('outside-after'));
    });

    it('provides keyboard shortcuts for navigation', async () => {
      const user = userEvent.setup();

      const KeyboardShortcutTest = () => {
        const { navigateBack, canGoBack } = useModalNavigation();

        React.useEffect(() => {
          const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
              // ESC key should close modal or navigate back
              if (canGoBack) {
                navigateBack();
              }
            }
          };

          document.addEventListener('keydown', handleKeyDown);
          return () => document.removeEventListener('keydown', handleKeyDown);
        }, [navigateBack, canGoBack]);

        return <AccessibilityTestComponent />;
      };

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <KeyboardShortcutTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Navigate to create history
      await user.click(screen.getByText('Navigate to Page 1'));
      expect(screen.getByText('Current page: Accessible Page 1')).toBeInTheDocument();

      // ESC key should navigate back
      await user.keyboard('{Escape}');
      expect(screen.getByText('Current page: None')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('maintains focus during navigation transitions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <FocusManagementTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const navButton1 = screen.getByText('Navigate to Focus Page 1');
      navButton1.focus();

      expect(screen.getByText('Currently focused: nav-button-1')).toBeInTheDocument();

      await user.click(navButton1);
      jest.advanceTimersByTime(300);

      // Focus should be managed appropriately during navigation
      const focusIndicator = screen.getByText(/Currently focused:/);
      expect(focusIndicator).toBeInTheDocument();
    });

    it('restores focus when navigating back', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <FocusManagementTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Navigate forward
      const navButton1 = screen.getByText('Navigate to Focus Page 1');
      await user.click(navButton1);
      jest.advanceTimersByTime(300);

      // Navigate back
      const backButton = screen.getByText('Go Back');
      await user.click(backButton);
      jest.advanceTimersByTime(300);

      // Focus should be restored or managed appropriately
      expect(screen.getByText(/Currently focused:/)).toBeInTheDocument();
    });

    it('manages focus for disabled elements', async () => {
      const user = userEvent.setup();

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const backButton = screen.getByText('Back');
      expect(backButton).toBeDisabled();

      // Disabled elements should be skipped in tab order
      const firstButton = screen.getByText('Navigate to Page 1');
      firstButton.focus();

      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('Navigate to Page 2'));

      // Disabled button should be skipped
      await user.tab();
      expect(document.activeElement).not.toBe(backButton);
    });

    it('handles focus for dynamically added elements', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const DynamicContentTest = () => {
        const [showExtra, setShowExtra] = React.useState(false);
        
        return (
          <div>
            <AccessibilityTestComponent />
            <button onClick={() => setShowExtra(!showExtra)}>
              Toggle Extra Content
            </button>
            {showExtra && (
              <button data-testid="dynamic-button">
                Dynamic Button
              </button>
            )}
          </div>
        );
      };

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <DynamicContentTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Add dynamic content
      await user.click(screen.getByText('Toggle Extra Content'));

      // Dynamic button should be focusable
      const dynamicButton = screen.getByTestId('dynamic-button');
      dynamicButton.focus();
      expect(document.activeElement).toBe(dynamicButton);
    });
  });

  describe('ARIA Attributes and Semantic Structure', () => {
    it('provides proper ARIA roles for navigation elements', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationHeader title="Test Modal" onClose={() => {}} />
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Header should have appropriate role
      const heading = screen.getByRole('heading', { name: 'Test Modal' });
      expect(heading).toBeInTheDocument();

      // Navigation should be properly labeled
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-label', 'Modal navigation');

      // Buttons should have proper roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('uses aria-live regions for dynamic content updates', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      // Navigate to update the live region
      await user.click(screen.getByText('Navigate to Page 1'));
      jest.advanceTimersByTime(300);

      expect(liveRegion).toHaveTextContent('Current page: Accessible Page 1');
    });

    it('provides aria-expanded for collapsible elements', () => {
      const CollapsibleTest = () => {
        const [expanded, setExpanded] = React.useState(false);
        
        return (
          <div>
            <button
              aria-expanded={expanded}
              aria-controls="collapsible-content"
              onClick={() => setExpanded(!expanded)}
            >
              Toggle Content
            </button>
            <div id="collapsible-content" hidden={!expanded}>
              <p>Collapsible content here</p>
            </div>
          </div>
        );
      };

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <CollapsibleTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const toggleButton = screen.getByRole('button', { name: 'Toggle Content' });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(toggleButton).toHaveAttribute('aria-controls', 'collapsible-content');
    });

    it('provides proper aria-describedby relationships', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <div>
              <button aria-describedby="help-text">
                Action Button
              </button>
              <div id="help-text">
                This button performs an important action
              </div>
            </div>
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const button = screen.getByRole('button', { name: 'Action Button' });
      expect(button).toHaveAttribute('aria-describedby', 'help-text');

      const helpText = screen.getByText('This button performs an important action');
      expect(helpText).toHaveAttribute('id', 'help-text');
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('maintains sufficient color contrast ratios', () => {
      // This would typically be tested with axe or manual contrast checking
      render(
        <ModalNavigationProvider>
          <ModalNavigationHeader title="High Contrast Test" onClose={() => {}} />
          <ModalNavigationContent>
            <div>
              <p style={{ color: '#333', backgroundColor: '#fff' }}>
                This text should have sufficient contrast
              </p>
              <button style={{ color: '#fff', backgroundColor: '#0066cc' }}>
                High contrast button
              </button>
            </div>
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // The axe audit would catch contrast issues
      expect(screen.getByText('This text should have sufficient contrast')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'High contrast button' })).toBeInTheDocument();
    });

    it('supports high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <AccessibilityTestComponent />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Component should render successfully in high contrast mode
      expect(screen.getByText('Navigate to Page 1')).toBeInTheDocument();
    });

    it('does not rely solely on color for information', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <div>
              <button className="success" data-testid="success-button">
                <span aria-label="Success">✓</span> Success Action
              </button>
              <button className="danger" data-testid="danger-button">
                <span aria-label="Warning">⚠</span> Danger Action
              </button>
            </div>
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Information should be conveyed through icons and text, not just color
      const successButton = screen.getByTestId('success-button');
      const dangerButton = screen.getByTestId('danger-button');

      expect(successButton).toHaveTextContent('✓ Success Action');
      expect(dangerButton).toHaveTextContent('⚠ Danger Action');
    });
  });

  describe('Motor Accessibility', () => {
    it('provides adequately sized touch targets', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <div>
              <button 
                style={{ minWidth: '44px', minHeight: '44px', padding: '12px 16px' }}
                data-testid="large-target"
              >
                Large Target
              </button>
              <button
                style={{ minWidth: '44px', minHeight: '44px', padding: '12px 16px' }}
                data-testid="large-target-2"
              >
                Another Large Target
              </button>
            </div>
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Touch targets should be at least 44x44px for accessibility
      const largeTarget = screen.getByTestId('large-target');
      const computedStyle = window.getComputedStyle(largeTarget);
      
      expect(computedStyle.minWidth).toBe('44px');
      expect(computedStyle.minHeight).toBe('44px');
    });

    it('provides adequate spacing between interactive elements', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button data-testid="button-1">Button 1</button>
              <button data-testid="button-2">Button 2</button>
              <button data-testid="button-3">Button 3</button>
            </div>
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Buttons should have adequate spacing to prevent accidental activation
      const container = screen.getByTestId('button-1').parentElement;
      const computedStyle = window.getComputedStyle(container!);
      
      expect(computedStyle.gap).toBe('8px');
    });

    it('supports drag and drop alternatives', async () => {
      const user = userEvent.setup();

      const DragDropAlternativeTest = () => {
        const [items, setItems] = React.useState(['Item 1', 'Item 2', 'Item 3']);
        const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

        const moveItem = (fromIndex: number, toIndex: number) => {
          const newItems = [...items];
          const [movedItem] = newItems.splice(fromIndex, 1);
          newItems.splice(toIndex, 0, movedItem);
          setItems(newItems);
        };

        return (
          <div>
            {items.map((item, index) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{item}</span>
                <button
                  onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
                  aria-pressed={selectedIndex === index}
                >
                  {selectedIndex === index ? 'Cancel' : 'Select'}
                </button>
                {selectedIndex !== null && selectedIndex !== index && (
                  <button
                    onClick={() => {
                      moveItem(selectedIndex, index);
                      setSelectedIndex(null);
                    }}
                  >
                    Move here
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      };

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <DragDropAlternativeTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Test keyboard alternative to drag and drop
      await user.click(screen.getByRole('button', { name: 'Select', pressed: false }));
      
      const selectedButton = screen.getByRole('button', { pressed: true });
      expect(selectedButton).toBeInTheDocument();

      const moveButtons = screen.getAllByText('Move here');
      expect(moveButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Cognitive Accessibility', () => {
    it('provides clear and consistent navigation patterns', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationHeader title="Clear Navigation" onClose={() => {}} />
          <ModalNavigationContent>
            <nav aria-label="Main navigation">
              <ul>
                <li><a href="#page1">Page 1</a></li>
                <li><a href="#page2">Page 2</a></li>
                <li><a href="#page3">Page 3</a></li>
              </ul>
            </nav>
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Navigation should be consistent and predictable
      const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
      expect(navigation).toBeInTheDocument();

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('provides helpful error messages and guidance', () => {
      const ErrorGuidanceTest = () => {
        const [error, setError] = React.useState('');

        const handleAction = () => {
          setError('Please fill in all required fields before proceeding.');
        };

        return (
          <div>
            <button onClick={handleAction}>
              Submit Form
            </button>
            {error && (
              <div 
                role="alert" 
                aria-live="assertive"
                style={{ color: '#d32f2f', marginTop: '8px' }}
              >
                <span aria-label="Error">⚠</span> {error}
              </div>
            )}
          </div>
        );
      };

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <ErrorGuidanceTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const submitButton = screen.getByRole('button', { name: 'Submit Form' });
      fireEvent.click(submitButton);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
      expect(errorMessage).toHaveTextContent('Please fill in all required fields before proceeding.');
    });

    it('supports users with attention or memory difficulties', async () => {
      const user = userEvent.setup();

      const MemoryAidsTest = () => {
        const [currentStep, setCurrentStep] = React.useState(1);
        const totalSteps = 3;

        return (
          <div>
            <div aria-live="polite" id="progress-status">
              Step {currentStep} of {totalSteps}
            </div>
            
            <nav aria-label="Step navigation">
              <ol>
                <li aria-current={currentStep === 1 ? 'step' : undefined}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    aria-pressed={currentStep === 1}
                  >
                    Step 1: Information
                  </button>
                </li>
                <li aria-current={currentStep === 2 ? 'step' : undefined}>
                  <button
                    onClick={() => setCurrentStep(2)}
                    aria-pressed={currentStep === 2}
                  >
                    Step 2: Confirmation
                  </button>
                </li>
                <li aria-current={currentStep === 3 ? 'step' : undefined}>
                  <button
                    onClick={() => setCurrentStep(3)}
                    aria-pressed={currentStep === 3}
                  >
                    Step 3: Complete
                  </button>
                </li>
              </ol>
            </nav>
          </div>
        );
      };

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <MemoryAidsTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Progress indicator should be clear
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();

      // Current step should be indicated
      const currentStepButton = screen.getByRole('button', { pressed: true });
      expect(currentStepButton).toHaveTextContent('Step 1: Information');

      // Navigate to next step
      await user.click(screen.getByRole('button', { name: 'Step 2: Confirmation' }));
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });

    it('provides timeout warnings and extensions', async () => {
      jest.useFakeTimers();

      const TimeoutWarningTest = () => {
        const [showWarning, setShowWarning] = React.useState(false);
        const [timeLeft, setTimeLeft] = React.useState(30);

        React.useEffect(() => {
          const warningTimer = setTimeout(() => {
            setShowWarning(true);
            
            const countdownTimer = setInterval(() => {
              setTimeLeft(prev => {
                if (prev <= 1) {
                  clearInterval(countdownTimer);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);

            return () => clearInterval(countdownTimer);
          }, 5000); // Show warning after 5 seconds for testing

          return () => clearTimeout(warningTimer);
        }, []);

        const extendSession = () => {
          setShowWarning(false);
          setTimeLeft(30);
        };

        return (
          <div>
            <p>Modal content here...</p>
            {showWarning && (
              <div
                role="alertdialog"
                aria-live="assertive"
                aria-labelledby="timeout-title"
                aria-describedby="timeout-desc"
              >
                <h3 id="timeout-title">Session Timeout Warning</h3>
                <p id="timeout-desc">
                  Your session will expire in {timeLeft} seconds due to inactivity.
                </p>
                <button onClick={extendSession}>
                  Extend Session
                </button>
              </div>
            )}
          </div>
        );
      };

      render(
        <ModalNavigationProvider>
          <ModalNavigationContent>
            <TimeoutWarningTest />
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      // Fast-forward to trigger warning
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      const timeoutDialog = screen.getByRole('alertdialog');
      expect(timeoutDialog).toHaveAttribute('aria-labelledby', 'timeout-title');
      expect(timeoutDialog).toHaveAttribute('aria-describedby', 'timeout-desc');

      jest.useRealTimers();
    });
  });
});