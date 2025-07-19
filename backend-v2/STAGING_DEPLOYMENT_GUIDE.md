# BookedBarber V2 Agent System - Staging Deployment Guide

**Version**: 1.0  
**Date**: 2025-01-19  
**Prerequisites**: Complete staging readiness assessment and checklist

---

## 🎯 Overview

This guide provides step-by-step instructions for deploying the BookedBarber V2 Agent System to the staging environment. The deployment follows a phased approach to minimize risk and ensure system stability.

## 📋 Pre-Deployment Requirements

### ✅ Prerequisites Checklist
- [ ] **Staging Readiness Assessment completed** (`STAGING_READINESS_ASSESSMENT.md`)
- [ ] **All staging checklist items verified** (`STAGING_DEPLOYMENT_CHECKLIST.md`)
- [ ] **Integration tests passed** (`test_real_data_integration.py`)
- [ ] **Environment configuration completed** (`.env.staging`)
- [ ] **Database migration strategy confirmed**
- [ ] **Rollback plan prepared and tested**

### 🔧 Required Tools and Access
- [ ] **Staging environment access** (SSH, admin panel, etc.)
- [ ] **Database administration access** (PostgreSQL staging)
- [ ] **API key access** (OpenAI, Stripe, SendGrid, etc.)
- [ ] **Monitoring system access** (Sentry, logging dashboard)
- [ ] **Git repository access** with deployment permissions

### 📊 Baseline Metrics
Before deployment, record current system performance:
```bash
# Capture baseline metrics
curl -s https://staging-api.bookedbarber.com/health > baseline_health.json
curl -s https://staging-api.bookedbarber.com/metrics > baseline_metrics.json

# Database performance baseline
psql $STAGING_DATABASE_URL -c "SELECT count(*) FROM appointments WHERE created_at > NOW() - INTERVAL '24 hours';"
```

---

## 🚀 Phase 1: Infrastructure Preparation (30-45 minutes)

### Step 1.1: Environment Setup
```bash
# 1. Clone/update repository
cd /opt/bookedbarber-v2
git checkout staging
git pull origin staging

# 2. Set up staging environment
cd backend-v2
./scripts/setup-staging-env.sh

# 3. Verify environment configuration
source .env.staging
echo "Database: $DATABASE_URL"
echo "Agent System: $AGENT_SYSTEM_ENABLED"
echo "OpenAI: ${OPENAI_API_KEY:0:10}..."
```

### Step 1.2: Database Preparation
```bash
# 1. Backup current staging database
pg_dump $STAGING_DATABASE_URL > staging_backup_$(date +%Y%m%d_%H%M).sql

# 2. Create agent system tables
./scripts/setup-staging-env.sh --database-only

# 3. Verify table creation
psql $STAGING_DATABASE_URL -c "\dt" | grep agent
```

### Step 1.3: Dependency Installation
```bash
# 1. Update Python dependencies
pip install -r requirements.txt

# 2. Install additional agent system dependencies
pip install openai anthropic tiktoken

# 3. Verify installations
python -c "import openai; print('OpenAI:', openai.__version__)"
```

### 🎯 Phase 1 Success Criteria
- ✅ Environment variables properly configured
- ✅ Database connection successful
- ✅ All agent tables created
- ✅ Dependencies installed and verified

---

## 🔧 Phase 2: Agent System Deployment (45-60 minutes)

### Step 2.1: Code Deployment
```bash
# 1. Deploy agent system code
./MIGRATE_AGENTS_TO_ROOT_V2.sh --environment=staging --mode=deploy

# 2. Verify deployment
ls -la utils/sub_agent_manager.py
ls -la services/agent_service.py
ls -la migrations/

# 3. Check for deployment errors
tail -f /var/log/bookedbarber/deployment.log
```

