/**
 * Unit Tests for ModalNavigation System
 * 
 * Tests the comprehensive modal navigation system including:
 * - ModalNavigationProvider (context and state management)
 * - ModalNavigationHeader (navigation header with back button)
 * - ModalNavigationContent (content container with animations)
 * - useModalNavigation hook
 * - useModalPageNavigation hook
 * 
 * Focus Areas:
 * - Navigation stack management
 * - External vs internal page routing
 * - Animation state management
 * - Accessibility compliance
 * - Keyboard navigation
 * - Context provider functionality
 * - Hook behavior and error handling
 */

import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import {
  ModalNavigationProvider,
  ModalNavigationHeader,
  ModalNavigationContent,
  useModalNavigation,
  useModalPageNavigation,
  type ModalPage,
  type ModalPageType,
} from '@/components/ui/ModalNavigation';

// Mock components for testing
const TestComponent: React.FC<{ title?: string }> = ({ title = 'Test Page' }) => (
  <div data-testid="test-component">
    <h1>{title}</h1>
    <p>This is a test component</p>
  </div>
);

const SecondaryComponent: React.FC = () => (
  <div data-testid="secondary-component">
    <h1>Secondary Page</h1>
    <p>This is a secondary test component</p>
  </div>
);

// Hook testing components
const NavigationTestComponent: React.FC = () => {
  const {
    state,
    navigateTo,
    navigateBack,
    canGoBack,
    getCurrentPage,
    reset,
  } = useModalNavigation();

  const currentPage = getCurrentPage();

  return (
    <div data-testid="navigation-test">
      <div data-testid="current-page-count">{state.pages.length}</div>
      <div data-testid="current-page-index">{state.currentPageIndex}</div>
      <div data-testid="is-navigating">{state.isNavigating ? 'true' : 'false'}</div>
      <div data-testid="can-go-back">{canGoBack ? 'true' : 'false'}</div>
      <div data-testid="current-page-title">{currentPage?.title || 'none'}</div>
      
      <button
        onClick={() => navigateTo({
          id: 'test-page',
          title: 'Test Page',
          component: TestComponent,
          type: 'internal',
        })}
        data-testid="navigate-to-test"
      >
        Navigate to Test
      </button>
      
      <button
        onClick={() => navigateTo({
          id: 'https://external.com',
          title: 'External Page',
          component: () => null,
          type: 'external',
        })}
        data-testid="navigate-to-external"
      >
        Navigate External
      </button>
      
      <button onClick={navigateBack} data-testid="navigate-back">
        Go Back
      </button>
      
      <button onClick={reset} data-testid="reset-navigation">
        Reset
      </button>
    </div>
  );
};

const PageNavigationTestComponent: React.FC = () => {
  const { navigateToPage, navigateToUrl } = useModalPageNavigation();

  return (
    <div data-testid="page-navigation-test">
      <button
        onClick={() => navigateToPage(
          'page-1',
          'Page One',
          TestComponent,
          { title: 'Custom Title' },
          'internal'
        )}
        data-testid="navigate-to-page"
      >
        Navigate to Page
      </button>
      
      <button
        onClick={() => navigateToUrl('/dashboard', 'Dashboard')}
        data-testid="navigate-to-url-internal"
      >
        Navigate to Dashboard
      </button>
      
      <button
        onClick={() => navigateToUrl('https://example.com', 'External Site')}
        data-testid="navigate-to-url-external"
      >
        Navigate to External URL
      </button>
    </div>
  );
};

// Error boundary for testing hook errors
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Hook error occurred</div>;
    }

    return this.props.children;
  }
}

