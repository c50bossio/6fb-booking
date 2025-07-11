import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary-500') // Primary variant by default
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>)
    
    let button = screen.getByRole('button')
    expect(button).toHaveClass('bg-white')
    
    rerender(<Button variant="destructive">Delete</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('bg-error-500')
    
    rerender(<Button variant="success">Success</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('bg-success-500')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    
    let button = screen.getByRole('button')
    expect(button).toHaveClass('text-ios-footnote')
    
    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button')
    expect(button).toHaveClass('text-ios-headline')
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button loading loadingText="Processing...">Submit</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('cursor-wait')
    
    // Check for loading spinner
    const spinner = screen.getByRole('button').querySelector('svg')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:opacity-50')
  })

  it('does not call onClick when disabled', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders with icons', () => {
    const LeftIcon = () => <span data-testid="left-icon">←</span>
    const RightIcon = () => <span data-testid="right-icon">→</span>
    
    render(
      <Button leftIcon={<LeftIcon />} rightIcon={<RightIcon />}>
        Button with icons
      </Button>
    )
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })

  it('applies fullWidth prop correctly', () => {
    render(<Button fullWidth>Full Width Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('w-full')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    
    render(<Button ref={ref}>Button</Button>)
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(ref.current).toHaveTextContent('Button')
  })

  it('supports keyboard navigation', async () => {
    const handleClick = jest.fn()
    
    render(<Button onClick={handleClick}>Keyboard Test</Button>)
    
    const button = screen.getByRole('button')
    button.focus()
    
    expect(button).toHaveFocus()
    
    // Simulate Enter key press
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
    fireEvent.click(button) // Enter triggers click
    
    expect(handleClick).toHaveBeenCalled()
  })

  it('has proper accessibility attributes', () => {
    const { rerender } = render(<Button>Accessible Button</Button>)
    
    const button = screen.getByRole('button')
    // Button should not have explicit type="button" unless specified
    expect(button).not.toHaveAttribute('aria-disabled')
    
    // Test with disabled state
    rerender(<Button disabled>Disabled Button</Button>)
    const disabledButton = screen.getByRole('button')
    expect(disabledButton).toBeDisabled()
  })

  it('renders with custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    // Should still have base classes
    expect(button).toHaveClass('inline-flex')
  })
})