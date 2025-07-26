#!/usr/bin/env python3
"""
Architecture Documentation and Diagram Generation System

This module provides comprehensive architecture documentation generation,
including C4 model diagrams, API documentation, database schemas,
and implementation guides for BookedBarber V2.
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import re
from datetime import datetime

class DiagramType(Enum):
    """Types of architecture diagrams"""
    SYSTEM_CONTEXT = "system_context"
    CONTAINER_DIAGRAM = "container_diagram"
    COMPONENT_DIAGRAM = "component_diagram"
    CODE_DIAGRAM = "code_diagram"
    DEPLOYMENT_DIAGRAM = "deployment_diagram"
    SEQUENCE_DIAGRAM = "sequence_diagram"
    DATABASE_SCHEMA = "database_schema"
    API_FLOW = "api_flow"

@dataclass
class DiagramContent:
    """Content for architecture diagrams"""
    diagram_type: DiagramType
    title: str
    description: str
    mermaid_content: str
    c4_content: Optional[str] = None
    plantuml_content: Optional[str] = None
    metadata: Dict[str, Any] = None

class ArchitectureDocumentationGenerator:
    """
    Comprehensive architecture documentation and diagram generator
    """
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.docs_dir = project_root / ".claude" / "architecture-docs"
        self.diagrams_dir = project_root / ".claude" / "architecture-diagrams"
        
        # Create directories
        self.docs_dir.mkdir(parents=True, exist_ok=True)
        self.diagrams_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize documentation templates
        self.documentation_templates = self._initialize_documentation_templates()
    
    def generate_system_overview_documentation(self) -> str:
        """Generate comprehensive system overview documentation"""
        doc_content = f"""
# BookedBarber V2 System Architecture Documentation

**Generated on**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Executive Summary

BookedBarber V2 is a comprehensive barbershop management platform built on clean architecture principles, designed to support the Six Figure Barber methodology. The system provides enterprise-grade scalability, real-time booking capabilities, and integrated payment processing.

## System Overview

### Core Business Domains
- **Booking Engine**: Real-time appointment scheduling and availability management
- **Payment Processing**: Stripe Connect integration with automatic commission handling
- **User Management**: Multi-role authentication and authorization system
- **Analytics Engine**: Revenue tracking and business intelligence
- **Franchise Management**: Multi-location enterprise support
- **Marketing Integrations**: Google My Business and review management

### Technology Stack

#### Backend Architecture
- **Framework**: FastAPI (Python 3.9+)
- **Database**: PostgreSQL with Redis caching
- **ORM**: SQLAlchemy with Alembic migrations
- **Authentication**: JWT tokens with refresh mechanism
- **API Design**: RESTful with OpenAPI documentation

#### Frontend Architecture
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query for server state
- **Build System**: Next.js with ESLint and TypeScript

#### Infrastructure
- **Deployment**: Docker containers on Render/Railway
- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis for session and data caching
- **File Storage**: Local storage with S3 support
- **Monitoring**: Comprehensive logging and metrics

### Six Figure Barber Methodology Alignment

The architecture directly supports the Six Figure Barber principles:

1. **Revenue Optimization**: Commission tracking, premium pricing, upselling features
2. **Client Value Creation**: Enhanced booking experience, preference tracking
3. **Business Efficiency**: Automated workflows, integrated systems
4. **Professional Growth**: Analytics dashboards, performance metrics
5. **Brand Building**: Marketing integrations, online presence management
6. **Scalability**: Multi-location support, franchise management

## System Context Diagram

{self._generate_system_context_diagram().mermaid_content}

## Container Architecture

{self._generate_container_diagram().mermaid_content}

## Security Architecture

### Authentication & Authorization
- **Multi-role system**: CLIENT, BARBER, SHOP_OWNER, ENTERPRISE_OWNER, ADMIN
- **JWT tokens**: Short-lived access tokens with refresh mechanism
- **Role-based access control**: Hierarchical permission system
- **API security**: Rate limiting, CORS, input validation

### Data Protection
- **Encryption**: TLS 1.3 for transport, database encryption at rest
- **PII Protection**: Field-level encryption for sensitive data
- **GDPR Compliance**: Data subject rights, automated retention policies
- **Audit Logging**: Comprehensive audit trails for all operations

## Performance Architecture

### Caching Strategy
- **Redis**: Session management, availability calculations, analytics data
- **Database**: Connection pooling, read replicas for analytics
- **CDN**: Static asset distribution, image optimization

### Scalability Patterns
- **Horizontal scaling**: Microservices architecture
- **Database optimization**: Proper indexing, query optimization
- **Background processing**: Async task handling with Celery
- **Load balancing**: Multi-instance deployment support

## Integration Architecture

### External Services
- **Stripe Connect**: Payment processing and commission handling
- **Google Calendar**: Bidirectional appointment synchronization
- **SendGrid**: Email notifications and marketing
- **Twilio**: SMS reminders and confirmations
- **Google My Business**: Online presence and review management

### Webhook Management
- **Stripe webhooks**: Payment event processing
- **Calendar webhooks**: Appointment change notifications
- **Review webhooks**: Automated review response

## Database Architecture