### Step 2.2: Service Configuration
```bash
# 1. Configure agent system services
systemctl stop bookedbarber-api  # Brief downtime for configuration

# 2. Update application configuration
cp .env.staging /opt/bookedbarber-v2/backend-v2/.env

# 3. Restart services
systemctl start bookedbarber-api
systemctl enable bookedbarber-agent-worker  # If using separate worker
```

### Step 2.3: Initial Health Check
```bash
# 1. Test basic API health
curl -f https://staging-api.bookedbarber.com/health

# 2. Test agent system endpoints
curl -H "Authorization: Bearer $STAGING_TOKEN" \
     https://staging-api.bookedbarber.com/api/v2/agents/health

# 3. Verify database connectivity
python -c "
from utils.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    result = conn.execute(text('SELECT COUNT(*) FROM agents'))
    print(f'Agent count: {result.scalar()}')
"
```

### 🎯 Phase 2 Success Criteria
- ✅ Agent system code deployed successfully
- ✅ API endpoints responding correctly
- ✅ Database connections stable
- ✅ No critical errors in logs

---

## 🧪 Phase 3: Limited Testing & Validation (30-45 minutes)

### Step 3.1: Agent System Activation (Limited)
```bash
# 1. Activate agent system in limited mode
./ACTIVATE_AGENTS_V2.sh --environment=staging --mode=limited

# 2. Verify agent templates loaded
curl -H "Authorization: Bearer $STAGING_TOKEN" \
     https://staging-api.bookedbarber.com/api/v2/agents/templates

# 3. Check agent status
curl -H "Authorization: Bearer $STAGING_TOKEN" \
     https://staging-api.bookedbarber.com/api/v2/agents/status
```

### Step 3.2: Integration Testing
```bash
# 1. Run comprehensive integration tests
python test_real_data_integration.py --staging --output=staging_deployment_test.md

# 2. Verify test results
cat staging_deployment_test.md | grep "Staging Ready"

# 3. Check for any test failures
grep -i "error\|failed" staging_deployment_test.md
```

### Step 3.3: Performance Validation
```bash
# 1. Monitor system performance during testing
htop  # Check CPU/memory usage
iostat -x 1 10  # Check disk I/O

# 2. Database performance monitoring
psql $STAGING_DATABASE_URL -c "
SELECT 
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as total_operations,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables 
WHERE tablename LIKE 'agent%'
ORDER BY total_operations DESC;
"

# 3. API response time validation
for i in {1..10}; do
    time curl -s https://staging-api.bookedbarber.com/api/v2/agents/health > /dev/null
done
```

### 🎯 Phase 3 Success Criteria
- ✅ Agent system activated successfully
- ✅ Integration tests pass with >80% success rate
- ✅ Performance within acceptable ranges
- ✅ No data integrity issues detected

---

## 📊 Phase 4: Full Deployment & Monitoring (60-90 minutes)

### Step 4.1: Full Agent System Activation
```bash
# 1. Enable all agent types
./ACTIVATE_AGENTS_V2.sh --environment=staging --mode=full

# 2. Verify all agents are active
curl -H "Authorization: Bearer $STAGING_TOKEN" \
     https://staging-api.bookedbarber.com/api/v2/agents/status | jq '.agents'

# 3. Test each agent type
python test_agent_manual.py --environment=staging --test-all-types
```

### Step 4.2: Monitoring Setup
```bash
# 1. Configure application monitoring
# Update Sentry configuration
export SENTRY_DSN="$STAGING_SENTRY_DSN"
export SENTRY_ENVIRONMENT="staging"

# 2. Set up performance monitoring
# Configure APM (DataDog/New Relic)
export APM_SERVICE_NAME="bookedbarber-staging"

# 3. Enable detailed logging
export LOG_LEVEL=INFO
export AGENT_CONVERSATION_LOGGING=true
```

### Step 4.3: Load Testing (Optional)
```bash
# 1. Prepare load testing data
python setup_agent_testing.py --environment=staging --test-data=load

# 2. Run controlled load test
# Use Apache Bench or similar
ab -n 100 -c 10 https://staging-api.bookedbarber.com/api/v2/agents/health

# 3. Monitor during load test
# Watch CPU, memory, database connections
watch -n 1 "ps aux | grep python"
```

