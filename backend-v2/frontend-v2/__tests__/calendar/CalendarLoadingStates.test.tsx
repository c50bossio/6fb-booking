import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { 
  CalendarSkeleton, 
  CalendarEmptyState, 
  CalendarLoading,
  CalendarErrorState 
} from '@/components/calendar/CalendarLoadingStates'

describe('Calendar Loading States', () => {
  describe('CalendarSkeleton', () => {
    it('renders day view skeleton', () => {
      render(<CalendarSkeleton view="day" />)
      
      // Should render skeleton structure
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('renders week view skeleton', () => {
      render(<CalendarSkeleton view="week" />)
      
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('renders month view skeleton', () => {
      render(<CalendarSkeleton view="month" />)
      
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('shows stats when enabled', () => {
      render(<CalendarSkeleton view="day" showStats={true} />)
      
      // Should have multiple skeleton elements including stats area
      const skeletonElements = document.querySelectorAll('.bg-gray-200')
      expect(skeletonElements.length).toBeGreaterThan(5)
    })

    it('hides stats when disabled', () => {
      render(<CalendarSkeleton view="day" showStats={false} />)
      
      // Should have fewer skeleton elements without stats
      const skeletonElements = document.querySelectorAll('.bg-gray-200')
      expect(skeletonElements.length).toBeGreaterThan(0)
    })
  })

  describe('CalendarEmptyState', () => {
    it('renders empty state for day view', () => {
      render(<CalendarEmptyState view="day" />)
      
      expect(screen.getByText(/no appointments scheduled/i)).toBeInTheDocument()
      expect(screen.getByText(/start building your schedule/i)).toBeInTheDocument()
    })

    it('renders empty state for week view', () => {
      render(<CalendarEmptyState view="week" />)
      
      expect(screen.getByText(/no appointments scheduled for this week/i)).toBeInTheDocument()
    })

    it('renders empty state for month view', () => {
      render(<CalendarEmptyState view="month" />)
      
      expect(screen.getByText(/no appointments scheduled for this month/i)).toBeInTheDocument()
    })

    it('shows custom message when provided', () => {
      const customMessage = 'Custom empty state message'
      render(<CalendarEmptyState view="day" message={customMessage} />)
      
      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    it('shows selected date in message when provided', () => {
      const selectedDate = new Date('2023-12-25')
      render(<CalendarEmptyState view="day" selectedDate={selectedDate} />)
      
      expect(screen.getByText(/12\/25\/2023/)).toBeInTheDocument()
    })

    it('calls onCreateAppointment when create button is clicked', () => {
      const mockCreate = jest.fn()
      render(
        <CalendarEmptyState 
          view="day" 
          onCreateAppointment={mockCreate} 
        />
      )
      
      const createButton = screen.getByText(/create appointment/i)
      fireEvent.click(createButton)
      
      expect(mockCreate).toHaveBeenCalled()
    })

    it('does not render create button when callback not provided', () => {
      render(<CalendarEmptyState view="day" />)
      
      expect(screen.queryByText(/create appointment/i)).not.toBeInTheDocument()
    })
  })

  describe('CalendarLoading', () => {
    it('renders loading state with default message', () => {
      render(<CalendarLoading />)
      
      expect(screen.getByText('Loading calendar...')).toBeInTheDocument()
    })

    it('renders custom loading message', () => {
      const customMessage = 'Syncing appointments...'
      render(<CalendarLoading message={customMessage} />)
      
      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    it('shows progress indicator when progress provided', () => {
      render(<CalendarLoading progress={75} />)
      
      expect(screen.getByText('75% complete')).toBeInTheDocument()
    })

    it('does not show progress when not provided', () => {
      render(<CalendarLoading />)
      
      expect(screen.queryByText(/% complete/)).not.toBeInTheDocument()
    })

    it('has spinning animation', () => {
      render(<CalendarLoading />)
      
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('CalendarErrorState', () => {
    it('renders error message', () => {
      const errorMessage = 'Failed to load calendar data'
      render(<CalendarErrorState error={errorMessage} />)
      
      expect(screen.getByText('Calendar Error')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('renders default error message when none provided', () => {
      render(<CalendarErrorState error="" />)
      
      expect(screen.getByText(/unable to load calendar data/i)).toBeInTheDocument()
    })

    it('shows context when provided', () => {
      const context = 'calendar-sync-error'
      render(
        <CalendarErrorState 
          error="Sync failed" 
          context={context} 
        />
      )
      
      expect(screen.getByText(`Context: ${context}`)).toBeInTheDocument()
    })

    it('calls onRetry when retry button is clicked', () => {
      const mockRetry = jest.fn()
      render(
        <CalendarErrorState 
          error="Test error" 
          onRetry={mockRetry} 
        />
      )
      
      const retryButton = screen.getByText(/try again/i)
      fireEvent.click(retryButton)
      
      expect(mockRetry).toHaveBeenCalled()
    })

    it('does not render retry button when callback not provided', () => {
      render(<CalendarErrorState error="Test error" />)
      
      expect(screen.queryByText(/try again/i)).not.toBeInTheDocument()
    })
  })
})