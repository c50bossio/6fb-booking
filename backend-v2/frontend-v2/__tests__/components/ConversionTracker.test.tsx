import React from 'react'
import { render, renderHook, act } from '@testing-library/react'
import { ConversionTracker, useConversionTracking, trackConversion, ConversionEventType } from '@/components/tracking'
import { trackEvent, trackPageView } from '@/lib/scriptLoader'

// Mock dependencies
jest.mock('@/lib/scriptLoader', () => ({
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
  initializeScripts: jest.fn(),
}))

jest.mock('@/hooks/useCookieConsent', () => ({
  useCookieConsent: () => ({
    canLoadAnalytics: true,
    canLoadMarketing: true,
    preferences: {
      hasConsented: true,
      categories: {
        necessary: true,
        analytics: true,
        marketing: true,
        functional: true,
      },
    },
  }),
}))

describe('ConversionTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component', () => {
    it('should render children', () => {
      const { getByText } = render(
        <ConversionTracker>
          <div>Test Content</div>
        </ConversionTracker>
      )
      
      expect(getByText('Test Content')).toBeInTheDocument()
    })

    it('should track page view on mount when analytics consent is given', () => {
      render(<ConversionTracker />)
      
      expect(trackPageView).toHaveBeenCalled()
    })
  })

  describe('trackConversion', () => {
    it('should track basic event', () => {
      trackConversion(ConversionEventType.LOGIN)
      
      expect(trackEvent).toHaveBeenCalledWith('login', undefined)
    })

    it('should track event with parameters', () => {
      const params = {
        user_id: 'user-123',
        user_type: 'customer' as const,
      }
      
      trackConversion(ConversionEventType.SIGN_UP, params)
      
      expect(trackEvent).toHaveBeenCalledWith('sign_up', params)
    })

    it('should track purchase event with full e-commerce data', () => {
      const purchaseData = {
        transaction_id: 'BOOK-123',
        value: 100,
        currency: 'USD',
        items: [{
          item_id: 'service-001',
          item_name: 'Haircut',
          price: 50,
          quantity: 1,
        }],
      }
      
      trackConversion(ConversionEventType.PURCHASE, purchaseData)
      
      expect(trackEvent).toHaveBeenCalledWith('purchase', purchaseData)
    })
  })

  describe('useConversionTracking hook', () => {
    it('should provide tracking functions', () => {
      const { result } = renderHook(() => useConversionTracking())
      
      expect(result.current).toHaveProperty('track')
      expect(result.current).toHaveProperty('trackPageView')
      expect(result.current).toHaveProperty('trackPurchase')
      expect(result.current).toHaveProperty('trackFormSubmission')
      expect(result.current).toHaveProperty('trackSearch')
      expect(result.current).toHaveProperty('trackBookingStep')
    })

    it('should track page view with enhanced parameters', () => {
      const { result } = renderHook(() => useConversionTracking())
      
      act(() => {
        result.current.trackPageView({
          page_title: 'Test Page',
          page_path: '/test',
          user_id: 'user-123',
        })
      })
      
      expect(trackPageView).toHaveBeenCalledWith('/test')
      expect(trackEvent).toHaveBeenCalledWith('page_view', {
        page_title: 'Test Page',
        page_path: '/test',
        user_id: 'user-123',
      })
    })

    it('should track form submission', () => {
      const { result } = renderHook(() => useConversionTracking())
      
      act(() => {
        result.current.trackFormSubmission('contact_form', {
          user_id: 'user-123',
        })
      })
      
      expect(trackEvent).toHaveBeenCalledWith('generate_lead', {
        user_id: 'user-123',
        content_name: 'contact_form',
        content_type: 'form',
      })
    })

    it('should track search with results count', () => {
      const { result } = renderHook(() => useConversionTracking())
      
      act(() => {
        result.current.trackSearch('barber near me', 10)
      })
      
      expect(trackEvent).toHaveBeenCalledWith('search', {
        search_term: 'barber near me',
        value: 10,
      })
    })

    it('should track booking steps', () => {
      const { result } = renderHook(() => useConversionTracking())
      
      // Track booking started
      act(() => {
        result.current.trackBookingStep('started', {
          user_id: 'user-123',
        })
      })
      
      expect(trackEvent).toHaveBeenCalledWith('booking_started', {
        user_id: 'user-123',
      })
      
      // Track service selected
      act(() => {
        result.current.trackBookingStep('service_selected', {
          items: [{
            item_id: 'service-001',
            item_name: 'Haircut',
            price: 50,
            quantity: 1,
          }],
        })
      })
      
      expect(trackEvent).toHaveBeenCalledWith('add_to_cart', {
        items: [{
          item_id: 'service-001',
          item_name: 'Haircut',
          price: 50,
          quantity: 1,
        }],
      })
    })

    it('should respect consent settings when analytics consent is granted', () => {
      // Test that tracking works when consent is granted (default mock behavior)
      const { result } = renderHook(() => useConversionTracking())
      
      act(() => {
        result.current.track(ConversionEventType.PAGE_VIEW)
      })
      
      // Should track since analytics consent is granted in the default mock
      expect(trackEvent).toHaveBeenCalledWith('page_view', undefined)
    })
  })
})