{self._generate_database_schema_diagram().mermaid_content}

## API Architecture

### API Versioning
- **Current version**: v2 (preferred)
- **Legacy support**: v1 (deprecated, maintenance only)
- **Versioning strategy**: URL path versioning (/api/v2/)

### Endpoint Design
- **RESTful principles**: Resource-based URLs, proper HTTP methods
- **Consistent naming**: Snake_case for JSON, kebab-case for URLs
- **Error handling**: Comprehensive error responses with proper status codes
- **Documentation**: OpenAPI/Swagger with interactive documentation

## Deployment Architecture

{self._generate_deployment_diagram().mermaid_content}

## Development Workflow

### Branch Strategy
- **main/production**: Production deployments
- **staging**: Testing and validation
- **feature/name-YYYYMMDD**: Feature development

### Testing Strategy
- **Unit tests**: 80%+ coverage for business logic
- **Integration tests**: API endpoint validation
- **E2E tests**: Critical user flow testing
- **Performance tests**: Load testing for scalability

### CI/CD Pipeline
- **Automated testing**: All tests run on PR creation
- **Code quality**: ESLint, TypeScript, pytest validation
- **Deployment**: Automatic deployment from staging/production branches
- **Monitoring**: Post-deployment health checks

## Monitoring & Observability

### Metrics Collection
- **Application metrics**: Response times, error rates, throughput
- **Business metrics**: Bookings, revenue, user activity
- **Infrastructure metrics**: CPU, memory, database performance
- **Custom metrics**: Six Figure Barber KPIs

### Logging Strategy
- **Structured logging**: JSON format with correlation IDs
- **Log levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Log aggregation**: Centralized logging with search capabilities
- **Audit trails**: Comprehensive business operation logging

### Alerting
- **Performance alerts**: Response time, error rate thresholds
- **Business alerts**: Payment failures, booking issues
- **Infrastructure alerts**: Resource utilization, service health
- **Security alerts**: Authentication failures, suspicious activity

## Disaster Recovery

### Backup Strategy
- **Database backups**: Daily automated backups with point-in-time recovery
- **File backups**: Regular file storage synchronization
- **Configuration backups**: Infrastructure as code versioning

### Recovery Procedures
- **RTO target**: 4 hours for complete system recovery
- **RPO target**: 1 hour maximum data loss
- **Failover procedures**: Documented manual and automated processes
- **Testing**: Regular disaster recovery testing

## Future Architecture Considerations

### Scalability Roadmap
- **Microservices migration**: Gradual service extraction
- **Event-driven architecture**: Implement domain events
- **CQRS implementation**: Separate read/write models
- **Multi-region deployment**: Geographic distribution

### Technology Evolution
- **GraphQL adoption**: Consider for mobile API needs
- **Real-time features**: WebSocket implementation for live updates
- **AI integration**: Machine learning for demand prediction
- **Blockchain**: Explore for loyalty programs

## Conclusion

The BookedBarber V2 architecture provides a solid foundation for scalable barbershop management while maintaining alignment with the Six Figure Barber methodology. The clean architecture approach ensures maintainability, testability, and adaptability for future business needs.

The system is designed to support growth from individual barbershops to large franchise operations, with enterprise-grade security, performance, and reliability features built in from the ground up.
"""
        
        doc_file = self.docs_dir / "system_architecture_overview.md"
        with open(doc_file, 'w') as f:
            f.write(doc_content.strip())
        
        return str(doc_file)
    
    def _generate_system_context_diagram(self) -> DiagramContent:
        """Generate C4 system context diagram"""
        mermaid_content = """
