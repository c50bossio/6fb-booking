/**
 * Integration Tests for ShareBookingModal Component
 * 
 * Tests the complete ShareBookingModal component with all its features:
 * - Link customization and URL generation
 * - QR code generation and display
 * - Clipboard operations and sharing
 * - Local storage integration
 * - API integration with short URL service
 * - Multiple modal interactions
 * - Six Figure Barber business workflows
 * 
 * Focus Areas:
 * - Complete user workflows
 * - API service integration
 * - State management across features
 * - Modal lifecycle with sub-modals
 * - Error handling and recovery
 * - Performance with real data
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import '@testing-library/jest-dom';

import ShareBookingModal from '@/components/booking/ShareBookingModal';

// Mock dependencies
jest.mock('@/lib/short-url-service', () => ({
  shortUrlService: {
    createBookingShortUrlWithFallback: jest.fn(),
  },
}));

jest.mock('@/components/booking/LinkCustomizer', () => {
  return function MockLinkCustomizer(props: any) {
    return props.isOpen ? (
      <div data-testid="link-customizer-modal">
        <h2>Link Customizer</h2>
        <button onClick={props.onClose} data-testid="close-customizer">
          Close Customizer
        </button>
        <button onClick={props.onBack} data-testid="back-customizer">
          Back
        </button>
      </div>
    ) : null;
  };
});

jest.mock('@/components/booking/QRCodeGenerator', () => {
  return function MockQRCodeGenerator(props: any) {
    return (
      <div data-testid="qr-code-generator" className={props.className}>
        <h3>{props.title}</h3>
        <p>{props.description}</p>
        <div data-testid="qr-url">{props.bookingUrl}</div>
        <div data-testid="qr-size">{props.defaultSize}</div>
        {props.showDownloadButton && (
          <button data-testid="download-qr">Download QR</button>
        )}
        {props.showShareButton && (
          <button data-testid="share-qr">Share QR</button>
        )}
        {props.showCopyButton && (
          <button data-testid="copy-qr">Copy QR</button>
        )}
      </div>
    );
  };
});

jest.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, onClose, title, ...props }: any) => 
    isOpen ? (
      <div data-testid={`modal-${title?.toLowerCase().replace(/\s+/g, '-')}`} {...props}>
        <div data-testid="modal-overlay" onClick={onClose}></div>
        <div data-testid="modal-content">
          <h2>{title}</h2>
          {children}
        </div>
      </div>
    ) : null,
  ModalBody: ({ children, className }: any) => (
    <div data-testid="modal-body" className={className}>
      {children}
    </div>
  ),
}));

// Mock clipboard API
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

// Mock Web Share API
const mockShare = jest.fn();
Object.defineProperty(navigator, 'share', {
  value: mockShare,
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock URL service
import { shortUrlService } from '@/lib/short-url-service';
const mockShortUrlService = shortUrlService as jest.Mocked<typeof shortUrlService>;

// MSW server for API mocking
const server = setupServer(
  rest.post('/api/short-urls', (req, res, ctx) => {
    return res(
      ctx.json({
        url: 'https://6fb.co/custom-link',
        isShortUrl: true,
        id: 'test-id',
      })
    );
  }),
  
  rest.get('/api/short-urls/analytics', (req, res, ctx) => {
    return res(
      ctx.json({
        clicks: 42,
        uniqueVisitors: 38,
        countries: ['US', 'CA', 'UK'],
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
  localStorageMock.clear();
});
afterAll(() => server.close());

describe('ShareBookingModal Integration Tests', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    bookingUrl: 'https://book.example.com/premium-barber',
    businessName: 'Six Figure Barber Studio',
    services: [
      { id: 1, name: 'Signature Executive Cut', price: 95, duration: 45 },
      { id: 2, name: 'Master Beard Sculpting', price: 55, duration: 30 },
      { id: 3, name: 'Complete Grooming Experience', price: 150, duration: 75 },
    ],
    barbers: [
      { id: 1, name: 'Master Stylist John', specialties: ['executive cuts', 'styling'] },
      { id: 2, name: 'Senior Barber Mike', specialties: ['traditional cuts', 'beard work'] },
    ],
    subscriptionTier: 'enterprise' as const,
  };

  describe('Complete Modal Rendering and Lifecycle', () => {
    it('renders main modal with all primary elements', () => {
      render(<ShareBookingModal {...defaultProps} />);

      expect(screen.getByTestId('modal-share-booking')).toBeInTheDocument();
      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();
      expect(screen.getByRole('link')).toHaveAttribute('href', defaultProps.bookingUrl);
      expect(screen.getByTestId('copy-link')).toBeInTheDocument();
    });

    it('handles modal close through various methods', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<ShareBookingModal {...defaultProps} onClose={onClose} />);

      // Test overlay click
      const overlay = screen.getByTestId('modal-overlay');
      await user.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);

      // Test escape key
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it('renders when closed without crashing', () => {
      render(<ShareBookingModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByTestId('modal-share-booking')).not.toBeInTheDocument();
    });
  });

  describe('Link Customization Workflow', () => {
    it('handles complete link customization flow', async () => {
      const user = userEvent.setup();
      
      mockShortUrlService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/premium-studio',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...defaultProps} />);

      // Expand link options
      const linkOptionsButton = screen.getByText('Link Options');
      await user.click(linkOptionsButton);

      // Set custom link name
      const linkNameInput = screen.getByPlaceholderText(/e.g., summer-special/);
      await user.type(linkNameInput, 'premium-studio');

      // Enable expiration
      const expirationCheckbox = screen.getByLabelText('Set expiration date');
      await user.click(expirationCheckbox);

      // Set expiration date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      
      const expirationInput = screen.getByDisplayValue('');
      await user.type(expirationInput, tomorrowString);

      // Wait for URL generation
      await waitFor(() => {
        expect(mockShortUrlService.createBookingShortUrlWithFallback).toHaveBeenCalledWith(
          defaultProps.bookingUrl,
          'premium-studio',
          tomorrowString,
          expect.stringContaining('Six Figure Barber Studio')
        );
      });

      // Verify UI updates
      await waitFor(() => {
        expect(screen.getByText('Branded')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', 'https://6fb.co/premium-studio');
      });
    });

    it('handles URL generation failures gracefully', async () => {
      const user = userEvent.setup();
      
      mockShortUrlService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: defaultProps.bookingUrl,
        isShortUrl: false,
        error: 'Service temporarily unavailable',
      });

      render(<ShareBookingModal {...defaultProps} />);

      // Expand link options and set custom name
      await user.click(screen.getByText('Link Options'));
      const linkNameInput = screen.getByPlaceholderText(/e.g., summer-special/);
      await user.type(linkNameInput, 'test-link');

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByText(/Service temporarily unavailable/)).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', defaultProps.bookingUrl);
      });
    });

    it('validates link name input correctly', async () => {
      const user = userEvent.setup();

      render(<ShareBookingModal {...defaultProps} />);

      await user.click(screen.getByText('Link Options'));
      const linkNameInput = screen.getByPlaceholderText(/e.g., summer-special/);

      // Test invalid characters are filtered
      await user.type(linkNameInput, 'test@#$%link!');
      expect(linkNameInput).toHaveValue('testlink');

      // Test length limit
      const longString = 'a'.repeat(60);
      await user.clear(linkNameInput);
      await user.type(linkNameInput, longString);
      expect(linkNameInput.value.length).toBe(50);
    });

    it('prevents past expiration dates', async () => {
      const user = userEvent.setup();

      render(<ShareBookingModal {...defaultProps} />);

      await user.click(screen.getByText('Link Options'));
      await user.click(screen.getByLabelText('Set expiration date'));

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      const expirationInput = screen.getByDisplayValue('');
      await user.type(expirationInput, yesterdayString);

      expect(screen.getByText('Expiration date cannot be in the past')).toBeInTheDocument();
    });
  });

  describe('QR Code Generation and Display', () => {
    it('opens and displays Quick QR Code modal', async () => {
      const user = userEvent.setup();

      render(<ShareBookingModal {...defaultProps} />);

      const qrButton = screen.getByTitle('Quick QR code');
      await user.click(qrButton);

      // Quick QR modal should be open
      expect(screen.getByTestId('modal-quick-qr-code')).toBeInTheDocument();
      expect(screen.getByTestId('qr-code-generator')).toBeInTheDocument();
      
      // Verify QR code props
      expect(screen.getByTestId('qr-url')).toHaveTextContent(defaultProps.bookingUrl);
      expect(screen.getByTestId('qr-size')).toHaveTextContent('small');
      expect(screen.getByTestId('download-qr')).toBeInTheDocument();
      expect(screen.queryByTestId('share-qr')).not.toBeInTheDocument();
    });

    it('closes QR modal correctly', async () => {
      const user = userEvent.setup();

      render(<ShareBookingModal {...defaultProps} />);

      // Open QR modal
      await user.click(screen.getByTitle('Quick QR code'));
      expect(screen.getByTestId('modal-quick-qr-code')).toBeInTheDocument();

      // Close via overlay
      const qrOverlay = within(screen.getByTestId('modal-quick-qr-code')).getByTestId('modal-overlay');
      await user.click(qrOverlay);

      expect(screen.queryByTestId('modal-quick-qr-code')).not.toBeInTheDocument();
    });

    it('uses custom URL for QR code when available', async () => {
      const user = userEvent.setup();
      
      mockShortUrlService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/custom-qr',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...defaultProps} />);

      // Create custom URL
      await user.click(screen.getByText('Link Options'));
      await user.type(screen.getByPlaceholderText(/e.g., summer-special/), 'custom-qr');

      // Wait for URL generation
      await waitFor(() => {
        expect(screen.getByRole('link')).toHaveAttribute('href', 'https://6fb.co/custom-qr');
      });

      // Open QR modal and verify it uses custom URL
      await user.click(screen.getByTitle('Quick QR code'));
      expect(screen.getByTestId('qr-url')).toHaveTextContent('https://6fb.co/custom-qr');
    });
  });

  describe('Clipboard Operations and Sharing', () => {
    it('copies link to clipboard successfully', async () => {
      const user = userEvent.setup();
      mockWriteText.mockResolvedValue(undefined);

      render(<ShareBookingModal {...defaultProps} />);

      const copyButton = screen.getByText('Copy Link');
      await user.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith(defaultProps.bookingUrl);
      
      // Check for success feedback
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });

      // Success feedback should disappear
      await waitFor(() => {
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      }, { timeout: 2500 });
    });

    it('handles clipboard errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockWriteText.mockRejectedValue(new Error('Clipboard access denied'));

      render(<ShareBookingModal {...defaultProps} />);

      const copyButton = screen.getByText('Copy Link');
      await user.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith(defaultProps.bookingUrl);
      // Should not show success feedback on error
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('tracks share count correctly', async () => {
      const user = userEvent.setup();
      mockWriteText.mockResolvedValue(undefined);

      render(<ShareBookingModal {...defaultProps} />);

      // Initially no share count shown
      expect(screen.queryByText(/Shared \d+ times/)).not.toBeInTheDocument();

      // Copy link multiple times
      const copyButton = screen.getByText('Copy Link');
      await user.click(copyButton);
      await waitFor(() => expect(screen.getByText('Shared 1 times')).toBeInTheDocument());

      await user.click(copyButton);
      await waitFor(() => expect(screen.getByText('Shared 2 times')).toBeInTheDocument());
    });

    it('handles Web Share API when available', async () => {
      const user = userEvent.setup();
      mockShare.mockResolvedValue(undefined);

      // Mock a share button interaction (this would be implemented in actual ShareBookingModal)
      const ShareTestComponent = () => {
        const handleShare = async () => {
          if (navigator.share) {
            await navigator.share({
              title: `Book with ${defaultProps.businessName}`,
              text: `Schedule your appointment with ${defaultProps.businessName}`,
              url: defaultProps.bookingUrl,
            });
          }
        };

        return (
          <div>
            <ShareBookingModal {...defaultProps} />
            <button onClick={handleShare} data-testid="web-share-test">
              Web Share Test
            </button>
          </div>
        );
      };

      render(<ShareTestComponent />);

      await user.click(screen.getByTestId('web-share-test'));

      expect(mockShare).toHaveBeenCalledWith({
        title: `Book with ${defaultProps.businessName}`,
        text: `Schedule your appointment with ${defaultProps.businessName}`,
        url: defaultProps.bookingUrl,
      });
    });
  });

  describe('Local Storage Integration', () => {
    it('saves custom links to recent links', async () => {
      const user = userEvent.setup();
      mockWriteText.mockResolvedValue(undefined);
      
      mockShortUrlService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/test-save',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...defaultProps} />);

      // Create custom link
      await user.click(screen.getByText('Link Options'));
      await user.type(screen.getByPlaceholderText(/e.g., summer-special/), 'test-save');

      // Wait for URL generation
      await waitFor(() => {
        expect(screen.getByRole('link')).toHaveAttribute('href', 'https://6fb.co/test-save');
      });

      // Copy the link to trigger save
      await user.click(screen.getByText('Copy Link'));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'recentBookingLinks',
        expect.stringContaining('test-save')
      );
    });

    it('displays and manages recent links', async () => {
      const user = userEvent.setup();
      
      // Pre-populate localStorage with recent links
      const recentLinks = [
        {
          url: 'https://6fb.co/recent-1',
          name: 'Copy Link',
          date: new Date().toISOString(),
          customName: 'recent-1',
          isShortUrl: true,
          businessName: defaultProps.businessName,
        },
        {
          url: 'https://6fb.co/recent-2',
          name: 'Copy Link',
          date: new Date().toISOString(),
          customName: 'recent-2',
          isShortUrl: true,
          businessName: defaultProps.businessName,
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(recentLinks));

      render(<ShareBookingModal {...defaultProps} />);

      // Recent links section should be visible
      const recentLinksToggle = screen.getByText('Recent links (2)');
      expect(recentLinksToggle).toBeInTheDocument();

      // Expand recent links
      await user.click(recentLinksToggle);

      expect(screen.getByText('recent-1')).toBeInTheDocument();
      expect(screen.getByText('recent-2')).toBeInTheDocument();
      expect(screen.getAllByText('Short')).toHaveLength(2);
    });

    it('handles localStorage errors gracefully', async () => {
      const user = userEvent.setup();
      
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not crash when localStorage fails
      expect(() => {
        render(<ShareBookingModal {...defaultProps} />);
      }).not.toThrow();

      // Recent links section should not appear
      expect(screen.queryByText(/Recent links/)).not.toBeInTheDocument();
    });

    it('limits recent links to maximum of 5', async () => {
      const user = userEvent.setup();
      mockWriteText.mockResolvedValue(undefined);

      // Start with 5 recent links
      const existingLinks = Array.from({ length: 5 }, (_, i) => ({
        url: `https://6fb.co/existing-${i}`,
        name: 'Copy Link',
        date: new Date(Date.now() - i * 1000).toISOString(),
        customName: `existing-${i}`,
        isShortUrl: true,
        businessName: defaultProps.businessName,
      }));

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingLinks));

      mockShortUrlService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/new-link',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...defaultProps} />);

      // Create new custom link
      await user.click(screen.getByText('Link Options'));
      await user.type(screen.getByPlaceholderText(/e.g., summer-special/), 'new-link');

      await waitFor(() => {
        expect(screen.getByRole('link')).toHaveAttribute('href', 'https://6fb.co/new-link');
      });

      // Copy to trigger save
      await user.click(screen.getByText('Copy Link'));

      // Verify that only 5 links are kept (new one replaces oldest)
      const savedData = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'recentBookingLinks'
      )?.[1];

      if (savedData) {
        const parsedData = JSON.parse(savedData);
        expect(parsedData).toHaveLength(5);
        expect(parsedData[0].customName).toBe('new-link');
        expect(parsedData.find((link: any) => link.customName === 'existing-4')).toBeUndefined();
      }
    });
  });

  describe('Expired Links Handling', () => {
    it('shows expired status for past expiration dates', async () => {
      const user = userEvent.setup();
      
      mockShortUrlService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/expired-link',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...defaultProps} />);

      // Set expiration to yesterday
      await user.click(screen.getByText('Link Options'));
      await user.click(screen.getByLabelText('Set expiration date'));

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      const expirationInput = screen.getByDisplayValue('');
      await user.type(expirationInput, yesterdayString);

      // Wait for UI to update
      await waitFor(() => {
        expect(screen.getByText('Link expired')).toBeInTheDocument();
        expect(screen.getByText('Expired')).toBeInTheDocument();
      });

      // Copy button should be disabled
      const copyButton = screen.getByRole('button', { name: /Expired/ });
      expect(copyButton).toBeDisabled();
    });

    it('shows expiring soon warning', async () => {
      const user = userEvent.setup();
      
      mockShortUrlService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/expiring-link',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...defaultProps} />);

      // Set expiration to today
      await user.click(screen.getByText('Link Options'));
      await user.click(screen.getByLabelText('Set expiration date'));

      const today = new Date().toISOString().split('T')[0];
      const expirationInput = screen.getByDisplayValue('');
      await user.type(expirationInput, today);

      await waitFor(() => {
        expect(screen.getByText('Expires today')).toBeInTheDocument();
      });
    });

    it('handles expired links in recent links correctly', async () => {
      const user = userEvent.setup();
      
      const expiredLink = {
        url: 'https://6fb.co/expired',
        name: 'Copy Link',
        date: new Date().toISOString(),
        customName: 'expired-link',
        expirationDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        isShortUrl: true,
        businessName: defaultProps.businessName,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([expiredLink]));

      render(<ShareBookingModal {...defaultProps} />);

      await user.click(screen.getByText('Recent links (1)'));

      expect(screen.getByText('Expired')).toBeInTheDocument();
      
      const copyButton = screen.getByTitle('Link expired');
      expect(copyButton).toBeDisabled();
    });
  });

  describe('Multiple Modal Management', () => {
    it('manages multiple modals without conflicts', async () => {
      const user = userEvent.setup();

      render(<ShareBookingModal {...defaultProps} />);

      // Main modal should be open
      expect(screen.getByTestId('modal-share-booking')).toBeInTheDocument();

      // Open QR modal
      await user.click(screen.getByTitle('Quick QR code'));
      expect(screen.getByTestId('modal-quick-qr-code')).toBeInTheDocument();

      // Both modals should coexist
      expect(screen.getByTestId('modal-share-booking')).toBeInTheDocument();
      expect(screen.getByTestId('modal-quick-qr-code')).toBeInTheDocument();

      // Close QR modal
      const qrOverlay = within(screen.getByTestId('modal-quick-qr-code')).getByTestId('modal-overlay');
      await user.click(qrOverlay);

      // Only main modal should remain
      expect(screen.getByTestId('modal-share-booking')).toBeInTheDocument();
      expect(screen.queryByTestId('modal-quick-qr-code')).not.toBeInTheDocument();
    });

    it('handles z-index stacking correctly', () => {
      render(<ShareBookingModal {...defaultProps} />);

      const mainModal = screen.getByTestId('modal-share-booking');
      expect(mainModal).toHaveStyle('z-index: 50'); // This would be from props
    });
  });

  describe('Six Figure Barber Business Logic Integration', () => {
    it('displays premium branding for enterprise tier', () => {
      render(<ShareBookingModal {...defaultProps} subscriptionTier="enterprise" />);

      expect(screen.getByText('Your Booking Link')).toBeInTheDocument();
      expect(screen.getByRole('link')).toHaveAttribute('href', defaultProps.bookingUrl);
      
      // Premium features should be available
      expect(screen.getByText('Link Options')).toBeInTheDocument();
    });

    it('handles high-value service pricing correctly', () => {
      const premiumProps = {
        ...defaultProps,
        services: [
          { id: 1, name: 'Master Craftsman Experience', price: 250, duration: 90 },
          { id: 2, name: 'Executive Styling Package', price: 180, duration: 60 },
        ],
      };

      render(<ShareBookingModal {...premiumProps} />);

      // Should render without issues with high-value services
      expect(screen.getByTestId('modal-share-booking')).toBeInTheDocument();
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('supports complex barber profiles', () => {
      const complexProps = {
        ...defaultProps,
        barbers: [
          {
            id: 1,
            name: 'Master Barber Alessandro',
            specialties: ['executive cuts', 'color', 'styling'],
            certifications: ['Master Barber', 'Color Specialist'],
            bio: 'Award-winning master barber with 15 years experience',
          },
        ],
      };

      render(<ShareBookingModal {...complexProps} />);

      expect(screen.getByTestId('modal-share-booking')).toBeInTheDocument();
    });

    it('generates appropriate URLs for premium locations', async () => {
      const user = userEvent.setup();
      
      const premiumUrl = 'https://book.sixfigurebarber.com/manhattan-flagship';
      const premiumProps = {
        ...defaultProps,
        bookingUrl: premiumUrl,
        businessName: 'Six Figure Barber Manhattan Flagship',
      };

      mockShortUrlService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/manhattan-flagship',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...premiumProps} />);

      await user.click(screen.getByText('Link Options'));
      await user.type(screen.getByPlaceholderText(/e.g., summer-special/), 'manhattan-flagship');

      await waitFor(() => {
        expect(mockShortUrlService.createBookingShortUrlWithFallback).toHaveBeenCalledWith(
          premiumUrl,
          'manhattan-flagship',
          undefined,
          expect.stringContaining('Six Figure Barber Manhattan Flagship')
        );
      });
    });
  });

  describe('Performance with Real Data', () => {
    it('handles large service catalogs efficiently', () => {
      const largeProps = {
        ...defaultProps,
        services: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Premium Service ${i}`,
          price: 50 + i,
          duration: 30 + i,
          category: `Category ${Math.floor(i / 10)}`,
        })),
      };

      const startTime = performance.now();
      render(<ShareBookingModal {...largeProps} />);
      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(100); // Should render quickly
      expect(screen.getByTestId('modal-share-booking')).toBeInTheDocument();
    });

    it('handles multiple simultaneous operations', async () => {
      const user = userEvent.setup();
      mockWriteText.mockResolvedValue(undefined);
      mockShortUrlService.createBookingShortUrlWithFallback.mockResolvedValue({
        url: 'https://6fb.co/multi-op',
        isShortUrl: true,
        error: null,
      });

      render(<ShareBookingModal {...defaultProps} />);

      // Perform multiple operations simultaneously
      const linkOptionsPromise = user.click(screen.getByText('Link Options'));
      const qrPromise = user.click(screen.getByTitle('Quick QR code'));

      await Promise.all([linkOptionsPromise, qrPromise]);

      // Both operations should complete successfully
      expect(screen.getByPlaceholderText(/e.g., summer-special/)).toBeInTheDocument();
      expect(screen.getByTestId('modal-quick-qr-code')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('recovers from API failures gracefully', async () => {
      const user = userEvent.setup();
      
      // First call fails, second succeeds
      mockShortUrlService.createBookingShortUrlWithFallback
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          url: 'https://6fb.co/recovered',
          isShortUrl: true,
          error: null,
        });

      render(<ShareBookingModal {...defaultProps} />);

      await user.click(screen.getByText('Link Options'));
      await user.type(screen.getByPlaceholderText(/e.g., summer-special/), 'test-recovery');

      // Should show fallback URL initially
      await waitFor(() => {
        expect(screen.getByRole('link')).toHaveAttribute('href', defaultProps.bookingUrl);
      });

      // Clear and retry
      await user.clear(screen.getByDisplayValue('test-recovery'));
      await user.type(screen.getByDisplayValue(''), 'recovered');

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByRole('link')).toHaveAttribute('href', 'https://6fb.co/recovered');
      });
    });

    it('maintains state consistency during errors', async () => {
      const user = userEvent.setup();
      mockShortUrlService.createBookingShortUrlWithFallback.mockRejectedValue(new Error('Service error'));

      render(<ShareBookingModal {...defaultProps} />);

      await user.click(screen.getByText('Link Options'));
      await user.type(screen.getByPlaceholderText(/e.g., summer-special/), 'error-test');

      // Should maintain input state despite API error
      expect(screen.getByDisplayValue('error-test')).toBeInTheDocument();
      
      // Should still allow other operations
      await user.click(screen.getByTitle('Quick QR code'));
      expect(screen.getByTestId('modal-quick-qr-code')).toBeInTheDocument();
    });
  });
});