### 🎯 Phase 4 Success Criteria
- ✅ All agent types functioning correctly
- ✅ Monitoring and alerting active
- ✅ Performance stable under normal load
- ✅ Error rates below 0.1%

---

## 🔍 Phase 5: Validation & Sign-off (30-60 minutes)

### Step 5.1: End-to-End Testing
```bash
# 1. Test complete agent workflows
python -c "
import asyncio
from test_agent_manual import RealDataIntegrationTester

async def test_workflows():
    tester = RealDataIntegrationTester(use_staging_db=True)
    # Test rebooking workflow
    result = await tester.test_rebooking_workflow()
    print(f'Rebooking test: {result}')
    
    # Test retention workflow  
    result = await tester.test_retention_workflow()
    print(f'Retention test: {result}')

asyncio.run(test_workflows())
"

# 2. Verify agent conversation persistence
psql $STAGING_DATABASE_URL -c "
SELECT 
    agent_type,
    COUNT(*) as conversation_count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
FROM agent_conversations 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY agent_type;
"
```

### Step 5.2: Business Logic Validation
```bash
# 1. Test Six Figure Barber methodology integration
python -c "
from services.agent_service import AgentService
service = AgentService()

# Test premium positioning in responses
response = service.generate_response('upsell', {
    'client_name': 'Test Client',
    'service_history': ['Basic Cut'],
    'avg_spend': 25.00
})
print('Upsell response:', response)
"

# 2. Verify data access controls
python -c "
from services.agent_service import AgentService
# Test unauthorized access (should fail)
try:
    service = AgentService()
    result = service.get_client_data(999, user_role='CLIENT')
    print('ERROR: Unauthorized access succeeded')
except Exception as e:
    print('SUCCESS: Access control working:', str(e))
"
```

### Step 5.3: Security Verification
```bash
# 1. Test API authentication
curl -H "Authorization: Bearer invalid_token" \
     https://staging-api.bookedbarber.com/api/v2/agents/status
# Should return 401 Unauthorized

# 2. Test rate limiting
for i in {1..20}; do
    curl -s https://staging-api.bookedbarber.com/api/v2/agents/health
done
# Should see rate limiting after threshold

# 3. Verify CORS configuration
curl -H "Origin: https://malicious-site.com" \
     https://staging-api.bookedbarber.com/api/v2/agents/health
# Should reject cross-origin requests
```

### 🎯 Phase 5 Success Criteria
- ✅ End-to-end workflows complete successfully
- ✅ Business logic validation passes
- ✅ Security controls functioning properly
- ✅ All monitoring systems operational

---

## 📈 Post-Deployment Monitoring

### Immediate Monitoring (First 4 hours)
```bash
# 1. Monitor error rates
watch -n 30 "curl -s https://staging-api.bookedbarber.com/metrics | grep error_rate"

# 2. Check agent conversation success rates
psql $STAGING_DATABASE_URL -c "
SELECT 
    agent_type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY agent_type), 2) as percentage
FROM agent_conversations 
WHERE created_at > NOW() - INTERVAL '4 hours'
GROUP BY agent_type, status
ORDER BY agent_type, status;
"

# 3. Monitor system resources
iostat -x 1 | head -20  # Disk I/O
free -h  # Memory usage
top -p $(pgrep -f "python.*main:app")  # Process monitoring
```

### Extended Monitoring (24-48 hours)
- **Business Metrics**: Track agent conversation quality, client response rates
- **Technical Metrics**: Monitor database performance, API response times
- **Error Tracking**: Review Sentry alerts, application logs
- **Performance**: Check for memory leaks, connection pool exhaustion

