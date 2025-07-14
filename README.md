# BookedBarber V2 - Professional Barbershop Management Platform

<div align="center">
  
  **OWN THE CHAIR. OWN THE BRAND.**
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
  [![Node](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)](https://fastapi.tiangolo.com/)
  [![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
</div>

## 🚀 Overview

BookedBarber V2 is a comprehensive business management platform designed specifically for barbershops, built on the proven Six Figure Barber methodology. This platform empowers barbers to streamline operations, maximize revenue, and build their personal brand.

### Why BookedBarber?

- **Built by Barbers, for Barbers**: Developed in collaboration with successful shop owners
- **Revenue-Focused**: Based on the Six Figure Barber methodology for maximizing earnings
- **All-in-One Solution**: Booking, payments, analytics, and client management in one platform
- **Modern Technology**: Fast, reliable, and scalable architecture

## ✨ Key Features

### 📅 Smart Booking System
- Real-time availability management with conflict detection
- Client self-booking portal with mobile optimization
- Automated scheduling and confirmations via SMS/Email
- Recurring appointment support with flexible patterns
- Multi-barber and multi-location support
- Double-booking prevention with intelligent slot management
- Waitlist management and automatic rebooking

### 💳 Integrated Payment Processing
- Seamless Stripe Connect integration with automatic onboarding
- Automatic commission splits with configurable rules
- Digital receipts and invoicing with custom branding
- Payment history tracking and financial reporting
- PCI-compliant security with tokenization
- Refund management and dispute handling

### 📊 Business Analytics Dashboard
- Revenue tracking and projections with trend analysis
- Client retention metrics and lifetime value calculations
- Service popularity analysis with pricing optimization
- Peak hours identification and capacity planning
- Performance comparisons across locations and barbers
- Real-time dashboard with customizable widgets

### 🤖 AI-Powered Analytics
- Cross-user benchmarking with privacy compliance
- Predictive revenue forecasting using machine learning
- Client churn prediction and retention recommendations
- Demand pattern analysis for optimal scheduling
- Pricing optimization based on market data
- Performance insights with actionable recommendations

### 📈 Marketing Integrations Suite
- **Google My Business Integration**: Automated review management and SEO-optimized responses
- **Conversion Tracking**: Google Tag Manager and Meta Pixel integration with attribution
- **Review Automation**: Smart response system following Google guidelines
- **Email/SMS Campaigns**: Targeted marketing with A/B testing capabilities
- **Lead Attribution**: Multi-touch attribution across digital channels

### 📱 Client Management
- Automated SMS/email reminders with customizable templates
- Client preference tracking and service history
- Visit notes and photo documentation
- Loyalty program support with point management
- Marketing campaign tools with segmentation
- GDPR-compliant data management

### 🔗 Calendar Integration
- Two-way Google Calendar sync with real-time updates
- Availability blocking and time-off management
- Personal event management across multiple calendars
- Webhook support for external calendar systems
- Timezone-aware scheduling for global clients

### 🏪 Multi-Location Support
- Manage multiple shops with centralized control
- Location-specific settings and branding
- Staff management across locations with role-based access
- Location-specific pricing and service offerings
- Cross-location reporting and analytics

### 🔐 Security & Compliance
- Multi-Factor Authentication (MFA) with TOTP support
- GDPR compliance with data export/deletion tools
- Role-based access control with granular permissions
- Audit logging for all sensitive operations
- Rate limiting and fraud protection
- Encrypted data storage and transmission

## 🛠️ Technology Stack

### Backend (V2 Architecture)
- **Framework**: FastAPI (Python 3.9+) with async/await support
- **Database**: PostgreSQL with SQLAlchemy ORM and Alembic migrations
- **Authentication**: JWT with refresh tokens and MFA support
- **API**: RESTful with comprehensive OpenAPI documentation
- **Caching**: Redis for session management and API caching
- **Background Tasks**: Celery for async processing
- **Testing**: pytest with 80%+ code coverage requirement

### Frontend (V2 Architecture)
- **Framework**: Next.js 14 with TypeScript and App Router
- **Styling**: Tailwind CSS + shadcn/ui component library
- **State Management**: React Query + Context API
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Accessible design with shadcn/ui
- **Performance**: Optimized with virtualization and lazy loading
- **Testing**: Jest and React Testing Library

### Infrastructure & DevOps
- **Hosting**: Render (primary), Railway, Vercel compatible
- **Monitoring**: Sentry for error tracking and performance monitoring
- **Communications**: SendGrid (email), Twilio (SMS)
- **Payments**: Stripe Connect with webhook management
- **Analytics**: Google Analytics 4, Google Tag Manager, Meta Pixel
- **Storage**: PostgreSQL (production), SQLite (development)
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Environment Management**: Multi-environment support (dev/staging/prod)

### Development Tools & AI Integration
- **Claude Code Integration**: Custom MCP (Model Context Protocol) servers for enhanced development
- **Browser Logs MCP**: Real-time browser console and network request monitoring via Chrome DevTools Protocol
- **Automated Debugging**: Direct access to browser logs, JavaScript errors, and network traffic
- **AI-Assisted Development**: Claude can directly analyze browser behavior and performance issues

### AI & Machine Learning
- **Analytics Engine**: Custom ML models for revenue forecasting
- **Privacy**: Anonymization service for cross-user analytics
- **Benchmarking**: AI-powered performance comparisons
- **Optimization**: Predictive pricing and demand analysis

### Security & Compliance
- **Authentication**: Multi-Factor Authentication with TOTP
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: GDPR compliance tools and data anonymization
- **Monitoring**: Comprehensive audit logging and security alerts
- **Rate Limiting**: Advanced rate limiting for API protection

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 13+ (or SQLite for development)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bookedbarber-v2.git
   cd bookedbarber-v2
   ```

2. **Set up the backend**
   ```bash
   cd backend-v2
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.template .env
   # Edit .env with your configuration
   alembic upgrade head
   ```

3. **Set up the frontend**
   ```bash
   cd backend-v2/frontend-v2
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development servers**
   ```bash
   # From project root
   ./scripts/start-dev-session.sh
   ```

   Or manually:
   ```bash
   # Terminal 1 - Backend
   cd backend-v2
   uvicorn main:app --reload

   # Terminal 2 - Frontend
   cd backend-v2/frontend-v2
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - Staging Frontend: http://localhost:3001 (when running staging environment)
   - Staging Backend: http://localhost:8001 (when running staging environment)

### Testing & Quality Assurance

BookedBarber V2 maintains high code quality with comprehensive testing:

#### Backend Testing
```bash
# Run all tests with coverage
cd backend-v2
pytest

# Run specific test categories
pytest -m unit          # Unit tests only
pytest -m integration   # Integration tests only
pytest -m api          # API endpoint tests
pytest -m gdpr         # GDPR compliance tests

# Generate coverage report
pytest --cov=. --cov-report=html
```

#### Frontend Testing
```bash
# Run frontend tests
cd backend-v2/frontend-v2
npm test

# Run with coverage
npm run test:coverage

# E2E testing (requires both servers running)
npm run test:e2e
```

#### Test Coverage
- **Backend**: 80%+ coverage requirement (enforced in CI)
- **Frontend**: Component testing with React Testing Library
- **Integration**: End-to-end booking flow testing
- **API**: Comprehensive endpoint testing with authentication
- **GDPR**: Privacy compliance validation
- **Security**: Authentication and authorization testing

#### Running Complete Test Suite
```bash
# Run comprehensive tests for entire platform
./scripts/test-all.sh

# Parallel testing for faster execution
./scripts/parallel-tests.sh
```

## 📖 Documentation

### Technical Documentation
- [Getting Started Guide](./docs/GETTING_STARTED.md) - Detailed setup instructions
- [Architecture Overview](./docs/ARCHITECTURE.md) - V2 system design and patterns
- [API Documentation](./docs/API_DOCUMENTATION.md) - Complete API reference with examples
- [Deployment Guide](./docs/DEPLOYMENT.md) - V2 deployment process and staging environment
- [Development Guide](./docs/DEVELOPMENT/README.md) - Contributing and coding standards
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) - Common issues and solutions

### Feature Documentation
- [AI Analytics Guide](./docs/AI_ANALYTICS.md) - AI-powered insights and benchmarking
- [Marketing Integrations](./docs/MARKETING_INTEGRATIONS.md) - GMB, conversion tracking, reviews
- [GDPR Compliance](./docs/GDPR_COMPLIANCE.md) - Privacy features and data protection
- [Multi-Factor Authentication](./docs/MFA_SETUP.md) - Security configuration guide
- [Calendar Integration](./docs/CALENDAR_INTEGRATION.md) - Google Calendar and webhook setup

### Business Documentation
- [Six Figure Barber Methodology](./docs/BUSINESS/SIX_FIGURE_BARBER_METHODOLOGY.md)
- [Platform Features Guide](./docs/FEATURES/README.md)
- [Client Onboarding Process](./docs/BUSINESS/CLIENT_ONBOARDING.md)

### API References
- [OpenAPI Specification](./docs/api/openapi.json) - Machine-readable API spec
- [Postman Collection](./docs/api/bookedbarber-v2.postman_collection.json) - Import for testing

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./docs/DEVELOPMENT/CONTRIBUTING.md) for details on:
- Code of Conduct
- Development workflow
- Coding standards
- Testing requirements
- Pull request process

## 🔒 Security

- All data encrypted in transit and at rest
- PCI-compliant payment processing via Stripe
- Regular security audits
- GDPR-compliant data handling
- Role-based access control

For security concerns, please email security@bookedbarber.com

## 📈 Roadmap

### Q1 2025
- [ ] Mobile app (iOS/Android)
- [ ] Advanced analytics with AI insights
- [ ] Inventory management system
- [ ] Point of Sale integration

### Q2 2025
- [ ] Franchise management tools
- [ ] Training and certification platform
- [ ] Marketplace for barber products
- [ ] White-label options

## 💬 Community & Support

- **Documentation**: [docs.bookedbarber.com](https://docs.bookedbarber.com)
- **Discord Community**: [Join our server](https://discord.gg/bookedbarber)
- **Email Support**: support@bookedbarber.com
- **Bug Reports**: [GitHub Issues](https://github.com/yourusername/bookedbarber-v2/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- The Six Figure Barber community for methodology and feedback
- All contributing barbers and shop owners
- Open source projects that made this possible

---

<div align="center">
  <p><strong>BookedBarber V2</strong> - Empowering barbers to build successful businesses</p>
  <p>Made with ❤️ by the BookedBarber Team</p>
</div>

<!-- Git workflow test - Updated July 14, 2025 -->
