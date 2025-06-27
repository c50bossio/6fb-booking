# Layout Components

This directory contains the core layout components for the global sidebar system, providing intelligent route-based layout selection and consistent theming throughout the application.

## Components

### ConditionalLayout

The `ConditionalLayout` component automatically detects the current route and applies the appropriate layout based on route type (dashboard vs public routes).

#### Usage

```tsx
import { ConditionalLayout } from '@/components/layouts'

function MyApp({ Component, pageProps }) {
  return (
    <ConditionalLayout>
      <Component {...pageProps} />
    </ConditionalLayout>
  )
}
```

#### Props

- `children`: React nodes to render
- `user?`: User object with dashboard session info
- `onLogout?`: Logout handler function
- `title?`: Page title
- `subtitle?`: Page subtitle
- `actions?`: Custom action buttons for header
- `breadcrumbs?`: Breadcrumb navigation array
- `className?`: Additional CSS classes
- `dashboardLayoutProps?`: Override props specifically for dashboard layout

#### Features

- **Automatic Route Detection**: Uses the route classification utility to determine layout type
- **Theme Integration**: Fully compatible with the theme system
- **Error Handling**: Wrapped in error boundary with fallback UI
- **SSR Compatible**: Handles server-side rendering properly
- **Loading States**: Shows loading spinner during route transitions

### DashboardLayout

Enhanced dashboard layout component that wraps the existing `DemoModernSidebar` with improved responsive design and theme integration.

#### Usage

```tsx
import { DashboardLayout } from '@/components/layouts'

export default function DashboardPage() {
  return (
    <DashboardLayout
      title="Analytics Dashboard"
      subtitle="View your business insights"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Analytics' }
      ]}
    >
      <div>Your dashboard content</div>
    </DashboardLayout>
  )
}
```

#### Props

- `children`: React nodes to render in main content area
- `title?`: Page title (default: 'Dashboard')
- `subtitle?`: Page subtitle
- `actions?`: Custom action buttons for header
- `user?`: User object for sidebar
- `onLogout?`: Logout handler
- `breadcrumbs?`: Breadcrumb navigation
- `className?`: Additional CSS classes for main content
- `showSearch?`: Show/hide search bar (default: true)
- `showNotifications?`: Show/hide notifications (default: true)
- `searchPlaceholder?`: Custom search placeholder text
- `onSearch?`: Search handler function
- `onNotificationClick?`: Notification click handler

#### Features

- **Responsive Design**: Mobile-first approach with collapsible sidebar
- **Theme Aware**: Adapts styling based on current theme
- **Search Integration**: Built-in search functionality with overlay
- **Notification System**: Header notifications with click handling
- **Breadcrumb Navigation**: Automatic breadcrumb rendering
- **Mobile Optimization**: Touch-friendly mobile interface

## Hooks

### useLayoutContext

Hook for components that need to know about the current layout context.

```tsx
import { useLayoutContext } from '@/components/layouts'

function MyComponent() {
  const { isDashboard, isPublic, shouldShowSidebar, routeType } = useLayoutContext()

  return (
    <div>
      {isDashboard && <DashboardSpecificContent />}
      {isPublic && <PublicSpecificContent />}
    </div>
  )
}
```

#### Returns

- `pathname`: Current pathname
- `isDashboard`: Boolean indicating dashboard route
- `isPublic`: Boolean indicating public route
- `shouldShowSidebar`: Boolean indicating sidebar visibility
- `routeType`: String indicating route type ('dashboard' | 'public' | 'unknown')

## Higher-Order Components

### withConditionalLayout

HOC for automatic layout detection and application.

```tsx
import { withConditionalLayout } from '@/components/layouts'

const MyPage = () => <div>Page content</div>

export default withConditionalLayout(MyPage, {
  title: 'My Page',
  subtitle: 'Page description'
})
```

## Route Classification Integration

The layout components integrate seamlessly with the route classification system:

- **Dashboard Routes**: `/dashboard/*`, `/appointments/*`, `/clients/*`, etc.
- **Public Routes**: `/`, `/about`, `/contact`, `/book/*`, etc.
- **Dynamic Routes**: Support for dynamic route patterns

