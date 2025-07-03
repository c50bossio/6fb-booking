# Attribution Model Documentation

## Overview

BookedBarber V2 implements a comprehensive multi-touch attribution system that tracks customer journeys across all marketing channels and touchpoints. This document details the attribution methodology, models, and implementation used to provide accurate ROI measurement for barbershop marketing efforts.

## Table of Contents

1. [Attribution Philosophy](#attribution-philosophy)
2. [Attribution Models](#attribution-models)
3. [Data Collection Framework](#data-collection-framework)
4. [Touchpoint Identification](#touchpoint-identification)
5. [Attribution Engine](#attribution-engine)
6. [Cross-Platform Attribution](#cross-platform-attribution)
7. [Customer Journey Mapping](#customer-journey-mapping)
8. [ROI Calculation](#roi-calculation)
9. [Reporting & Analytics](#reporting--analytics)
10. [Implementation Details](#implementation-details)
11. [Validation & Testing](#validation--testing)
12. [Barbershop-Specific Considerations](#barbershop-specific-considerations)
13. [Best Practices](#best-practices)

## Attribution Philosophy

### Core Principles

BookedBarber's attribution system is built on these fundamental principles:

1. **Holistic View**: Every touchpoint matters in the customer journey
2. **Business Context**: Attribution models reflect barbershop customer behavior
3. **Actionable Insights**: Attribution data drives marketing optimization decisions
4. **Transparency**: Clear methodology for all stakeholders
5. **Accuracy**: Minimize false attribution while maximizing coverage

### Customer Journey Understanding

Barbershop customers typically follow these journey patterns:

```
Discovery → Consideration → Booking → Service → Retention
    ↓           ↓           ↓         ↓         ↓
Google Ads → Review Read → Website → In-store → Loyalty
Social     → Friend      → Phone    → Service → Referral
GMB        → Comparison  → Walk-in  → Review  → Repeat
```

## Attribution Models

BookedBarber implements six attribution models, each serving different analytical needs:

### 1. First-Touch Attribution

**Use Case**: Understanding discovery channels and brand awareness impact

**Methodology**: 100% credit to the first touchpoint in the customer journey

```python
def first_touch_attribution(touchpoints):
    """
    Assigns 100% credit to the first marketing touchpoint
    
    Best for: Brand awareness campaigns, new customer acquisition
    """
    if not touchpoints:
        return {}
    
    first_touch = touchpoints[0]
    return {
        first_touch['channel']: {
            'credit': 1.0,
            'value': first_touch['conversion_value'],
            'touchpoint_count': 1
        }
    }
```

**Business Application**:
- Measuring brand awareness campaign effectiveness
- Understanding initial customer discovery patterns
- Budgeting for top-of-funnel marketing

### 2. Last-Touch Attribution

**Use Case**: Understanding conversion drivers and closing channels

**Methodology**: 100% credit to the last touchpoint before conversion

```python
def last_touch_attribution(touchpoints):
    """
    Assigns 100% credit to the last marketing touchpoint
    
    Best for: Conversion optimization, closing channel analysis
    """
    if not touchpoints:
        return {}
    
    last_touch = touchpoints[-1]
    return {
        last_touch['channel']: {
            'credit': 1.0,
            'value': last_touch['conversion_value'],
            'touchpoint_count': 1
        }
    }
```

**Business Application**:
- Optimizing conversion-focused campaigns
- Understanding which channels close bookings
- Retargeting campaign effectiveness

### 3. Linear Attribution

**Use Case**: Equal credit distribution across all touchpoints

**Methodology**: Credit split equally among all touchpoints

```python
def linear_attribution(touchpoints):
    """
    Distributes credit equally across all touchpoints
    
    Best for: Balanced view of customer journey impact
    """
    if not touchpoints:
        return {}
    
    credit_per_touch = 1.0 / len(touchpoints)
    attribution = {}
    
    for touch in touchpoints:
        channel = touch['channel']
        if channel not in attribution:
            attribution[channel] = {
                'credit': 0,
                'value': 0,
                'touchpoint_count': 0
            }
        
        attribution[channel]['credit'] += credit_per_touch
        attribution[channel]['value'] += touch['conversion_value'] * credit_per_touch
        attribution[channel]['touchpoint_count'] += 1
    
    return attribution
```

**Business Application**:
- Holistic campaign performance evaluation
- Multi-channel strategy optimization
- Long-term customer relationship building

### 4. Time-Decay Attribution

**Use Case**: Emphasizing recent touchpoints while acknowledging earlier influence

**Methodology**: Exponential decay favoring more recent touchpoints

```python
def time_decay_attribution(touchpoints, half_life_days=7):
    """
    Applies exponential decay with configurable half-life
    
    Best for: Recency-focused attribution, seasonal campaigns
    """
    if not touchpoints:
        return {}
    
    # Calculate decay weights
    conversion_time = touchpoints[-1]['timestamp']
    weights = []
    
    for touch in touchpoints:
        days_ago = (conversion_time - touch['timestamp']).days
        # Exponential decay: weight = 2^(-days_ago/half_life)
        weight = 2 ** (-days_ago / half_life_days)
        weights.append(weight)
    
    total_weight = sum(weights)
    attribution = {}
    
    for i, touch in enumerate(touchpoints):
        channel = touch['channel']
        credit = weights[i] / total_weight
        
        if channel not in attribution:
            attribution[channel] = {
                'credit': 0,
                'value': 0,
                'touchpoint_count': 0
            }
        
        attribution[channel]['credit'] += credit
        attribution[channel]['value'] += touch['conversion_value'] * credit
        attribution[channel]['touchpoint_count'] += 1
    
    return attribution
```

**Business Application**:
- Short sales cycle optimization
- Retargeting campaign measurement
- Seasonal promotion effectiveness

### 5. Position-Based (U-Shaped) Attribution

**Use Case**: Emphasizing discovery and conversion while acknowledging nurturing

**Methodology**: 40% first, 40% last, 20% distributed among middle touchpoints

```python
def position_based_attribution(touchpoints, first_weight=0.4, last_weight=0.4):
    """
    U-shaped attribution emphasizing first and last touchpoints
    
    Best for: Balanced discovery and conversion focus
    """
    if not touchpoints:
        return {}
    
    if len(touchpoints) == 1:
        return first_touch_attribution(touchpoints)
    
    attribution = {}
    middle_touchpoints = len(touchpoints) - 2
    middle_weight = (1.0 - first_weight - last_weight) / middle_touchpoints if middle_touchpoints > 0 else 0
    
    for i, touch in enumerate(touchpoints):
        channel = touch['channel']
        
        if i == 0:  # First touchpoint
            credit = first_weight
        elif i == len(touchpoints) - 1:  # Last touchpoint
            credit = last_weight
        else:  # Middle touchpoints
            credit = middle_weight
        
        if channel not in attribution:
            attribution[channel] = {
                'credit': 0,
                'value': 0,
                'touchpoint_count': 0
            }
        
        attribution[channel]['credit'] += credit
        attribution[channel]['value'] += touch['conversion_value'] * credit
        attribution[channel]['touchpoint_count'] += 1
    
    return attribution
```

**Business Application**:
- Comprehensive customer journey understanding
- Balancing brand awareness and conversion optimization
- Multi-stage campaign planning

### 6. Data-Driven Attribution

**Use Case**: Machine learning-based attribution tailored to barbershop behavior

**Methodology**: Statistical modeling based on historical conversion data

```python
def data_driven_attribution(touchpoints, conversion_history):
    """
    Uses machine learning to determine optimal attribution weights
    
    Best for: Large datasets, sophisticated analysis
    """
    if not touchpoints or not conversion_history:
        return linear_attribution(touchpoints)  # Fallback
    
    # Simplified implementation - in practice, use ML models
    channel_weights = calculate_channel_weights(conversion_history)
    
    attribution = {}
    total_weight = 0
    
    # Calculate weights for each touchpoint
    for touch in touchpoints:
        channel = touch['channel']
        weight = channel_weights.get(channel, 1.0)
        total_weight += weight
        
        if channel not in attribution:
            attribution[channel] = {
                'credit': 0,
                'value': 0,
                'touchpoint_count': 0,
                'weight': weight
            }
        else:
            attribution[channel]['weight'] += weight
    
    # Normalize and assign credit
    for channel in attribution:
        attribution[channel]['credit'] = attribution[channel]['weight'] / total_weight
        attribution[channel]['value'] = (
            attribution[channel]['credit'] * touchpoints[0]['conversion_value']
        )
    
    return attribution

def calculate_channel_weights(conversion_history):
    """Calculate channel weights based on historical performance"""
    # Simplified implementation
    channel_performance = {}
    
    for journey in conversion_history:
        for touchpoint in journey['touchpoints']:
            channel = touchpoint['channel']
            if channel not in channel_performance:
                channel_performance[channel] = {
                    'conversions': 0,
                    'total_value': 0,
                    'touchpoint_count': 0
                }
            
            channel_performance[channel]['conversions'] += 1
            channel_performance[channel]['total_value'] += journey['conversion_value']
            channel_performance[channel]['touchpoint_count'] += 1
    
    # Calculate weights based on conversion rate and value
    weights = {}
    for channel, perf in channel_performance.items():
        conversion_rate = perf['conversions'] / perf['touchpoint_count']
        avg_value = perf['total_value'] / perf['conversions']
        weights[channel] = conversion_rate * avg_value
    
    # Normalize weights
    total_weight = sum(weights.values())
    if total_weight > 0:
        weights = {k: v / total_weight for k, v in weights.items()}
    
    return weights
```

**Business Application**:
- Advanced performance optimization
- AI-driven budget allocation
- Predictive marketing strategies

## Data Collection Framework

### Touchpoint Data Structure

```python
class Touchpoint:
    def __init__(self, customer_id, channel, source, medium, campaign,
                 timestamp, page_url, referrer, user_agent, location_data,
                 interaction_type, content_id, value=0):
        self.customer_id = customer_id
        self.channel = channel  # 'google_ads', 'facebook', 'organic', etc.
        self.source = source    # 'google', 'facebook.com', 'direct', etc.
        self.medium = medium    # 'cpc', 'organic', 'social', etc.
        self.campaign = campaign # Campaign name or 'none'
        self.timestamp = timestamp
        self.page_url = page_url
        self.referrer = referrer
        self.user_agent = user_agent
        self.location_data = location_data
        self.interaction_type = interaction_type  # 'page_view', 'click', 'form_submit'
        self.content_id = content_id
        self.value = value
        self.conversion_value = 0  # Set when conversion occurs
        
    def to_dict(self):
        return {
            'customer_id': self.customer_id,
            'channel': self.channel,
            'source': self.source,
            'medium': self.medium,
            'campaign': self.campaign,
            'timestamp': self.timestamp.isoformat(),
            'page_url': self.page_url,
            'referrer': self.referrer,
            'user_agent': self.user_agent,
            'location_data': self.location_data,
            'interaction_type': self.interaction_type,
            'content_id': self.content_id,
            'value': self.value,
            'conversion_value': self.conversion_value
        }
```

### Data Collection Methods

#### 1. First-Party Data Collection

```javascript
// Client-side touchpoint tracking
class TouchpointTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.customerId = this.getCustomerId();
        this.touchpoints = [];
        this.initialize();
    }
    
    initialize() {
        // Track page views
        this.trackPageView();
        
        // Track interactions
        this.trackInteractions();
        
        // Track form submissions
        this.trackFormSubmissions();
        
        // Track external clicks
        this.trackExternalClicks();
    }
    
    trackPageView() {
        const touchpoint = {
            customer_id: this.customerId,
            session_id: this.sessionId,
            channel: this.identifyChannel(),
            source: this.getSource(),
            medium: this.getMedium(),
            campaign: this.getCampaign(),
            timestamp: new Date().toISOString(),
            page_url: window.location.href,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            interaction_type: 'page_view',
            content_id: this.getContentId(),
            location_data: this.getLocationData()
        };
        
        this.sendTouchpoint(touchpoint);
    }
    
    identifyChannel() {
        const url = new URL(window.location.href);
        const utm_source = url.searchParams.get('utm_source');
        const utm_medium = url.searchParams.get('utm_medium');
        const referrer = document.referrer;
        
        // Channel identification logic
        if (utm_source && utm_medium) {
            return this.channelFromUTM(utm_source, utm_medium);
        }
        
        if (referrer) {
            return this.channelFromReferrer(referrer);
        }
        
        return 'direct';
    }
    
    channelFromUTM(source, medium) {
        const channelMap = {
            'google_ads': ['google', 'cpc'],
            'facebook_ads': ['facebook', 'cpc'],
            'instagram_ads': ['instagram', 'cpc'],
            'email': ['email', 'email'],
            'sms': ['sms', 'sms'],
            'social_organic': ['facebook', 'organic'],
            'google_organic': ['google', 'organic']
        };
        
        for (const [channel, [src, med]] of Object.entries(channelMap)) {
            if (source.includes(src) && medium.includes(med)) {
                return channel;
            }
        }
        
        return 'other';
    }
    
    channelFromReferrer(referrer) {
        const referrerMap = {
            'google': 'google_organic',
            'facebook': 'facebook_organic',
            'instagram': 'instagram_organic',
            'yelp': 'yelp',
            'nextdoor': 'nextdoor'
        };
        
        for (const [domain, channel] of Object.entries(referrerMap)) {
            if (referrer.includes(domain)) {
                return channel;
            }
        }
        
        return 'referral';
    }
    
    sendTouchpoint(touchpoint) {
        fetch('/api/v1/attribution/touchpoint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(touchpoint)
        }).catch(error => {
            console.error('Failed to send touchpoint:', error);
        });
    }
}

// Initialize tracker
const tracker = new TouchpointTracker();
```

#### 2. Server-Side Data Collection

```python
# Server-side touchpoint collection
from fastapi import Request
from user_agents import parse as parse_user_agent
import geoip2.database

class ServerSideTouchpointTracker:
    def __init__(self):
        self.geoip_reader = geoip2.database.Reader('GeoLite2-City.mmdb')
    
    def track_touchpoint(self, request: Request, customer_id: str,
                        interaction_type: str, content_id: str = None):
        """Server-side touchpoint tracking"""
        
        # Extract request data
        user_agent = request.headers.get('user-agent', '')
        ip_address = self.get_client_ip(request)
        referrer = request.headers.get('referer', '')
        
        # Parse user agent
        ua = parse_user_agent(user_agent)
        
        # Get location data
        location_data = self.get_location_data(ip_address)
        
        # Create touchpoint
        touchpoint = Touchpoint(
            customer_id=customer_id,
            channel=self.identify_channel(request),
            source=self.get_source(request),
            medium=self.get_medium(request),
            campaign=self.get_campaign(request),
            timestamp=datetime.utcnow(),
            page_url=str(request.url),
            referrer=referrer,
            user_agent=user_agent,
            location_data=location_data,
            interaction_type=interaction_type,
            content_id=content_id
        )
        
        # Store touchpoint
        self.store_touchpoint(touchpoint)
        
        return touchpoint
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        forwarded = request.headers.get('x-forwarded-for')
        if forwarded:
            return forwarded.split(',')[0].strip()
        return request.client.host
    
    def get_location_data(self, ip_address: str) -> dict:
        """Get location data from IP address"""
        try:
            response = self.geoip_reader.city(ip_address)
            return {
                'city': response.city.name,
                'region': response.subdivisions.most_specific.name,
                'country': response.country.iso_code,
                'latitude': float(response.location.latitude),
                'longitude': float(response.location.longitude)
            }
        except:
            return {}
    
    def identify_channel(self, request: Request) -> str:
        """Identify marketing channel from request"""
        url = request.url
        utm_source = url.params.get('utm_source')
        utm_medium = url.params.get('utm_medium')
        referrer = request.headers.get('referer', '')
        
        # Channel identification logic (same as client-side)
        if utm_source and utm_medium:
            return self.channel_from_utm(utm_source, utm_medium)
        
        if referrer:
            return self.channel_from_referrer(referrer)
        
        return 'direct'
    
    def store_touchpoint(self, touchpoint: Touchpoint):
        """Store touchpoint in database"""
        # Implementation depends on your database choice
        pass
```

### 3. Cross-Device Tracking

```python
class CrossDeviceTracker:
    """Track customers across devices and browsers"""
    
    def __init__(self):
        self.fingerprint_weights = {
            'email': 0.8,
            'phone': 0.8,
            'name': 0.6,
            'address': 0.7,
            'browser_fingerprint': 0.4,
            'ip_address': 0.3
        }
    
    def identify_customer(self, touchpoint_data: dict, 
                         existing_customers: list) -> str:
        """Identify customer across devices"""
        
        # Try exact matches first
        for customer in existing_customers:
            if self.exact_match(touchpoint_data, customer):
                return customer['id']
        
        # Try probabilistic matching
        best_match = None
        best_score = 0
        
        for customer in existing_customers:
            score = self.calculate_match_score(touchpoint_data, customer)
            if score > best_score and score > 0.7:  # Threshold
                best_score = score
                best_match = customer
        
        return best_match['id'] if best_match else self.create_new_customer(touchpoint_data)
    
    def exact_match(self, touchpoint_data: dict, customer: dict) -> bool:
        """Check for exact identifier matches"""
        exact_fields = ['email', 'phone']
        
        for field in exact_fields:
            if (touchpoint_data.get(field) and 
                customer.get(field) and 
                touchpoint_data[field] == customer[field]):
                return True
        
        return False
    
    def calculate_match_score(self, touchpoint_data: dict, customer: dict) -> float:
        """Calculate probabilistic match score"""
        total_score = 0
        total_weight = 0
        
        for field, weight in self.fingerprint_weights.items():
            if field in touchpoint_data and field in customer:
                similarity = self.calculate_similarity(
                    touchpoint_data[field], 
                    customer[field]
                )
                total_score += similarity * weight
                total_weight += weight
        
        return total_score / total_weight if total_weight > 0 else 0
    
    def calculate_similarity(self, value1: str, value2: str) -> float:
        """Calculate similarity between two values"""
        # Implement similarity calculation (Levenshtein distance, etc.)
        if value1 == value2:
            return 1.0
        
        # Simplified similarity calculation
        if value1 and value2:
            return len(set(value1.lower()) & set(value2.lower())) / len(set(value1.lower()) | set(value2.lower()))
        
        return 0.0
```

## Customer Journey Mapping

### Journey Stages

```python
class CustomerJourney:
    STAGES = {
        'awareness': {
            'touchpoint_types': ['page_view', 'ad_impression', 'social_view'],
            'typical_channels': ['google_ads', 'facebook_ads', 'organic'],
            'conversion_probability': 0.05
        },
        'consideration': {
            'touchpoint_types': ['page_view', 'content_engagement', 'review_read'],
            'typical_channels': ['google_organic', 'review_sites', 'social'],
            'conversion_probability': 0.15
        },
        'intent': {
            'touchpoint_types': ['service_page_view', 'pricing_view', 'contact_form'],
            'typical_channels': ['direct', 'google_organic', 'referral'],
            'conversion_probability': 0.35
        },
        'booking': {
            'touchpoint_types': ['booking_form', 'phone_call', 'walk_in'],
            'typical_channels': ['direct', 'phone', 'walk_in'],
            'conversion_probability': 0.80
        },
        'service': {
            'touchpoint_types': ['appointment_completion', 'payment'],
            'typical_channels': ['in_person'],
            'conversion_probability': 0.95
        },
        'retention': {
            'touchpoint_types': ['review_submission', 'loyalty_signup', 'referral'],
            'typical_channels': ['email', 'sms', 'social'],
            'conversion_probability': 0.25
        }
    }
    
    def __init__(self, customer_id: str):
        self.customer_id = customer_id
        self.touchpoints = []
        self.stage_transitions = []
        self.current_stage = 'awareness'
    
    def add_touchpoint(self, touchpoint: Touchpoint):
        """Add touchpoint and update journey stage"""
        self.touchpoints.append(touchpoint)
        
        # Determine stage from touchpoint
        new_stage = self.determine_stage(touchpoint)
        
        if new_stage != self.current_stage:
            self.stage_transitions.append({
                'from_stage': self.current_stage,
                'to_stage': new_stage,
                'timestamp': touchpoint.timestamp,
                'trigger_touchpoint': touchpoint.to_dict()
            })
            self.current_stage = new_stage
    
    def determine_stage(self, touchpoint: Touchpoint) -> str:
        """Determine customer stage from touchpoint"""
        # Stage determination logic
        interaction_type = touchpoint.interaction_type
        channel = touchpoint.channel
        content_id = touchpoint.content_id
        
        # Booking stage indicators
        if interaction_type in ['booking_form', 'appointment_scheduled']:
            return 'booking'
        
        # Service stage indicators
        if interaction_type in ['appointment_completion', 'payment']:
            return 'service'
        
        # Intent stage indicators
        if (interaction_type == 'page_view' and 
            content_id in ['services', 'pricing', 'booking']):
            return 'intent'
        
        # Consideration stage indicators
        if interaction_type in ['content_engagement', 'review_read']:
            return 'consideration'
        
        # Retention stage indicators
        if interaction_type in ['review_submission', 'loyalty_signup']:
            return 'retention'
        
        # Default to awareness
        return 'awareness'
    
    def get_stage_duration(self, stage: str) -> timedelta:
        """Get time spent in specific stage"""
        stage_touchpoints = [
            t for t in self.touchpoints 
            if self.determine_stage(t) == stage
        ]
        
        if not stage_touchpoints:
            return timedelta(0)
        
        first_touch = min(stage_touchpoints, key=lambda t: t.timestamp)
        last_touch = max(stage_touchpoints, key=lambda t: t.timestamp)
        
        return last_touch.timestamp - first_touch.timestamp
    
    def get_journey_metrics(self) -> dict:
        """Calculate journey metrics"""
        if not self.touchpoints:
            return {}
        
        first_touch = min(self.touchpoints, key=lambda t: t.timestamp)
        last_touch = max(self.touchpoints, key=lambda t: t.timestamp)
        
        return {
            'total_duration': last_touch.timestamp - first_touch.timestamp,
            'total_touchpoints': len(self.touchpoints),
            'unique_channels': len(set(t.channel for t in self.touchpoints)),
            'stage_transitions': len(self.stage_transitions),
            'current_stage': self.current_stage,
            'stage_durations': {
                stage: self.get_stage_duration(stage)
                for stage in self.STAGES.keys()
            }
        }
```

### Journey Visualization

```python
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta

class JourneyVisualizer:
    def __init__(self):
        self.colors = {
            'awareness': '#FF6B6B',
            'consideration': '#4ECDC4',
            'intent': '#45B7D1',
            'booking': '#96CEB4',
            'service': '#FFEAA7',
            'retention': '#DDA0DD'
        }
    
    def plot_journey_timeline(self, journey: CustomerJourney):
        """Create timeline visualization of customer journey"""
        fig, ax = plt.subplots(figsize=(15, 8))
        
        # Plot touchpoints
        for i, touchpoint in enumerate(journey.touchpoints):
            stage = journey.determine_stage(touchpoint)
            ax.scatter(
                touchpoint.timestamp, 
                i, 
                c=self.colors[stage],
                s=100,
                alpha=0.7,
                label=f"{touchpoint.channel} - {touchpoint.interaction_type}"
            )
        
        # Plot stage transitions
        for transition in journey.stage_transitions:
            ax.axvline(
                x=transition['timestamp'],
                color='red',
                linestyle='--',
                alpha=0.5,
                label=f"Stage: {transition['from_stage']} → {transition['to_stage']}"
            )
        
        ax.set_xlabel('Time')
        ax.set_ylabel('Touchpoint Index')
        ax.set_title(f'Customer Journey Timeline - {journey.customer_id}')
        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.tight_layout()
        plt.show()
    
    def plot_channel_attribution(self, attribution_data: dict):
        """Visualize channel attribution"""
        channels = list(attribution_data.keys())
        credits = [data['credit'] for data in attribution_data.values()]
        values = [data['value'] for data in attribution_data.values()]
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Credit distribution
        ax1.pie(credits, labels=channels, autopct='%1.1f%%', startangle=90)
        ax1.set_title('Attribution Credit Distribution')
        
        # Value distribution
        ax2.bar(channels, values, color='skyblue')
        ax2.set_title('Attribution Value Distribution')
        ax2.set_ylabel('Attribution Value ($)')
        ax2.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.show()
    
    def plot_journey_funnel(self, journey_data: list):
        """Create funnel visualization for multiple journeys"""
        stage_counts = {}
        
        for journey in journey_data:
            for stage in journey.STAGES.keys():
                stage_counts[stage] = stage_counts.get(stage, 0) + 1
        
        stages = list(stage_counts.keys())
        counts = list(stage_counts.values())
        
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Create funnel effect
        for i, (stage, count) in enumerate(zip(stages, counts)):
            width = count / max(counts) * 0.8
            ax.barh(
                i, 
                width, 
                color=self.colors[stage],
                alpha=0.7,
                label=f"{stage}: {count}"
            )
        
        ax.set_yticks(range(len(stages)))
        ax.set_yticklabels(stages)
        ax.set_xlabel('Relative Volume')
        ax.set_title('Customer Journey Funnel')
        ax.legend()
        plt.tight_layout()
        plt.show()
```

## ROI Calculation

### Channel ROI Calculation

```python
class ROICalculator:
    def __init__(self):
        self.cost_sources = {
            'google_ads': 'google_ads_api',
            'facebook_ads': 'facebook_ads_api',
            'instagram_ads': 'facebook_ads_api',
            'email': 'email_service_cost',
            'sms': 'sms_service_cost',
            'organic': 'seo_tools_cost'
        }
    
    def calculate_channel_roi(self, channel: str, time_period: dict,
                            attribution_model: str = 'linear') -> dict:
        """Calculate ROI for a specific channel"""
        
        # Get attribution data
        attribution_data = self.get_attribution_data(
            channel, time_period, attribution_model
        )
        
        # Get cost data
        cost_data = self.get_cost_data(channel, time_period)
        
        # Calculate metrics
        total_revenue = sum(attr['value'] for attr in attribution_data.values())
        total_cost = sum(cost_data.values())
        
        roi = (total_revenue - total_cost) / total_cost if total_cost > 0 else 0
        roas = total_revenue / total_cost if total_cost > 0 else 0
        
        return {
            'channel': channel,
            'time_period': time_period,
            'attribution_model': attribution_model,
            'total_revenue': total_revenue,
            'total_cost': total_cost,
            'roi': roi,
            'roas': roas,
            'profit': total_revenue - total_cost,
            'cost_per_conversion': self.calculate_cost_per_conversion(
                channel, time_period
            ),
            'attribution_breakdown': attribution_data
        }
    
    def get_attribution_data(self, channel: str, time_period: dict,
                           attribution_model: str) -> dict:
        """Get attribution data for channel and time period"""
        # Query attribution database
        journeys = self.query_customer_journeys(channel, time_period)
        
        attribution_engine = AttributionEngine()
        model_func = attribution_engine.attribution_models[attribution_model]
        
        total_attribution = {}
        
        for journey in journeys:
            journey_attribution = model_func(journey.touchpoints)
            
            for channel_name, data in journey_attribution.items():
                if channel_name == channel:
                    if channel not in total_attribution:
                        total_attribution[channel] = {
                            'credit': 0,
                            'value': 0,
                            'conversions': 0
                        }
                    
                    total_attribution[channel]['credit'] += data['credit']
                    total_attribution[channel]['value'] += data['value']
                    total_attribution[channel]['conversions'] += 1
        
        return total_attribution
    
    def get_cost_data(self, channel: str, time_period: dict) -> dict:
        """Get cost data for channel and time period"""
        cost_source = self.cost_sources.get(channel)
        
        if cost_source == 'google_ads_api':
            return self.get_google_ads_cost(time_period)
        elif cost_source == 'facebook_ads_api':
            return self.get_facebook_ads_cost(time_period)
        elif cost_source == 'email_service_cost':
            return self.get_email_service_cost(time_period)
        elif cost_source == 'sms_service_cost':
            return self.get_sms_service_cost(time_period)
        else:
            return {'estimated_cost': 0}
    
    def calculate_cost_per_conversion(self, channel: str, time_period: dict) -> float:
        """Calculate cost per conversion for channel"""
        cost_data = self.get_cost_data(channel, time_period)
        total_cost = sum(cost_data.values())
        
        conversions = self.get_conversion_count(channel, time_period)
        
        return total_cost / conversions if conversions > 0 else 0
    
    def calculate_lifetime_value_roi(self, channel: str, time_period: dict) -> dict:
        """Calculate ROI including customer lifetime value"""
        # Get new customers from channel
        new_customers = self.get_new_customers(channel, time_period)
        
        # Calculate average CLV
        avg_clv = self.calculate_average_clv(new_customers)
        
        # Get costs
        cost_data = self.get_cost_data(channel, time_period)
        total_cost = sum(cost_data.values())
        
        # Calculate LTV-based ROI
        total_ltv = len(new_customers) * avg_clv
        ltv_roi = (total_ltv - total_cost) / total_cost if total_cost > 0 else 0
        
        return {
            'channel': channel,
            'time_period': time_period,
            'new_customers': len(new_customers),
            'average_clv': avg_clv,
            'total_ltv': total_ltv,
            'total_cost': total_cost,
            'ltv_roi': ltv_roi,
            'customer_acquisition_cost': total_cost / len(new_customers) if new_customers else 0
        }
    
    def calculate_average_clv(self, customers: list) -> float:
        """Calculate average customer lifetime value"""
        if not customers:
            return 0
        
        total_clv = 0
        for customer in customers:
            # CLV calculation: Average order value × Purchase frequency × Customer lifespan
            avg_order_value = customer.get('avg_order_value', 0)
            purchase_frequency = customer.get('purchase_frequency', 0)
            customer_lifespan = customer.get('customer_lifespan', 1)  # years
            
            clv = avg_order_value * purchase_frequency * customer_lifespan
            total_clv += clv
        
        return total_clv / len(customers)
```

### Multi-Touch ROI Analysis

```python
class MultiTouchROIAnalyzer:
    def __init__(self):
        self.attribution_models = [
            'first_touch',
            'last_touch',
            'linear',
            'time_decay',
            'position_based',
            'data_driven'
        ]
    
    def analyze_multi_model_roi(self, time_period: dict) -> dict:
        """Analyze ROI across multiple attribution models"""
        results = {}
        
        for model in self.attribution_models:
            results[model] = self.calculate_model_roi(model, time_period)
        
        # Calculate model comparison
        model_comparison = self.compare_attribution_models(results)
        
        return {
            'model_results': results,
            'model_comparison': model_comparison,
            'recommended_model': self.recommend_attribution_model(results),
            'insights': self.generate_insights(results)
        }
    
    def calculate_model_roi(self, model: str, time_period: dict) -> dict:
        """Calculate ROI for a specific attribution model"""
        roi_calculator = ROICalculator()
        
        # Get all channels
        channels = self.get_active_channels(time_period)
        
        channel_rois = {}
        for channel in channels:
            channel_roi = roi_calculator.calculate_channel_roi(
                channel, time_period, model
            )
            channel_rois[channel] = channel_roi
        
        # Calculate overall metrics
        total_revenue = sum(roi['total_revenue'] for roi in channel_rois.values())
        total_cost = sum(roi['total_cost'] for roi in channel_rois.values())
        overall_roi = (total_revenue - total_cost) / total_cost if total_cost > 0 else 0
        
        return {
            'model': model,
            'channel_rois': channel_rois,
            'total_revenue': total_revenue,
            'total_cost': total_cost,
            'overall_roi': overall_roi,
            'profit': total_revenue - total_cost
        }
    
    def compare_attribution_models(self, results: dict) -> dict:
        """Compare attribution models"""
        comparison = {}
        
        # Revenue attribution comparison
        revenue_comparison = {}
        for model, data in results.items():
            revenue_comparison[model] = data['total_revenue']
        
        # ROI comparison
        roi_comparison = {}
        for model, data in results.items():
            roi_comparison[model] = data['overall_roi']
        
        # Channel ranking comparison
        channel_ranking = {}
        for model, data in results.items():
            sorted_channels = sorted(
                data['channel_rois'].items(),
                key=lambda x: x[1]['roi'],
                reverse=True
            )
            channel_ranking[model] = [channel for channel, _ in sorted_channels]
        
        return {
            'revenue_comparison': revenue_comparison,
            'roi_comparison': roi_comparison,
            'channel_ranking_comparison': channel_ranking,
            'model_variance': self.calculate_model_variance(results)
        }
    
    def recommend_attribution_model(self, results: dict) -> str:
        """Recommend best attribution model based on business context"""
        # Scoring criteria
        scores = {}
        
        for model, data in results.items():
            score = 0
            
            # Business alignment score
            if model == 'linear':
                score += 2  # Good for balanced view
            elif model == 'position_based':
                score += 2  # Good for discovery and conversion
            elif model == 'time_decay':
                score += 1  # Good for short sales cycles
            
            # Data quality score
            if model == 'data_driven':
                score += 3  # Best if enough data
            
            # Simplicity score
            if model in ['first_touch', 'last_touch']:
                score += 1  # Simple to understand
            
            scores[model] = score
        
        # Return model with highest score
        return max(scores, key=scores.get)
    
    def generate_insights(self, results: dict) -> list:
        """Generate insights from multi-model analysis"""
        insights = []
        
        # Model consistency insight
        roi_values = [data['overall_roi'] for data in results.values()]
        roi_variance = np.var(roi_values)
        
        if roi_variance < 0.1:
            insights.append({
                'type': 'model_consistency',
                'message': 'Attribution models show consistent ROI results',
                'confidence': 'high'
            })
        else:
            insights.append({
                'type': 'model_variance',
                'message': 'Significant variance between attribution models',
                'confidence': 'medium',
                'recommendation': 'Consider data-driven attribution'
            })
        
        # Channel performance insight
        channel_performance = {}
        for model, data in results.items():
            for channel, roi_data in data['channel_rois'].items():
                if channel not in channel_performance:
                    channel_performance[channel] = []
                channel_performance[channel].append(roi_data['roi'])
        
        # Find consistently performing channels
        consistent_performers = []
        for channel, rois in channel_performance.items():
            if all(roi > 0 for roi in rois):
                consistent_performers.append(channel)
        
        if consistent_performers:
            insights.append({
                'type': 'consistent_performers',
                'message': f'Channels with consistent positive ROI: {", ".join(consistent_performers)}',
                'confidence': 'high'
            })
        
        return insights
```

## Reporting & Analytics

### Attribution Dashboard

```python
class AttributionDashboard:
    def __init__(self, time_period: dict):
        self.time_period = time_period
        self.multi_touch_analyzer = MultiTouchROIAnalyzer()
        self.roi_calculator = ROICalculator()
    
    def generate_executive_summary(self) -> dict:
        """Generate executive summary of attribution performance"""
        
        # Multi-model analysis
        multi_model_results = self.multi_touch_analyzer.analyze_multi_model_roi(
            self.time_period
        )
        
        # Channel performance
        channel_performance = self.get_channel_performance()
        
        # Customer journey insights
        journey_insights = self.get_journey_insights()
        
        # ROI trends
        roi_trends = self.get_roi_trends()
        
        return {
            'time_period': self.time_period,
            'overall_performance': {
                'total_revenue': multi_model_results['model_results']['linear']['total_revenue'],
                'total_cost': multi_model_results['model_results']['linear']['total_cost'],
                'overall_roi': multi_model_results['model_results']['linear']['overall_roi'],
                'profit': multi_model_results['model_results']['linear']['profit']
            },
            'top_performing_channels': self.get_top_channels(channel_performance),
            'attribution_insights': multi_model_results['insights'],
            'recommended_model': multi_model_results['recommended_model'],
            'journey_insights': journey_insights,
            'roi_trends': roi_trends,
            'recommendations': self.generate_recommendations(multi_model_results)
        }
    
    def get_channel_performance(self) -> dict:
        """Get detailed channel performance data"""
        channels = self.get_active_channels(self.time_period)
        performance = {}
        
        for channel in channels:
            performance[channel] = self.roi_calculator.calculate_channel_roi(
                channel, self.time_period, 'linear'
            )
        
        return performance
    
    def get_journey_insights(self) -> dict:
        """Get customer journey insights"""
        journeys = self.get_customer_journeys(self.time_period)
        
        if not journeys:
            return {}
        
        # Calculate journey metrics
        avg_touchpoints = sum(len(j.touchpoints) for j in journeys) / len(journeys)
        avg_duration = sum(
            (j.touchpoints[-1].timestamp - j.touchpoints[0].timestamp).total_seconds()
            for j in journeys if j.touchpoints
        ) / len(journeys) / 3600  # Convert to hours
        
        # Common journey patterns
        journey_patterns = self.identify_common_patterns(journeys)
        
        # Stage analysis
        stage_analysis = self.analyze_journey_stages(journeys)
        
        return {
            'total_journeys': len(journeys),
            'avg_touchpoints': avg_touchpoints,
            'avg_duration_hours': avg_duration,
            'common_patterns': journey_patterns,
            'stage_analysis': stage_analysis
        }
    
    def get_roi_trends(self) -> dict:
        """Get ROI trends over time"""
        # Split time period into smaller intervals
        intervals = self.split_time_period(self.time_period, 'weekly')
        
        trends = {}
        for interval in intervals:
            interval_roi = self.roi_calculator.calculate_channel_roi(
                'all', interval, 'linear'
            )
            trends[interval['start']] = interval_roi['roi']
        
        return trends
    
    def generate_recommendations(self, multi_model_results: dict) -> list:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Channel optimization recommendations
        channel_rois = multi_model_results['model_results']['linear']['channel_rois']
        
        # Identify underperforming channels
        underperforming = [
            channel for channel, data in channel_rois.items()
            if data['roi'] < 0
        ]
        
        if underperforming:
            recommendations.append({
                'type': 'channel_optimization',
                'priority': 'high',
                'message': f'Consider reducing spend on underperforming channels: {", ".join(underperforming)}',
                'expected_impact': 'cost_reduction'
            })
        
        # Identify high-performing channels for scaling
        high_performing = [
            channel for channel, data in channel_rois.items()
            if data['roi'] > 2.0  # 200% ROI
        ]
        
        if high_performing:
            recommendations.append({
                'type': 'channel_scaling',
                'priority': 'high',
                'message': f'Consider increasing spend on high-performing channels: {", ".join(high_performing)}',
                'expected_impact': 'revenue_growth'
            })
        
        # Attribution model recommendation
        recommendations.append({
            'type': 'attribution_model',
            'priority': 'medium',
            'message': f'Recommended attribution model: {multi_model_results["recommended_model"]}',
            'expected_impact': 'improved_measurement'
        })
        
        return recommendations
```

### Automated Reporting

```python
class AutomatedReporting:
    def __init__(self):
        self.dashboard = None
        self.email_service = EmailService()
        self.slack_service = SlackService()
    
    def generate_weekly_report(self):
        """Generate and send weekly attribution report"""
        # Define time period (last 7 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        time_period = {
            'start': start_date,
            'end': end_date
        }
        
        # Generate dashboard
        self.dashboard = AttributionDashboard(time_period)
        summary = self.dashboard.generate_executive_summary()
        
        # Create report
        report = self.format_weekly_report(summary)
        
        # Send via email
        self.send_email_report(report)
        
        # Send Slack notification
        self.send_slack_notification(summary)
    
    def format_weekly_report(self, summary: dict) -> str:
        """Format weekly report as HTML"""
        html_template = """
        <html>
        <head>
            <title>Weekly Attribution Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .positive { color: #28a745; }
                .negative { color: #dc3545; }
                .channel-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .channel-table th, .channel-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .channel-table th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Weekly Attribution Report</h1>
            <p>Period: {start_date} to {end_date}</p>
            
            <h2>Overall Performance</h2>
            <div class="metric">
                <strong>Total Revenue:</strong> ${total_revenue:,.2f}
            </div>
            <div class="metric">
                <strong>Total Cost:</strong> ${total_cost:,.2f}
            </div>
            <div class="metric">
                <strong>Overall ROI:</strong> 
                <span class="{roi_class}">{overall_roi:.1%}</span>
            </div>
            <div class="metric">
                <strong>Profit:</strong> 
                <span class="{profit_class}">${profit:,.2f}</span>
            </div>
            
            <h2>Top Performing Channels</h2>
            <table class="channel-table">
                <tr>
                    <th>Channel</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>ROI</th>
                    <th>Profit</th>
                </tr>
                {channel_rows}
            </table>
            
            <h2>Key Insights</h2>
            <ul>
                {insights}
            </ul>
            
            <h2>Recommendations</h2>
            <ul>
                {recommendations}
            </ul>
        </body>
        </html>
        """
        
        # Format data
        overall = summary['overall_performance']
        
        # Channel table rows
        channel_rows = ""
        for channel, data in summary['top_performing_channels'].items():
            channel_rows += f"""
            <tr>
                <td>{channel}</td>
                <td>${data['total_revenue']:,.2f}</td>
                <td>${data['total_cost']:,.2f}</td>
                <td class="{'positive' if data['roi'] > 0 else 'negative'}">{data['roi']:.1%}</td>
                <td class="{'positive' if data['profit'] > 0 else 'negative'}">${data['profit']:,.2f}</td>
            </tr>
            """
        
        # Insights list
        insights = ""
        for insight in summary['attribution_insights']:
            insights += f"<li>{insight['message']}</li>"
        
        # Recommendations list
        recommendations = ""
        for rec in summary['recommendations']:
            recommendations += f"<li><strong>{rec['priority'].upper()}:</strong> {rec['message']}</li>"
        
        return html_template.format(
            start_date=summary['time_period']['start'].strftime('%Y-%m-%d'),
            end_date=summary['time_period']['end'].strftime('%Y-%m-%d'),
            total_revenue=overall['total_revenue'],
            total_cost=overall['total_cost'],
            overall_roi=overall['overall_roi'],
            roi_class='positive' if overall['overall_roi'] > 0 else 'negative',
            profit=overall['profit'],
            profit_class='positive' if overall['profit'] > 0 else 'negative',
            channel_rows=channel_rows,
            insights=insights,
            recommendations=recommendations
        )
    
    def send_email_report(self, report_html: str):
        """Send email report"""
        self.email_service.send_email(
            to=['owner@barbershop.com', 'manager@barbershop.com'],
            subject='Weekly Attribution Report',
            html_content=report_html
        )
    
    def send_slack_notification(self, summary: dict):
        """Send Slack notification"""
        overall = summary['overall_performance']
        
        message = f"""
        📊 *Weekly Attribution Report*
        
        *Overall Performance:*
        • Revenue: ${overall['total_revenue']:,.2f}
        • ROI: {overall['overall_roi']:.1%}
        • Profit: ${overall['profit']:,.2f}
        
        *Top Recommendations:*
        {chr(10).join(f"• {rec['message']}" for rec in summary['recommendations'][:3])}
        
        Full report sent via email.
        """
        
        self.slack_service.send_message(
            channel='#marketing-reports',
            message=message
        )
```

## Implementation Details

### Database Schema

```sql
-- Customer touchpoints table
CREATE TABLE touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    session_id VARCHAR(255),
    channel VARCHAR(100) NOT NULL,
    source VARCHAR(255),
    medium VARCHAR(100),
    campaign VARCHAR(255),
    content_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    location_data JSONB,
    interaction_type VARCHAR(100),
    interaction_value DECIMAL(10,2) DEFAULT 0,
    conversion_value DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer journeys table
CREATE TABLE customer_journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    journey_start TIMESTAMP WITH TIME ZONE NOT NULL,
    journey_end TIMESTAMP WITH TIME ZONE,
    current_stage VARCHAR(50),
    total_touchpoints INTEGER DEFAULT 0,
    unique_channels INTEGER DEFAULT 0,
    conversion_value DECIMAL(10,2) DEFAULT 0,
    is_converted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attribution results table
CREATE TABLE attribution_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID REFERENCES customer_journeys(id),
    attribution_model VARCHAR(50) NOT NULL,
    channel VARCHAR(100) NOT NULL,
    credit_percentage DECIMAL(5,4) NOT NULL,
    attributed_value DECIMAL(10,2) NOT NULL,
    touchpoint_count INTEGER NOT NULL,
    calculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketing costs table
CREATE TABLE marketing_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    cost_amount DECIMAL(10,2) NOT NULL,
    cost_currency VARCHAR(3) DEFAULT 'USD',
    campaign_id VARCHAR(255),
    campaign_name VARCHAR(255),
    cost_type VARCHAR(50), -- 'cpc', 'cpm', 'fixed', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel, date, campaign_id)
);

-- Indexes for performance
CREATE INDEX idx_touchpoints_customer_id ON touchpoints(customer_id);
CREATE INDEX idx_touchpoints_timestamp ON touchpoints(timestamp);
CREATE INDEX idx_touchpoints_channel ON touchpoints(channel);
CREATE INDEX idx_touchpoints_conversion ON touchpoints(conversion_value) WHERE conversion_value > 0;

CREATE INDEX idx_journeys_customer_id ON customer_journeys(customer_id);
CREATE INDEX idx_journeys_dates ON customer_journeys(journey_start, journey_end);
CREATE INDEX idx_journeys_converted ON customer_journeys(is_converted) WHERE is_converted = TRUE;

CREATE INDEX idx_attribution_journey_id ON attribution_results(journey_id);
CREATE INDEX idx_attribution_model_channel ON attribution_results(attribution_model, channel);
CREATE INDEX idx_attribution_calc_date ON attribution_results(calculation_date);

CREATE INDEX idx_costs_channel_date ON marketing_costs(channel, date);
```

### API Endpoints

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/attribution", tags=["attribution"])

@router.post("/touchpoint")
async def create_touchpoint(
    touchpoint_data: TouchpointCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new touchpoint"""
    touchpoint = TouchpointService.create_touchpoint(touchpoint_data)
    return {"touchpoint_id": touchpoint.id}

@router.get("/customer/{customer_id}/journey")
async def get_customer_journey(
    customer_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get customer journey with all touchpoints"""
    journey = JourneyService.get_customer_journey(customer_id)
    return journey

@router.get("/attribution/{journey_id}")
async def get_attribution_results(
    journey_id: str,
    model: str = Query("linear", description="Attribution model"),
    current_user: User = Depends(get_current_user)
):
    """Get attribution results for a journey"""
    attribution = AttributionService.calculate_attribution(journey_id, model)
    return attribution

@router.get("/channels/performance")
async def get_channel_performance(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    model: str = Query("linear"),
    current_user: User = Depends(get_current_user)
):
    """Get channel performance for date range"""
    performance = PerformanceService.get_channel_performance(
        start_date, end_date, model
    )
    return performance

@router.get("/roi/analysis")
async def get_roi_analysis(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    channels: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive ROI analysis"""
    analysis = ROIService.get_roi_analysis(start_date, end_date, channels)
    return analysis

@router.post("/costs/upload")
async def upload_marketing_costs(
    cost_data: List[MarketingCostCreate],
    current_user: User = Depends(get_current_user)
):
    """Upload marketing cost data"""
    results = CostService.upload_costs(cost_data)
    return {"uploaded": len(results)}

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard summary for date range"""
    summary = DashboardService.get_summary(start_date, end_date)
    return summary
```

## Best Practices

### 1. Data Quality Management

```python
class DataQualityManager:
    def __init__(self):
        self.validation_rules = {
            'required_fields': ['customer_id', 'channel', 'timestamp'],
            'valid_channels': [
                'google_ads', 'facebook_ads', 'instagram_ads', 'email',
                'sms', 'organic', 'direct', 'referral', 'yelp'
            ],
            'valid_interaction_types': [
                'page_view', 'click', 'form_submit', 'booking_start',
                'booking_complete', 'payment', 'review_submit'
            ]
        }
    
    def validate_touchpoint(self, touchpoint_data: dict) -> dict:
        """Validate touchpoint data quality"""
        errors = []
        warnings = []
        
        # Required fields check
        for field in self.validation_rules['required_fields']:
            if field not in touchpoint_data or not touchpoint_data[field]:
                errors.append(f"Missing required field: {field}")
        
        # Valid channel check
        channel = touchpoint_data.get('channel')
        if channel and channel not in self.validation_rules['valid_channels']:
            warnings.append(f"Unknown channel: {channel}")
        
        # Valid interaction type check
        interaction_type = touchpoint_data.get('interaction_type')
        if (interaction_type and 
            interaction_type not in self.validation_rules['valid_interaction_types']):
            warnings.append(f"Unknown interaction type: {interaction_type}")
        
        # Timestamp validation
        timestamp = touchpoint_data.get('timestamp')
        if timestamp:
            try:
                ts = datetime.fromisoformat(timestamp)
                if ts > datetime.now():
                    errors.append("Timestamp cannot be in the future")
            except ValueError:
                errors.append("Invalid timestamp format")
        
        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }
    
    def clean_touchpoint_data(self, touchpoint_data: dict) -> dict:
        """Clean and normalize touchpoint data"""
        cleaned = touchpoint_data.copy()
        
        # Normalize channel names
        channel = cleaned.get('channel', '').lower()
        channel_mapping = {
            'google ads': 'google_ads',
            'facebook ads': 'facebook_ads',
            'instagram ads': 'instagram_ads',
            'organic search': 'organic',
            'direct traffic': 'direct'
        }
        cleaned['channel'] = channel_mapping.get(channel, channel)
        
        # Normalize URLs
        if 'page_url' in cleaned:
            cleaned['page_url'] = self.normalize_url(cleaned['page_url'])
        if 'referrer' in cleaned:
            cleaned['referrer'] = self.normalize_url(cleaned['referrer'])
        
        # Clean customer ID
        if 'customer_id' in cleaned:
            cleaned['customer_id'] = str(cleaned['customer_id']).strip()
        
        return cleaned
    
    def normalize_url(self, url: str) -> str:
        """Normalize URL for consistent tracking"""
        if not url:
            return ''
        
        # Remove tracking parameters
        tracking_params = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
            'gclid', 'fbclid', 'msclkid', '_ga', '_gid'
        ]
        
        try:
            parsed = urlparse(url)
            query_params = parse_qs(parsed.query)
            
            # Remove tracking parameters
            cleaned_params = {
                k: v for k, v in query_params.items()
                if k not in tracking_params
            }
            
            # Rebuild URL
            cleaned_query = urlencode(cleaned_params, doseq=True)
            cleaned_url = urlunparse((
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                cleaned_query,
                parsed.fragment
            ))
            
            return cleaned_url
        except:
            return url
```

### 2. Performance Optimization

```python
class AttributionPerformanceOptimizer:
    def __init__(self):
        self.cache = CacheService()
        self.batch_size = 1000
    
    def optimize_attribution_calculation(self, journey_ids: List[str]) -> dict:
        """Optimize attribution calculation for multiple journeys"""
        
        # Batch process journeys
        batches = [
            journey_ids[i:i + self.batch_size]
            for i in range(0, len(journey_ids), self.batch_size)
        ]
        
        results = {}
        
        for batch in batches:
            batch_results = self.calculate_batch_attribution(batch)
            results.update(batch_results)
        
        return results
    
    def calculate_batch_attribution(self, journey_ids: List[str]) -> dict:
        """Calculate attribution for a batch of journeys"""
        # Load all journeys at once
        journeys = JourneyService.get_journeys_batch(journey_ids)
        
        # Group by attribution model for efficient calculation
        attribution_results = {}
        
        for journey in journeys:
            # Check cache first
            cache_key = f"attribution_{journey.id}_linear"
            cached_result = self.cache.get(cache_key)
            
            if cached_result:
                attribution_results[journey.id] = cached_result
                continue
            
            # Calculate attribution
            engine = AttributionEngine()
            attribution = engine.linear_attribution(journey.touchpoints)
            
            # Cache result
            self.cache.set(cache_key, attribution, ttl=3600)
            attribution_results[journey.id] = attribution
        
        return attribution_results
    
    def precompute_attribution_results(self):
        """Precompute attribution results for common queries"""
        # Get active journeys
        active_journeys = JourneyService.get_active_journeys()
        
        # Precompute for all models
        models = ['linear', 'first_touch', 'last_touch', 'position_based']
        
        for journey in active_journeys:
            for model in models:
                cache_key = f"attribution_{journey.id}_{model}"
                
                if not self.cache.exists(cache_key):
                    engine = AttributionEngine()
                    attribution = engine.attribution_models[model](journey.touchpoints)
                    self.cache.set(cache_key, attribution, ttl=3600)
```

### 3. Privacy and Compliance

```python
class PrivacyManager:
    def __init__(self):
        self.retention_periods = {
            'touchpoints': 365,  # days
            'journeys': 730,     # days
            'attribution_results': 1095  # days
        }
    
    def anonymize_customer_data(self, customer_id: str):
        """Anonymize customer data while preserving attribution"""
        # Create anonymous ID
        anonymous_id = self.generate_anonymous_id(customer_id)
        
        # Update touchpoints
        TouchpointService.anonymize_customer_touchpoints(
            customer_id, anonymous_id
        )
        
        # Update journeys
        JourneyService.anonymize_customer_journeys(
            customer_id, anonymous_id
        )
        
        # Update attribution results
        AttributionService.anonymize_customer_attribution(
            customer_id, anonymous_id
        )
        
        return anonymous_id
    
    def delete_customer_data(self, customer_id: str):
        """Delete all customer attribution data"""
        # Delete touchpoints
        TouchpointService.delete_customer_touchpoints(customer_id)
        
        # Delete journeys
        JourneyService.delete_customer_journeys(customer_id)
        
        # Delete attribution results
        AttributionService.delete_customer_attribution(customer_id)
    
    def cleanup_expired_data(self):
        """Clean up expired data based on retention periods"""
        current_date = datetime.now()
        
        # Clean up touchpoints
        touchpoint_cutoff = current_date - timedelta(
            days=self.retention_periods['touchpoints']
        )
        TouchpointService.delete_old_touchpoints(touchpoint_cutoff)
        
        # Clean up journeys
        journey_cutoff = current_date - timedelta(
            days=self.retention_periods['journeys']
        )
        JourneyService.delete_old_journeys(journey_cutoff)
        
        # Clean up attribution results
        attribution_cutoff = current_date - timedelta(
            days=self.retention_periods['attribution_results']
        )
        AttributionService.delete_old_attribution_results(attribution_cutoff)
    
    def generate_anonymous_id(self, customer_id: str) -> str:
        """Generate anonymous ID for customer"""
        # Use hash of customer ID + salt
        import hashlib
        salt = "attribution_anonymization_salt"
        hash_input = f"{customer_id}{salt}".encode()
        return hashlib.sha256(hash_input).hexdigest()[:16]
```

## Conclusion

BookedBarber's attribution model provides a comprehensive framework for understanding customer journeys and measuring marketing ROI in the barbershop industry. The multi-touch attribution system accounts for the unique characteristics of barbershop customers, including:

- **Local search behavior** - Heavy reliance on Google My Business and local SEO
- **Social proof importance** - Reviews and referrals play crucial roles
- **Relationship-based business** - Long-term customer relationships affect attribution
- **Seasonal patterns** - Holiday and back-to-school booking patterns
- **Mobile-first experience** - High mobile usage for booking and discovery

The system provides actionable insights through:
- **Multiple attribution models** for different business questions
- **Real-time tracking** of customer touchpoints
- **Automated ROI calculation** with cost data integration
- **Privacy-compliant** data handling
- **Scalable architecture** for growing businesses

By implementing this attribution model, barbershops can:
- Optimize marketing spend across channels
- Understand true customer acquisition costs
- Improve customer journey experiences
- Make data-driven marketing decisions
- Demonstrate marketing ROI to stakeholders

This documentation serves as a complete guide for implementing, maintaining, and optimizing the attribution system in BookedBarber V2.