```mermaid
graph TB
    subgraph "BookedBarber V2 System Context"
        SYSTEM[BookedBarber V2<br/>Barbershop Management Platform]
    end
    
    subgraph "Users"
        CLIENT[Clients<br/>Book appointments]
        BARBER[Barbers<br/>Manage schedules]
        OWNER[Shop Owners<br/>Business management]
        ENTERPRISE[Enterprise Owners<br/>Multi-location management]
    end
    
    subgraph "External Systems"
        STRIPE[Stripe Connect<br/>Payment Processing]
        GOOGLE_CAL[Google Calendar<br/>Schedule Sync]
        SENDGRID[SendGrid<br/>Email Service]
        TWILIO[Twilio<br/>SMS Service]
        GMB[Google My Business<br/>Online Presence]
        ANALYTICS[Google Analytics<br/>Web Analytics]
    end
    
    CLIENT --> SYSTEM
    BARBER --> SYSTEM
    OWNER --> SYSTEM
    ENTERPRISE --> SYSTEM
    
    SYSTEM --> STRIPE
    SYSTEM --> GOOGLE_CAL
    SYSTEM --> SENDGRID
    SYSTEM --> TWILIO
    SYSTEM --> GMB
    SYSTEM --> ANALYTICS
    
    style SYSTEM fill:#e1f5fe
    style CLIENT fill:#f3e5f5
    style BARBER fill:#f3e5f5
    style OWNER fill:#f3e5f5
    style ENTERPRISE fill:#f3e5f5
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.SYSTEM_CONTEXT,
            title="BookedBarber V2 System Context",
            description="High-level view of the BookedBarber V2 system and its interactions with users and external systems",
            mermaid_content=mermaid_content
        )
    
    def _generate_container_diagram(self) -> DiagramContent:
        """Generate C4 container diagram"""
        mermaid_content = """
```mermaid
graph TB
    subgraph "BookedBarber V2 Containers"
        WEB[Web Application<br/>Next.js 14 + TypeScript<br/>Port 3000]
        API[API Gateway<br/>FastAPI + Python<br/>Port 8000]
        DB[(PostgreSQL Database<br/>Primary data store)]
        CACHE[(Redis Cache<br/>Session & data cache)]
        FILES[File Storage<br/>User uploads & assets]
    end
    
    subgraph "Users"
        USERS[All User Types<br/>Web browsers]
    end
    
    subgraph "External Services"
        STRIPE[Stripe Connect]
        GOOGLE[Google Services]
        COMMS[Communication Services]
    end
    
    USERS --> WEB
    WEB --> API
    API --> DB
    API --> CACHE
    API --> FILES
    API --> STRIPE
    API --> GOOGLE
    API --> COMMS
    
    style WEB fill:#e3f2fd
    style API fill:#f1f8e9
    style DB fill:#fce4ec
    style CACHE fill:#fff3e0
    style FILES fill:#f3e5f5
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.CONTAINER_DIAGRAM,
            title="BookedBarber V2 Container Architecture",
            description="Container-level view showing the main applications and data stores",
            mermaid_content=mermaid_content
        )
    
    def _generate_database_schema_diagram(self) -> DiagramContent:
        """Generate database schema diagram"""
        mermaid_content = """
```mermaid
erDiagram
    USERS {
        uuid id PK
        string email UK
        string password_hash
        enum role
        boolean is_active
        boolean email_verified
        timestamp created_at
        timestamp last_login
    }
    
    BARBERSHOPS {
        uuid id PK
        string name
        uuid owner_id FK
        text address
        string phone
        json business_hours
        boolean is_active
        timestamp created_at
    }
    
    BARBERS {
        uuid id PK
        uuid user_id FK
        uuid barbershop_id FK
        decimal commission_rate
        json specialties
        boolean is_active
        timestamp created_at
    }
    
    SERVICES {
        uuid id PK
        uuid barbershop_id FK
        string name
        text description
        integer duration_minutes
        decimal price
        boolean is_active
        timestamp created_at
    }
    
    APPOINTMENTS {
        uuid id PK
        uuid client_id FK
        uuid barber_id FK
        uuid service_id FK
        timestamp start_time
        timestamp end_time
        enum status
        decimal total_amount
        text notes
        timestamp created_at
        timestamp updated_at
    }
    
    PAYMENTS {
        uuid id PK
        uuid appointment_id FK
        string stripe_payment_intent_id UK
        decimal amount
        decimal commission_amount
        enum status
        json metadata
        timestamp processed_at
        timestamp created_at
    }
    
    AVAILABILITY {
        uuid id PK
        uuid barber_id FK
        integer day_of_week
        time start_time
        time end_time
        boolean is_available
        timestamp effective_date
    }
    
    ANALYTICS_METRICS {
        uuid id PK
        string metric_name
        decimal metric_value
        date metric_date
        uuid barbershop_id FK
        uuid barber_id FK
        json metadata
        timestamp created_at
    }
    
    USERS ||--o{ BARBERSHOPS : owns
    USERS ||--o{ BARBERS : "is barber"
    USERS ||--o{ APPOINTMENTS : "books as client"
    BARBERSHOPS ||--o{ BARBERS : employs
    BARBERSHOPS ||--o{ SERVICES : offers
    BARBERSHOPS ||--o{ ANALYTICS_METRICS : "generates metrics"
    BARBERS ||--o{ APPOINTMENTS : provides
    BARBERS ||--o{ AVAILABILITY : "has schedule"
    BARBERS ||--o{ ANALYTICS_METRICS : "generates metrics"
    SERVICES ||--o{ APPOINTMENTS : "booked for"
    APPOINTMENTS ||--|| PAYMENTS : "paid via"
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.DATABASE_SCHEMA,
            title="BookedBarber V2 Database Schema",
            description="Entity relationship diagram showing the core database structure",
            mermaid_content=mermaid_content
        )
    
    def _generate_deployment_diagram(self) -> DiagramContent:
        """Generate deployment architecture diagram"""
        mermaid_content = """
