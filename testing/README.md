# BookedBarber V2 Load Testing Suite

Comprehensive load testing infrastructure designed to validate BookedBarber V2's capacity for handling **10,000+ concurrent users** in production.

## 🎯 Overview

This load testing suite provides complete validation of the BookedBarber V2 system under realistic production loads. It includes:

- **Progressive Load Testing**: 100 → 1,000 → 5,000 → 10,000 users
- **Database Performance Testing**: Validates 81 critical performance indexes
- **Real-time Monitoring**: System resources, response times, error rates
- **Performance Benchmarking**: Against production requirements
- **Regression Testing**: Detects performance degradations
- **CI/CD Integration**: Automated testing in GitHub Actions

## 📊 Test Coverage

### Load Test Types
- **Smoke Tests**: Basic functionality verification (100 users, 2 minutes)
- **Gradual Load Tests**: Progressive ramping to identify capacity limits
- **Stress Tests**: Beyond-capacity testing to find breaking points
- **API Endpoint Tests**: Comprehensive endpoint performance validation
- **Critical Flow Tests**: Booking, payment, and calendar sync workflows
- **Database Load Tests**: Index performance and connection handling

### Performance Metrics
- Response times (P50, P95, P99)
- Throughput (requests per second)
- Error rates (4xx, 5xx)
- Resource utilization (CPU, memory, disk)
- Database performance (query times, connection counts)
- System scalability limits

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and **Python 3.9+**
2. **PostgreSQL** (for production-like testing)
3. **Redis** (for caching and session management)
4. **Artillery.js** (installed automatically)

### Installation

```bash
# Navigate to testing directory
cd testing

# Install dependencies
npm install

# Setup environment
npm run setup
```

### Basic Usage

```bash
# Run smoke tests (quick validation)
npm run test:smoke

# Run comprehensive load tests
npm run test:load

# Run all tests with monitoring
npm run test:all

# Run gradual load progression
npm run test:gradual

# Generate performance benchmarks
npm run test:performance
```

## 🧪 Test Suites

### 1. Smoke Tests
**Purpose**: Quick validation of basic functionality
**Duration**: ~3 minutes
**Load**: 100 concurrent users

```bash
npm run test:smoke
```

### 2. Gradual Load Tests
**Purpose**: Progressive load testing to find system limits
**Duration**: ~60 minutes
**Load**: 100 → 1,000 → 5,000 → 10,000 users

```bash
npm run test:gradual
# or
node scripts/gradual-load-test.js
```

### 3. Database Load Tests
**Purpose**: Validate database performance and indexes
**Duration**: ~10 minutes
**Coverage**: 81 performance-critical indexes

```bash
npm run test:database
# or
node scripts/database-load-test.js
```

### 4. API Endpoint Tests
**Purpose**: Comprehensive API performance validation
**Duration**: ~15 minutes
**Coverage**: All major API routes

```bash
npm run test:api
```

### 5. Critical Flow Tests
**Purpose**: End-to-end workflow performance
**Flows**: Booking, Payment, Calendar Sync

```bash
npm run test:booking
npm run test:payment
npm run test:calendar
```

### 6. Stress Tests
**Purpose**: Beyond-capacity testing
**Duration**: ~20 minutes
**Load**: Push system to breaking point

```bash
npm run test:stress
```

## 📈 Monitoring & Analytics

### Real-time Monitoring
The monitoring system provides live performance metrics during testing:

```bash
# Start monitoring dashboard
npm run monitor:start

# Access dashboard at http://localhost:3001/dashboard
open http://localhost:3001/dashboard
```

### Monitoring Features
- **System Metrics**: CPU, memory, disk usage
- **API Metrics**: Response times, throughput, error rates
- **Database Metrics**: Connection counts, query performance
- **Real-time Alerts**: Threshold-based notifications
- **WebSocket Dashboard**: Live updates during testing

### Performance Benchmarks
Comprehensive benchmarking against production requirements:

```bash
npm run test:performance
```

**Production Requirements**:
- P95 response time < 200ms
- P99 response time < 500ms
- Minimum 1,000 RPS throughput
- Error rate < 0.5%
- 10,000+ concurrent users support

## 🔄 CI/CD Integration

### GitHub Actions Workflow
Automated load testing runs on:
- Pull requests (smoke tests)
- Push to main (moderate tests)
- Daily schedule (full test suite)
- Manual dispatch (configurable)

```yaml
# Trigger workflow manually
gh workflow run load-testing.yml -f test_level=full -f target_users=10000
```

### Test Levels
- **smoke**: Basic validation (PRs)
- **moderate**: 1,000 user capacity (main branch)
- **full**: Complete 10,000 user validation (releases)
- **stress**: Breaking point identification (manual)

### CI Integration Commands
```bash
# Run in CI mode
node scripts/run-all-tests.js --ci

# Skip specific test types
node scripts/run-all-tests.js --skip-database --skip-monitoring

# Generate CI-friendly reports
npm run report:generate -- --ci
```

## 📊 Performance Regression Testing

### Baseline Management
```bash
# Create performance baseline
npm run regression:baseline

# Run regression analysis
npm run regression:test

# Compare against baseline
node scripts/regression-test.js
```

### Regression Detection
The framework automatically detects:
- Response time increases > 15-25%
- Throughput decreases > 10%
- Error rate increases > 50%
- Resource usage increases > 25-30%