### Key Monitoring Dashboards
1. **Sentry Dashboard**: Error tracking and performance monitoring
2. **Database Dashboard**: Query performance, connection pools
3. **Application Metrics**: API response times, throughput
4. **Agent Metrics**: Conversation success rates, response quality

---

## 🚨 Rollback Procedures

### Immediate Rollback (< 5 minutes)
```bash
# 1. Disable agent system
export AGENT_SYSTEM_ENABLED=false
systemctl restart bookedbarber-api

# 2. Verify agent system disabled
curl https://staging-api.bookedbarber.com/api/v2/agents/health
# Should return "Agent system disabled"
```

### Partial Rollback (< 15 minutes)
```bash
# 1. Revert to previous git commit
git checkout staging-backup-$(date +%Y%m%d)
systemctl restart bookedbarber-api

# 2. Remove agent tables (if causing issues)
psql $STAGING_DATABASE_URL -c "
DROP TABLE IF EXISTS agent_conversations CASCADE;
DROP TABLE IF EXISTS agent_templates CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
"
```

### Full Rollback (< 30 minutes)
```bash
# 1. Restore database backup
pg_dump $STAGING_DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M).sql
psql $STAGING_DATABASE_URL < staging_backup_$(date +%Y%m%d)_*.sql

# 2. Revert application code
git reset --hard staging-pre-agent-deployment
systemctl restart bookedbarber-api

# 3. Verify full rollback
curl https://staging-api.bookedbarber.com/health
./scripts/test-core-functionality.sh
```

---

## ✅ Success Metrics & Sign-off

### Technical Success Criteria
- [ ] **System Stability**: No critical errors for 4+ hours
- [ ] **Performance**: API response time < 200ms (p95)
- [ ] **Agent Success Rate**: >90% successful conversations
- [ ] **Database Performance**: Query time < 100ms (p95)
- [ ] **Error Rate**: <0.01% across all endpoints

### Business Success Criteria
- [ ] **Agent Response Quality**: Manual review shows appropriate responses
- [ ] **Client Data Security**: Access controls functioning properly
- [ ] **Six Figure Barber Alignment**: Agent responses support methodology
- [ ] **Integration Stability**: No impact on core booking functionality

### Stakeholder Sign-off
- [ ] **Technical Lead**: System architecture and performance
- [ ] **Product Owner**: Business logic and agent response quality
- [ ] **Security Team**: Data access controls and security measures
- [ ] **Operations Team**: Monitoring and maintenance procedures

---

## 📞 Emergency Contacts & Support

### Technical Escalation
- **Platform Engineering**: [Contact Information]
- **Database Administration**: [Contact Information]
- **Security Team**: [Contact Information]

### Business Escalation
- **Product Owner**: [Contact Information]
- **Six Figure Barber Program Lead**: [Contact Information]
- **Customer Success**: [Contact Information]

### Monitoring & Alerting
- **Sentry Alerts**: Configured for critical errors
- **Database Alerts**: Query performance degradation
- **Performance Alerts**: Response time threshold exceeded
- **Business Logic Alerts**: Agent conversation failure rates

---

## 📚 Related Documentation

- **[Staging Readiness Assessment](./STAGING_READINESS_ASSESSMENT.md)**: Comprehensive readiness evaluation
- **[Staging Deployment Checklist](./STAGING_DEPLOYMENT_CHECKLIST.md)**: Detailed pre-deployment checklist
- **[Agent System Architecture](./AGENT_SYSTEM_ARCHITECTURE.md)**: Technical architecture overview
- **[Six Figure Barber Methodology](./SIX_FIGURE_BARBER_METHODOLOGY.md)**: Business methodology integration
- **[Monitoring & Alerting Guide](./MONITORING_GUIDE.md)**: Comprehensive monitoring setup

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-19  
**Next Review**: Post-deployment retrospective

**Deployment Status**: ⏳ Ready for Execution  
**Estimated Deployment Time**: 4-6 hours  
**Risk Level**: Medium (with comprehensive testing and rollback procedures)