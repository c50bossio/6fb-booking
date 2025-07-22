# BookedBarber V2 Design System Guide

This guide shows how to use the enhanced design system for consistent spacing, typography, and component styling across BookedBarber V2.

## Table of Contents

1. [Typography System](#typography-system)
2. [Spacing System](#spacing-system)
3. [Layout Patterns](#layout-patterns)
4. [Component Styles](#component-styles)
5. [Migration Guide](#migration-guide)
6. [Examples](#examples)

## Typography System

### Semantic Typography Classes

Use semantic typography classes for consistent text styling:

```jsx
// Page-level typography
<h1 className="text-page-title">Dashboard Overview</h1>
<p className="text-page-subtitle">Welcome back to your dashboard</p>

// Section-level typography
<h2 className="text-section-title">Recent Activity</h2>
<p className="text-section-subtitle">Your latest appointments and updates</p>

// Component-level typography
<h3 className="text-card-title">Appointment Details</h3>
<p className="text-card-description">Scheduled for today at 2:00 PM</p>

// Content typography
<p className="text-body">Regular body text with proper line height</p>
<span className="text-caption">Additional details or metadata</span>
<label className="text-label">Form field label</label>
```

### iOS-Inspired Typography

For premium, iOS-like text styling:

```jsx
<h1 className="text-ios-large-title">BookedBarber</h1>
<h2 className="text-ios-title1">Dashboard</h2>
<h3 className="text-ios-title2">Appointments</h3>
<p className="text-ios-body">Body text with iOS-perfect scaling</p>
<span className="text-ios-caption1">Metadata or captions</span>
```

### Button Typography

```jsx
<button className="text-button-lg">Large Action</button>
<button className="text-button-md">Default Button</button>
<button className="text-button-sm">Secondary</button>
```

## Spacing System

### Card Spacing

Consistent card padding and gaps:

```jsx
// Card padding
<div className="card card-padding-sm">Small padding card</div>
<div className="card card-padding-md">Default padding card</div>
<div className="card card-padding-lg">Large padding card</div>

// Card content spacing
<div className="card-gap-sm">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Form Spacing

```jsx
<form className="form-fieldset">
  <div className="form-field">
    <label className="text-label">Email Address</label>
    <input className="input form-input-padding" />
  </div>
  
  <div className="form-field">
    <label className="text-label">Password</label>
    <input className="input form-input-padding" type="password" />
  </div>
  
  <div className="form-button-group">
    <button className="btn-primary">Sign In</button>
    <button className="btn-secondary">Cancel</button>
  </div>
</form>
```

### Container Spacing

Responsive container padding:

```jsx
// Responsive container padding
<div className="container-padding-responsive">
  Content with appropriate padding on all screen sizes
</div>

// Specific breakpoint padding
<div className="container-padding-mobile sm:container-padding-tablet lg:container-padding-desktop">
  Manual responsive padding
</div>
```

### Section Spacing

```jsx
<section className="section-padding-sm">Small section</section>
<section className="section-padding-md">Default section</section>
<section className="section-padding-lg">Large section</section>

// Responsive section padding
<section className="section-padding-responsive">
  Automatically scales with screen size
</section>
```

## Layout Patterns

### Container Patterns

```jsx
// Page-width container (max-width: 7xl)
<div className="container-page">
  <h1>Dashboard</h1>
</div>

// Content-width container (max-width: 4xl)
<div className="container-content">
  <article>Content here</article>
</div>

// Narrow container (max-width: 2xl)
<div className="container-narrow">
  <form>Centered form</form>
</div>
```

### Flexbox Patterns

```jsx
// Common flex patterns
<div className="flex-center">Centered content</div>
<div className="flex-between">Space between items</div>
<div className="flex-col-center">Vertical centered column</div>
```

### Grid Patterns

```jsx
// Auto-fit grids
<div className="grid-auto-fit-md gap-6">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>

// Responsive grids
<div className="grid-responsive-1-2-3 grid-gap-responsive">
  <div>1 col mobile, 2 tablet, 3 desktop</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>
```

### Stack Patterns

```jsx
// Vertical spacing
<div className="stack-normal">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

// Horizontal spacing
<div className="flex inline-normal">
  <button>Button 1</button>
  <button>Button 2</button>
</div>
```

## Component Styles

### Cards

```jsx
// Card variants
<div className="card card-padding-md">Default card</div>
<div className="card-elevated card-padding-md">Elevated card</div>
<div className="card-interactive card-padding-md">Clickable card</div>
<div className="card-glass card-padding-md">Glass morphism card</div>
```

### Buttons

```jsx
// Button styles
<button className="btn-primary text-button-md px-6 py-3 rounded-lg">
  Primary Action
</button>

<button className="btn-secondary text-button-md px-6 py-3 rounded-lg">
  Secondary Action
</button>

<button className="btn-ghost text-button-sm px-4 py-2 rounded-md">
  Ghost Button
</button>
```

### Inputs

```jsx
// Input variants
<input className="input" placeholder="Default input" />
<input className="input-error" placeholder="Error state" />
<input className="input-success" placeholder="Success state" />
```

### Badges

```jsx
// Badge variants
<span className="badge-primary">Primary</span>
<span className="badge-success">Success</span>
<span className="badge-warning">Warning</span>
<span className="badge-error">Error</span>
```

### Alerts

```jsx
// Alert variants
<div className="alert-info">
  <p>Information message</p>
</div>

<div className="alert-success">
  <p>Success message</p>
</div>

<div className="alert-warning">
  <p>Warning message</p>
</div>

<div className="alert-error">
  <p>Error message</p>
</div>
```

## Migration Guide

### From Old Patterns to New

#### Typography Migration

```jsx
// Before (inconsistent)
<h1 className="text-3xl font-bold text-gray-900">Title</h1>
<h1 className="text-ios-largeTitle font-bold text-accent-900">Title</h1>
<h1 className="text-4xl sm:text-5xl font-semibold">Title</h1>

// After (consistent)
<h1 className="text-page-title">Title</h1>
```

#### Spacing Migration

```jsx
// Before (inconsistent)
<div className="p-6">Content</div>
<div className="p-card-lg">Content</div>
<div className="px-4 sm:px-6 lg:px-8">Content</div>

// After (consistent)
<div className="card-padding-md">Content</div>
<div className="container-padding-responsive">Content</div>
```

#### Component Migration

```jsx
// Before (verbose)
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h3 className="text-xl font-semibold text-gray-900 mb-4">Card Title</h3>
  <p className="text-gray-600">Card content</p>
</div>

// After (semantic)
<div className="card card-padding-md card-gap-sm">
  <h3 className="text-card-title">Card Title</h3>
  <p className="text-card-description">Card content</p>
</div>
```

### Progressive Migration

1. **Start with new components**: Use design system classes in all new components
2. **Update during refactoring**: When touching existing components, migrate to new patterns
3. **Focus on high-traffic areas**: Migrate dashboard, forms, and modal components first
4. **Batch similar components**: Update all cards, buttons, or forms at once

## JavaScript/TypeScript Integration

### Using Design Tokens in Components

```tsx
import { 
  enhancedTypography, 
  enhancedSpacing, 
  layoutPatterns,
  componentStyles,
  getTypographyPattern,
  getSpacingPattern
} from '@/lib/design-tokens'

// Access patterns programmatically
const titleClass = getTypographyPattern('pageTitle')
const cardPadding = getSpacingPattern('cardPadding', 'medium')

// Use in conditional styling
function Card({ variant = 'default', children }) {
  const cardStyle = componentStyles.card[variant]
  
  return (
    <div className={`${cardStyle} card-padding-md`}>
      {children}
    </div>
  )
}
```

### Dynamic Class Generation

```tsx
import { cn } from '@/lib/utils'

function ResponsiveTitle({ level = 'page', children, className }) {
  const baseClasses = {
    page: 'text-page-title',
    section: 'text-section-title',
    card: 'text-card-title'
  }
  
  return (
    <h1 className={cn(baseClasses[level], className)}>
      {children}
    </h1>
  )
}
```

## Examples

### Complete Dashboard Card

```jsx
function DashboardCard({ title, description, stats, actions }) {
  return (
    <div className="card-interactive card-padding-md animate-fade-in-up">
      <div className="card-gap-sm">
        {/* Header */}
        <div className="flex-between">
          <div>
            <h3 className="text-card-title">{title}</h3>
            <p className="text-card-description">{description}</p>
          </div>
          <div className="badge-primary">
            New
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid-responsive-1-2-3 grid-gap-responsive">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-ios-title2 text-primary-600">{stat.value}</div>
              <div className="text-ios-caption1">{stat.label}</div>
            </div>
          ))}
        </div>
        
        {/* Actions */}
        <div className="form-button-group">
          {actions.map((action) => (
            <button
              key={action.label}
              className={`${action.primary ? 'btn-primary' : 'btn-secondary'} text-button-md px-4 py-2 rounded-md`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

### Responsive Form

```tsx
function ContactForm() {
  return (
    <div className="container-narrow">
      <div className="card card-padding-lg">
        <div className="card-gap-lg">
          <div className="text-center">
            <h2 className="text-section-title">Get in Touch</h2>
            <p className="text-section-subtitle">We'd love to hear from you</p>
          </div>
          
          <form className="form-fieldset">
            <div className="grid-responsive-1-2 grid-gap-responsive">
              <div className="form-field">
                <label className="text-label">First Name</label>
                <input className="input" placeholder="John" />
              </div>
              <div className="form-field">
                <label className="text-label">Last Name</label>
                <input className="input" placeholder="Doe" />
              </div>
            </div>
            
            <div className="form-field">
              <label className="text-label">Email Address</label>
              <input className="input" type="email" placeholder="john@example.com" />
            </div>
            
            <div className="form-field">
              <label className="text-label">Message</label>
              <textarea className="input" rows={4} placeholder="Your message..."></textarea>
            </div>
            
            <div className="form-button-group justify-end">
              <button type="button" className="btn-secondary text-button-md px-6 py-3 rounded-lg">
                Cancel
              </button>
              <button type="submit" className="btn-primary text-button-md px-6 py-3 rounded-lg">
                Send Message
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
```

## Best Practices

### Do's ✅

- Use semantic class names for typography and spacing
- Combine layout patterns for consistent responsive behavior
- Leverage component styles for common UI elements
- Test responsive behavior across all breakpoints
- Use animation utilities for smooth interactions

### Don'ts ❌

- Don't mix old spacing patterns with new ones in the same component
- Don't override design system values with arbitrary values
- Don't skip responsive considerations
- Don't create custom spacing without consulting the design tokens
- Don't use inline styles when design system classes exist

### Performance Tips

- The design system CSS is loaded as part of the component layer
- All classes are automatically purged if unused by Tailwind
- Animation classes use GPU-accelerated transforms
- Responsive utilities follow mobile-first approach
- Semantic classes reduce bundle size compared to utility combinations

## Support and Updates

- Design system is versioned with the main application
- Breaking changes will be documented in migration guides
- New patterns should be added to design tokens first
- Report inconsistencies or missing patterns as GitHub issues
- Design system documentation is automatically updated with releases