### CI Integration
Regression tests run automatically on pull requests and provide:
- **Approve**: No significant regressions
- **Review**: Minor regressions detected
- **Reject**: Critical regressions found

## 📁 Directory Structure

```
testing/
├── artillery-configs/           # Artillery test configurations
│   ├── load-test-comprehensive.yml
│   ├── smoke-test.yml
│   ├── stress-test.yml
│   ├── booking-flow.yml
│   ├── payment-flow.yml
│   └── calendar-sync.yml
├── scripts/                     # Load testing scripts
│   ├── gradual-load-test.js
│   ├── database-load-test.js
│   ├── monitoring-collector.js
│   ├── performance-benchmarks.js
│   ├── regression-test.js
│   └── run-all-tests.js
├── reports/                     # Test results and reports
│   ├── baseline/               # Performance baselines
│   ├── final/                  # Comprehensive reports
│   ├── monitoring/             # Monitoring data
│   └── regression/             # Regression analysis
├── data/                       # Test data and fixtures
├── logs/                       # Test execution logs
└── .github/                    # CI/CD workflows
    └── workflows/
        └── load-testing.yml
```

## 🎛️ Configuration

### Environment Variables
```bash
# Backend configuration
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"
export REDIS_URL="redis://localhost:6379"

# Load testing configuration
export TARGET_USERS=10000
export TEST_DURATION=3600
export ERROR_THRESHOLD=5

# Monitoring configuration
export MONITORING_PORT=3001
export METRICS_COLLECTION_INTERVAL=5000
```

### Test Configuration
Edit `artillery-configs/*.yml` files to customize:
- Load progression phases
- User behavior scenarios
- Performance thresholds
- Test duration and intensity

### Monitoring Configuration
Customize monitoring in `scripts/monitoring-collector.js`:
- Alert thresholds
- Metric collection intervals
- Dashboard refresh rates
- Resource monitoring targets

## 📋 Production Readiness Checklist

### Performance Requirements ✅
- [ ] P95 response time < 200ms
- [ ] P99 response time < 500ms  
- [ ] Throughput > 1,000 RPS
- [ ] Error rate < 0.5%
- [ ] 10,000+ concurrent users

### Scalability Requirements ✅
- [ ] Database connection pooling
- [ ] Redis caching implementation
- [ ] CDN configuration
- [ ] Auto-scaling configuration
- [ ] Load balancer setup

### Monitoring Requirements ✅
- [ ] APM monitoring (DataDog/New Relic)
- [ ] Error tracking (Sentry)
- [ ] Log aggregation (ELK stack)
- [ ] Health check endpoints
- [ ] Performance alerting

## 🛠️ Troubleshooting

### Common Issues

**1. Tests failing with connection errors**
```bash
# Check if backend is running
curl http://localhost:8000/health

# Verify database connection
curl http://localhost:8000/api/v1/health/database

# Check system resources
npm run validate:system
```

**2. High error rates during testing**
```bash
# Check application logs
tail -f backend-v2/logs/app.log

# Monitor database connections
npm run monitor:database

# Verify test data setup
npm run setup:test-data
```

**3. Monitoring not working**
```bash
# Restart monitoring
npm run monitor:restart

# Check monitoring logs
tail -f testing/logs/monitoring.log

# Verify ports are available
lsof -i :3001 -i :8080
```

### Performance Debugging
```bash
# Generate detailed performance profile
npm run profile:generate

# Analyze slow queries
npm run analyze:database

# Check resource bottlenecks
npm run analyze:resources
```

## 📚 Advanced Usage

### Custom Test Scenarios
Create custom Artillery configurations:

```yaml
# custom-test.yml
config:
  target: 'http://localhost:8000'
  phases:
    - duration: 300
      arrivalRate: 50
scenarios:
  - name: "Custom Scenario"
    flow:
      - get:
          url: "/api/v1/custom-endpoint"
```

### Monitoring Integration
Integrate with external monitoring systems:

```javascript
// Custom monitoring
const monitor = new LoadTestMonitor();
monitor.addMetricsEndpoint('http://custom-metrics-api');
monitor.startMonitoring();
```

### CI/CD Customization
Customize GitHub Actions workflow:

```yaml
# Add custom test step
- name: Custom Performance Test
  run: |
    node scripts/custom-performance-test.js
  env:
    CUSTOM_CONFIG: ${{ secrets.CUSTOM_CONFIG }}
```

## 🤝 Contributing

### Adding New Tests
1. Create Artillery configuration in `artillery-configs/`
2. Add test script to `scripts/` if needed
3. Update `package.json` scripts
4. Add documentation to this README

### Modifying Thresholds
Update performance requirements in:
- `scripts/performance-benchmarks.js`
- `scripts/regression-test.js`
- `artillery-configs/*.yml`

### Extending Monitoring
Add new metrics to:
- `scripts/monitoring-collector.js`
- Dashboard HTML in the monitoring script
- Alert thresholds configuration

## 📝 License

This load testing suite is part of the BookedBarber V2 project and follows the same licensing terms.

## 🆘 Support

For issues with the load testing suite:
1. Check the troubleshooting section above
2. Review test logs in `testing/logs/`
3. Examine monitoring data in `testing/reports/monitoring/`
4. Create an issue with test configuration and error details

---

**BookedBarber V2 Load Testing Suite** - Validating production readiness for 10,000+ concurrent users.