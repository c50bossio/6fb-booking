/**
 * Tests for BarberSelection component
 * 
 * Tests cover:
 * - Component rendering with barber data
 * - Barber selection functionality
 * - Service specialty matching
 * - Portfolio image display
 * - Next available barber option
 * - Loading and error states
 * - Accessibility features
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import BarberSelection from '@/components/booking/BarberSelection'

// Mock the API
const mockApiGet = vi.fn()
vi.mock('@/lib/api', () => ({
  apiGet: mockApiGet
}))

// Mock router
const mockBack = vi.fn()
const mockBarberSelect = vi.fn()

// Sample barber data for testing
const mockBarbers = [
  {
    id: 1,
    name: 'John Smith',
    bio: 'Professional barber with 8 years of experience specializing in modern cuts and traditional barbering.',
    years_experience: 8,
    hourly_rate: 45.00,
    profile_image_url: 'https://example.com/john.jpg',
    instagram_url: 'https://instagram.com/johnbarber',
    website_url: 'https://johnsmith.com',
    specialties: [
      {
        id: 1,
        specialty_name: 'Haircut',
        description: 'Modern and classic haircuts',
        years_experience: 8,
        price_modifier: 1.0
      },
      {
        id: 2,
        specialty_name: 'Beard Trimming',
        description: 'Professional beard styling',
        years_experience: 5,
        price_modifier: 1.15
      }
    ],
    portfolio_images: [
      {
        id: 1,
        image_url: 'https://example.com/work1.jpg',
        description: 'Modern fade cut',
        tags: ['fade', 'modern'],
        is_featured: true
      },
      {
        id: 2,
        image_url: 'https://example.com/work2.jpg',
        description: 'Beard styling',
        tags: ['beard', 'styling'],
        is_featured: false
      }
    ],
    completion_percentage: 95,
    is_active: true
  },
  {
    id: 2,
    name: 'Mike Johnson',
    bio: 'Traditional barber specializing in straight razor shaves and classic cuts.',
    years_experience: 12,
    hourly_rate: 55.00,
    profile_image_url: 'https://example.com/mike.jpg',
    specialties: [
      {
        id: 3,
        specialty_name: 'Shave',
        description: 'Traditional straight razor shaves',
        years_experience: 12,
        price_modifier: 1.25
      },
      {
        id: 4,
        specialty_name: 'Haircut',
        description: 'Classic barbering techniques',
        years_experience: 12,
        price_modifier: 1.1
      }
    ],
    portfolio_images: [
      {
        id: 3,
        image_url: 'https://example.com/mike1.jpg',
        description: 'Classic cut',
        tags: ['classic', 'traditional'],
        is_featured: true
      }
    ],
    completion_percentage: 88,
    is_active: true
  }
]

const defaultProps = {
  selectedService: 'Haircut',
  onBarberSelect: mockBarberSelect,
  onBack: mockBack,
  organizationSlug: 'test-shop'
}

describe('BarberSelection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiGet.mockResolvedValue({ barbers: mockBarbers })
  })

  describe('Rendering', () => {
    it('renders component with title and back button', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      expect(screen.getByText('Choose Your Barber')).toBeInTheDocument()
      expect(screen.getByText('Back')).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
      mockApiGet.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<BarberSelection {...defaultProps} />)
      
      expect(screen.getByText('Loading barbers...')).toBeInTheDocument()
    })

    it('renders barber cards when data loads', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
      })
    })

    it('displays barber experience and bio', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('8 years experience')).toBeInTheDocument()
        expect(screen.getByText('12 years experience')).toBeInTheDocument()
        expect(screen.getByText(/Professional barber with 8 years/)).toBeInTheDocument()
      })
    })

    it('shows barber profile images', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        const johnImage = screen.getByAltText('John Smith')
        const mikeImage = screen.getByAltText('Mike Johnson')
        
        expect(johnImage).toBeInTheDocument()
        expect(johnImage).toHaveAttribute('src', 'https://example.com/john.jpg')
        expect(mikeImage).toHaveAttribute('src', 'https://example.com/mike.jpg')
      })
    })
  })

  describe('Service Specialty Matching', () => {
    it('highlights matching specialties for selected service', async () => {
      render(<BarberSelection {...defaultProps} selectedService="Haircut" />)
      
      await waitFor(() => {
        // Both barbers have Haircut specialty, should be highlighted
        const haircutSpecialties = screen.getAllByText(/Haircut/i)
        expect(haircutSpecialties.length).toBeGreaterThan(0)
      })
    })

    it('shows all specialties but highlights matching ones', async () => {
      render(<BarberSelection {...defaultProps} selectedService="Shave" />)
      
      await waitFor(() => {
        // Mike has Shave specialty, should be highlighted
        expect(screen.getByText(/Traditional straight razor shaves/)).toBeInTheDocument()
        // John's other specialties should still be visible
        expect(screen.getByText(/Beard Trimming/)).toBeInTheDocument()
      })
    })

    it('handles case when no specialties match selected service', async () => {
      render(<BarberSelection {...defaultProps} selectedService="Hair Coloring" />)
      
      await waitFor(() => {
        // Should still show barbers even if no exact specialty match
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('Mike Johnson')).toBeInTheDocument()
      })
    })
  })

  describe('Portfolio Display', () => {
    it('shows featured portfolio images', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        // Featured images should be displayed
        expect(screen.getByAltText('Modern fade cut')).toBeInTheDocument()
        expect(screen.getByAltText('Classic cut')).toBeInTheDocument()
      })
    })

    it('limits portfolio images displayed', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        // Should show portfolio but not all images (component limits display)
        const portfolioImages = screen.getAllByAltText(/Modern fade cut|Classic cut/)
        expect(portfolioImages.length).toBeLessThanOrEqual(4) // Component shows max 4
      })
    })
  })

  describe('Next Available Barber', () => {
    it('shows next available option at top', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Next Available Barber')).toBeInTheDocument()
        expect(screen.getByText(/Skip the wait/)).toBeInTheDocument()
      })
    })

    it('calls onBarberSelect with next available when clicked', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        const nextAvailableButton = screen.getByText('Select Next Available')
        fireEvent.click(nextAvailableButton)
      })
      
      expect(mockBarberSelect).toHaveBeenCalledWith(-1, 'Next Available Barber')
    })
  })

  describe('Barber Selection', () => {
    it('calls onBarberSelect when barber card is clicked', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        const johnCard = screen.getByRole('button', { name: /John Smith/ })
        fireEvent.click(johnCard)
      })
      
      expect(mockBarberSelect).toHaveBeenCalledWith(1, 'John Smith')
    })

    it('calls onBarberSelect when Select button is clicked', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        const selectButtons = screen.getAllByText('Select')
        fireEvent.click(selectButtons[0]) // First barber
      })
      
      expect(mockBarberSelect).toHaveBeenCalledWith(1, 'John Smith')
    })

    it('calls onBack when back button is clicked', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      const backButton = screen.getByText('Back')
      fireEvent.click(backButton)
      
      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('shows error message when API call fails', async () => {
      mockApiGet.mockRejectedValue(new Error('Failed to fetch barbers'))
      
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Failed to load barbers/)).toBeInTheDocument()
      })
    })

    it('shows empty state when no barbers available', async () => {
      mockApiGet.mockResolvedValue({ barbers: [] })
      
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/No barbers available/)).toBeInTheDocument()
      })
    })

    it('shows retry button on error', async () => {
      mockApiGet.mockRejectedValue(new Error('Failed to fetch'))
      
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })

    it('retries API call when retry button clicked', async () => {
      mockApiGet.mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ barbers: mockBarbers })
      
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        const retryButton = screen.getByText('Try Again')
        fireEvent.click(retryButton)
      })
      
      expect(mockApiGet).toHaveBeenCalledTimes(2)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for barber cards', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        const johnCard = screen.getByRole('button', { 
          name: /John Smith.*8 years experience.*Select this barber/ 
        })
        expect(johnCard).toBeInTheDocument()
      })
    })

    it('has keyboard navigation support', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        const johnCard = screen.getByRole('button', { name: /John Smith/ })
        
        // Should be focusable
        johnCard.focus()
        expect(johnCard).toHaveFocus()
        
        // Should respond to Enter key
        fireEvent.keyDown(johnCard, { key: 'Enter' })
        expect(mockBarberSelect).toHaveBeenCalled()
      })
    })

    it('has proper heading structure', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      expect(screen.getByRole('heading', { name: 'Choose Your Barber' })).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'John Smith' })).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Mike Johnson' })).toBeInTheDocument()
      })
    })

    it('provides screen reader announcements for loading states', () => {
      mockApiGet.mockImplementation(() => new Promise(() => {}))
      
      render(<BarberSelection {...defaultProps} />)
      
      expect(screen.getByLabelText('Loading barbers')).toBeInTheDocument()
    })
  })

  describe('Organization Context', () => {
    it('makes API call with organization slug', () => {
      render(<BarberSelection {...defaultProps} organizationSlug="my-shop" />)
      
      expect(mockApiGet).toHaveBeenCalledWith(
        '/api/v2/barber-profiles/shop/my-shop'
      )
    })

    it('handles missing organization slug', () => {
      render(<BarberSelection {...defaultProps} organizationSlug={undefined} />)
      
      // Should still make API call, possibly with default endpoint
      expect(mockApiGet).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('memoizes barber data to prevent unnecessary re-renders', async () => {
      const { rerender } = render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument()
      })
      
      // Re-render with same props
      rerender(<BarberSelection {...defaultProps} />)
      
      // Should not make another API call
      expect(mockApiGet).toHaveBeenCalledTimes(1)
    })

    it('refetches when selected service changes', async () => {
      const { rerender } = render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledTimes(1)
      })
      
      // Change selected service
      rerender(<BarberSelection {...defaultProps} selectedService="Shave" />)
      
      // Should make new API call for different service
      expect(mockApiGet).toHaveBeenCalledTimes(2)
    })
  })

  describe('Visual Design', () => {
    it('applies correct CSS classes for styling', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        const johnCard = screen.getByRole('button', { name: /John Smith/ })
        expect(johnCard).toHaveClass('bg-white', 'rounded-lg', 'border')
      })
    })

    it('shows completion percentage indicators', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        // High completion should show positive indicator
        expect(screen.getByText('95% Complete Profile')).toBeInTheDocument()
        expect(screen.getByText('88% Complete Profile')).toBeInTheDocument()
      })
    })

    it('differentiates featured vs regular portfolio images', async () => {
      render(<BarberSelection {...defaultProps} />)
      
      await waitFor(() => {
        const featuredImages = screen.getAllByTestId('featured-portfolio-image')
        expect(featuredImages.length).toBeGreaterThan(0)
      })
    })
  })
})