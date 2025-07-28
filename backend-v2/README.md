# BookedBarber V2 - Backend

## 🚀 Overview

BookedBarber V2 is a comprehensive barbershop management platform built on the Six Figure Barber methodology. This backend provides robust APIs for appointment booking, payment processing, business analytics, and advanced search capabilities.

## ✨ Key Features

### 🔍 **Advanced Search System** (NEW)
- **BM25 Lexical Search**: Precise keyword matching with barbershop terminology
- **Cross-Encoder Reranking**: AI-powered relevance optimization
- **Contextual Retrieval**: User preference and location-based results
- **Query Expansion**: Intelligent synonym matching for barbershop terms
- **Multi-Index RAG Pipeline**: Combines semantic + keyword + contextual signals

### 💰 Business Management
- **Six Figure Barber Methodology**: Revenue optimization and client value tracking
- **Appointment Management**: Intelligent scheduling with conflict prevention
- **Payment Processing**: Stripe Connect integration with automatic payouts
- **Analytics Dashboard**: Comprehensive business intelligence and reporting

### 🤖 AI-Powered Features
- **Semantic Search**: Voyage.ai embeddings for intelligent content discovery
- **Upselling Engine**: AI-driven revenue optimization suggestions
- **Performance Benchmarking**: Automated business metrics tracking
- **Smart CTAs**: Context-aware call-to-action generation

### 🔐 Enterprise Security
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions system
- **Multi-Factor Authentication**: TOTP-based MFA support
- **API Rate Limiting**: Protection against abuse

## 🛠 Technology Stack

### Core Framework
- **FastAPI**: Modern, fast web framework for APIs
- **SQLAlchemy**: Powerful SQL toolkit and ORM
- **PostgreSQL**: Production database (SQLite for development)
- **Redis**: Caching and session management
- **Alembic**: Database migration management

### AI & Search
- **Voyage.ai**: State-of-the-art semantic embeddings
- **BM25**: Traditional information retrieval algorithm  
- **Sentence Transformers**: Cross-encoder reranking models
- **NumPy/SciPy**: Scientific computing for search algorithms

### Integrations
- **Stripe Connect**: Payment processing and marketplace payouts
- **Google Calendar**: Two-way calendar synchronization
- **SendGrid**: Transactional email delivery
- **Twilio**: SMS notifications and communication

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- PostgreSQL (production) or SQLite (development)
- Redis (optional, for caching)

### Installation

1. **Clone and setup environment:**
```bash
cd backend-v2
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp .env.template .env
# Edit .env with your configuration
```

3. **Setup database:**
```bash
alembic upgrade head
```

4. **Start development server:**
```bash
uvicorn main:app --reload
```

### Docker Development (Recommended)
```bash
# Quick development setup
./docker-dev-start.sh

# Full production setup
./docker-start.sh

# Stop services
./docker-stop.sh
```

## 🔍 Advanced Search

### Search Capabilities
The platform includes state-of-the-art search capabilities:

```python
# Test search system
python test_search_system_final.py

# Test individual components
python simple_search_test.py
```

### API Endpoints
- `GET /api/v2/search/advanced/barbers` - Full advanced search
- `GET /api/v2/search/enhanced/barbers` - Enhanced semantic search
- `GET /api/v2/search/suggestions/intelligent` - AI-powered suggestions
- `GET /api/v2/search/capabilities` - System status

### Search Methods
1. **Semantic Search**: Natural language understanding
2. **BM25 Search**: Precise keyword matching  
3. **Hybrid Search**: Balanced approach (recommended)
4. **Advanced Search**: Full pipeline with reranking (production)

## 📚 Documentation

### Development Guides
- **[CLAUDE.md](./CLAUDE.md)**: Development guidelines and best practices
- **[API_SEARCH_DOCUMENTATION.md](./API_SEARCH_DOCUMENTATION.md)**: Complete search API reference
- **[SEARCH_USER_GUIDE.md](./SEARCH_USER_GUIDE.md)**: User-facing search documentation

### Feature Documentation
- **[ADVANCED_SEARCH_IMPLEMENTATION_SUMMARY.md](./ADVANCED_SEARCH_IMPLEMENTATION_SUMMARY.md)**: Technical implementation details
- **[AUTH_README.md](./AUTH_README.md)**: Authentication system
- **[PERFORMANCE_BENCHMARK_README.md](./PERFORMANCE_BENCHMARK_README.md)**: Performance monitoring
- **[SEO_OPTIMIZATION_SERVICE_README.md](./SEO_OPTIMIZATION_SERVICE_README.md)**: SEO features

## 🧪 Testing

### Run Tests
```bash
# All tests with coverage
pytest --cov=. --cov-report=term-missing

# Specific test categories
pytest tests/unit/              # Unit tests
pytest tests/integration/       # Integration tests
pytest tests/e2e/              # End-to-end tests

# Search system tests
python test_search_system_final.py
python simple_search_test.py
```

