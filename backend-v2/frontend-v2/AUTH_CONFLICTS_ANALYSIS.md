# Authentication System Conflicts Analysis

## Executive Summary

The application has **multiple conflicting authentication implementations** causing the "This site can't be reached" error after login. The main issue is that there are **two competing authentication hooks** (`useAuth` and `useSecureAuth`) and **inconsistent token storage methods** (localStorage vs HttpOnly cookies).

## Identified Authentication Systems

### 1. **useAuth Hook** (`/hooks/useAuth.ts`)
- **Storage**: Uses localStorage for tokens (`access_token`, `refresh_token`)
- **Cookie Support**: Sets non-HttpOnly cookies for middleware compatibility
- **API Calls**: Direct fetch to `/api/v2/auth/me`
- **Token Refresh**: Manual refresh with localStorage tokens
- **Usage**: Currently used in login page and many components

### 2. **useSecureAuth Hook** (`/hooks/useSecureAuth.ts`)
- **Storage**: Relies on HttpOnly cookies (server-side)
- **Cookie Support**: Uses secure HttpOnly cookies via `secureAuth` service
- **API Calls**: Through `secureAuth` service with CSRF protection
- **Token Refresh**: Automatic with cookie-based tokens
- **Usage**: Intended to replace useAuth but creates conflicts

### 3. **API Library** (`/lib/api.ts`)
- **Hybrid Approach**: Tries to support both localStorage AND cookies
- **Token Lookup**: Checks both `access_token` and legacy `token` in localStorage
- **Headers**: Includes both Authorization header and cookies
- **Refresh**: Attempts cookie-based refresh but also manages localStorage

### 4. **Middleware** (currently disabled)
- **File**: `middleware.ts` is missing (only backups exist)
- **Cookie Checking**: Was looking for `access_token` and `refresh_token` cookies
- **Role Extraction**: Tried to extract role from JWT token in cookies
- **Protected Routes**: Was enforcing authentication for dashboard, analytics, etc.

## Core Conflicts

### 1. **Storage Method Conflict**
```typescript
// useAuth stores in localStorage
localStorage.setItem('access_token', token)

// useSecureAuth expects HttpOnly cookies
// Cannot access HttpOnly cookies from JavaScript
```

### 2. **API Call Conflicts**
```typescript
// useAuth makes direct calls
fetch(`${API_URL}/api/v2/auth/me`, { headers: { Authorization: `Bearer ${token}` }})

// useSecureAuth uses service with credentials
secureAuth.makeRequest('/api/v2/auth/me', { credentials: 'include' })
```

### 3. **Token Refresh Conflicts**
```typescript
// useAuth sends refresh_token in body
body: JSON.stringify({ refresh_token: refreshTokenValue })

// useSecureAuth expects cookie-based refresh
body: JSON.stringify({}) // Empty - token in cookie
```

### 4. **Login Flow Conflicts**
1. Login page uses direct fetch and stores tokens in localStorage
2. Dashboard expects tokens in cookies for middleware
3. AppLayout tries to validate auth with getProfile()
4. Multiple auth checks create race conditions

## Why "This site can't be reached" Happens

1. **Login Success**: User logs in, tokens stored in localStorage
2. **Redirect**: Browser redirects to `/dashboard`
3. **Missing Middleware**: No middleware.ts file exists to handle the route
4. **Auth Check Loop**: AppLayout tries to validate auth, fails, redirects
5. **Infinite Redirect**: Creates redirect loop or crashes the app

## Authentication Flow Diagram

```
User Login
    ↓
Login Page (uses localStorage)
    ↓
Stores tokens in localStorage + non-HttpOnly cookies
    ↓
Redirects to /dashboard
    ↓
[MISSING MIDDLEWARE] - No route protection
    ↓
AppLayout checks auth (getProfile)
    ↓
API expects different token format
    ↓
Auth fails → Redirect to login
    ↓
[LOOP or CRASH]
```

## Recommended Fix Strategy

### Option 1: Complete Migration to Secure Auth (Recommended)
1. Fully implement HttpOnly cookie authentication
2. Update login page to use `useSecureAuth`
3. Remove all localStorage token storage
4. Ensure backend sets proper HttpOnly cookies
5. Restore middleware.ts with cookie-based auth

### Option 2: Stick with localStorage (Quick Fix)
1. Remove `useSecureAuth` completely
2. Ensure all components use `useAuth`
3. Create simple middleware that checks localStorage
4. Remove HttpOnly cookie expectations

### Option 3: Hybrid Approach (Not Recommended)
1. Support both methods temporarily
2. Gradually migrate components
3. High complexity and error-prone

## Critical Files to Fix

1. **Create `/middleware.ts`** - Currently missing!
2. **Update `/app/login/page.tsx`** - Use consistent auth method
3. **Fix `/hooks/useAuth.ts`** - Choose one storage method
4. **Update `/lib/api.ts`** - Consistent token handling
5. **Fix `/components/layout/AppLayout.tsx`** - Proper auth checks

## Immediate Action Items

1. **Restore middleware.ts** from backup or create new one
2. **Choose ONE auth method** and stick to it
3. **Update all auth-related code** to use chosen method
4. **Test auth flow end-to-end**
5. **Remove conflicting implementations**

## Security Considerations

- HttpOnly cookies are more secure (prevent XSS)
- localStorage is easier but vulnerable to XSS
- CSRF protection needed with cookies
- Consistent implementation is critical

The current state creates security vulnerabilities and user experience issues. A decision needs to be made on which authentication method to use, followed by a complete cleanup of the conflicting code.