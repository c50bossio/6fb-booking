# Cookie Consent Implementation Guide - BookedBarber

## Overview
This guide provides step-by-step instructions for implementing GDPR-compliant cookie consent in BookedBarber.

## 1. Cookie Categories

### 1.1 Essential Cookies (Always Active)
```javascript
// No consent required
const essentialCookies = {
  'session_id': {
    purpose: 'Maintain user session',
    duration: 'Session',
    provider: 'BookedBarber'
  },
  'csrf_token': {
    purpose: 'Security - prevent CSRF attacks',
    duration: '24 hours',
    provider: 'BookedBarber'
  },
  'auth_token': {
    purpose: 'Authentication state',
    duration: '7 days',
    provider: 'BookedBarber'
  }
};
```

### 1.2 Functional Cookies
```javascript
// Consent required
const functionalCookies = {
  'language': {
    purpose: 'Language preference',
    duration: '1 year',
    provider: 'BookedBarber'
  },
  'timezone': {
    purpose: 'Timezone settings',
    duration: '1 year',
    provider: 'BookedBarber'
  },
  'theme': {
    purpose: 'UI theme preference',
    duration: '1 year',
    provider: 'BookedBarber'
  }
};
```

### 1.3 Analytics Cookies
```javascript
const analyticsCookies = {
  '_ga': {
    purpose: 'Google Analytics - user tracking',
    duration: '2 years',
    provider: 'Google'
  },
  '_gid': {
    purpose: 'Google Analytics - user distinction',
    duration: '24 hours',
    provider: 'Google'
  },
  '_gat': {
    purpose: 'Google Analytics - throttle requests',
    duration: '1 minute',
    provider: 'Google'
  }
};
```

### 1.4 Marketing Cookies
```javascript
const marketingCookies = {
  '_fbp': {
    purpose: 'Facebook Pixel - ad targeting',
    duration: '3 months',
    provider: 'Meta'
  },
  'fr': {
    purpose: 'Facebook - ad delivery',
    duration: '3 months',
    provider: 'Meta'
  },
  'gtm': {
    purpose: 'Google Tag Manager',
    duration: '2 years',
    provider: 'Google'
  }
};
```

## 2. Frontend Implementation

### 2.1 Cookie Consent Component
```typescript
// components/CookieConsent.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true
    functional: false,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    saveCookiePreferences(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyEssential = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    saveCookiePreferences(onlyEssential);
  };

  const handleSavePreferences = () => {
    saveCookiePreferences(preferences);
  };

  const saveCookiePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify(prefs));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    
    // Apply preferences
    applyCookiePreferences(prefs);
    
    // Send to backend
    fetch('/api/v1/privacy/cookie-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: prefs })
    });
    
    setShowBanner(false);
  };

  const applyCookiePreferences = (prefs: CookiePreferences) => {
    // Google Analytics
    if (prefs.analytics) {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted'
      });
    } else {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'denied'
      });
    }

    // Marketing cookies
    if (prefs.marketing) {
      window.gtag?.('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    } else {
      window.gtag?.('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg p-6 z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Cookie Preferences</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-600 ml-2 underline"
              >
                {showDetails ? 'Hide' : 'Show'} Details
              </button>
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRejectAll}>
              Reject All
            </Button>
            <Button variant="outline" onClick={() => setShowDetails(true)}>
              Manage Preferences
            </Button>
            <Button onClick={handleAcceptAll}>
              Accept All
            </Button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-6 border-t pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Essential Cookies</h4>
                  <p className="text-sm text-gray-600">Required for the website to function properly</p>
                </div>
                <Switch checked={true} disabled />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Functional Cookies</h4>
                  <p className="text-sm text-gray-600">Remember your preferences and settings</p>
                </div>
                <Switch 
                  checked={preferences.functional}
                  onCheckedChange={(checked) => 
                    setPreferences({...preferences, functional: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Analytics Cookies</h4>
                  <p className="text-sm text-gray-600">Help us understand how visitors use our website</p>
                </div>
                <Switch 
                  checked={preferences.analytics}
                  onCheckedChange={(checked) => 
                    setPreferences({...preferences, analytics: checked})
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Marketing Cookies</h4>
                  <p className="text-sm text-gray-600">Used to deliver personalized advertisements</p>
                </div>
                <Switch 
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => 
                    setPreferences({...preferences, marketing: checked})
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreferences}>
                Save Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

### 2.2 Cookie Manager Hook
```typescript
// hooks/useCookieConsent.ts
import { useEffect, useState } from 'react';

