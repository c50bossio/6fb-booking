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
- Real-time availability management
- Client self-booking portal
- Automated scheduling and confirmations
- Recurring appointment support
- Multi-barber and multi-location support

### 💳 Integrated Payment Processing
- Seamless Stripe Connect integration
- Automatic commission splits
- Digital receipts and invoicing
- Payment history tracking
- PCI-compliant security

### 📊 Business Analytics Dashboard
- Revenue tracking and projections
- Client retention metrics
- Service popularity analysis
- Peak hours identification
- Performance comparisons

### 📱 Client Management
- Automated SMS/email reminders
- Client preference tracking
- Visit history and notes
- Loyalty program support
- Marketing campaign tools

### 🔗 Calendar Integration
- Two-way Google Calendar sync
- Availability blocking
- Personal event management
- Multi-calendar support

### 🏪 Multi-Location Support
- Manage multiple shops
- Centralized reporting
- Staff management across locations
- Location-specific pricing

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.9+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT with refresh tokens
- **API**: RESTful with OpenAPI documentation

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query + Context API
- **Forms**: React Hook Form with Zod validation

### Infrastructure
- **Hosting**: Render (primary), Railway, Vercel
- **Monitoring**: Sentry error tracking
- **Communications**: SendGrid (email), Twilio (SMS)
- **Payments**: Stripe Connect

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

## 📖 Documentation

- [Getting Started Guide](./docs/GETTING_STARTED.md) - Detailed setup instructions
- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and patterns
- [API Documentation](./docs/API_DOCUMENTATION.md) - Complete API reference
- [Deployment Guide](./docs/DEPLOYMENT/README.md) - Production deployment instructions
- [Development Guide](./docs/DEVELOPMENT/README.md) - Contributing and coding standards

### Business Documentation
- [Six Figure Barber Methodology](./docs/BUSINESS/SIX_FIGURE_BARBER_METHODOLOGY.md)
- [Platform Features Guide](./docs/FEATURES/README.md)
- [Client Onboarding Process](./docs/BUSINESS/CLIENT_ONBOARDING.md)

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
- **Phase 4**: Admin & Mentor Portal (Weeks 7-8)