```mermaid
graph TB
    subgraph "Production Environment - Render"
        subgraph "Web Services"
            WEB_PROD[Frontend Service<br/>Next.js Static Site<br/>CDN Distribution]
            API_PROD[Backend Service<br/>FastAPI Container<br/>Auto-scaling]
        end
        
        subgraph "Data Services"
            DB_PROD[(PostgreSQL<br/>Managed Database<br/>Automated Backups)]
            REDIS_PROD[(Redis<br/>Managed Cache<br/>High Availability)]
        end
        
        subgraph "Storage"
            FILES_PROD[File Storage<br/>Persistent Volumes<br/>Backup Strategy]
        end
    end
    
    subgraph "Staging Environment"
        WEB_STAGE[Frontend Staging<br/>Port 3001]
        API_STAGE[Backend Staging<br/>Port 8001]
        DB_STAGE[(PostgreSQL Staging)]
    end
    
    subgraph "Development Environment"
        WEB_DEV[Frontend Dev<br/>localhost:3000]
        API_DEV[Backend Dev<br/>localhost:8000]
        DB_DEV[(SQLite/PostgreSQL)]
        REDIS_DEV[(Redis Local)]
    end
    
    subgraph "External Services"
        STRIPE[Stripe Connect<br/>Payment Processing]
        GOOGLE[Google APIs<br/>Calendar, My Business]
        SENDGRID[SendGrid<br/>Email Service]
        TWILIO[Twilio<br/>SMS Service]
    end
    
    subgraph "Monitoring & Logging"
        LOGS[Log Aggregation<br/>Structured Logging]
        METRICS[Metrics Collection<br/>Performance Monitoring]
        ALERTS[Alert Management<br/>Notification System]
    end
    
    WEB_PROD --> API_PROD
    API_PROD --> DB_PROD
    API_PROD --> REDIS_PROD
    API_PROD --> FILES_PROD
    
    API_PROD --> STRIPE
    API_PROD --> GOOGLE
    API_PROD --> SENDGRID
    API_PROD --> TWILIO
    
    API_PROD --> LOGS
    API_PROD --> METRICS
    METRICS --> ALERTS
    
    style WEB_PROD fill:#e8f5e8
    style API_PROD fill:#e8f5e8
    style DB_PROD fill:#ffe8e8
    style REDIS_PROD fill:#fff8e8
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.DEPLOYMENT_DIAGRAM,
            title="BookedBarber V2 Deployment Architecture",
            description="Deployment view showing production, staging, and development environments",
            mermaid_content=mermaid_content
        )
    
    def generate_api_documentation(self) -> str:
        """Generate comprehensive API documentation"""
        api_doc_content = f"""
# BookedBarber V2 API Documentation

**Generated on**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Overview

The BookedBarber V2 API provides comprehensive endpoints for barbershop management, booking operations, payment processing, and analytics. The API follows RESTful principles with consistent error handling and comprehensive validation.

## Base URLs

- **Production**: `https://bookedbarber.com/api/v2`
- **Staging**: `https://staging.bookedbarber.com/api/v2`
- **Development**: `http://localhost:8000/api/v2`

## Authentication

### JWT Token Authentication
All authenticated endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Management
- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry
- **Token Refresh**: Use `/api/v2/auth/refresh` endpoint

## API Versioning

- **Current Version**: v2 (recommended)
- **Legacy Version**: v1 (deprecated, maintenance only)
- **Versioning Strategy**: URL path versioning

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **General endpoints**: 60 requests per minute
- **Webhook endpoints**: 100 requests per minute

## Response Format

### Success Response
```json
{{
  "success": true,
  "data": {{
    // Response data
  }},
  "message": "Operation successful",
  "timestamp": "2025-07-26T16:00:00Z"
}}
```

### Error Response
```json
{{
  "success": false,
  "error": {{
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {{
      "field": "email",
      "message": "Invalid email format"
    }}
  }},
  "timestamp": "2025-07-26T16:00:00Z"
}}
```

## Core Endpoints

### Authentication

#### POST /auth/login
Authenticate user and receive access/refresh tokens.

**Request Body:**
```json
{{
  "email": "user@example.com",
  "password": "secure_password"
}}
```

**Response:**
```json
{{
  "success": true,
  "data": {{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {{
      "id": "uuid",
      "email": "user@example.com",
      "role": "BARBER"
    }}
  }}
}}
```

#### POST /auth/refresh
Refresh access token using refresh token.

#### POST /auth/logout
Invalidate current tokens.

### Booking Management

#### GET /bookings
Retrieve user's bookings with filtering and pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by appointment status
- `start_date`: Filter by start date
- `end_date`: Filter by end date

#### POST /bookings
Create a new booking appointment.

**Request Body:**
```json
{{
  "barber_id": "uuid",
  "service_id": "uuid",
  "start_time": "2025-07-26T14:00:00Z",
  "notes": "Special requests"
}}
```

#### GET /bookings/{{id}}
Get specific booking details.

#### PUT /bookings/{{id}}
Update booking details (limited fields).

#### POST /bookings/{{id}}/cancel
Cancel a booking with optional reason.

### Availability Management

#### GET /availability
Check barber availability for date range.

**Query Parameters:**
- `barber_id`: Specific barber (optional)
- `start_date`: Start date for availability check
- `end_date`: End date for availability check
- `service_id`: Filter by service duration

#### GET /availability/{{barber_id}}
Get specific barber's availability schedule.

### Payment Processing

#### POST /payments
Process payment for appointment.

**Request Body:**
```json
{{
  "appointment_id": "uuid",
  "payment_method_id": "stripe_payment_method_id",
  "amount": 50.00
}}
```

#### GET /payments/{{id}}
Get payment details and status.

#### POST /payments/{{id}}/refund
Process refund for payment.

#### POST /payments/webhooks
Handle Stripe webhook events (internal use).

### User Management

#### GET /users/profile
Get current user's profile information.

