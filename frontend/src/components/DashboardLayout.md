# DashboardLayout Component

A comprehensive dashboard layout component that provides a consistent, responsive interface for the 6FB Booking Platform. This component integrates seamlessly with the existing ModernSidebar and uses the matte dark theme.

## Features

- **Responsive Design**: Mobile-first approach with sidebar collapse on mobile
- **Integrated Sidebar**: Uses the existing ModernSidebar component
- **Top Header**: Search functionality, notifications, and custom actions
- **Breadcrumb Navigation**: Optional breadcrumb support
- **Matte Dark Theme**: Consistent with the existing design system
- **Smooth Animations**: Premium transitions and hover effects
- **Accessibility**: ARIA labels and keyboard navigation support

## Basic Usage

```tsx
import DashboardLayout from '@/components/DashboardLayout'

export default function MyPage() {
  const user = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    role: 'admin'
  }

  const handleLogout = () => {
    // Handle logout logic
  }

  return (
    <DashboardLayout
      title="My Dashboard"
      subtitle="Welcome to your dashboard"
      user={user}
      onLogout={handleLogout}
    >
      {/* Your page content here */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white">Hello World!</h1>
      </div>
    </DashboardLayout>
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | The main content to display |
| `title` | `string` | `'Dashboard'` | Page title shown in header |
| `subtitle` | `string` | `undefined` | Optional subtitle |
| `user` | `User` | `undefined` | User object for sidebar |
| `onLogout` | `() => void` | `undefined` | Logout handler |
| `actions` | `ReactNode` | `undefined` | Custom actions for header |
| `breadcrumbs` | `Breadcrumb[]` | `undefined` | Breadcrumb navigation |
| `className` | `string` | `''` | Additional CSS classes |

### User Type

```tsx
interface User {
  first_name: string
  last_name: string
  email: string
  role: string
}
```

### Breadcrumb Type

```tsx
interface Breadcrumb {
  label: string
  href?: string  // Optional - if not provided, it's the current page
}
```

## Advanced Usage

### With Custom Actions

```tsx
const headerActions = (
  <>
    <button className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200">
      Export Data
    </button>
    <button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-lg transition-all duration-200">
      New Appointment
    </button>
  </>
)

<DashboardLayout
  title="Analytics"
  actions={headerActions}
  user={user}
  onLogout={handleLogout}
>
  {/* Content */}
</DashboardLayout>
```

### With Breadcrumbs

```tsx
const breadcrumbs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Monthly Report' } // Current page (no href)
]

<DashboardLayout
  title="Monthly Report"
  breadcrumbs={breadcrumbs}
  user={user}
  onLogout={handleLogout}
>
  {/* Content */}
</DashboardLayout>
```

### With Custom Styling

```tsx
<DashboardLayout
  title="Custom Page"
  user={user}
  onLogout={handleLogout}
  className="p-8 bg-gradient-to-br from-slate-900 to-gray-800"
>
  {/* Content with custom padding and background */}
</DashboardLayout>
```

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Mobile Menu Overlay (mobile only)                      │
├─────────────────────────────────────────────────────────┤
│ Desktop Sidebar (fixed, hidden on mobile)              │
├─────────────────────────────────────────────────────────┤
│ Main Content Area                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Top Header (sticky)                                 │ │
│ │ - Mobile menu button                                │ │
│ │ - Breadcrumbs / Title                               │ │
│ │ - Search bar (center)                               │ │
│ │ - Notifications & Actions (right)                   │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Mobile Page Header (mobile only)                    │ │
│ │ - Page title and subtitle                           │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Main Content (scrollable)                           │ │
│ │ - Your page content goes here                       │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Responsive Behavior

- **Desktop (lg+)**: Sidebar is fixed on the left, main content takes remaining space
- **Tablet/Mobile**: Sidebar becomes an overlay, triggered by hamburger menu
- **Search Bar**: Full width on desktop, icon-only on mobile
- **Header Actions**: Simplified on mobile (some actions may be hidden)

## Styling Classes

The component uses these CSS classes that should be defined in your global CSS:

- `.glass-card-dark`: Dark glass morphism effect
- `.sidebar-dark`: Dark sidebar background
- `.sidebar-nav-item`: Sidebar navigation item
- `.user-avatar`: User avatar styling

## Integration with Existing Components

This layout component works seamlessly with:

- **ModernSidebar**: Automatically integrated
- **Existing CSS**: Uses the same color scheme and animations
- **Navigation**: Maintains current routing and navigation patterns
- **Authentication**: Passes user data to sidebar

## Migration from ModernLayout

To migrate from the existing ModernLayout:

1. Replace `ModernLayout` import with `DashboardLayout`
2. Update props (some prop names have changed)
3. Remove any custom header/sidebar logic (now handled by DashboardLayout)
4. Adjust content styling if needed

### Before (ModernLayout)

```tsx
import ModernLayout from '@/components/ModernLayout'

<ModernLayout requireAuth={true} showSidebar={true}>
  <div className="p-6">
    {/* Content */}
  </div>
</ModernLayout>
```

### After (DashboardLayout)

```tsx
import DashboardLayout from '@/components/DashboardLayout'

<DashboardLayout
  title="Page Title"
  user={user}
  onLogout={handleLogout}
  className="p-6"
>
  {/* Content */}
</DashboardLayout>
```

## Accessibility Features

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus handling for mobile menu
- **Screen Reader Support**: Skip links and descriptive text
- **Color Contrast**: Meets WCAG guidelines

## Performance Optimizations

- **Lazy Loading**: Mobile menu only renders when needed
- **Event Cleanup**: Proper event listener cleanup
- **Smooth Animations**: Hardware-accelerated transitions
- **Responsive Images**: Optimized for different screen sizes

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with touch optimizations

## Examples

See `/src/app/example-dashboard/page.tsx` for a complete working example demonstrating all features of the DashboardLayout component.