## Theme Integration

All layout components are fully theme-aware and support:

- **Light Theme**: Clean, bright interface
- **Soft Light Theme**: Warm, muted colors
- **Dark Theme**: High contrast dark interface
- **Charcoal Theme**: Professional dark theme

## Best Practices

### 1. Use ConditionalLayout at App Level

```tsx
// _app.tsx or layout.tsx
export default function RootLayout({ children }) {
  return (
    <ThemeProvider>
      <ConditionalLayout>
        {children}
      </ConditionalLayout>
    </ThemeProvider>
  )
}
```

### 2. Override Layout Props When Needed

```tsx
<ConditionalLayout
  dashboardLayoutProps={{
    title: 'Custom Dashboard Title',
    showSearch: false,
    onSearch: handleCustomSearch
  }}
>
  {children}
</ConditionalLayout>
```

### 3. Use Layout Context for Conditional Rendering

```tsx
function AdaptiveComponent() {
  const { isDashboard } = useLayoutContext()

  return isDashboard ? <AdminView /> : <PublicView />
}
```

### 4. Handle Loading States

```tsx
<ConditionalLayout>
  <Suspense fallback={<LoadingSpinner />}>
    <AsyncComponent />
  </Suspense>
</ConditionalLayout>
```

## Error Handling

Both layout components include comprehensive error handling:

- **Error Boundaries**: Catch and handle layout-related errors
- **Fallback UI**: Graceful degradation when errors occur
- **Development Mode**: Detailed error information in development
- **Production Mode**: User-friendly error messages

## Mobile Responsiveness

The layout system is fully responsive:

- **Breakpoints**: Uses Tailwind CSS responsive breakpoints
- **Touch Optimization**: Mobile-friendly touch targets
- **Gesture Support**: Swipe gestures for mobile sidebar
- **Viewport Adaptation**: Adapts to different screen sizes

## Performance Considerations

- **Lazy Loading**: Components load only when needed
- **Memoization**: Expensive operations are memoized
- **Bundle Splitting**: Layouts are code-split for optimal loading
- **SSR Optimization**: Server-side rendering support

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and semantic HTML
- **Focus Management**: Proper focus handling
- **High Contrast**: High contrast mode support

## Testing

Components include comprehensive test coverage:

- **Unit Tests**: Individual component testing
- **Integration Tests**: Layout interaction testing
- **Accessibility Tests**: A11y compliance testing
- **Visual Tests**: Cross-browser visual testing

## Migration Guide

### From Old Layout System

If migrating from an existing layout system:

1. **Replace Layout Imports**:
   ```tsx
   // Old
   import DashboardLayout from '@/components/DashboardLayout'

   // New
   import { ConditionalLayout } from '@/components/layouts'
   ```

2. **Update Usage**:
   ```tsx
   // Old - Manual layout selection
   {isDashboard ? (
     <DashboardLayout>{children}</DashboardLayout>
   ) : (
     <PublicLayout>{children}</PublicLayout>
   )}

   // New - Automatic layout selection
   <ConditionalLayout>{children}</ConditionalLayout>
   ```

3. **Move Layout Props**:
   ```tsx
   // Old
   <DashboardLayout title="Dashboard" subtitle="Overview">

   // New
   <ConditionalLayout
     dashboardLayoutProps={{ title: "Dashboard", subtitle: "Overview" }}
   >
   ```

## Examples

See the `/examples` directory for complete implementation examples and use cases.

## Contributing

When contributing to layout components:

1. **Follow TypeScript**: All components must be fully typed
2. **Test Coverage**: Include comprehensive tests
3. **Documentation**: Update documentation for new features
4. **Theme Support**: Ensure new features support all themes
5. **Accessibility**: Follow accessibility guidelines
6. **Performance**: Consider performance implications

## Troubleshooting

### Common Issues

1. **Hydration Mismatch**: Ensure server and client render the same layout
2. **Theme Flashing**: Use proper theme initialization
3. **Route Detection**: Verify route patterns in classification utility
4. **Mobile Issues**: Test on actual mobile devices
5. **Performance**: Monitor bundle size and render performance
