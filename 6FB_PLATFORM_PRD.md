# 6FB Booking Platform - Product Requirements Document (PRD)

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

### Phase 6: Testing & Optimization (Next)
- Unit testing
- Integration testing
- Performance optimization
- Security audit

### Phase 7: Deployment
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
- **Production**: PostgreSQL
- **Deployment**: Docker + Kubernetes
- **Monitoring**: Prometheus + Grafana

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

## Conclusion

The 6FB Platform represents a comprehensive solution for barbershop management, combining booking integration, analytics, automation, and training into a single platform. By following this PRD, we ensure consistent development, clear communication, and successful delivery of a platform that helps barbers achieve six-figure revenues.