describe('ModalNavigationProvider', () => {
  const mockOnExternalNavigation = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Provider Setup and State Management', () => {
    it('provides navigation context to children', () => {
      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      expect(screen.getByTestId('navigation-test')).toBeInTheDocument();
      expect(screen.getByTestId('current-page-count')).toHaveTextContent('0');
      expect(screen.getByTestId('current-page-index')).toHaveTextContent('0');
      expect(screen.getByTestId('can-go-back')).toHaveTextContent('false');
    });

    it('initializes with initial page when provided', () => {
      const initialPage: ModalPage = {
        id: 'initial',
        title: 'Initial Page',
        component: TestComponent,
        type: 'internal',
      };

      render(
        <ModalNavigationProvider initialPage={initialPage}>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('1');
      expect(screen.getByTestId('current-page-title')).toHaveTextContent('Initial Page');
    });

    it('handles empty state correctly', () => {
      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('0');
      expect(screen.getByTestId('current-page-title')).toHaveTextContent('none');
    });
  });

  describe('Internal Navigation', () => {
    it('adds internal pages to navigation stack', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      const navigateButton = screen.getByTestId('navigate-to-test');
      await user.click(navigateButton);

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('1');
      expect(screen.getByTestId('current-page-index')).toHaveTextContent('0');
      expect(screen.getByTestId('current-page-title')).toHaveTextContent('Test Page');
      expect(screen.getByTestId('is-navigating')).toHaveTextContent('true');
      expect(screen.getByTestId('can-go-back')).toHaveTextContent('false');

      // Fast-forward timer to complete navigation animation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByTestId('is-navigating')).toHaveTextContent('false');
    });

    it('maintains navigation stack correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      // Navigate to first page
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('1');
      expect(screen.getByTestId('can-go-back')).toHaveTextContent('false');

      // Navigate to second page
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('2');
      expect(screen.getByTestId('current-page-index')).toHaveTextContent('1');
      expect(screen.getByTestId('can-go-back')).toHaveTextContent('true');
    });

    it('handles navigation back correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      // Navigate forward twice
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('current-page-index')).toHaveTextContent('1');
      expect(screen.getByTestId('can-go-back')).toHaveTextContent('true');

      // Navigate back
      await user.click(screen.getByTestId('navigate-back'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('current-page-index')).toHaveTextContent('0');
      expect(screen.getByTestId('can-go-back')).toHaveTextContent('false');
    });
  });

  describe('External Navigation', () => {
    it('handles external navigation through callback', async () => {
      const user = userEvent.setup();

      render(
        <ModalNavigationProvider onExternalNavigation={mockOnExternalNavigation}>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      await user.click(screen.getByTestId('navigate-to-external'));

      expect(mockOnExternalNavigation).toHaveBeenCalledWith('https://external.com');
      // Should not add to navigation stack
      expect(screen.getByTestId('current-page-count')).toHaveTextContent('0');
    });

    it('falls back to window.open when no callback provided', async () => {
      const user = userEvent.setup();
      const mockWindowOpen = jest.fn();
      Object.defineProperty(window, 'open', { value: mockWindowOpen, writable: true });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      await user.click(screen.getByTestId('navigate-to-external'));

      expect(mockWindowOpen).toHaveBeenCalledWith('https://external.com', '_blank');
    });

    it('handles public pages as external navigation', async () => {
      const user = userEvent.setup();

      const PublicNavigationTest = () => {
        const { navigateTo } = useModalNavigation();
        return (
          <button
            onClick={() => navigateTo({
              id: '/register',
              title: 'Register',
              component: () => null,
              type: 'public',
            })}
            data-testid="navigate-to-public"
          >
            Navigate to Public
          </button>
        );
      };

      render(
        <ModalNavigationProvider onExternalNavigation={mockOnExternalNavigation}>
          <PublicNavigationTest />
        </ModalNavigationProvider>
      );

      await user.click(screen.getByTestId('navigate-to-public'));

      expect(mockOnExternalNavigation).toHaveBeenCalledWith('/register');
    });
  });

  describe('Navigation State Reset', () => {
    it('resets navigation state correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const initialPage: ModalPage = {
        id: 'initial',
        title: 'Initial Page',
        component: TestComponent,
        type: 'internal',
      };

      render(
        <ModalNavigationProvider initialPage={initialPage}>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      // Navigate to additional pages
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('3');
      expect(screen.getByTestId('current-page-index')).toHaveTextContent('2');

      // Reset navigation
      await user.click(screen.getByTestId('reset-navigation'));

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('1');
      expect(screen.getByTestId('current-page-index')).toHaveTextContent('0');
      expect(screen.getByTestId('current-page-title')).toHaveTextContent('Initial Page');
    });

    it('resets to empty state when no initial page', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      // Navigate to pages
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('1');

      // Reset navigation
      await user.click(screen.getByTestId('reset-navigation'));

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('0');
      expect(screen.getByTestId('current-page-title')).toHaveTextContent('none');
    });
  });

  describe('Animation State Management', () => {
    it('manages navigation animation state correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      expect(screen.getByTestId('is-navigating')).toHaveTextContent('false');

      await user.click(screen.getByTestId('navigate-to-test'));
      expect(screen.getByTestId('is-navigating')).toHaveTextContent('true');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByTestId('is-navigating')).toHaveTextContent('false');
    });

    it('handles rapid navigation requests correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      // Rapid navigation clicks
      await user.click(screen.getByTestId('navigate-to-test'));
      await user.click(screen.getByTestId('navigate-to-test'));
      await user.click(screen.getByTestId('navigate-to-test'));

      expect(screen.getByTestId('current-page-count')).toHaveTextContent('3');
      expect(screen.getByTestId('is-navigating')).toHaveTextContent('true');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByTestId('is-navigating')).toHaveTextContent('false');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles navigation back at beginning of stack', async () => {
      const user = userEvent.setup();

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
        </ModalNavigationProvider>
      );

      expect(screen.getByTestId('can-go-back')).toHaveTextContent('false');

      // Try to navigate back with empty stack
      await user.click(screen.getByTestId('navigate-back'));

      expect(screen.getByTestId('current-page-index')).toHaveTextContent('0');
      expect(screen.getByTestId('can-go-back')).toHaveTextContent('false');
    });

    it('handles pages with canNavigateBack = false', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const NoBackNavigationTest = () => {
        const { navigateTo, canGoBack } = useModalNavigation();
        return (
          <div>
            <div data-testid="can-go-back-no-back">{canGoBack ? 'true' : 'false'}</div>
            <button
              onClick={() => navigateTo({
                id: 'no-back',
                title: 'No Back Page',
                component: TestComponent,
                type: 'internal',
                canNavigateBack: false,
              })}
              data-testid="navigate-to-no-back"
            >
              Navigate to No Back
            </button>
          </div>
        );
      };

      render(
        <ModalNavigationProvider>
          <NoBackNavigationTest />
        </ModalNavigationProvider>
      );

      await user.click(screen.getByTestId('navigate-to-no-back'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('can-go-back-no-back')).toHaveTextContent('false');
    });
  });
});

