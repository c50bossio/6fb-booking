import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/Card'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default props', () => {
      render(
        <Card data-testid="card">
          <div>Card content</div>
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('bg-white')
      expect(card).toHaveClass('rounded-ios-xl')
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('renders with different variants', () => {
      const { rerender } = render(
        <Card variant="elevated" data-testid="card">Content</Card>
      )
      
      let card = screen.getByTestId('card')
      expect(card).toHaveClass('shadow-ios-lg')
      
      rerender(<Card variant="glass" data-testid="card">Content</Card>)
      card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-white/10')
      expect(card).toHaveClass('backdrop-blur-ios')
      
      rerender(<Card variant="premium" data-testid="card">Content</Card>)
      card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-gradient-to-br')
    })

    it('applies different padding sizes', () => {
      const { rerender } = render(
        <Card padding="none" data-testid="card">Content</Card>
      )
      
      let card = screen.getByTestId('card')
      expect(card).toHaveClass('p-0')
      
      rerender(<Card padding="lg" data-testid="card">Content</Card>)
      card = screen.getByTestId('card')
      expect(card).toHaveClass('p-8')
    })

    it('handles interactive prop', async () => {
      const user = userEvent.setup()
      
      render(
        <Card interactive data-testid="card">
          Interactive content
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('cursor-pointer')
      expect(card).toHaveClass('hover:scale-[1.02]')
    })

    it('renders background patterns', () => {
      render(
        <Card backgroundPattern="dots" data-testid="card">
          Content with dots
        </Card>
      )
      
      const card = screen.getByTestId('card')
      const pattern = card.querySelector('svg')
      expect(pattern).toBeInTheDocument()
    })

    it('applies animation delay', () => {
      render(
        <Card animationDelay={500} data-testid="card">
          Delayed content
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveStyle('animation-delay: 500ms')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      
      render(<Card ref={ref}>Card content</Card>)
      
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
      expect(ref.current).toHaveTextContent('Card content')
    })
  })

  describe('CardHeader', () => {
    it('renders with proper styling', () => {
      render(
        <CardHeader data-testid="header">
          Header content
        </CardHeader>
      )
      
      const header = screen.getByTestId('header')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('border-b')
      expect(header).toHaveClass('pb-4')
      expect(screen.getByText('Header content')).toBeInTheDocument()
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 by default', () => {
      render(<CardTitle>Test Title</CardTitle>)
      
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Test Title')
      expect(title).toHaveClass('text-ios-headline')
      expect(title).toHaveClass('font-semibold')
    })

    it('renders with different heading levels', () => {
      render(<CardTitle as="h1">H1 Title</CardTitle>)
      
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('H1 Title')
    })
  })

  describe('CardDescription', () => {
    it('renders with proper styling', () => {
      render(<CardDescription>Test description</CardDescription>)
      
      const description = screen.getByText('Test description')
      expect(description).toBeInTheDocument()
      expect(description.tagName).toBe('P')
      expect(description).toHaveClass('text-ios-subheadline')
      expect(description).toHaveClass('text-ios-gray-600')
    })
  })

  describe('CardContent', () => {
    it('renders content correctly', () => {
      render(
        <CardContent data-testid="content">
          <p>Content paragraph</p>
        </CardContent>
      )
      
      const content = screen.getByTestId('content')
      expect(content).toBeInTheDocument()
      expect(screen.getByText('Content paragraph')).toBeInTheDocument()
    })
  })

  describe('CardFooter', () => {
    it('renders with proper styling', () => {
      render(
        <CardFooter data-testid="footer">
          Footer content
        </CardFooter>
      )
      
      const footer = screen.getByTestId('footer')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveClass('border-t')
      expect(footer).toHaveClass('pt-6')
      expect(footer).toHaveClass('flex')
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })
  })

  describe('Full Card Integration', () => {
    it('renders complete card structure', () => {
      render(
        <Card variant="elevated" padding="lg" data-testid="full-card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action Button</button>
          </CardFooter>
        </Card>
      )
      
      const card = screen.getByTestId('full-card')
      expect(card).toBeInTheDocument()
      
      // Check all components are rendered
      expect(screen.getByRole('heading', { name: 'Card Title' })).toBeInTheDocument()
      expect(screen.getByText('Card description')).toBeInTheDocument()
      expect(screen.getByText('Main content goes here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
      
      // Check structure
      expect(card).toHaveClass('p-8') // lg padding
      expect(card).toHaveClass('shadow-ios-lg') // elevated variant
    })
  })
})