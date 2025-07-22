/**
 * Test Template for React Components
 * 
 * This template provides comprehensive testing patterns for React components.
 * Copy this file and rename it according to the component you're testing.
 * 
 * Example: BookingForm.test.tsx, Calendar.test.tsx, UserDashboard.test.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'next/router';
import mockRouter from 'next-router-mock';
import Link from 'next/link';
import '@testing-library/jest-dom';

// Import the component to test
// import { YourComponent } from '../components/YourComponent';

// ===== MOCK SERVER SETUP =====

const server = setupServer(
  // Define API mocks
  rest.get('/api/resources', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        items: [
          { id: 1, name: 'Resource 1' },
          { id: 2, name: 'Resource 2' },
        ],
        total: 2,
      })
    );
  }),
  
  rest.post('/api/resources', (req, res, ctx) => {
    const { name } = req.body as { name: string };
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        name,
        created_at: new Date().toISOString(),
      })
    );
  }),
  
  rest.delete('/api/resources/:id', (req, res, ctx) => {
    return res(ctx.status(204));
  })
);

// Enable API mocking before tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ===== TEST UTILITIES =====

// Custom render function with providers
const renderWithProviders = (
  ui: React.ReactElement,
  {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    }),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock authentication context
const mockAuthContext = {
  user: {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'client',
  },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
};

// ===== COMPONENT TESTS =====

describe('YourComponent', () => {
  // Setup user event instance
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    mockRouter.setCurrentUrl('/');
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderWithProviders(<div>Component</div>);
      expect(screen.getByText('Component')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      renderWithProviders(<div data-testid="loading">Loading...</div>);
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('renders with custom props', () => {
      const props = {
        title: 'Test Title',
        subtitle: 'Test Subtitle',
      };
      
      renderWithProviders(
        <div>
          <h1>{props.title}</h1>
          <p>{props.subtitle}</p>
        </div>
      );
      
      expect(screen.getByRole('heading')).toHaveTextContent(props.title);
      expect(screen.getByText(props.subtitle)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles button click', async () => {
      const handleClick = jest.fn();
      
      renderWithProviders(
        <button onClick={handleClick}>Click me</button>
      );
      
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles form submission', async () => {
      const handleSubmit = jest.fn((e) => e.preventDefault());
      
      renderWithProviders(
        <form onSubmit={handleSubmit}>
          <input name="email" type="email" placeholder="Email" />
          <input name="password" type="password" placeholder="Password" />
          <button type="submit">Submit</button>
        </form>
      );
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Submit' }));
      
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('validates form inputs', async () => {
      renderWithProviders(
        <form>
          <input 
            type="email" 
            required 
            placeholder="Email"
            aria-label="Email input"
          />
          <span role="alert">Email is required</span>
        </form>
      );
      
      const emailInput = screen.getByPlaceholderText('Email');
      
      // Test empty submission
      fireEvent.blur(emailInput);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('fetches and displays data', async () => {
      renderWithProviders(
        <div>
          <div data-testid="resource-1">Resource 1</div>
          <div data-testid="resource-2">Resource 2</div>
        </div>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('resource-1')).toBeInTheDocument();
        expect(screen.getByTestId('resource-2')).toBeInTheDocument();
      });
    });

    it('handles API errors gracefully', async () => {
      server.use(
        rest.get('/api/resources', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        })
      );
      
      renderWithProviders(
        <div data-testid="error">Failed to load resources</div>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toBeInTheDocument();
      });
    });

    it('creates a new resource', async () => {
      const onCreate = jest.fn();
      
      renderWithProviders(
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          await fetch('/api/resources', {
            method: 'POST',
            body: JSON.stringify({ name: formData.get('name') }),
          });
          onCreate();
        }}>
          <input name="name" placeholder="Resource name" />
          <button type="submit">Create</button>
        </form>
      );
      
      await user.type(screen.getByPlaceholderText('Resource name'), 'New Resource');
      await user.click(screen.getByRole('button', { name: 'Create' }));
      
      await waitFor(() => {
        expect(onCreate).toHaveBeenCalled();
      });
    });
  });

  describe('Conditional Rendering', () => {
    it('shows content based on authentication', () => {
      const { rerender } = renderWithProviders(
        <div>
          {mockAuthContext.isAuthenticated ? (
            <div>Authenticated content</div>
          ) : (
            <div>Please login</div>
          )}
        </div>
      );
      
      expect(screen.getByText('Authenticated content')).toBeInTheDocument();
      
      // Test with unauthenticated state
      mockAuthContext.isAuthenticated = false;
      rerender(
        <div>
          {mockAuthContext.isAuthenticated ? (
            <div>Authenticated content</div>
          ) : (
            <div>Please login</div>
          )}
        </div>
      );
      
      expect(screen.getByText('Please login')).toBeInTheDocument();
    });

    it('shows different content based on user role', () => {
      const userRole = 'admin';
      
      renderWithProviders(
        <div>
          {userRole === 'admin' && <div>Admin panel</div>}
          {userRole === 'client' && <div>Client dashboard</div>}
        </div>
      );
      
      expect(screen.getByText('Admin panel')).toBeInTheDocument();
      expect(screen.queryByText('Client dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Async Operations', () => {
    it('shows loading state during async operation', async () => {
      let isLoading = true;
      
      const { rerender } = renderWithProviders(
        <div>
          {isLoading ? <div>Loading...</div> : <div>Data loaded</div>}
        </div>
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Simulate async completion
      isLoading = false;
      rerender(
        <div>
          {isLoading ? <div>Loading...</div> : <div>Data loaded</div>}
        </div>
      );
      
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });

    it('handles debounced search input', async () => {
      jest.useFakeTimers();
      const handleSearch = jest.fn();
      
      renderWithProviders(
        <input
          type="search"
          placeholder="Search..."
          onChange={(e) => {
            setTimeout(() => handleSearch(e.target.value), 500);
          }}
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'test query');
      
      // Fast-forward timers
      jest.runAllTimers();
      
      await waitFor(() => {
        expect(handleSearch).toHaveBeenCalledWith('test query');
      });
      
      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(
        <nav aria-label="Main navigation">
          <ul>
            <li><Link href="/home" aria-label="Go to home page">Home</Link></li>
            <li><Link href="/about" aria-label="Go to about page">About</Link></li>
          </ul>
        </nav>
      );
      
      expect(screen.getByLabelText('Main navigation')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to home page')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const handleKeyDown = jest.fn();
      
      renderWithProviders(
        <div onKeyDown={handleKeyDown} tabIndex={0}>
          Focusable element
        </div>
      );
      
      const element = screen.getByText('Focusable element');
      element.focus();
      
      fireEvent.keyDown(element, { key: 'Enter', code: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalled();
    });
  });

  describe('Error Boundaries', () => {
    it('catches and displays errors', () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const ThrowError = () => {
        throw new Error('Test error');
      };
      
      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div>Something went wrong</div>;
        }
      };
      
      renderWithProviders(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Normal content')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Custom Hooks', () => {
    // Example of testing a custom hook
    it('uses custom hook correctly', () => {
      const useCounter = () => {
        const [count, setCount] = React.useState(0);
        const increment = () => setCount(c => c + 1);
        return { count, increment };
      };
      
      const TestComponent = () => {
        const { count, increment } = useCounter();
        return (
          <div>
            <span>Count: {count}</span>
            <button onClick={increment}>Increment</button>
          </div>
        );
      };
      
      renderWithProviders(<TestComponent />);
      
      expect(screen.getByText('Count: 0')).toBeInTheDocument();
      
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Count: 1')).toBeInTheDocument();
    });
  });
});

// ===== INTEGRATION TEST EXAMPLE =====

describe('Full Page Integration', () => {
  it('completes a full user flow', async () => {
    const user = userEvent.setup();
    
    // Mock all necessary API calls
    server.use(
      rest.post('/api/auth/login', (req, res, ctx) => {
        return res(ctx.json({ token: 'fake-token', user: mockAuthContext.user }));
      }),
      rest.get('/api/bookings', (req, res, ctx) => {
        return res(ctx.json({ bookings: [] }));
      }),
      rest.post('/api/bookings', (req, res, ctx) => {
        return res(ctx.json({ id: 1, status: 'confirmed' }));
      })
    );
    
    // Render the page
    renderWithProviders(<div>Integration test placeholder</div>);
    
    // Simulate user flow
    // 1. Login
    // 2. Navigate to booking
    // 3. Select service
    // 4. Choose time slot
    // 5. Confirm booking
    // 6. Verify success message
    
    expect(screen.getByText('Integration test placeholder')).toBeInTheDocument();
  });
});

// ===== SNAPSHOT TESTS =====

describe('Snapshot Tests', () => {
  it('matches snapshot', () => {
    const { container } = renderWithProviders(
      <div className="test-component">
        <h1>Snapshot Test</h1>
        <p>This component structure should not change</p>
      </div>
    );
    
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ===== PERFORMANCE TESTS =====

describe('Performance', () => {
  it('renders large lists efficiently', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));
    
    const start = performance.now();
    
    renderWithProviders(
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    );
    
    const renderTime = performance.now() - start;
    
    // Expect render to complete within reasonable time
    expect(renderTime).toBeLessThan(1000); // 1 second
    expect(screen.getAllByRole('listitem')).toHaveLength(1000);
  });
});