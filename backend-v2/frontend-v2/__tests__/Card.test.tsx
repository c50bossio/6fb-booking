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
} from '@/components/ui/card'

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
      expect(card).toHaveClass('bg-card')
      expect(card).toHaveClass('rounded-lg')
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">Content</Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
    })

    it('applies custom styling through className', () => {
      render(
        <Card className="p-0" data-testid="card">Content</Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-0')
    })

    it('handles onClick prop', async () => {
      const user = userEvent.setup()
      const mockClick = jest.fn()
      
      render(
        <Card onClick={mockClick} data-testid="card">
          Interactive content
        </Card>
      )
      
      const card = screen.getByTestId('card')
      await user.click(card)
      expect(mockClick).toHaveBeenCalledTimes(1)
    })

    it('renders with default background styling', () => {
      render(
        <Card data-testid="card">
          Content
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-card')
    })

    it('supports custom styles', () => {
      render(
        <Card style={{ animationDelay: '500ms' }} data-testid="card">
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
      expect(header).toHaveClass('flex')
      expect(header).toHaveClass('flex-col')
      expect(screen.getByText('Header content')).toBeInTheDocument()
    })
  })

  describe('CardTitle', () => {
    it('renders as h3 by default', () => {
      render(<CardTitle>Test Title</CardTitle>)
      
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Test Title')
      expect(title).toHaveClass('text-2xl')
      expect(title).toHaveClass('font-semibold')
    })

    it('renders with different heading levels', () => {
      render(<CardTitle>H1 Title</CardTitle>)
      
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
      expect(description).toHaveClass('text-sm')
      expect(description).toHaveClass('text-muted-foreground')
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
      expect(footer).toHaveClass('flex')
      expect(footer).toHaveClass('items-center')
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })
  })

  describe('Full Card Integration', () => {
    it('renders complete card structure', () => {
      render(
        <Card className="p-8 shadow-lg" data-testid="full-card">
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
      expect(card).toHaveClass('p-8') // custom padding
      expect(card).toHaveClass('shadow-lg') // custom shadow
    })
  })
})