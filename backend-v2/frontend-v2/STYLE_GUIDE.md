# 6FB Booking Platform - Style Guide

## Design System Overview

Our design system is inspired by modern, clean aesthetics with a teal/turquoise primary color palette that conveys trust and professionalism, perfect for a premium barbershop booking platform.

## Color Palette

### Primary Colors (Teal/Turquoise)
- `primary-500`: #14b8a6 - Main brand color
- `primary-600`: #0d9488 - Hover states
- `primary-700`: #0f766e - Active states
- Light variants: `primary-50` to `primary-400` for backgrounds and subtle accents
- Dark variants: `primary-800` to `primary-950` for text on light backgrounds

### Accent Colors (Navy)
- `accent-800`: #1e293b - Primary text color
- `accent-900`: #0f172a - Headers and emphasis
- Light variants: `accent-50` to `accent-700` for various UI elements

### Semantic Colors
- Success: Primary greens (#059669)
- Error: Standard reds (#ef4444)
- Warning: Warm yellows (#f59e0b)
- Info: Primary blues (#3b82f6)

## Typography

### Font Family
- Primary: Inter (falls back to system fonts)
- Display: Inter (for headings)
- Monospace: JetBrains Mono (for code/technical content)

### Font Sizes
Use the responsive typography utilities:
```tsx
import { typography } from '@/lib/responsive'

<h1 className={typography.h1}>Main Heading</h1>
<p className={typography.body}>Body text</p>
```

## Components

### Buttons

```tsx
import { Button } from '@/components/ui/Button'

// Primary button (teal)
<Button variant="primary">Book Appointment</Button>

// Secondary button (white with border)
<Button variant="secondary">Learn More</Button>

// Accent button (navy)
<Button variant="accent">View Profile</Button>

// Ghost button (minimal)
<Button variant="ghost">Cancel</Button>

// With loading state
<Button loading={isLoading} loadingText="Booking...">
  Book Now
</Button>

// With icons
<Button leftIcon={<Icon />}>With Icon</Button>
```

### Cards

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

<Card variant="default">
  <CardHeader>
    <CardTitle>Service Details</CardTitle>
  </CardHeader>
  <CardContent>
    Your content here
  </CardContent>
</Card>

// Premium card with gradient
<Card variant="premium">
  // Content
</Card>

// Accent card with teal gradient
<Card variant="accent">
  // Content
</Card>
```

### Form Inputs

```tsx
import { Input, Textarea, Select } from '@/components/ui/Input'

// Basic input
<Input 
  label="Email"
  type="email"
  placeholder="your@email.com"
/>

// With error state
<Input 
  label="Phone"
  error="Please enter a valid phone number"
/>

// With icons
<Input 
  label="Search"
  leftIcon={<SearchIcon />}
  placeholder="Search services..."
/>

// Select dropdown
<Select
  label="Service"
  options={[
    { value: 'haircut', label: 'Haircut' },
    { value: 'shave', label: 'Shave' }
  ]}
  placeholder="Choose a service"
/>
```

## Responsive Design

### Container Classes
```tsx
import { containerClasses } from '@/lib/responsive'

// Standard container
<div className={containerClasses.default}>

// Narrow container for forms
<div className={containerClasses.narrow}>

// Full width with padding
<div className={containerClasses.full}>
```

### Grid Layouts
```tsx
import { gridClasses, spacing } from '@/lib/responsive'

// Responsive 3-column grid
<div className={`${gridClasses.cols3} ${spacing.gap.md}`}>
  // Grid items
</div>
```

### Responsive Utilities
```tsx
import { useResponsive } from '@/hooks/useResponsive'

function Component() {
  const { isMobile, isDesktop } = useResponsive()
  
  return (
    <div>
      {isMobile && <MobileMenu />}
      {isDesktop && <DesktopNav />}
    </div>
  )
}
```

## Spacing System

Use consistent spacing throughout:
- `spacing.section.y` - Vertical section padding
- `spacing.card.md` - Card padding
- `spacing.stack.md` - Vertical spacing between elements
- `spacing.gap.md` - Grid/flex gap

## Animation Guidelines

- Use subtle transitions (200ms duration)
- Stick to opacity and transform for performance
- Available animations:
  - `animate-fade-in`
  - `animate-slide-up`
  - `animate-pulse-gentle`

## Best Practices

1. **Color Usage**
   - Use teal (`primary-500`) for primary actions
   - Use navy (`accent-800`) for text and secondary elements
   - Maintain high contrast ratios for accessibility

2. **Component Composition**
   - Compose components rather than creating variants
   - Use the design tokens for consistency
   - Keep components focused and single-purpose

3. **Responsive Design**
   - Mobile-first approach
   - Use responsive utilities instead of custom breakpoints
   - Test on multiple screen sizes

4. **Performance**
   - Use CSS transitions over JavaScript animations
   - Lazy load heavy components
   - Optimize images and assets

## Example Page Layout

```tsx
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { containerClasses, spacing, typography } from '@/lib/responsive'

export default function ServicePage() {
  return (
    <div className={`${containerClasses.default} ${spacing.section.y}`}>
      <h1 className={typography.h1}>Our Services</h1>
      
      <div className={`${gridClasses.cols3} ${spacing.gap.md} mt-8`}>
        <Card variant="default">
          <CardHeader>
            <CardTitle>Haircut</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={typography.body}>Professional haircut service</p>
            <Button variant="primary" className="mt-4">
              Book Now
            </Button>
          </CardContent>
        </Card>
        // More cards...
      </div>
    </div>
  )
}
```

## Accessibility

- Always use semantic HTML
- Include proper ARIA labels
- Ensure keyboard navigation works
- Maintain color contrast ratios (WCAG AA minimum)
- Provide focus indicators on interactive elements