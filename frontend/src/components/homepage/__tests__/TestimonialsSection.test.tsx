import { render, screen } from '@testing-library/react'
import TestimonialsSection from '../TestimonialsSection'

// Mock Heroicons to avoid import issues in test environment
jest.mock('@heroicons/react/24/outline', () => ({
  StarIcon: ({ className }: { className?: string }) => (
    <div data-testid="star-icon" className={className}>★</div>
  ),
}))

describe('TestimonialsSection', () => {
  it('renders the main heading', () => {
    render(<TestimonialsSection />)
    expect(screen.getByText('Join 1,200+ Successful Barbers')).toBeInTheDocument()
  })

  it('renders all three testimonials', () => {
    render(<TestimonialsSection />)
    expect(screen.getByText('Marcus Johnson')).toBeInTheDocument()
    expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument()
    expect(screen.getByText('David Rodriguez')).toBeInTheDocument()
  })

  it('renders testimonial quotes', () => {
    render(<TestimonialsSection />)
    expect(
      screen.getByText(/The automated payouts changed my life/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Managing 8 barbers was chaos/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/The VIP pricing and peak hour rates are genius/)
    ).toBeInTheDocument()
  })

  it('renders success metrics', () => {
    render(<TestimonialsSection />)
    expect(screen.getByText('$2.5M+')).toBeInTheDocument()
    expect(screen.getByText('45K+')).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()
    expect(screen.getByText('30 sec')).toBeInTheDocument()
  })

  it('renders metric labels', () => {
    render(<TestimonialsSection />)
    expect(screen.getByText('Paid Out Monthly')).toBeInTheDocument()
    expect(screen.getByText('Appointments Tracked')).toBeInTheDocument()
    expect(screen.getByText('On-Time Payouts')).toBeInTheDocument()
    expect(screen.getByText('Instant Transfers')).toBeInTheDocument()
  })

  it('renders star ratings for testimonials', () => {
    render(<TestimonialsSection />)
    // Should have 15 stars total (5 stars × 3 testimonials)
    const stars = screen.getAllByTestId('star-icon')
    expect(stars).toHaveLength(15)
  })

  it('renders "Trusted Nationwide" badge', () => {
    render(<TestimonialsSection />)
    expect(screen.getByText('Trusted Nationwide')).toBeInTheDocument()
  })

  it('displays testimonial titles correctly', () => {
    render(<TestimonialsSection />)
    expect(screen.getByText('Master Barber, Atlanta')).toBeInTheDocument()
    expect(screen.getByText('Shop Owner, Denver')).toBeInTheDocument()
    expect(screen.getByText('Celebrity Barber, Los Angeles')).toBeInTheDocument()
  })
})