#### PUT /users/profile
Update user profile.

#### POST /users/change-password
Change user password.

### Analytics

#### GET /analytics/revenue
Get revenue analytics for date range.

**Access**: Shop owners and above

#### GET /analytics/bookings
Get booking analytics and trends.

#### GET /analytics/performance
Get barber performance metrics.

**Access**: Barber own data or shop owner

## Error Codes

### Authentication Errors
- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_TOKEN_EXPIRED`: Access token has expired
- `AUTH_TOKEN_INVALID`: Invalid or malformed token
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions

### Validation Errors
- `VALIDATION_ERROR`: Request validation failed
- `VALIDATION_MISSING_FIELD`: Required field missing
- `VALIDATION_INVALID_FORMAT`: Field format invalid

### Business Logic Errors
- `BOOKING_CONFLICT`: Time slot not available
- `BOOKING_INVALID_TIME`: Invalid booking time
- `PAYMENT_FAILED`: Payment processing failed
- `RESOURCE_NOT_FOUND`: Requested resource not found

### System Errors
- `INTERNAL_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: External service unavailable
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Webhook Events

### Stripe Webhooks
The system handles the following Stripe webhook events:

- `payment_intent.succeeded`: Payment completed successfully
- `payment_intent.payment_failed`: Payment failed
- `account.updated`: Connected account updated
- `payout.paid`: Payout processed

### Webhook Security
All webhooks must include valid signatures for verification.

## SDK Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const api = axios.create({{
  baseURL: 'https://bookedbarber.com/api/v2',
  headers: {{
    'Content-Type': 'application/json'
  }}
}});

// Add auth token interceptor
api.interceptors.request.use((config) => {{
  const token = localStorage.getItem('access_token');
  if (token) {{
    config.headers.Authorization = `Bearer ${{token}}`;
  }}
  return config;
}});

// Create booking
const booking = await api.post('/bookings', {{
  barber_id: 'uuid',
  service_id: 'uuid',
  start_time: '2025-07-26T14:00:00Z'
}});
```

### Python
```python
import requests

class BookedBarberAPI:
    def __init__(self, base_url, access_token=None):
        self.base_url = base_url
        self.session = requests.Session()
        if access_token:
            self.session.headers.update({{
                'Authorization': f'Bearer {{access_token}}'
            }})
    
    def create_booking(self, barber_id, service_id, start_time):
        response = self.session.post(f'{{self.base_url}}/bookings', json={{
            'barber_id': barber_id,
            'service_id': service_id,
            'start_time': start_time
        }})
        return response.json()

# Usage
api = BookedBarberAPI('https://bookedbarber.com/api/v2', 'your_access_token')
booking = api.create_booking('uuid', 'uuid', '2025-07-26T14:00:00Z')
```

## Testing

### Test Environment
- **Base URL**: `https://staging.bookedbarber.com/api/v2`
- **Test Stripe Keys**: Use Stripe test publishable/secret keys
- **Test Data**: Staging environment includes test data

### API Testing Tools
- **Interactive Documentation**: `/docs` endpoint (Swagger UI)
- **ReDoc Documentation**: `/redoc` endpoint
- **OpenAPI Specification**: `/openapi.json` endpoint

## Support

For API support and questions:
- **Documentation**: This document and interactive API docs
- **Issues**: Report via GitHub issues
- **Contact**: Technical support team

## Changelog

### v2.1.0 (2025-07-26)
- Added analytics endpoints
- Enhanced error handling
- Improved webhook processing

### v2.0.0 (2025-07-01)
- Complete API redesign
- JWT authentication implementation
- Stripe Connect integration
- Comprehensive validation

### v1.0.0 (Deprecated)
- Legacy API version
- Maintenance mode only
- No new features
"""
        
        api_doc_file = self.docs_dir / "api_documentation.md"
        with open(api_doc_file, 'w') as f:
            f.write(api_doc_content.strip())
        
        return str(api_doc_file)
    
    def generate_component_diagram(self, domain: str) -> DiagramContent:
        """Generate component diagram for specific domain"""
        if domain.lower() == "booking_engine":
            return self._generate_booking_engine_components()
        elif domain.lower() == "payment_processing":
            return self._generate_payment_processing_components()
        elif domain.lower() == "user_management":
            return self._generate_user_management_components()
        else:
            return self._generate_default_component_diagram(domain)
    
    def _generate_booking_engine_components(self) -> DiagramContent:
        """Generate booking engine component diagram"""
        mermaid_content = """