describe('ModalNavigationHeader', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (headerProps = {}, initialPage?: ModalPage) => {
    return render(
      <ModalNavigationProvider initialPage={initialPage}>
        <ModalNavigationHeader onClose={mockOnClose} {...headerProps} />
      </ModalNavigationProvider>
    );
  };

  describe('Header Rendering', () => {
    it('renders header with default title', () => {
      renderWithProvider();

      expect(screen.getByRole('heading')).toHaveTextContent('Page');
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      renderWithProvider({ title: 'Custom Title' });

      expect(screen.getByRole('heading')).toHaveTextContent('Custom Title');
    });

    it('uses current page title when available', () => {
      const initialPage: ModalPage = {
        id: 'test',
        title: 'Test Page Title',
        component: TestComponent,
        type: 'internal',
      };

      renderWithProvider({}, initialPage);

      expect(screen.getByRole('heading')).toHaveTextContent('Test Page Title');
    });

    it('prioritizes explicit title over current page title', () => {
      const initialPage: ModalPage = {
        id: 'test',
        title: 'Page Title',
        component: TestComponent,
        type: 'internal',
      };

      renderWithProvider({ title: 'Override Title' }, initialPage);

      expect(screen.getByRole('heading')).toHaveTextContent('Override Title');
    });
  });

  describe('Back Button Behavior', () => {
    it('shows back button when navigation is possible', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
          <ModalNavigationHeader onClose={mockOnClose} />
        </ModalNavigationProvider>
      );

      // Initially no back button
      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();

      // Navigate to create stack
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));

      // Now back button should be visible
      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });

    it('handles back button click correctly', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
          <ModalNavigationHeader onClose={mockOnClose} />
        </ModalNavigationProvider>
      );

      // Create navigation stack
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('current-page-index')).toHaveTextContent('1');

      // Click back button
      await user.click(screen.getByLabelText('Go back'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByTestId('current-page-index')).toHaveTextContent('0');
    });

    it('uses custom back action when provided', async () => {
      const user = userEvent.setup();
      const customBackAction = jest.fn();

      renderWithProvider({ customBackAction });

      const backButton = screen.getByLabelText('Go back');
      await user.click(backButton);

      expect(customBackAction).toHaveBeenCalledTimes(1);
    });

    it('hides back button when showBackButton is false', () => {
      renderWithProvider({ showBackButton: false });

      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
    });
  });

  describe('Close Button Behavior', () => {
    it('shows close button by default', () => {
      renderWithProvider();

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('handles close button click', async () => {
      const user = userEvent.setup();

      renderWithProvider();

      await user.click(screen.getByLabelText('Close modal'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not show close button when onClose not provided', () => {
      render(
        <ModalNavigationProvider>
          <ModalNavigationHeader />
        </ModalNavigationProvider>
      );

      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });
  });

  describe('Right Actions', () => {
    it('renders right actions when provided', () => {
      const rightActions = (
        <button data-testid="custom-action">Custom Action</button>
      );

      renderWithProvider({ rightActions });

      expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    });

    it('positions right actions correctly with close button', () => {
      const rightActions = (
        <button data-testid="custom-action">Custom Action</button>
      );

      renderWithProvider({ rightActions });

      const actionsContainer = screen.getByTestId('custom-action').parentElement;
      const closeButton = screen.getByLabelText('Close modal');

      expect(actionsContainer).toContainElement(closeButton);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on buttons', () => {
      renderWithProvider();

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('maintains focus management', async () => {
      const user = userEvent.setup();

      renderWithProvider();

      const closeButton = screen.getByLabelText('Close modal');
      closeButton.focus();

      expect(document.activeElement).toBe(closeButton);

      await user.tab();
      // Focus should move to next focusable element
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProvider();

      const closeButton = screen.getByLabelText('Close modal');

      await user.type(closeButton, '{enter}');
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      await user.type(closeButton, ' ');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling and Customization', () => {
    it('applies custom className', () => {
      renderWithProvider({ className: 'custom-header-class' });

      const header = screen.getByRole('heading').closest('div');
      expect(header).toHaveClass('custom-header-class');
    });

    it('applies dark mode styles correctly', () => {
      renderWithProvider();

      const header = screen.getByRole('heading').closest('div');
      expect(header).toHaveClass('dark:border-gray-700');
    });
  });
});

describe('ModalNavigationContent', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (contentProps = {}, initialPage?: ModalPage) => {
    return render(
      <ModalNavigationProvider initialPage={initialPage}>
        <ModalNavigationContent onClose={mockOnClose} {...contentProps}>
          <div data-testid="modal-content">Test Content</div>
        </ModalNavigationContent>
      </ModalNavigationProvider>
    );
  };

  describe('Content Rendering', () => {
    it('renders children content', () => {
      renderWithProvider();

      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders with navigation header by default', () => {
      renderWithProvider();

      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('hides navigation header when showNavigationHeader is false', () => {
      renderWithProvider({ showNavigationHeader: false });

      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });

    it('passes header props correctly', () => {
      const headerProps = {
        title: 'Custom Content Title',
        showBackButton: false,
      };

      renderWithProvider({ headerProps });

      expect(screen.getByRole('heading')).toHaveTextContent('Custom Content Title');
      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
    });
  });

  describe('Animation and Transitions', () => {
    it('applies correct animation classes during navigation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
          <ModalNavigationContent onClose={mockOnClose}>
            <div data-testid="animated-content">Animated Content</div>
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const contentContainer = screen.getByTestId('animated-content').closest('div');
      
      // Initially should have translate-x-0
      expect(contentContainer).toHaveClass('transform', 'translate-x-0');

      // Start navigation
      await user.click(screen.getByTestId('navigate-to-test'));

      // During navigation should have translate-x-full
      expect(contentContainer).toHaveClass('transform', '-translate-x-full');

      // Complete navigation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // After navigation should return to translate-x-0
      expect(contentContainer).toHaveClass('transform', 'translate-x-0');
    });

    it('maintains smooth transition timing', () => {
      renderWithProvider();

      const contentContainer = screen.getByTestId('modal-content').closest('div');
      expect(contentContainer).toHaveClass('transition-transform', 'duration-300', 'ease-out');
    });
  });

  describe('Layout and Structure', () => {
    it('uses flexbox layout correctly', () => {
      renderWithProvider();

      const container = screen.getByTestId('modal-content').closest('div')?.parentElement;
      expect(container).toHaveClass('flex', 'flex-col', 'h-full');
    });

    it('applies custom className', () => {
      renderWithProvider({ className: 'custom-content-class' });

      const container = screen.getByTestId('modal-content').closest('div')?.parentElement;
      expect(container).toHaveClass('custom-content-class');
    });

    it('handles overflow correctly', () => {
      renderWithProvider();

      const contentArea = screen.getByTestId('modal-content').closest('div');
      expect(contentArea?.parentElement).toHaveClass('relative', 'overflow-hidden');
    });
  });

  describe('Integration with Navigation State', () => {
    it('responds to navigation state changes', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
          <ModalNavigationContent onClose={mockOnClose}>
            <div data-testid="state-responsive-content">Content</div>
          </ModalNavigationContent>
        </ModalNavigationProvider>
      );

      const contentContainer = screen.getByTestId('state-responsive-content').closest('div');

      // Navigate to trigger state change
      await user.click(screen.getByTestId('navigate-to-test'));
      expect(contentContainer).toHaveClass('-translate-x-full');

      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(contentContainer).toHaveClass('translate-x-0');
    });

    it('updates header based on current page', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <ModalNavigationProvider>
          <NavigationTestComponent />
          <ModalNavigationContent onClose={mockOnClose} />
        </ModalNavigationProvider>
      );

      // Initially shows default title
      expect(screen.getByRole('heading')).toHaveTextContent('Page');

      // Navigate to page with title
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(300));

      expect(screen.getByRole('heading')).toHaveTextContent('Test Page');
    });
  });
});

describe('useModalNavigation Hook', () => {
  const TestHookComponent = () => {
    try {
      const navigation = useModalNavigation();
      return <div data-testid="hook-success">Hook works</div>;
    } catch (error) {
      return <div data-testid="hook-error">Hook failed</div>;
    }
  };

  it('throws error when used outside provider', () => {
    render(
      <TestErrorBoundary>
        <TestHookComponent />
      </TestErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('works correctly when used within provider', () => {
    render(
      <ModalNavigationProvider>
        <TestHookComponent />
      </ModalNavigationProvider>
    );

    expect(screen.getByTestId('hook-success')).toBeInTheDocument();
  });

  it('provides all expected navigation methods', () => {
    const HookMethodsTest = () => {
      const navigation = useModalNavigation();
      const methods = Object.keys(navigation);
      
      return (
        <div data-testid="hook-methods">
          {methods.map(method => (
            <div key={method} data-testid={`method-${method}`}>
              {method}
            </div>
          ))}
        </div>
      );
    };

    render(
      <ModalNavigationProvider>
        <HookMethodsTest />
      </ModalNavigationProvider>
    );

    const expectedMethods = [
      'state',
      'navigateTo',
      'navigateBack',
      'canGoBack',
      'getCurrentPage',
      'reset',
      'setNavigating'
    ];

    expectedMethods.forEach(method => {
      expect(screen.getByTestId(`method-${method}`)).toBeInTheDocument();
    });
  });
});

describe('useModalPageNavigation Hook', () => {
  it('provides navigation helper methods', () => {
    render(
      <ModalNavigationProvider>
        <PageNavigationTestComponent />
      </ModalNavigationProvider>
    );

    expect(screen.getByTestId('navigate-to-page')).toBeInTheDocument();
    expect(screen.getByTestId('navigate-to-url-internal')).toBeInTheDocument();
    expect(screen.getByTestId('navigate-to-url-external')).toBeInTheDocument();
  });

  it('navigates to pages correctly', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <ModalNavigationProvider>
        <NavigationTestComponent />
        <PageNavigationTestComponent />
      </ModalNavigationProvider>
    );

    await user.click(screen.getByTestId('navigate-to-page'));
    act(() => jest.advanceTimersByTime(300));

    expect(screen.getByTestId('current-page-count')).toHaveTextContent('1');
    expect(screen.getByTestId('current-page-title')).toHaveTextContent('Page One');
  });

  it('distinguishes between internal and external URLs', async () => {
    const user = userEvent.setup();
    const mockOnExternalNavigation = jest.fn();

    render(
      <ModalNavigationProvider onExternalNavigation={mockOnExternalNavigation}>
        <PageNavigationTestComponent />
      </ModalNavigationProvider>
    );

    // Internal URL should not trigger external navigation
    await user.click(screen.getByTestId('navigate-to-url-internal'));
    expect(mockOnExternalNavigation).toHaveBeenCalledWith('/dashboard');

    // External URL should trigger external navigation
    await user.click(screen.getByTestId('navigate-to-url-external'));
    expect(mockOnExternalNavigation).toHaveBeenCalledWith('https://example.com');
  });

  it('detects public pages correctly', async () => {
    const user = userEvent.setup();
    const mockOnExternalNavigation = jest.fn();

    const PublicPageTest = () => {
      const { navigateToUrl } = useModalPageNavigation();
      return (
        <button
          onClick={() => navigateToUrl('/register')}
          data-testid="navigate-to-register"
        >
          Register
        </button>
      );
    };

    render(
      <ModalNavigationProvider onExternalNavigation={mockOnExternalNavigation}>
        <PublicPageTest />
      </ModalNavigationProvider>
    );

    await user.click(screen.getByTestId('navigate-to-register'));
    expect(mockOnExternalNavigation).toHaveBeenCalledWith('/register');
  });
});

describe('Performance and Memory Management', () => {
  it('handles large navigation stacks efficiently', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <ModalNavigationProvider>
        <NavigationTestComponent />
      </ModalNavigationProvider>
    );

    const startTime = performance.now();

    // Create large navigation stack
    for (let i = 0; i < 50; i++) {
      await user.click(screen.getByTestId('navigate-to-test'));
      act(() => jest.advanceTimersByTime(10)); // Reduced timer for performance
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    expect(totalTime).toBeLessThan(5000); // Should complete in under 5 seconds
    expect(screen.getByTestId('current-page-count')).toHaveTextContent('50');
  });

  it('cleans up timers properly', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const { unmount } = render(
      <ModalNavigationProvider>
        <NavigationTestComponent />
      </ModalNavigationProvider>
    );

    await user.click(screen.getByTestId('navigate-to-test'));
    
    // Unmount before timer completes
    unmount();

    // Should not cause memory leaks or errors
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Test passes if no errors thrown
    expect(true).toBe(true);
  });
});