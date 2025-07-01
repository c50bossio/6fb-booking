# 6FB Booking Platform - Product Requirements Document (PRD)

**Last Updated**: 2025-06-29
**Version**: 2.0
**Status**: Active Development

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [Core Components](#core-components)
   - [Foundation & Core Dashboard](#1-foundation--core-dashboard)
   - [Trafft Integration & Real-time Sync](#2-trafft-integration--real-time-sync)
   - [Automation Engine](#3-automation-engine)
   - [Admin & Mentor Portal](#4-admin--mentor-portal)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [Integration Points](#integration-points)
8. [Performance Metrics](#performance-metrics)
9. [Security & Compliance](#security--compliance)
10. [Development Phases](#development-phases)
11. [Success Metrics](#success-metrics)
12. [Future Enhancements](#future-enhancements)
13. [Technology Stack](#technology-stack)
14. [Testing Strategy](#testing-strategy)
15. [Documentation](#documentation)
16. [Support & Maintenance](#support--maintenance)
17. [Related Specifications](#related-specifications)

## Executive Summary

The 6FB (Six Figure Barber) Platform is a comprehensive business management system designed to help barbershops achieve six-figure revenue through data-driven insights, automation, and mentorship. The platform integrates with existing booking systems, provides advanced analytics, and includes training and certification programs.

## Product Vision

Transform the barbering industry by providing a complete business management platform that enables barbers to scale their businesses to six-figure revenues through:
- Data-driven decision making
- Automated workflows
- Professional development
- Mentorship programs
- Multi-location management

## Core Components

### 1. Foundation & Core Dashboard
**Purpose**: Centralized analytics and business intelligence

**Key Features**:
- Real-time revenue tracking
- Appointment analytics
- Client retention metrics
- 6FB Score calculation (booking utilization, revenue growth, customer retention, average ticket, service quality)
- Role-based dashboards (Admin, Mentor, Barber, Staff)

**Technical Implementation**:
- FastAPI backend with SQLAlchemy ORM
- Next.js 14 frontend with TypeScript
- JWT-based authentication
- SQLite for development, PostgreSQL for production

### 2. Trafft Integration & Real-time Sync
**Purpose**: Seamless integration with existing booking systems

**Key Features**:
- Webhook-based real-time sync
- Two-way data synchronization
- Appointment data mapping
- Client information sync
- Service catalog integration

**Technical Implementation**:
- Trafft API client service
- Webhook handlers for real-time updates
- Data mapping layer
- Sync status dashboard

### 3. Automation Engine
**Purpose**: Streamline operations and improve efficiency

**Key Features**:
- Client follow-up automation
- Performance alerts
- Smart scheduling recommendations
- Automated reporting
- Custom workflow builder

**Automation Types**:
- Time-based triggers (cron schedules)
- Event-based triggers (appointment completion, no-shows)
- Metric-based triggers (performance thresholds)

### 4. Admin & Mentor Portal
**Purpose**: Multi-location management and oversight

**Key Features**:
- Location management dashboard
- Mentor assignment and tracking
- Team performance analytics
- Training program management
- Revenue sharing calculations
- RBAC (Role-Based Access Control)

## User Roles & Permissions

### 1. Super Admin
- Full system access
- Network-wide analytics
- All location management
- User management
- System configuration

### 2. Admin
- Location-specific management
- Staff management
- Local analytics
- Training oversight

### 3. Mentor
- Multi-location oversight
- Barber performance tracking
- Training delivery
- Certification management

### 4. Barber
- Personal dashboard
- Client management
- Appointment tracking
- Training access
- Performance metrics

### 5. Staff
- Basic appointment access
- Client check-in
- Limited reporting

## Compensation Models

### Flexible Compensation Support
The platform adapts to various barbershop compensation structures, with analytics and dashboards that automatically adjust to reflect the chosen model:

#### 1. Booth/Chair Rental Model
- **Structure**: Fixed monthly/weekly rental fees per chair/booth
- **Revenue**: Barbers keep 100% of service revenue after rental
- **Dashboard Metrics**:
  - Rental payment status and history
  - Net profit calculations (revenue minus rental)
  - Break-even analysis and targets
  - Chair utilization rates
  - Vacancy cost tracking
  - ROI per chair/booth

#### 2. Commission-Based Model
- **Structure**: Percentage-based revenue sharing
- **Revenue**: Shop receives percentage of barber's revenue
- **Dashboard Metrics**:
  - Gross revenue vs. net earnings
  - Real-time commission calculations
  - Performance-based tier progression
  - Service-level commission breakdown
  - Comparative commission analysis
  - Retention bonus tracking

#### 3. Hybrid Model
- **Structure**: Base rental plus commission above threshold
- **Revenue**: Combined fixed and variable components
- **Dashboard Metrics**:
  - Base rental obligations
  - Commission on revenue above threshold
  - Optimal revenue target zones
  - Model efficiency comparison
  - Threshold visualization
  - Dual metric tracking

#### 4. Custom Models
- **Structure**: Fully configurable compensation rules
- **Features**:
  - Multi-tier commission structures
  - Time-based rate adjustments (new barber rates)
  - Performance incentives
  - Special arrangements and overrides
  - Seasonal adjustments

### Compensation Analytics Features
- **Model Comparison**: Side-by-side analysis of different compensation structures
- **Profitability Analysis**: Net revenue impact by model type
- **Barber Satisfaction**: Retention metrics correlated with compensation model
- **Optimization Recommendations**: AI-driven suggestions for model improvements
- **Historical Tracking**: Model performance over time

## Data Models

### Core Entities
1. **User**: Authentication and role management
2. **Location**: Barbershop locations with business details
3. **Barber**: Professional profiles and performance data
4. **Client**: Customer information and visit history
5. **Appointment**: Booking details and revenue data
6. **SixFBScore**: Performance metrics and calculations
7. **Training**: Modules, certifications, and progress
8. **AutomationRule**: Workflow automation configuration
9. **RevenueShare**: Commission and payout tracking
10. **CompensationPlan**: Flexible compensation model configurations
11. **PayoutRule**: Dynamic payout calculations based on model
12. **RevenueAllocation**: Revenue distribution tracking by model type
13. **ChairInventory**: Chair/booth tracking for rental models

## API Endpoints

### Authentication
- `POST /api/v1/auth/token` - Login
- `GET /api/v1/auth/me` - Current user
- `POST /api/v1/auth/refresh` - Refresh token

### Core Resources
- `/api/v1/users` - User management
- `/api/v1/locations` - Location management
- `/api/v1/barbers` - Barber profiles
- `/api/v1/appointments` - Appointment data
- `/api/v1/analytics` - Analytics endpoints
- `/api/v1/training` - Training management
- `/api/v1/automation` - Automation rules
- `/api/v1/revenue` - Revenue tracking
- `/api/v1/compensation` - Compensation plan management
- `/api/v1/compensation/calculate` - Dynamic calculation engine
- `/api/v1/analytics/compensation` - Model-specific analytics
- `/api/v1/analytics/enterprise` - Enterprise-level aggregated analytics

## Integration Points

### 1. Trafft Booking System
- Webhook endpoints for real-time updates
- API integration for data sync
- Service mapping
- Client synchronization

### 2. Payment Systems
- Commission calculations
- Payout tracking
- Financial reporting

### 3. Communication Channels
- SMS notifications (Twilio)
- Email notifications (SendGrid)
- In-app notifications

## Performance Metrics

### 6FB Score Components
1. **Booking Utilization** (25%)
   - Target: 85%+ capacity
   - Calculation: Actual appointments / Available slots

2. **Revenue Growth** (20%)
   - Month-over-month growth
   - Year-over-year comparisons

3. **Customer Retention** (20%)
   - Returning customer percentage
   - Visit frequency tracking

4. **Average Ticket** (20%)
   - Service revenue per appointment
   - Upsell tracking

5. **Service Quality** (15%)
   - Based on tips percentage
   - Client satisfaction metrics

## Security & Compliance

### Authentication
- JWT tokens with refresh mechanism
- Role-based access control
- Session management
- Password hashing (bcrypt)

### Data Protection
- Encrypted sensitive data
- HTTPS only
- API rate limiting
- Input validation

### Compliance
- GDPR compliance for EU clients
- PCI compliance for payment data
- Data retention policies

## Development Phases

### Phase 1: Foundation (Complete)
- Core authentication system
- Basic dashboard
- Database schema
- User management

### Phase 2: Trafft Integration (Complete)
- API client implementation
- Webhook handlers
- Data synchronization
- Integration dashboard

### Phase 3: Automation (Complete)
- Automation engine
- Rule builder
- Workflow execution
- Performance monitoring

### Phase 4: Admin Portal (Complete)
- Multi-location management
- Mentor dashboards
- Training system
- Revenue sharing

### Phase 5: Backend-Frontend Integration (Complete)
- API implementation
- Authentication flow
- Real-time updates
- Error handling

### Phase 6: Payment Integration (Complete)
- Stripe Connect integration
- Payment processing
- Payout system
- Commission tracking
- Payment security

### Phase 7: Testing & Optimization (In Progress)
- Unit testing coverage (80%+ target)
- Integration testing
- Performance optimization (65% improvement achieved)
- Security audit
- Load testing

### Phase 8: Production Deployment (In Progress)
- Railway deployment configuration
- Environment management
- CI/CD pipeline setup
- Monitoring and alerting
- Backup and recovery procedures

### Phase 9: V2 Clean Architecture (In Progress)
- Clean codebase implementation
- Enhanced testing framework
- Improved authentication with refresh tokens
- Rate limiting implementation
- Duplication prevention system

### Phase 10: Enterprise Hierarchical Dashboard (In Progress)
- Multi-location enterprise dashboard
- Hierarchical navigation (Enterprise → Barbershop → Barber)
- Aggregated KPIs across all locations
- Chair inventory tracking
- Location performance matrix
- Real-time occupancy monitoring
- Compensation model configuration per location
- Dynamic KPI adjustment based on compensation type
- Model-specific performance metrics
- Revenue allocation visualization
- Flexible dashboard views by compensation model

### Phase 11: Production Launch
- Production setup
- CI/CD pipeline
- Monitoring setup
- Documentation

## Success Metrics

### Business Metrics
- Number of active locations
- Average revenue per location
- Barber retention rate
- Training completion rate

### Technical Metrics
- API response time < 200ms
- 99.9% uptime
- Zero security breaches
- < 1% error rate

## Future Enhancements

### V2 Features
- Mobile application
- Advanced AI recommendations
- Predictive analytics
- Inventory management
- Client mobile app
- Advanced reporting builder

### V3 Features
- Franchise management tools
- Financial planning tools
- Marketing automation
- Competitive analysis
- Industry benchmarking

## Technology Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLAlchemy ORM with SQLite/PostgreSQL
- **Authentication**: JWT with refresh tokens
- **API Documentation**: OpenAPI/Swagger

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **UI Library**: Tailwind CSS + shadcn/ui
- **State Management**: React Context + Hooks
- **API Client**: Axios with interceptors

### Infrastructure
- **Development**: Local SQLite
- **Production**: PostgreSQL on Railway/Render
- **Deployment**: Railway (primary), Docker support
- **Monitoring**: Sentry for error tracking
- **Current Production**: https://web-production-92a6c.up.railway.app

## Testing Strategy

### Unit Tests
- Model validation
- Service logic
- API endpoints
- Frontend components

### Integration Tests
- API workflows
- Database operations
- External integrations
- Authentication flow

### E2E Tests
- User journeys
- Critical paths
- Cross-browser testing

## Documentation

### Technical Documentation
- API documentation (auto-generated)
- Database schema
- Integration guides
- Deployment guide

### User Documentation
- User manual
- Training materials
- Video tutorials
- FAQ section

## Support & Maintenance

### Support Levels
- **Critical**: < 1 hour response
- **High**: < 4 hours response
- **Medium**: < 1 business day
- **Low**: < 3 business days

### Maintenance Windows
- Scheduled: Sunday 2-4 AM EST
- Emergency: As needed with notification

## Related Specifications

### Technical Specifications
- **Demo Flow**: See [`DEMO_FLOW_SPECIFICATION.md`](./DEMO_FLOW_SPECIFICATION.md) for demo mode implementation details
- **API Documentation**: See [`docs/API_DOCUMENTATION.md`](./docs/API_DOCUMENTATION.md) for detailed API specifications
- **Trafft Integration**: See [`TRAFFT_INTEGRATION_DOCUMENTATION.md`](./TRAFFT_INTEGRATION_DOCUMENTATION.md) for integration details
- **Payout System**: See [`backend/PAYOUT_API_DOCUMENTATION.md`](./backend/PAYOUT_API_DOCUMENTATION.md) for payout implementation

### Project Management
- **Current Status**: See [`backend-v2/PROJECT_STATUS.md`](./backend-v2/PROJECT_STATUS.md) for real-time development status
- **Claude Guidelines**: See [`CLAUDE.md`](./CLAUDE.md) for AI assistant instructions
- **V2 Guidelines**: See [`backend-v2/CLAUDE.md`](./backend-v2/CLAUDE.md) for V2-specific development guidelines

### Additional Resources
- **Performance Baseline**: See [`monitoring/PERFORMANCE_BASELINE_DOCUMENTATION.md`](./monitoring/PERFORMANCE_BASELINE_DOCUMENTATION.md)
- **Payment System**: See [`backend-v2/PAYMENT_SYSTEM_DOCUMENTATION.md`](./backend-v2/PAYMENT_SYSTEM_DOCUMENTATION.md)
- **Notification System**: See [`backend-v2/NOTIFICATION_SYSTEM_DOCUMENTATION.md`](./backend-v2/NOTIFICATION_SYSTEM_DOCUMENTATION.md)

## Conclusion

The 6FB Platform represents a comprehensive solution for barbershop management, combining booking integration, analytics, automation, and training into a single platform. By following this PRD, we ensure consistent development, clear communication, and successful delivery of a platform that helps barbers achieve six-figure revenues.

---

*This document is the primary source of truth for product requirements. For implementation details and technical specifications, refer to the linked documents above.*