```mermaid
graph TB
    subgraph "Booking Engine Components"
        subgraph "Presentation Layer"
            BF[Booking Form<br/>React Component]
            AC[Availability Calendar<br/>Interactive Calendar]
            AD[Appointment Details<br/>Booking Summary]
        end
        
        subgraph "Application Layer"
            BS[Booking Service<br/>Business Logic]
            AS[Availability Service<br/>Time Slot Management]
            CS[Conflict Service<br/>Schedule Conflicts]
            VS[Validation Service<br/>Business Rules]
        end
        
        subgraph "Domain Layer"
            APP[Appointment Entity<br/>Core Business Object]
            TS[TimeSlot Entity<br/>Time Management]
            BR[Booking Rules<br/>Business Constraints]
            AV[Availability Entity<br/>Schedule Management]
        end
        
        subgraph "Infrastructure Layer"
            AR[Appointment Repository<br/>Data Access]
            AVR[Availability Repository<br/>Schedule Data]
            CC[Cache Controller<br/>Performance]
            EH[Event Handler<br/>Domain Events]
        end
        
        subgraph "External Integrations"
            GC[Google Calendar<br/>Sync Service]
            NS[Notification Service<br/>Reminders]
            PS[Payment Service<br/>Booking Payments]
        end
    end
    
    BF --> BS
    AC --> AS
    AD --> BS
    
    BS --> APP
    AS --> AV
    CS --> TS
    VS --> BR
    
    BS --> AR
    AS --> AVR
    BS --> CC
    BS --> EH
    
    EH --> GC
    EH --> NS
    BS --> PS
    
    style BF fill:#e3f2fd
    style AC fill:#e3f2fd
    style AD fill:#e3f2fd
    style BS fill:#f1f8e9
    style AS fill:#f1f8e9
    style CS fill:#f1f8e9
    style VS fill:#f1f8e9
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.COMPONENT_DIAGRAM,
            title="Booking Engine Component Architecture",
            description="Detailed component view of the booking engine system",
            mermaid_content=mermaid_content
        )
    
    def _generate_payment_processing_components(self) -> DiagramContent:
        """Generate payment processing component diagram"""
        mermaid_content = """
```mermaid
graph TB
    subgraph "Payment Processing Components"
        subgraph "Presentation Layer"
            PF[Payment Form<br/>Secure Input]
            PS[Payment Status<br/>Progress Display]
            RI[Refund Interface<br/>Admin Panel]
        end
        
        subgraph "Application Layer"
            PAYS[Payment Service<br/>Orchestration]
            CS[Commission Service<br/>Calculation Logic]
            RS[Refund Service<br/>Refund Processing]
            POS[Payout Service<br/>Barber Payouts]
        end
        
        subgraph "Domain Layer"
            PAY[Payment Entity<br/>Transaction Data]
            COM[Commission Entity<br/>Earnings Data]
            REF[Refund Entity<br/>Refund Logic]
            POL[Payment Policy<br/>Business Rules]
        end
        
        subgraph "Infrastructure Layer"
            PR[Payment Repository<br/>Transaction Storage]
            SA[Stripe Adapter<br/>External Integration]
            WH[Webhook Handler<br/>Event Processing]
            AL[Audit Logger<br/>Compliance]
        end
        
        subgraph "External Services"
            SC[Stripe Connect<br/>Payment Gateway]
            ACC[Accounting System<br/>Financial Records]
            TAX[Tax Service<br/>Tax Calculations]
        end
    end
    
    PF --> PAYS
    PS --> PAYS
    RI --> RS
    
    PAYS --> PAY
    CS --> COM
    RS --> REF
    POS --> COM
    
    PAYS --> PR
    PAYS --> SA
    SA --> WH
    PAYS --> AL
    
    SA --> SC
    CS --> ACC
    CS --> TAX
    
    style PF fill:#e8f5e8
    style PAYS fill:#fff3e0
    style SA fill:#fce4ec
    style SC fill:#f3e5f5
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.COMPONENT_DIAGRAM,
            title="Payment Processing Component Architecture",
            description="Detailed component view of the payment processing system",
            mermaid_content=mermaid_content
        )
    
    def _generate_user_management_components(self) -> DiagramContent:
        """Generate user management component diagram"""
        mermaid_content = """
```mermaid
graph TB
    subgraph "User Management Components"
        subgraph "Presentation Layer"
            LF[Login Form<br/>Authentication UI]
            RF[Registration Form<br/>User Signup]
            PM[Profile Management<br/>User Settings]
            RS[Role Selector<br/>Permission UI]
        end
        
        subgraph "Application Layer"
            AS[Auth Service<br/>Authentication Logic]
            US[User Service<br/>User Operations]
            ROS[Role Service<br/>Authorization]
            PS[Profile Service<br/>Profile Management]
        end
        
        subgraph "Domain Layer"
            USER[User Entity<br/>Core User Data]
            ROLE[Role Entity<br/>Permission System]
            PERM[Permission Entity<br/>Access Rights]
            PROF[Profile Entity<br/>User Details]
        end
        
        subgraph "Infrastructure Layer"
            UR[User Repository<br/>User Data Storage]
            RR[Role Repository<br/>Permission Storage]
            TC[Token Controller<br/>JWT Management]
            SC[Session Controller<br/>Session Management]
        end
        
        subgraph "External Services"
            OA[OAuth Providers<br/>Google, Facebook]
            ES[Email Service<br/>Verification]
            SMS[SMS Service<br/>2FA Support]
        end
    end
    
    LF --> AS
    RF --> US
    PM --> PS
    RS --> ROS
    
    AS --> USER
    US --> USER
    ROS --> ROLE
    PS --> PROF
    
    AS --> UR
    ROS --> RR
    AS --> TC
    AS --> SC
    
    AS --> OA
    US --> ES
    AS --> SMS
    
    style LF fill:#e1f5fe
    style AS fill:#f9fbe7
    style USER fill:#fce4ec
    style TC fill:#fff3e0
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.COMPONENT_DIAGRAM,
            title="User Management Component Architecture",
            description="Detailed component view of the user management system",
            mermaid_content=mermaid_content
        )
    
    def _generate_default_component_diagram(self, domain: str) -> DiagramContent:
        """Generate default component diagram for unknown domains"""
        mermaid_content = f"""
