# SSR Compatibility Guide for Next.js on Vercel

This guide documents all SSR compatibility fixes implemented to resolve the "self is not defined" and other browser API errors during Vercel deployment.

## Overview

When deploying Next.js applications to Vercel (which uses AWS Lambda), server-side rendering can fail when code tries to access browser-only APIs like `window`, `document`, `localStorage`, etc. This is because the AWS Lambda environment doesn't have these browser globals.

## Key Issues Fixed

### 1. Browser API Access
- **Problem**: Direct usage of `localStorage`, `sessionStorage`, `document.cookie`, `window.location`
- **Solution**: Created `lib/ssr-safe-utils.ts` with safe wrappers that check for browser environment

### 2. Chart.js Libraries
- **Problem**: Chart.js and react-chartjs-2 register components globally on import
- **Solution**: 
  - Created `lib/chartjs-dynamic.tsx` with dynamic imports
  - Created `components/charts/SSRSafeChart.tsx` wrapper components
  - Removed global registration from chart components

### 3. QR Code Generation
- **Problem**: qrcode library uses canvas which isn't available in Node.js
- **Solution**: 
  - Dynamic imports in `lib/qr-code-service.ts`
  - Created `components/booking/SSRSafeQRCode.tsx` wrapper

### 4. Authentication & API
- **Problem**: Direct localStorage and cookie access in `lib/api.ts`
- **Solution**: Replaced all instances with SSR-safe utilities

### 5. Webpack Configuration
- **Problem**: AWS Lambda doesn't have browser globals like `self`
- **Solution**: 
  - Created comprehensive polyfills in `lib/complete-ssr-polyfills.js`
  - Updated `next.config.js` to inject polyfills during SSR
  - Externalized problematic packages for Vercel builds

## Implementation Details

### SSR-Safe Utilities (`lib/ssr-safe-utils.ts`)

```typescript
// Example usage
import { safeLocalStorage, safeCookie, safeWindow } from '@/lib/ssr-safe-utils';

// Instead of: localStorage.getItem('token')
const token = safeLocalStorage.getItem('token');

// Instead of: document.cookie = 'name=value'
safeCookie.set('name', 'value', 'path=/; max-age=86400');

// Instead of: window.location.href = '/login'
safeWindow.location.href('/login');
```

### Dynamic Chart Components

```typescript
// Instead of importing directly
import RevenueChart from '@/components/charts/RevenueChart';

// Use SSR-safe version
import { SSRSafeRevenueChart } from '@/components/charts/SSRSafeChart';
```

### Polyfills Structure

1. **`lib/vercel-polyfills.js`**: AWS Lambda specific polyfills
2. **`lib/global-polyfills.js`**: General browser API polyfills
3. **`lib/ssr-polyfills.js`**: SSR-specific polyfills
4. **`lib/complete-ssr-polyfills.js`**: Comprehensive polyfills combining all

### Next.js Configuration Updates

The `next.config.js` has been updated with:
- Webpack ProvidePlugin to inject polyfills
- Externalization of problematic packages for Vercel
- Entry point modification to load polyfills first
- Proper alias configuration for SSR compatibility

## Best Practices

### 1. Always Check for Browser Environment
```typescript
if (typeof window !== 'undefined') {
  // Browser-only code
}
```

### 2. Use Dynamic Imports for Browser-Only Libraries
```typescript
const QRCode = dynamic(() => import('qrcode'), { ssr: false });
```

### 3. Use SSR-Safe Utilities
Always use the utilities from `lib/ssr-safe-utils.ts` instead of direct browser API access.

### 4. Test SSR Locally
```bash
# Build and start production server locally
npm run build
npm start
```

### 5. Component Patterns

#### For Charts
```typescript
'use client'

import { SSRSafeRevenueChart } from '@/components/charts/SSRSafeChart';

export default function Dashboard() {
  return <SSRSafeRevenueChart data={data} />;
}
```

#### For QR Codes
```typescript
'use client'

import SSRSafeQRCode from '@/components/booking/SSRSafeQRCode';

export default function BookingPage() {
  return <SSRSafeQRCode url={bookingUrl} />;
}
```

## Common Errors and Solutions

### Error: "self is not defined"
- **Cause**: AWS Lambda doesn't have the `self` global
- **Solution**: Polyfills are automatically loaded via webpack configuration

### Error: "window is not defined"
- **Cause**: Code accessing window during SSR
- **Solution**: Use `safeWindow` utilities or wrap in `typeof window !== 'undefined'` check

### Error: "document is not defined"
- **Cause**: Code accessing document during SSR
- **Solution**: Use `safeDocument` utilities or dynamic imports

### Error: "localStorage is not defined"
- **Cause**: Direct localStorage access
- **Solution**: Use `safeLocalStorage` utilities

## Testing Checklist

- [ ] Run `npm run build` without errors
- [ ] Test production build locally with `npm start`
- [ ] Deploy to Vercel staging environment
- [ ] Verify all pages load without SSR errors
- [ ] Check browser console for runtime errors
- [ ] Test chart components render correctly
- [ ] Test QR code generation works
- [ ] Verify authentication flow works properly

## Deployment Notes

1. These fixes are specifically for Vercel/AWS Lambda environments
2. The polyfills are only loaded during SSR, not in the browser
3. Bundle size impact is minimal as polyfills are server-side only
4. All changes are backward compatible with existing code

## Future Considerations

1. Consider migrating to server components where possible
2. Use React Server Components for data fetching
3. Keep browser-specific code in client components only
4. Regular testing of SSR compatibility with new features