export const useCookieConsent = () => {
  const [consent, setConsent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedConsent = localStorage.getItem('cookie-consent');
    if (storedConsent) {
      setConsent(JSON.parse(storedConsent));
    }
    setLoading(false);
  }, []);

  const updateConsent = (category: string, value: boolean) => {
    const newConsent = { ...consent, [category]: value };
    setConsent(newConsent);
    localStorage.setItem('cookie-consent', JSON.stringify(newConsent));
    
    // Update backend
    fetch('/api/v1/privacy/cookie-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences: newConsent })
    });
  };

  const hasConsent = (category: string): boolean => {
    return consent?.[category] || false;
  };

  return { consent, loading, updateConsent, hasConsent };
};
```

### 2.3 Conditional Script Loading
```typescript
// utils/scriptLoader.ts
export const loadAnalytics = (hasConsent: boolean) => {
  if (!hasConsent) return;

  // Google Analytics
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', process.env.NEXT_PUBLIC_GA_ID);
};

export const loadMarketing = (hasConsent: boolean) => {
  if (!hasConsent) return;

  // Facebook Pixel
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  
  fbq('init', process.env.NEXT_PUBLIC_FB_PIXEL_ID);
  fbq('track', 'PageView');
};
```

## 3. Backend Implementation

### 3.1 Cookie Consent API
```python
# routers/privacy.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, CookieConsent
from dependencies import get_current_user
from schemas import CookiePreferences

router = APIRouter(prefix="/privacy", tags=["privacy"])

