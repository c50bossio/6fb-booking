# BookedBarber V2 Agent System - Staging Deployment Checklist

## 🚨 PRE-DEPLOYMENT REQUIREMENTS (MANDATORY)

### ✅ Environment Setup
- [ ] **Staging database connection configured**
  ```bash
  # Update backend-v2/.env with staging PostgreSQL connection
  DATABASE_URL=postgresql://user:pass@staging-db:5432/bookedbarber_staging
  ```
- [ ] **Agent system environment variables set**
  ```bash
  AGENT_SYSTEM_ENABLED=true
  AGENT_LOG_LEVEL=INFO
  AGENT_MAX_CONCURRENT=10
  AGENT_RETRY_ATTEMPTS=3
  AGENT_TIMEOUT_SECONDS=30
  ```
- [ ] **Staging API keys configured**
  ```bash
  OPENAI_API_KEY=sk-staging-key
  STRIPE_SECRET_KEY=sk_test_staging
  SENDGRID_API_KEY=SG.staging-key
  ```

### ✅ Database Migration
- [ ] **Create agent tables in staging PostgreSQL**
  ```bash
  cd backend-v2
  python create_agent_tables.py --environment=staging
  ```
- [ ] **Verify table creation**
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name LIKE 'agent%';
  ```
- [ ] **Test database connection from application**
  ```bash
  python -c "from utils.database import engine; print(engine.connect())"
  ```

### ✅ Security Implementation
- [ ] **Agent API authentication added**
  ```python
  # Add to api/v1/agents.py
  @router.post("/activate")
  @require_auth(roles=["SHOP_OWNER", "ENTERPRISE_OWNER"])
  async def activate_agent(request: AgentActivationRequest):
  ```
- [ ] **Client data access controls**
  ```python
  # Add to services/agent_service.py
  def get_client_data(client_id: int, requesting_user: User):
      if not has_client_access(requesting_user, client_id):
          raise HTTPException(403, "Unauthorized client access")
  ```
- [ ] **Rate limiting configured**
  ```python
  # Add to middleware
  @app.middleware("http")
  async def rate_limit_agents(request: Request, call_next):
      # Implement rate limiting for /api/v2/agents/*
  ```

### ✅ Error Handling Enhancement
- [ ] **Agent operation try-catch blocks**
  ```python
  async def process_agent_conversation(conversation_id: int):
      try:
          result = await agent.process()
          return result
      except Exception as e:
          logger.error(f"Agent conversation failed: {e}")
          await mark_conversation_failed(conversation_id, str(e))
          raise
  ```
- [ ] **Database operation retries**
  ```python
  @retry(attempts=3, delay=1.0, backoff=2.0)
  async def save_agent_conversation(data: dict):
      # Database operation with retry logic
  ```
- [ ] **External API circuit breakers**
  ```python
  from circuit_breaker import CircuitBreaker
  
  @CircuitBreaker(failure_threshold=5, timeout=30)
  async def call_openai_api(prompt: str):
      # OpenAI API call with circuit breaker
  ```

## 🔧 DEPLOYMENT STEPS

### Step 1: Code Deployment
- [ ] **Merge feature branch to staging**
  ```bash
  git checkout staging
  git merge feature/migrate-agents-to-root-v2-implementation
  git push origin staging
  ```
- [ ] **Deploy to staging environment** (via Render/Platform)
- [ ] **Verify deployment status**
  ```bash
  curl -f https://staging-api.bookedbarber.com/health
  ```

### Step 2: Database Setup
- [ ] **Run agent table creation**
  ```bash
  ./MIGRATE_AGENTS_TO_ROOT_V2.sh --environment=staging --mode=setup
  ```
- [ ] **Populate test data** (optional)
  ```bash
  python setup_agent_testing.py --environment=staging --test-data=minimal
  ```
- [ ] **Verify agent tables exist and are accessible**

### Step 3: Agent System Activation
- [ ] **Activate agent system with limited scope**
  ```bash
  ./ACTIVATE_AGENTS_V2.sh --environment=staging --mode=limited
  ```
- [ ] **Verify agent status endpoints**
  ```bash
  curl -H "Authorization: Bearer $STAGING_TOKEN" \
       https://staging-api.bookedbarber.com/api/v2/agents/status
  ```
- [ ] **Test agent template loading**

### Step 4: Integration Testing
- [ ] **Test with real staging appointment data**
  ```bash
  python test_agent_manual.py --environment=staging --use-real-data
  ```
- [ ] **Verify agent conversations are saved to database**
- [ ] **Test agent performance with realistic load**
- [ ] **Validate client data access controls**

### Step 5: Monitoring Setup
- [ ] **Configure Sentry for agent errors**
  ```python
  import sentry_sdk
  sentry_sdk.init(
      dsn="https://staging-dsn@sentry.io/project",
      traces_sample_rate=1.0,
      # Add agent-specific tags
  )
  ```
- [ ] **Set up agent performance metrics**
- [ ] **Configure alerting for failed conversations**
- [ ] **Test error reporting and alerting**

## 🚨 POST-DEPLOYMENT VERIFICATION

### Immediate Checks (0-30 minutes)
- [ ] **Application starts without errors**
  ```bash
  curl -f https://staging-api.bookedbarber.com/health
  ```
- [ ] **Agent endpoints respond correctly**
  ```bash
  curl -f https://staging-api.bookedbarber.com/api/v2/agents/health
  ```
- [ ] **Database connections are stable**
- [ ] **No critical errors in logs**
  ```bash
  tail -f /var/log/bookedbarber/application.log | grep -i error
  ```

### Short-term Validation (1-4 hours)
- [ ] **Agent system processes test conversations successfully**
- [ ] **Performance metrics show acceptable response times**
- [ ] **Memory and CPU usage within expected ranges**
- [ ] **No database connection pool exhaustion**
- [ ] **Error rates below 1%**

### Extended Validation (24-48 hours)
- [ ] **Agent system handles realistic conversation volume**
- [ ] **No memory leaks or resource accumulation**
- [ ] **Database performance remains stable**
- [ ] **All monitoring and alerting systems functional**
- [ ] **Client data access controls working correctly**

## 🎯 ROLLBACK PROCEDURES

### Immediate Rollback (< 5 minutes)
```bash
# Disable agent system via environment variable
export AGENT_SYSTEM_ENABLED=false
# Restart application
sudo systemctl restart bookedbarber-api
```

### Full Rollback (< 15 minutes)
```bash
# Revert to previous deployment
git checkout staging-backup-$(date +%Y%m%d)
# Redeploy previous version
./deploy-staging.sh --rollback
```

### Database Rollback (if needed)
```bash
# Remove agent tables (ONLY if causing issues)
./MIGRATE_AGENTS_TO_ROOT_V2.sh --environment=staging --mode=cleanup
```

## 📊 SUCCESS CRITERIA

### Performance Benchmarks
- **Agent response time**: < 2 seconds (p95)
- **Database query time**: < 100ms (p95)
- **Error rate**: < 0.1%
- **Memory usage**: < 100MB additional
- **CPU usage**: < 10% additional

### Functional Requirements
- ✅ Agent conversations save to database
- ✅ Client data access controls enforced
- ✅ Error handling prevents cascading failures
- ✅ Monitoring captures all agent activities
- ✅ Performance impact on main application < 5%

### Business Requirements
- ✅ Agent responses are contextually appropriate
- ✅ Client privacy and data security maintained
- ✅ System reliability not compromised
- ✅ Rollback capability verified and tested

## ⚠️ KNOWN RISKS AND MITIGATIONS

### High-Priority Risks
1. **Database Performance Impact**
   - **Risk**: Agent operations slow down main application
   - **Mitigation**: Monitor database metrics, implement connection pooling
   - **Rollback Trigger**: Query response time > 200ms

2. **Memory Usage Growth**
   - **Risk**: Agent system causes memory leaks
   - **Mitigation**: Monitor memory usage, implement cleanup procedures
   - **Rollback Trigger**: Memory usage > 2GB

3. **Client Data Security**
   - **Risk**: Unauthorized access to client information
   - **Mitigation**: Strict access controls, audit logging
   - **Rollback Trigger**: Any unauthorized data access detected

### Medium-Priority Risks
1. **External API Rate Limits**
   - **Risk**: Agent system hits OpenAI/other API limits
   - **Mitigation**: Implement rate limiting and circuit breakers
   - **Response**: Graceful degradation, queue management

2. **Agent Response Quality**
   - **Risk**: Poor quality responses harm client experience
   - **Mitigation**: Monitor conversation quality, manual review system
   - **Response**: Disable problematic agent types, manual review

## 📞 EMERGENCY CONTACTS

### Technical Support
- **Platform Engineer**: [Contact Info]
- **Database Admin**: [Contact Info]
- **Security Team**: [Contact Info]

### Business Stakeholders
- **Product Owner**: [Contact Info]
- **Customer Success**: [Contact Info]

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-19  
**Next Review**: Post-deployment retrospective