```mermaid
graph TB
    subgraph "{domain.title()} Components"
        subgraph "Presentation Layer"
            UI[User Interface<br/>React Components]
            FORM[Forms<br/>Input Handling]
        end
        
        subgraph "Application Layer"
            SERVICE[{domain.title()} Service<br/>Business Logic]
            VALIDATOR[Validation Service<br/>Input Validation]
        end
        
        subgraph "Domain Layer"
            ENTITY[{domain.title()} Entity<br/>Core Business Object]
            RULES[Business Rules<br/>Domain Logic]
        end
        
        subgraph "Infrastructure Layer"
            REPO[{domain.title()} Repository<br/>Data Access]
            CACHE[Cache Layer<br/>Performance]
        end
    end
    
    UI --> SERVICE
    FORM --> VALIDATOR
    SERVICE --> ENTITY
    VALIDATOR --> RULES
    SERVICE --> REPO
    SERVICE --> CACHE
    
    style UI fill:#e3f2fd
    style SERVICE fill:#f1f8e9
    style ENTITY fill:#fce4ec
    style REPO fill:#fff3e0
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.COMPONENT_DIAGRAM,
            title=f"{domain.title()} Component Architecture",
            description=f"Component view of the {domain} system",
            mermaid_content=mermaid_content
        )
    
    def generate_sequence_diagram(self, flow_name: str) -> DiagramContent:
        """Generate sequence diagram for specific flow"""
        if flow_name.lower() == "booking_flow":
            return self._generate_booking_sequence_diagram()
        elif flow_name.lower() == "payment_flow":
            return self._generate_payment_sequence_diagram()
        elif flow_name.lower() == "authentication_flow":
            return self._generate_authentication_sequence_diagram()
        else:
            return self._generate_default_sequence_diagram(flow_name)
    
    def _generate_booking_sequence_diagram(self) -> DiagramContent:
        """Generate booking flow sequence diagram"""
        mermaid_content = """
```mermaid
sequenceDiagram
    participant C as Client
    participant F as Frontend
    participant A as API Gateway
    participant B as Booking Service
    participant P as Payment Service
    participant D as Database
    participant G as Google Calendar
    participant N as Notification Service
    
    C->>F: Select barber and service
    F->>A: GET /availability?barber_id=123
    A->>B: Check availability
    B->>D: Query available slots
    D-->>B: Available time slots
    B-->>A: Availability data
    A-->>F: Available slots
    F-->>C: Show available times
    
    C->>F: Select time and confirm
    F->>A: POST /bookings
    A->>B: Create booking request
    B->>D: Begin transaction
    B->>B: Validate time slot
    B->>D: Lock time slot
    B->>D: Create appointment
    
    alt Payment Required
        B->>P: Process payment
        P->>P: Calculate commission
        P-->>B: Payment confirmed
    end
    
    B->>D: Commit transaction
    B->>G: Sync to calendar
    B->>N: Send confirmation
    
    B-->>A: Booking confirmed
    A-->>F: Success response
    F-->>C: Booking confirmation
    
    N->>C: Email confirmation
    N->>C: SMS reminder (later)
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.SEQUENCE_DIAGRAM,
            title="Booking Flow Sequence",
            description="Complete booking flow from selection to confirmation",
            mermaid_content=mermaid_content
        )
    
    def _generate_payment_sequence_diagram(self) -> DiagramContent:
        """Generate payment flow sequence diagram"""
        mermaid_content = """
```mermaid
sequenceDiagram
    participant C as Client
    participant F as Frontend
    participant A as API Gateway
    participant P as Payment Service
    participant S as Stripe Connect
    participant D as Database
    participant W as Webhook Handler
    participant N as Notification Service
    
    C->>F: Initiate payment
    F->>A: POST /payments
    A->>P: Process payment request
    P->>P: Validate appointment
    P->>P: Calculate commission
    
    P->>S: Create payment intent
    S-->>P: Payment intent + client secret
    P->>D: Store payment record (pending)
    P-->>A: Client secret
    A-->>F: Payment intent
    
    F->>S: Confirm payment (client-side)
    S->>W: Webhook: payment_intent.succeeded
    W->>P: Handle payment success
    P->>D: Update payment status
    P->>P: Calculate commission split
    P->>D: Record commission
    
    P->>N: Send payment confirmation
    N->>C: Email receipt
    
    alt Barber Payout
        P->>S: Schedule payout
        S->>W: Webhook: payout.paid
        W->>P: Handle payout completion
        P->>D: Update payout status
        P->>N: Notify barber
    end
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.SEQUENCE_DIAGRAM,
            title="Payment Processing Sequence",
            description="Complete payment flow with commission handling",
            mermaid_content=mermaid_content
        )
    
    def _generate_authentication_sequence_diagram(self) -> DiagramContent:
        """Generate authentication flow sequence diagram"""
        mermaid_content = """
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Gateway
    participant AS as Auth Service
    participant D as Database
    participant T as Token Service
    participant E as Email Service
    
    U->>F: Enter credentials
    F->>A: POST /auth/login
    A->>AS: Authenticate user
    AS->>D: Verify credentials
    D-->>AS: User data
    
    alt Valid Credentials
        AS->>T: Generate tokens
        T-->>AS: Access + Refresh tokens
        AS->>D: Store refresh token
        AS-->>A: Auth success + tokens
        A-->>F: Login response
        F->>F: Store tokens
        F-->>U: Login successful
        
        Note over F: Access token expires (15 min)
        
        F->>A: API request with expired token
        A-->>F: 401 Unauthorized
        F->>A: POST /auth/refresh
        A->>AS: Refresh token
        AS->>D: Verify refresh token
        AS->>T: Generate new access token
        T-->>AS: New access token
        AS-->>A: Token refreshed
        A-->>F: New access token
        F->>A: Retry original request
        A-->>F: Success with data
        
    else Invalid Credentials
        AS-->>A: Auth failed
        A-->>F: 401 Unauthorized
        F-->>U: Login failed
        
        alt Too Many Failures
            AS->>E: Send security alert
            E->>U: Suspicious activity email
        end
    end
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.SEQUENCE_DIAGRAM,
            title="Authentication Flow Sequence",
            description="User authentication and token refresh flow",
            mermaid_content=mermaid_content
        )
    
    def _generate_default_sequence_diagram(self, flow_name: str) -> DiagramContent:
        """Generate default sequence diagram"""
        mermaid_content = f"""
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant S as Service
    participant D as Database
    
    U->>F: Initiate {flow_name}
    F->>A: API Request
    A->>S: Process request
    S->>D: Data operation
    D-->>S: Result
    S-->>A: Response
    A-->>F: Success
    F-->>U: Complete
```
"""
        
        return DiagramContent(
            diagram_type=DiagramType.SEQUENCE_DIAGRAM,
            title=f"{flow_name.title()} Sequence",
            description=f"Sequence diagram for {flow_name} process",
            mermaid_content=mermaid_content
        )
    
    def save_diagram(self, diagram: DiagramContent) -> str:
        """Save diagram to file"""
        filename = f"{diagram.diagram_type.value}_{diagram.title.lower().replace(' ', '_')}.md"
        filepath = self.diagrams_dir / filename
        
        content = f"""
# {diagram.title}

**Type**: {diagram.diagram_type.value.title()}
**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Description
{diagram.description}

## Diagram
{diagram.mermaid_content}
"""
        
        with open(filepath, 'w') as f:
            f.write(content.strip())
        
        return str(filepath)
    
    def _initialize_documentation_templates(self) -> Dict[str, str]:
        """Initialize documentation templates"""
        return {
            "implementation_guide": """
# {title} Implementation Guide

## Overview
{overview}

## Prerequisites
{prerequisites}

## Implementation Steps
{implementation_steps}

## Testing Strategy
{testing_strategy}

## Deployment Considerations
{deployment_considerations}

## Monitoring and Maintenance
{monitoring}
""",
            "api_endpoint_doc": """
# {endpoint_name} API Documentation

## Endpoint Details
- **URL**: {url}
- **Method**: {method}
- **Authentication**: {auth_required}

## Request Format
{request_format}

## Response Format
{response_format}

## Error Handling
{error_handling}

## Examples
{examples}
""",
            "component_spec": """
# {component_name} Component Specification

## Purpose
{purpose}

## Responsibilities
{responsibilities}

## Dependencies
{dependencies}

## Interface Definition
{interface}

## Implementation Notes
{implementation_notes}
"""
        }
    
    def generate_all_documentation(self) -> List[str]:
        """Generate all architecture documentation"""
        generated_files = []
        
        # Generate system overview
        system_doc = self.generate_system_overview_documentation()
        generated_files.append(system_doc)
        
        # Generate API documentation
        api_doc = self.generate_api_documentation()
        generated_files.append(api_doc)
        
        # Generate core diagrams
        diagrams = [
            self._generate_system_context_diagram(),
            self._generate_container_diagram(),
            self._generate_database_schema_diagram(),
            self._generate_deployment_diagram()
        ]
        
        for diagram in diagrams:
            diagram_file = self.save_diagram(diagram)
            generated_files.append(diagram_file)
        
        # Generate component diagrams for core domains
        core_domains = ["booking_engine", "payment_processing", "user_management"]
        for domain in core_domains:
            component_diagram = self.generate_component_diagram(domain)
            diagram_file = self.save_diagram(component_diagram)
            generated_files.append(diagram_file)
        
        # Generate sequence diagrams for core flows
        core_flows = ["booking_flow", "payment_flow", "authentication_flow"]
        for flow in core_flows:
            sequence_diagram = self.generate_sequence_diagram(flow)
            diagram_file = self.save_diagram(sequence_diagram)
            generated_files.append(diagram_file)
        
        return generated_files