### Test Coverage Requirements
- **Minimum Coverage**: 80% for all new code
- **Critical Paths**: 95% coverage for auth, payments, bookings, search
- **Integration Tests**: Required for all API endpoints

## 🚀 Deployment

### Environment Configuration
```bash
# Development
PORT=8000
DATABASE_URL=sqlite:///./6fb_booking.db
DEBUG=true

# Production
PORT=8000
DATABASE_URL=postgresql://user:pass@host:5432/db
DEBUG=false
STRIPE_SECRET_KEY=sk_live_...
VOYAGE_API_KEY=pa-...
```

### Production Dependencies
```bash
# Core dependencies
fastapi==0.109.2
uvicorn[standard]==0.27.1
sqlalchemy==2.0.25
psycopg2-binary==2.9.9

# Advanced search
rank-bm25==0.2.2
sentence-transformers==2.2.2
voyageai>=0.2.0

# AI & Analytics
anthropic>=0.8.0
numpy==1.26.4
scipy==1.12.0
```

### Database Migrations
```bash
# Create new migration
alembic revision -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🔧 Configuration

### Search System
```python
from services.advanced_search_service import AdvancedSearchConfig

config = AdvancedSearchConfig(
    enable_reranking=True,           # Cross-encoder reranking
    enable_contextual=True,          # User preference boosting
    semantic_weight=0.4,             # Voyage.ai semantic weight
    bm25_weight=0.3,                # BM25 keyword weight
    contextual_weight=0.3            # Contextual boost weight
)
```

### API Rate Limits
- **Search requests**: 100/minute per user
- **Analytics requests**: 50/minute per user
- **General API**: 1000/minute per user

## 📊 Monitoring

### Health Checks
```bash
# System health
curl http://localhost:8000/health

# Search capabilities
curl http://localhost:8000/api/v2/search/capabilities

# Database status
curl http://localhost:8000/api/v2/status/database
```

### Performance Metrics
- **Search Response Time**: Target < 500ms
- **API Uptime**: 99.9% SLA
- **Database Performance**: Monitored via built-in analytics
- **Cache Hit Rate**: Optimized for frequently accessed data

## 🤝 Contributing

### Development Workflow
1. **Start from staging branch**: `git checkout staging`
2. **Create feature branch**: `git checkout -b feature/name-YYYYMMDD`
3. **Develop with tests**: Follow TDD approach
4. **Test thoroughly**: Run full test suite
5. **Deploy to staging**: Create PR to staging branch
6. **Deploy to production**: Create PR to production branch

### Code Quality
- **Linting**: ESLint (frontend), ruff/black (backend)
- **Type Checking**: TypeScript (frontend), mypy (backend)
- **Testing**: Jest (frontend), pytest (backend)
- **Coverage**: Minimum 80% for new code

## 🔐 Security

### Authentication
- **JWT Tokens**: Secure token-based auth
- **Password Hashing**: bcrypt with salt
- **Rate Limiting**: Built-in protection
- **CORS**: Configured for production domains

### Data Protection
- **PCI Compliance**: Via Stripe Connect
- **Encryption**: Data at rest and in transit
- **Audit Logging**: Comprehensive activity tracking
- **Privacy Controls**: GDPR compliance features

## 🆘 Support

### Common Issues
- **Search not working**: Check `VOYAGE_API_KEY` environment variable
- **Database errors**: Verify connection string and run migrations
- **Performance issues**: Monitor via `/api/v2/search/analytics/query-performance`
- **Authentication failures**: Check JWT token validity

### Debugging
```bash
# Enable debug logging
export DEBUG=true

# Check search system status
python -c "from services.advanced_search_service import advanced_search; print('Ready:', advanced_search.reranker.is_available())"

# Test database connection
python -c "from db import get_db; next(get_db()); print('Database OK')"
```

### Getting Help
- **Issues**: Create GitHub issue with detailed description
- **Documentation**: Check relevant README files
- **Performance**: Use built-in analytics endpoints
- **Search Problems**: Run diagnostic tests

## 📈 Roadmap

### Upcoming Features
- **Enhanced Analytics**: Advanced business intelligence
- **Mobile API**: Dedicated mobile app endpoints  
- **Multi-language**: Internationalization support
- **Advanced Integrations**: Additional third-party services

### Performance Improvements
- **Caching Optimization**: Advanced Redis strategies
- **Database Optimization**: Query performance improvements
- **Search Enhancement**: Additional ML models
- **Real-time Features**: WebSocket support

---

**Version**: 2.0.0-advanced  
**Last Updated**: July 27, 2025  
**License**: Proprietary

For detailed API documentation, visit `/docs` when the server is running.