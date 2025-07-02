# Marketing Integration Guide

## Overview

This guide provides comprehensive implementation patterns for marketing enhancements in BookedBarber, including Google My Business integration, conversion tracking, review automation, and centralized integration management.

## Table of Contents
1. [OAuth Integration Pattern](#oauth-integration-pattern)
2. [Google My Business Integration](#google-my-business-integration)
3. [Review Management System](#review-management-system)
4. [Conversion Tracking](#conversion-tracking)
5. [Integration Settings Hub](#integration-settings-hub)
6. [Testing Strategies](#testing-strategies)
7. [Security Considerations](#security-considerations)

## OAuth Integration Pattern

### Architecture Overview
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│ OAuth Provider  │
│  (Next.js)      │◀────│   (FastAPI)      │◀────│ (GMB/Meta/etc) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │
        └──── Secure Token ──────┘
```

### Implementation

#### 1. OAuth Service (Backend)

```python
# backend-v2/services/oauth_service.py
from typing import Dict, Optional
from datetime import datetime, timedelta
import secrets
import httpx
from sqlalchemy.orm import Session
from models.integration import Integration
from config.settings import settings

class OAuthService:
    """Centralized OAuth management for all marketing integrations"""
    
    PROVIDERS = {
        'google': {
            'auth_url': 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url': 'https://oauth2.googleapis.com/token',
            'scopes': ['https://www.googleapis.com/auth/business.manage'],
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
        },
        'meta': {
            'auth_url': 'https://www.facebook.com/v17.0/dialog/oauth',
            'token_url': 'https://graph.facebook.com/v17.0/oauth/access_token',
            'scopes': ['business_management', 'ads_management'],
            'client_id': settings.META_CLIENT_ID,
            'client_secret': settings.META_CLIENT_SECRET,
        }
    }
    
    def __init__(self, db: Session):
        self.db = db
        
    async def initiate_oauth(self, provider: str, user_id: int) -> Dict:
        """Generate OAuth authorization URL and state"""
        if provider not in self.PROVIDERS:
            raise ValueError(f"Unsupported provider: {provider}")
            
        config = self.PROVIDERS[provider]
        state = secrets.token_urlsafe(32)
        
        # Store state in cache with user_id
        await cache.set(f"oauth_state:{state}", {
            'user_id': user_id,
            'provider': provider
        }, expire=600)  # 10 minutes
        
        params = {
            'client_id': config['client_id'],
            'redirect_uri': f"{settings.BACKEND_URL}/api/v1/oauth/callback/{provider}",
            'scope': ' '.join(config['scopes']),
            'state': state,
            'response_type': 'code',
            'access_type': 'offline',  # For refresh tokens
        }
        
        auth_url = f"{config['auth_url']}?{urlencode(params)}"
        
        return {
            'auth_url': auth_url,
            'state': state
        }
    
    async def handle_callback(self, provider: str, code: str, state: str) -> Dict:
        """Process OAuth callback and store tokens"""
        # Verify state
        state_data = await cache.get(f"oauth_state:{state}")
        if not state_data:
            raise ValueError("Invalid or expired state")
            
        config = self.PROVIDERS[provider]
        user_id = state_data['user_id']
        
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            response = await client.post(config['token_url'], data={
                'client_id': config['client_id'],
                'client_secret': config['client_secret'],
                'code': code,
                'redirect_uri': f"{settings.BACKEND_URL}/api/v1/oauth/callback/{provider}",
                'grant_type': 'authorization_code',
            })
            
        if response.status_code != 200:
            raise Exception(f"Token exchange failed: {response.text}")
            
        token_data = response.json()
        
        # Store tokens in database
        integration = self.db.query(Integration).filter_by(
            user_id=user_id,
            provider=provider
        ).first()
        
        if not integration:
            integration = Integration(user_id=user_id, provider=provider)
            
        integration.access_token = encrypt(token_data['access_token'])
        integration.refresh_token = encrypt(token_data.get('refresh_token'))
        integration.expires_at = datetime.utcnow() + timedelta(
            seconds=token_data.get('expires_in', 3600)
        )
        integration.metadata = {
            'scope': token_data.get('scope'),
            'token_type': token_data.get('token_type'),
        }
        
        self.db.add(integration)
        self.db.commit()
        
        # Clear state from cache
        await cache.delete(f"oauth_state:{state}")
        
        return {'success': True, 'provider': provider}
    
    async def refresh_token(self, provider: str, user_id: int) -> Dict:
        """Refresh expired OAuth tokens"""
        integration = self.db.query(Integration).filter_by(
            user_id=user_id,
            provider=provider
        ).first()
        
        if not integration or not integration.refresh_token:
            raise ValueError("No refresh token available")
            
        config = self.PROVIDERS[provider]
        
        async with httpx.AsyncClient() as client:
            response = await client.post(config['token_url'], data={
                'client_id': config['client_id'],
                'client_secret': config['client_secret'],
                'refresh_token': decrypt(integration.refresh_token),
                'grant_type': 'refresh_token',
            })
            
        if response.status_code != 200:
            raise Exception(f"Token refresh failed: {response.text}")
            
        token_data = response.json()
        
        # Update tokens
        integration.access_token = encrypt(token_data['access_token'])
        if 'refresh_token' in token_data:
            integration.refresh_token = encrypt(token_data['refresh_token'])
        integration.expires_at = datetime.utcnow() + timedelta(
            seconds=token_data.get('expires_in', 3600)
        )
        
        self.db.commit()
        
        return {'success': True}
```

#### 2. OAuth API Endpoints

```python
# backend-v2/api/v1/oauth.py
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from services.oauth_service import OAuthService

router = APIRouter(prefix="/oauth", tags=["oauth"])

@router.post("/initiate/{provider}")
async def initiate_oauth(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initiate OAuth flow for a provider"""
    service = OAuthService(db)
    try:
        result = await service.initiate_oauth(provider, current_user.id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/callback/{provider}")
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """Handle OAuth callback from provider"""
    service = OAuthService(db)
    try:
        result = await service.handle_callback(provider, code, state)
        # Redirect to frontend success page
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/settings/integrations?success=true&provider={provider}"
        )
    except Exception as e:
        # Redirect to frontend error page
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/settings/integrations?error={str(e)}"
        )
```

## Google My Business Integration

### GMB Service Implementation

```python
# backend-v2/services/gmb_service.py
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from typing import List, Dict

class GMBService:
    """Google My Business API integration"""
    
    def __init__(self, db: Session):
        self.db = db
        
    def _get_credentials(self, user_id: int) -> Credentials:
        """Get Google OAuth credentials for user"""
        integration = self.db.query(Integration).filter_by(
            user_id=user_id,
            provider='google'
        ).first()
        
        if not integration:
            raise ValueError("Google integration not found")
            
        creds = Credentials(
            token=decrypt(integration.access_token),
            refresh_token=decrypt(integration.refresh_token),
            token_uri='https://oauth2.googleapis.com/token',
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )
        
        # Refresh if expired
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Update stored tokens
            integration.access_token = encrypt(creds.token)
            self.db.commit()
            
        return creds
    
    async def list_locations(self, user_id: int) -> List[Dict]:
        """List all GMB locations for user"""
        creds = self._get_credentials(user_id)
        service = build('mybusinessbusinessinformation', 'v1', credentials=creds)
        
        # Get accounts
        accounts = service.accounts().list().execute()
        if not accounts.get('accounts'):
            return []
            
        locations = []
        for account in accounts['accounts']:
            # Get locations for each account
            locs = service.accounts().locations().list(
                parent=account['name']
            ).execute()
            
            for loc in locs.get('locations', []):
                locations.append({
                    'id': loc['name'],
                    'title': loc.get('title'),
                    'address': loc.get('address'),
                    'phone': loc.get('phoneNumbers', {}).get('primaryPhone'),
                    'website': loc.get('websiteUrl'),
                })
                
        return locations
    
    async def get_reviews(self, user_id: int, location_id: str) -> List[Dict]:
        """Fetch reviews for a GMB location"""
        creds = self._get_credentials(user_id)
        service = build('mybusiness', 'v4', credentials=creds)
        
        reviews = service.accounts().locations().reviews().list(
            parent=location_id
        ).execute()
        
        return [{
            'id': review['reviewId'],
            'author': review.get('reviewer', {}).get('displayName'),
            'rating': review.get('starRating'),
            'text': review.get('comment'),
            'created_at': review.get('createTime'),
            'reply': review.get('reviewReply'),
        } for review in reviews.get('reviews', [])]
    
    async def reply_to_review(self, user_id: int, location_id: str, review_id: str, reply_text: str):
        """Post a reply to a GMB review"""
        creds = self._get_credentials(user_id)
        service = build('mybusiness', 'v4', credentials=creds)
        
        response = service.accounts().locations().reviews().updateReply(
            name=f"{location_id}/reviews/{review_id}",
            body={'comment': reply_text}
        ).execute()
        
        return response
```

## Review Management System

### Review Service with AI-Powered Response Generation

```python
# backend-v2/services/review_service.py
from typing import List, Dict, Optional
import openai
from datetime import datetime, timedelta

class ReviewService:
    """Automated review management with SEO-optimized responses"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gmb_service = GMBService(db)
        
    async def fetch_all_reviews(self, user_id: int) -> List[Dict]:
        """Fetch reviews from all integrated platforms"""
        reviews = []
        
        # Fetch from Google My Business
        try:
            locations = await self.gmb_service.list_locations(user_id)
            for location in locations:
                gmb_reviews = await self.gmb_service.get_reviews(user_id, location['id'])
                for review in gmb_reviews:
                    review['platform'] = 'google'
                    review['location_id'] = location['id']
                    reviews.append(review)
        except Exception as e:
            logger.error(f"Failed to fetch GMB reviews: {e}")
            
        # TODO: Add other platforms (Yelp, Facebook, etc.)
        
        return sorted(reviews, key=lambda x: x['created_at'], reverse=True)
    
    async def generate_response(self, review: Dict, template_type: Optional[str] = None) -> str:
        """Generate SEO-optimized response using templates and AI"""
        rating = review.get('rating', 0)
        
        # Get appropriate template based on rating
        template = self.db.query(ReviewTemplate).filter(
            ReviewTemplate.rating_range.contains(str(rating)),
            ReviewTemplate.template_type == (template_type or 'default'),
            ReviewTemplate.active == True
        ).first()
        
        if not template:
            # Fallback to AI generation
            return await self._generate_ai_response(review)
            
        # Personalize template
        response = template.template_text.format(
            customer_name=review.get('author', 'valued customer'),
            business_name=settings.BUSINESS_NAME,
            review_text=review.get('text', ''),
        )
        
        # Add SEO keywords naturally
        if template.seo_keywords:
            response = self._inject_seo_keywords(response, template.seo_keywords)
            
        return response
    
    async def _generate_ai_response(self, review: Dict) -> str:
        """Generate response using OpenAI when no template matches"""
        prompt = f"""
        Generate a professional, SEO-optimized response to this review:
        Rating: {review.get('rating')}/5
        Review: {review.get('text')}
        
        Guidelines:
        - Be authentic and personalized
        - Include business name: {settings.BUSINESS_NAME}
        - Mention key services: haircuts, beard grooming, styling
        - Include location keywords: {settings.BUSINESS_LOCATION}
        - Keep under 200 words
        - End with a call to action
        """
        
        response = await openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.7,
        )
        
        return response.choices[0].message.content
    
    def _inject_seo_keywords(self, text: str, keywords: List[str]) -> str:
        """Naturally inject SEO keywords into response"""
        # Simple implementation - can be enhanced with NLP
        for keyword in keywords[:3]:  # Limit to avoid keyword stuffing
            if keyword.lower() not in text.lower():
                # Add keyword in a natural way
                text += f" We're proud to offer {keyword} services."
                
        return text
    
    async def auto_respond_to_reviews(self, user_id: int):
        """Automatically respond to new reviews"""
        reviews = await self.fetch_all_reviews(user_id)
        
        for review in reviews:
            # Skip if already replied or too old
            if review.get('reply') or self._is_too_old(review['created_at']):
                continue
                
            # Generate response
            response = await self.generate_response(review)
            
            # Post response
            try:
                if review['platform'] == 'google':
                    await self.gmb_service.reply_to_review(
                        user_id,
                        review['location_id'],
                        review['id'],
                        response
                    )
                # TODO: Add other platforms
                
                # Log successful response
                self.db.add(ReviewResponse(
                    review_id=review['id'],
                    platform=review['platform'],
                    response_text=response,
                    responded_at=datetime.utcnow(),
                ))
                self.db.commit()
                
            except Exception as e:
                logger.error(f"Failed to post review response: {e}")
    
    def _is_too_old(self, created_at: str, days: int = 7) -> bool:
        """Check if review is too old to respond to"""
        review_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        return (datetime.utcnow() - review_date) > timedelta(days=days)
```

### Review Response Templates

```python
# backend-v2/models/review_template.py
from sqlalchemy import Column, Integer, String, Text, Boolean, ARRAY
from config.database import Base

class ReviewTemplate(Base):
    __tablename__ = "review_templates"
    
    id = Column(Integer, primary_key=True)
    rating_range = Column(String(10))  # e.g., "4-5", "3", "1-2"
    template_type = Column(String(50))  # default, complaint, praise, etc.
    template_text = Column(Text)
    seo_keywords = Column(ARRAY(String))
    active = Column(Boolean, default=True)
    
# Sample templates
DEFAULT_TEMPLATES = [
    {
        'rating_range': '5',
        'template_type': 'default',
        'template_text': """Thank you so much, {customer_name}! We're thrilled to hear you had an amazing experience at {business_name}. Your kind words mean the world to our team. We look forward to providing you with exceptional service on your next visit!""",
        'seo_keywords': ['barber', 'haircut', 'grooming', 'barbershop']
    },
    {
        'rating_range': '4',
        'template_type': 'default',
        'template_text': """Thank you for your review, {customer_name}! We're glad you enjoyed your visit to {business_name}. We appreciate your feedback and are always looking for ways to improve. See you soon!""",
        'seo_keywords': ['professional barber', 'men\'s grooming', 'beard trim']
    },
    {
        'rating_range': '1-3',
        'template_type': 'default',
        'template_text': """Thank you for your feedback, {customer_name}. We sincerely apologize that your experience at {business_name} didn't meet expectations. We'd love the opportunity to make things right. Please contact us directly so we can address your concerns personally.""",
        'seo_keywords': ['customer service', 'barbershop experience']
    }
]
```

## Conversion Tracking

### Unified Tracking Service

```python
# backend-v2/services/tracking_service.py
from typing import Dict, List, Optional
from datetime import datetime
import json

class TrackingService:
    """Unified conversion tracking across all platforms"""
    
    EVENTS = {
        'booking_started': {'gtm': 'begin_checkout', 'meta': 'InitiateCheckout'},
        'booking_completed': {'gtm': 'purchase', 'meta': 'Purchase'},
        'registration': {'gtm': 'sign_up', 'meta': 'CompleteRegistration'},
        'service_viewed': {'gtm': 'view_item', 'meta': 'ViewContent'},
        'appointment_scheduled': {'gtm': 'schedule', 'meta': 'Schedule'},
    }
    
    def __init__(self, db: Session):
        self.db = db
        
    async def track_event(self, event_type: str, user_id: Optional[int], data: Dict):
        """Send conversion event to all enabled platforms"""
        if event_type not in self.EVENTS:
            logger.warning(f"Unknown event type: {event_type}")
            return
            
        # Store event in database
        event = ConversionEvent(
            event_type=event_type,
            user_id=user_id,
            appointment_id=data.get('appointment_id'),
            revenue=data.get('revenue'),
            metadata=data,
        )
        self.db.add(event)
        self.db.commit()
        
        # Send to enabled platforms
        await self._send_to_gtm(event_type, data)
        await self._send_to_meta(event_type, data)
        
    async def _send_to_gtm(self, event_type: str, data: Dict):
        """Send event to Google Tag Manager"""
        gtm_event = self.EVENTS[event_type]['gtm']
        
        # GTM data layer push (frontend will handle actual push)
        gtm_data = {
            'event': gtm_event,
            'event_data': {
                'value': data.get('revenue', 0),
                'currency': 'USD',
                'items': data.get('items', []),
                **data
            }
        }
        
        # Queue for frontend processing
        await cache.rpush('gtm_events', json.dumps(gtm_data))
        
    async def _send_to_meta(self, event_type: str, data: Dict):
        """Send event to Meta Pixel"""
        meta_event = self.EVENTS[event_type]['meta']
        
        # Server-side Meta Conversions API
        if settings.META_PIXEL_ID and settings.META_ACCESS_TOKEN:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f'https://graph.facebook.com/v17.0/{settings.META_PIXEL_ID}/events',
                    json={
                        'data': [{
                            'event_name': meta_event,
                            'event_time': int(datetime.utcnow().timestamp()),
                            'user_data': {
                                'client_user_agent': data.get('user_agent'),
                                'client_ip_address': data.get('ip_address'),
                            },
                            'custom_data': {
                                'value': data.get('revenue', 0),
                                'currency': 'USD',
                                'contents': data.get('items', []),
                            }
                        }],
                        'access_token': settings.META_ACCESS_TOKEN,
                    }
                )
    
    async def get_conversion_analytics(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get conversion analytics for date range"""
        events = self.db.query(ConversionEvent).filter(
            ConversionEvent.tracked_at >= start_date,
            ConversionEvent.tracked_at <= end_date
        ).all()
        
        analytics = {
            'total_conversions': len(events),
            'total_revenue': sum(e.revenue or 0 for e in events),
            'conversion_rate': 0,
            'events_by_type': {},
            'revenue_by_source': {},
        }
        
        # Calculate metrics
        for event in events:
            event_type = event.event_type
            if event_type not in analytics['events_by_type']:
                analytics['events_by_type'][event_type] = {
                    'count': 0,
                    'revenue': 0
                }
            analytics['events_by_type'][event_type]['count'] += 1
            analytics['events_by_type'][event_type]['revenue'] += event.revenue or 0
            
        return analytics
```

### Frontend Tracking Implementation

```typescript
// frontend-v2/lib/tracking.ts
import { gtag } from './gtag';

export class TrackingManager {
  private static instance: TrackingManager;
  
  static getInstance(): TrackingManager {
    if (!TrackingManager.instance) {
      TrackingManager.instance = new TrackingManager();
    }
    return TrackingManager.instance;
  }
  
  async trackEvent(eventType: string, data: any) {
    // Send to backend
    await apiClient.post('/api/v1/tracking/event', {
      event_type: eventType,
      ...data,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
    });
    
    // Also track client-side for immediate feedback
    this.trackClientSide(eventType, data);
  }
  
  private trackClientSide(eventType: string, data: any) {
    // Google Tag Manager
    if (window.dataLayer) {
      window.dataLayer.push({
        event: this.getGTMEvent(eventType),
        ...data,
      });
    }
    
    // Meta Pixel
    if (window.fbq) {
      window.fbq('track', this.getMetaEvent(eventType), data);
    }
  }
  
  private getGTMEvent(eventType: string): string {
    const eventMap: Record<string, string> = {
      'booking_started': 'begin_checkout',
      'booking_completed': 'purchase',
      'registration': 'sign_up',
      'service_viewed': 'view_item',
    };
    return eventMap[eventType] || eventType;
  }
  
  private getMetaEvent(eventType: string): string {
    const eventMap: Record<string, string> = {
      'booking_started': 'InitiateCheckout',
      'booking_completed': 'Purchase',
      'registration': 'CompleteRegistration',
      'service_viewed': 'ViewContent',
    };
    return eventMap[eventType] || eventType;
  }
}

// Usage in components
const tracking = TrackingManager.getInstance();

// Track booking started
tracking.trackEvent('booking_started', {
  service_id: selectedService.id,
  service_name: selectedService.name,
  price: selectedService.price,
});

// Track booking completed
tracking.trackEvent('booking_completed', {
  appointment_id: appointment.id,
  revenue: appointment.total_price,
  items: appointment.services,
});
```

## Integration Settings Hub

### Frontend Settings Component

```typescript
// frontend-v2/components/settings/IntegrationsHub.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from '@tanstack/react-query';

interface Integration {
  provider: string;
  name: string;
  description: string;
  connected: boolean;
  lastSync?: string;
  features: string[];
}

export function IntegrationsHub() {
  const { data: integrations, refetch } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => apiClient.get('/api/v1/integrations'),
  });
  
  const connectMutation = useMutation({
    mutationFn: (provider: string) => 
      apiClient.post(`/api/v1/oauth/initiate/${provider}`),
    onSuccess: (data, provider) => {
      // Redirect to OAuth URL
      window.location.href = data.auth_url;
    },
  });
  
  const disconnectMutation = useMutation({
    mutationFn: (provider: string) => 
      apiClient.delete(`/api/v1/integrations/${provider}`),
    onSuccess: () => refetch(),
  });
  
  const availableIntegrations: Integration[] = [
    {
      provider: 'google',
      name: 'Google My Business',
      description: 'Manage reviews, update business info, track insights',
      connected: integrations?.google?.connected || false,
      lastSync: integrations?.google?.lastSync,
      features: ['Review Management', 'Business Updates', 'Analytics'],
    },
    {
      provider: 'meta',
      name: 'Meta Business Suite',
      description: 'Facebook & Instagram ads, pixel tracking, insights',
      connected: integrations?.meta?.connected || false,
      lastSync: integrations?.meta?.lastSync,
      features: ['Ad Management', 'Pixel Tracking', 'Audience Insights'],
    },
    {
      provider: 'mailchimp',
      name: 'Mailchimp',
      description: 'Email marketing, campaigns, customer segments',
      connected: integrations?.mailchimp?.connected || false,
      lastSync: integrations?.mailchimp?.lastSync,
      features: ['Email Campaigns', 'Automation', 'Segmentation'],
    },
  ];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Marketing Integrations</h2>
        <p className="text-muted-foreground">
          Connect your marketing tools to supercharge your business
        </p>
      </div>
      
      <div className="grid gap-6">
        {availableIntegrations.map((integration) => (
          <Card key={integration.provider}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{integration.name}</CardTitle>
                  <CardDescription>{integration.description}</CardDescription>
                </div>
                <Badge variant={integration.connected ? "success" : "outline"}>
                  {integration.connected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {integration.features.map((feature) => (
                    <Badge key={feature} variant="secondary">
                      {feature}
                    </Badge>
                  ))}
                </div>
                
                {integration.connected && integration.lastSync && (
                  <p className="text-sm text-muted-foreground">
                    Last synced: {new Date(integration.lastSync).toLocaleString()}
                  </p>
                )}
                
                <div className="flex justify-end">
                  {integration.connected ? (
                    <Button
                      variant="destructive"
                      onClick={() => disconnectMutation.mutate(integration.provider)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      onClick={() => connectMutation.mutate(integration.provider)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Conversion Tracking</CardTitle>
          <CardDescription>
            Configure how conversions are tracked across platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConversionTrackingSettings />
        </CardContent>
      </Card>
    </div>
  );
}
```

## Testing Strategies

### OAuth Flow Testing

```python
# backend-v2/tests/integration/test_oauth_flow.py
import pytest
from unittest.mock import Mock, patch
from services.oauth_service import OAuthService

@pytest.mark.asyncio
class TestOAuthFlow:
    async def test_initiate_oauth_google(self, db_session, test_user):
        """Test initiating Google OAuth flow"""
        service = OAuthService(db_session)
        
        result = await service.initiate_oauth('google', test_user.id)
        
        assert 'auth_url' in result
        assert 'state' in result
        assert 'accounts.google.com' in result['auth_url']
        assert len(result['state']) == 43  # base64 encoded 32 bytes
        
    @patch('httpx.AsyncClient.post')
    async def test_handle_callback_success(self, mock_post, db_session, test_user):
        """Test successful OAuth callback handling"""
        # Mock token exchange response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'access_token': 'test_access_token',
            'refresh_token': 'test_refresh_token',
            'expires_in': 3600,
            'scope': 'business.manage',
        }
        mock_post.return_value = mock_response
        
        service = OAuthService(db_session)
        
        # Set up state in cache
        await cache.set('oauth_state:test_state', {
            'user_id': test_user.id,
            'provider': 'google'
        })
        
        result = await service.handle_callback('google', 'test_code', 'test_state')
        
        assert result['success'] is True
        assert result['provider'] == 'google'
        
        # Verify integration was saved
        integration = db_session.query(Integration).filter_by(
            user_id=test_user.id,
            provider='google'
        ).first()
        assert integration is not None
        assert integration.access_token is not None
        
    async def test_token_refresh(self, db_session, test_user, test_integration):
        """Test OAuth token refresh"""
        service = OAuthService(db_session)
        
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                'access_token': 'new_access_token',
                'expires_in': 3600,
            }
            mock_post.return_value = mock_response
            
            result = await service.refresh_token('google', test_user.id)
            
            assert result['success'] is True
```

### Review Response Testing

```python
# backend-v2/tests/unit/test_review_response.py
import pytest
from services.review_service import ReviewService

class TestReviewResponse:
    def test_generate_response_5_star(self, db_session):
        """Test response generation for 5-star review"""
        service = ReviewService(db_session)
        
        review = {
            'rating': 5,
            'author': 'John Doe',
            'text': 'Amazing haircut! Best barber in town.',
        }
        
        response = service.generate_response(review)
        
        assert 'John Doe' in response
        assert len(response) < 500  # Reasonable length
        assert any(keyword in response.lower() for keyword in ['barber', 'service', 'visit'])
        
    def test_seo_keyword_injection(self, db_session):
        """Test SEO keyword injection in responses"""
        service = ReviewService(db_session)
        
        response = "Thank you for visiting us!"
        keywords = ['professional barber', 'men\'s grooming', 'haircut']
        
        enhanced = service._inject_seo_keywords(response, keywords)
        
        assert len(enhanced) > len(response)
        assert any(keyword in enhanced.lower() for keyword in keywords)
```

### Conversion Tracking Testing

```python
# backend-v2/tests/integration/test_conversion_tracking.py
import pytest
from services.tracking_service import TrackingService

@pytest.mark.asyncio
class TestConversionTracking:
    async def test_track_booking_completed(self, db_session, test_user):
        """Test tracking booking completion event"""
        service = TrackingService(db_session)
        
        await service.track_event('booking_completed', test_user.id, {
            'appointment_id': 123,
            'revenue': 45.00,
            'items': [{'name': 'Haircut', 'price': 45.00}],
        })
        
        # Verify event was stored
        event = db_session.query(ConversionEvent).filter_by(
            event_type='booking_completed',
            user_id=test_user.id
        ).first()
        
        assert event is not None
        assert event.revenue == 45.00
        assert event.appointment_id == 123
        
    async def test_conversion_analytics(self, db_session):
        """Test conversion analytics calculation"""
        service = TrackingService(db_session)
        
        # Create test events
        for i in range(5):
            await service.track_event('booking_completed', None, {
                'revenue': 50.00,
            })
            
        analytics = await service.get_conversion_analytics(
            datetime.utcnow() - timedelta(days=1),
            datetime.utcnow()
        )
        
        assert analytics['total_conversions'] == 5
        assert analytics['total_revenue'] == 250.00
        assert 'booking_completed' in analytics['events_by_type']
```

## Security Considerations

### Token Storage
- All OAuth tokens are encrypted using AES-256 before database storage
- Refresh tokens are stored separately with additional encryption
- Token expiry is tracked and automatic refresh is implemented

### API Security
- All OAuth endpoints require authentication
- State parameter validation prevents CSRF attacks
- Redirect URIs are whitelisted in provider configs
- Rate limiting on OAuth initiation endpoints

### Data Privacy
- PII in conversion events is anonymized
- Review responses don't include sensitive customer data
- Integration metadata is encrypted at rest
- Audit logs track all integration access

### Best Practices
1. **Regular Token Rotation**: Refresh tokens every 30 days
2. **Scope Minimization**: Request only necessary permissions
3. **Error Handling**: Never expose token errors to frontend
4. **Monitoring**: Track failed OAuth attempts and API errors
5. **Compliance**: Follow GDPR/CCPA for data handling

## Implementation Checklist

- [ ] Set up OAuth providers (Google, Meta) with proper redirect URIs
- [ ] Configure environment variables for all API keys
- [ ] Create database migrations for new tables
- [ ] Implement OAuth service with token encryption
- [ ] Build review management service with templates
- [ ] Set up conversion tracking with GTM/Meta Pixel
- [ ] Create integration settings UI in frontend
- [ ] Write comprehensive tests for all flows
- [ ] Add monitoring and error tracking
- [ ] Document API endpoints and usage
- [ ] Set up automated review response job
- [ ] Configure security headers and CORS
- [ ] Test end-to-end flows in staging
- [ ] Create user documentation
- [ ] Plan rollout strategy with feature flags