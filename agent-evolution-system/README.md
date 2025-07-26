# Agent Evolution System

A comprehensive system for AI agent improvement through systematic learning, feedback loops, and knowledge accumulation.

## 🚀 Features

- **Prompt Version Control**: Git-based versioning with semantic versioning and A/B testing
- **Feedback Loop Implementation**: Automated pattern detection and improvement suggestions
- **Pattern Library**: Intelligent code pattern storage and recommendation
- **Analytics Dashboard**: Real-time monitoring and performance visualization
- **Automated Improvement Engine**: ML-based optimization with confidence scoring
- **Integration Workflows**: Daily, weekly, and monthly automation
- **Production-Ready**: Docker deployment with monitoring and scaling

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Frontend Dashboard](#frontend-dashboard)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Contributing](#contributing)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- MongoDB 7+
- Redis 7+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agent-evolution-system
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Docker Setup (Recommended)**
   ```bash
   # Start all services
   docker-compose up -d
   
   # Check health
   docker-compose ps
   ```

4. **Manual Setup (Alternative)**
   ```bash
   # Backend
   cd backend-v2
   npm install
   npm run migrate
   npm run dev
   
   # Frontend (new terminal)
   cd frontend
   npm install
   npm start
   ```

5. **Access the System**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  FastAPI Backend │    │   Databases     │
│                 │    │                 │    │                 │
│ • Dashboard     │◄──►│ • Version Control│◄──►│ • PostgreSQL    │
│ • Agent Manager │    │ • Feedback Proc. │    │ • MongoDB       │
│ • Pattern Lib   │    │ • Pattern Extr.  │    │ • Redis         │
│ • Analytics     │    │ • Agent Optimizer│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Services

1. **PromptVersionControl**: Git-based prompt versioning
2. **FeedbackProcessor**: Pattern analysis and improvement generation
3. **PatternExtractor**: Code pattern recognition and categorization
4. **AgentOptimizer**: ML-based optimization engine
5. **ScheduledTasks**: Automated daily/weekly workflows

## 📚 API Documentation

### Authentication
All API endpoints support optional authentication via JWT tokens.

### Core Endpoints

#### Agents
```http
GET    /api/agents                    # List all agents
POST   /api/agents                    # Create new agent
GET    /api/agents/:name              # Get agent details
PUT    /api/agents/:name/prompt       # Update agent prompt
GET    /api/agents/:name/versions     # Get version history
POST   /api/agents/:name/rollback     # Rollback to version
DELETE /api/agents/:name              # Deactivate agent
```

#### Feedback
```http
POST   /api/feedback                  # Submit feedback
GET    /api/feedback/:agentName       # Get agent feedback
GET    /api/feedback/:agentName/summary # Get feedback summary
```

#### Patterns
```http
POST   /api/patterns/extract          # Extract code pattern
GET    /api/patterns/recommend        # Get recommendations
GET    /api/patterns                  # Search patterns
POST   /api/patterns/:id/rate         # Rate pattern success
```

#### Analytics
```http
GET    /api/analytics/dashboard       # Dashboard data
GET    /api/analytics/agents/:name    # Agent analytics
GET    /api/analytics/patterns        # Pattern analytics
```

#### Optimization
```http
POST   /api/optimization/suggest      # Get suggestions
POST   /api/optimization/predict      # Predict impact
POST   /api/optimization/apply        # Apply optimization
```

### Example Usage

#### Creating an Agent
```javascript
const agent = await fetch('/api/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'database-specialist',
    description: 'Expert in database optimization',
    category: 'database'
  })
});
```

#### Submitting Feedback
```javascript
const feedback = await fetch('/api/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_name: 'database-specialist',
    project_id: 'project-123',
    corrections_needed: ['Add connection pooling'],
    missing_capabilities: ['Redis caching'],
    quality_score: 8,
    user_satisfaction: 9,
    time_to_completion: 45
  })
});
```

#### Extracting Code Pattern
```javascript
const pattern = await fetch('/api/patterns/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: `
      const pool = new Pool({
        max: 20,
        idleTimeoutMillis: 30000
      });
    `,
    category: 'database',
    language: 'javascript',
    description: 'Database connection pooling pattern'
  })
});
```

## 🎨 Frontend Dashboard

### Dashboard Features

1. **Overview Dashboard**
   - Real-time metrics
   - Performance trends
   - Quick actions

2. **Agent Management**
   - Agent list and details
   - Version history
   - Performance comparison

3. **Pattern Library**
   - Search and browse patterns
   - Usage statistics
   - Success rates

4. **Feedback Center**
   - Submit feedback
   - View feedback trends
   - Pattern analysis

5. **Analytics**
   - Detailed performance insights
   - Custom date ranges
   - Export functionality

### Key Components

- **AgentDashboard**: Main overview with charts
- **PromptEditor**: Monaco-based code editor
- **MetricsVisualizer**: Chart.js visualizations
- **FeedbackForm**: Structured feedback collection

## ⚙️ Configuration

### Environment Variables

```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=agent_evolution
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

MONGODB_URI=mongodb://localhost:27017/agent_patterns
REDIS_URL=redis://localhost:6379

# Server Configuration
PORT=3001
NODE_ENV=development
API_BASE_URL=http://localhost:3001

# Git Configuration
GIT_REPOSITORY_PATH=./agent-prompts
GIT_USER_NAME=Agent Evolution System
GIT_USER_EMAIL=agent-evolution@example.com

# Security
JWT_SECRET=your-super-secret-jwt-key-here
BCRYPT_ROUNDS=12

# Machine Learning
PATTERN_SIMILARITY_THRESHOLD=0.85
AUTO_OPTIMIZE_THRESHOLD=0.75
```

### Advanced Configuration

#### Custom Optimization Rules
```javascript
// backend/config/optimization-rules.js
module.exports = {
  qualityThreshold: 7.0,
  autoOptimizeConfidence: 0.8,
  maxSuggestionsPerAgent: 5,
  feedbackWindowDays: 30
};
```

#### Pattern Categories
```javascript
// backend/config/pattern-categories.js
module.exports = {
  database: ['connection_pooling', 'query_optimization', 'indexing'],
  api: ['rate_limiting', 'validation', 'error_handling'],
  frontend: ['lazy_loading', 'memoization', 'state_management'],
  security: ['authentication', 'authorization', 'encryption']
};
```

## 💻 Development

### Project Structure
```
/agent-evolution-system
├── /backend                    # Node.js/Express backend
│   ├── /api                   # REST API endpoints
│   ├── /services              # Business logic
│   ├── /models                # Database models
│   ├── /utils                 # Utilities
│   └── /tests                 # Test suites
├── /frontend                  # React frontend
│   ├── /src
│   │   ├── /components        # Reusable components
│   │   ├── /pages            # Page components
│   │   ├── /hooks            # Custom hooks
│   │   └── /utils            # Utilities
├── /agent-prompts             # Git repository for prompts
├── /knowledge-base            # Pattern storage
└── /monitoring               # Monitoring config
```

### Development Workflow

1. **Feature Development**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   npm test
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

2. **Testing**
   ```bash
   # Backend tests
   cd backend-v2 && npm test
   
   # Frontend tests
   cd frontend && npm test
   
   # Integration tests
   npm run test:integration
   ```

3. **Code Quality**
   ```bash
   # Linting
   npm run lint
   
   # Type checking
   npm run type-check
   
   # Security audit
   npm audit
   ```

### Adding New Agents

1. **Create Agent**
   ```javascript
   const agent = await fetch('/api/agents', {
     method: 'POST',
     body: JSON.stringify({
       name: 'new-specialist',
       description: 'Specialist in X domain',
       category: 'domain-x'
     })
   });
   ```

2. **Set Initial Prompt**
   ```javascript
   await fetch(`/api/agents/new-specialist/prompt`, {
     method: 'PUT',
     body: JSON.stringify({
       content: 'You are a specialist in...',
       changelog: 'Initial prompt creation'
     })
   });
   ```

## 🧪 Testing

### Test Framework
- **Backend**: Jest + Supertest
- **Frontend**: Jest + React Testing Library
- **Integration**: Custom test suite
- **E2E**: Playwright (planned)

### Running Tests

```bash
# All tests
npm test

# Backend only
cd backend-v2 && npm test

# Frontend only
cd frontend && npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Categories

1. **Unit Tests**
   - Service logic
   - Utility functions
   - Component behavior

2. **Integration Tests**
   - API endpoints
   - Database operations
   - Service interactions

3. **Performance Tests**
   - Load testing
   - Memory usage
   - Response times

### Example Test

```javascript
describe('FeedbackProcessor', () => {
  it('should process feedback and generate improvements', async () => {
    const feedback = {
      agent_name: 'test-agent',
      quality_score: 6,
      corrections_needed: ['Fix validation']
    };
    
    const result = await feedbackProcessor.collectFeedback(
      'project-1', 'test-agent', feedback
    );
    
    expect(result.processed).toBe(true);
    expect(result.feedbackId).toBeDefined();
  });
});
```

## 🚀 Deployment

### Docker Deployment (Recommended)

1. **Production Build**
   ```bash
   # Build all services
   docker-compose -f docker-compose.prod.yml build
   
   # Start production stack
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Environment Setup**
   ```bash
   # Copy production environment
   cp .env.production .env
   
   # Generate secure secrets
   openssl rand -base64 32 > jwt_secret.txt
   ```

### Manual Deployment

1. **Backend Deployment**
   ```bash
   cd backend-v2
   npm ci --production
   npm run build
   npm start
   ```

2. **Frontend Deployment**
   ```bash
   cd frontend
   npm ci
   npm run build
   # Serve build/ with nginx or similar
   ```

### Cloud Deployment

#### AWS ECS
```bash
# Build and push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin
docker build -t agent-evolution .
docker tag agent-evolution:latest <account>.dkr.ecr.region.amazonaws.com/agent-evolution:latest
docker push <account>.dkr.ecr.region.amazonaws.com/agent-evolution:latest
```

#### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-evolution-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-evolution-backend
  template:
    metadata:
      labels:
        app: agent-evolution-backend
    spec:
      containers:
      - name: backend
        image: agent-evolution:latest
        ports:
        - containerPort: 3001
```

### Database Migration

```bash
# Run migrations
npm run migrate

# Seed initial data
npm run seed

# Backup database
pg_dump agent_evolution > backup.sql
```

## 📊 Monitoring

### Built-in Monitoring

1. **Health Checks**
   - `/health` endpoint
   - Database connectivity
   - Service status

2. **Performance Metrics**
   - Response times
   - Error rates
   - Resource usage

3. **Business Metrics**
   - Agent performance
   - Feedback trends
   - Pattern usage

### External Monitoring

#### Prometheus + Grafana
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    
  grafana:
    image: grafana/grafana
    ports: ["3030:3000"]
```

#### Application Monitoring
```javascript
// Sentry integration
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### Alerts

1. **System Alerts**
   - High error rates
   - Database connectivity
   - Memory/CPU usage

2. **Business Alerts**
   - Low agent quality scores
   - Feedback volume spikes
   - Pattern failures

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- API rate limiting

### Data Protection
- Input validation & sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

### Infrastructure Security
- Container security scanning
- Secret management
- Network isolation
- TLS/SSL encryption

## 📈 Performance Optimization

### Database Optimization
- Connection pooling
- Query optimization
- Index strategies
- Read replicas

### Caching Strategy
- Redis for session data
- API response caching
- Pattern result caching
- Frontend asset caching

### Scaling
- Horizontal scaling support
- Load balancing
- Auto-scaling groups
- CDN integration

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

### Code Standards
- ESLint configuration
- Prettier formatting
- TypeScript strict mode
- 80%+ test coverage

### Pull Request Process
1. Update documentation
2. Add/update tests
3. Ensure CI passes
4. Get review approval

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- 📖 Documentation: [docs/](./docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 Email: support@agent-evolution.com

## 🎯 Roadmap

### Version 2.0 (Q1 2024)
- [ ] Real-time collaboration
- [ ] Advanced ML models
- [ ] Multi-tenant support
- [ ] API rate limiting v2

### Version 2.1 (Q2 2024)
- [ ] Plugin architecture
- [ ] Custom dashboards
- [ ] Automated testing
- [ ] Performance benchmarks

---

**Built with ❤️ for AI Agent Evolution**