@router.post("/cookie-consent")
async def save_cookie_consent(
    preferences: CookiePreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save user's cookie preferences"""
    consent = db.query(CookieConsent).filter(
        CookieConsent.user_id == current_user.id
    ).first()
    
    if consent:
        consent.functional = preferences.functional
        consent.analytics = preferences.analytics
        consent.marketing = preferences.marketing
        consent.updated_at = datetime.utcnow()
    else:
        consent = CookieConsent(
            user_id=current_user.id,
            functional=preferences.functional,
            analytics=preferences.analytics,
            marketing=preferences.marketing
        )
        db.add(consent)
    
    db.commit()
    return {"status": "success"}

@router.get("/cookie-consent")
async def get_cookie_consent(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's cookie preferences"""
    consent = db.query(CookieConsent).filter(
        CookieConsent.user_id == current_user.id
    ).first()
    
    if not consent:
        return {
            "functional": False,
            "analytics": False,
            "marketing": False
        }
    
    return {
        "functional": consent.functional,
        "analytics": consent.analytics,
        "marketing": consent.marketing,
        "updated_at": consent.updated_at
    }
```

### 3.2 Cookie Middleware
```python
# middleware/cookie_compliance.py
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import json

class CookieComplianceMiddleware(BaseHTTPMiddleware):
    """Ensure cookies are set according to user preferences"""
    
    COOKIE_CATEGORIES = {
        'session_id': 'essential',
        'auth_token': 'essential',
        'csrf_token': 'essential',
        'language': 'functional',
        'theme': 'functional',
        '_ga': 'analytics',
        '_gid': 'analytics',
        '_fbp': 'marketing'
    }
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Get user's cookie preferences
        preferences = await self.get_user_preferences(request)
        
        # Filter cookies based on preferences
        if preferences:
            self.filter_cookies(response, preferences)
        
        return response
    
    def filter_cookies(self, response, preferences):
        """Remove cookies that user hasn't consented to"""
        cookies_to_remove = []
        
        for cookie_name, category in self.COOKIE_CATEGORIES.items():
            if category != 'essential' and not preferences.get(category, False):
                cookies_to_remove.append(cookie_name)
        
        # Remove non-consented cookies
        for cookie in cookies_to_remove:
            response.delete_cookie(cookie)
```

## 4. Database Schema

```sql
-- Cookie consent tracking
CREATE TABLE cookie_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    functional BOOLEAN DEFAULT FALSE,
    analytics BOOLEAN DEFAULT FALSE,
    marketing BOOLEAN DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cookie audit log
CREATE TABLE cookie_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50), -- 'accepted_all', 'rejected_all', 'custom'
    preferences JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 5. Testing Cookie Compliance

### 5.1 Unit Tests
```python
# tests/test_cookie_consent.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_cookie_consent_save(client: AsyncClient):
    """Test saving cookie preferences"""
    response = await client.post(
        "/api/v1/privacy/cookie-consent",
        json={
            "functional": True,
            "analytics": False,
            "marketing": False
        }
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"

@pytest.mark.asyncio
async def test_cookie_filtering(client: AsyncClient):
    """Test that non-consented cookies are filtered"""
    # Set preferences to reject analytics
    await client.post(
        "/api/v1/privacy/cookie-consent",
        json={"analytics": False}
    )
    
    # Make request that would set analytics cookie
    response = await client.get("/api/v1/bookings")
    
    # Check analytics cookies are not set
    assert "_ga" not in response.cookies
    assert "_gid" not in response.cookies
```

### 5.2 E2E Tests
```typescript
// tests/e2e/cookieConsent.spec.ts
import { test, expect } from '@playwright/test';

test('cookie banner appears on first visit', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid="cookie-banner"]')).toBeVisible();
});

test('accepting all cookies', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="accept-all-cookies"]');
  
  // Check localStorage
  const consent = await page.evaluate(() => 
    localStorage.getItem('cookie-consent')
  );
  expect(JSON.parse(consent)).toEqual({
    essential: true,
    functional: true,
    analytics: true,
    marketing: true
  });
});

test('custom cookie preferences', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="manage-preferences"]');
  
  // Toggle analytics off
  await page.click('[data-testid="analytics-toggle"]');
  
  await page.click('[data-testid="save-preferences"]');
  
  // Verify analytics scripts not loaded
  const hasGoogleAnalytics = await page.evaluate(() => 
    window.gtag !== undefined
  );
  expect(hasGoogleAnalytics).toBe(false);
});
```

## 6. Compliance Checklist

- [ ] Cookie banner appears on first visit
- [ ] "Reject All" option clearly visible
- [ ] Granular control over cookie categories
- [ ] Preferences saved and respected
- [ ] No non-essential cookies before consent
- [ ] Easy preference management
- [ ] Clear cookie policy link
- [ ] Consent records maintained
- [ ] Regular consent renewal (annual)
- [ ] Cross-device consent sync

## 7. Legal Requirements

1. **Prior Consent**: No cookies except essential before consent
2. **Informed Consent**: Clear information about each category
3. **Granular Control**: Separate toggles for each category
4. **Easy Withdrawal**: Simple process to change preferences
5. **Equal Prominence**: "Reject All" as prominent as "Accept All"
6. **No Cookie Walls**: Access not conditional on consent
7. **Consent Records**: Maintain audit trail
8. **Regular Review**: Re-request consent annually

## 8. Implementation Timeline

### Week 1
- Implement cookie consent component
- Set up backend API endpoints
- Create database schema

### Week 2
- Integrate consent checks in script loading
- Implement cookie filtering middleware
- Add preference management UI

### Week 3
- Complete testing suite
- Add audit logging
- Deploy to staging

### Week 4
- User acceptance testing
- Legal review
- Production deployment