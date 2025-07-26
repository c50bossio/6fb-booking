# BookedBarber V2 - Enterprise Migration Strategy & Runbooks

## Executive Summary

This document outlines the comprehensive migration strategy to transform BookedBarber V2 from current production operations to enterprise-scale franchise platform supporting 100,000+ franchise locations and 1,000,000+ concurrent users globally.

## Migration Overview

### Current State Analysis
- **Current Scale**: 10,000+ users, single region (US)
- **Current Architecture**: Render-hosted with PostgreSQL + Redis
- **Current Database**: ~100GB, single instance
- **Current Performance**: 99.9% uptime, 1,000 RPS

### Target State Architecture
- **Target Scale**: 1,000,000+ users, 4 regions globally
- **Target Architecture**: Multi-region Kubernetes with database sharding
- **Target Database**: 10TB+, 16 shards across regions
- **Target Performance**: 99.99% uptime, 100,000 RPS

## Migration Phases

### Phase 1: Infrastructure Foundation (Weeks 1-4)
**Objective**: Establish enterprise infrastructure without disrupting current operations

#### Week 1-2: Multi-Region Kubernetes Setup
```bash
# Deploy primary region (US-East-1)
terraform init -backend-config="key=infrastructure/us-east-1/terraform.tfstate"
terraform plan -var-file="environments/production-us-east-1.tfvars"
terraform apply -auto-approve

# Deploy secondary regions
for region in us-west-2 eu-west-1 ap-southeast-1; do
  terraform workspace new $region
  terraform plan -var-file="environments/production-$region.tfvars"
  terraform apply -auto-approve
done
```

#### Week 3-4: Database Sharding Preparation
```bash
# Create shard-aware database schema
kubectl apply -f k8s/enterprise-scale/postgres-sharding-enterprise.yaml

# Initialize franchise routing tables
psql $DATABASE_URL -f scripts/franchise-sharding-setup.sql

# Test cross-shard queries
python scripts/test-franchise-sharding.py
```

**Success Criteria:**
- [ ] All 4 regions deployed with Kubernetes clusters
- [ ] Database sharding infrastructure ready
- [ ] Redis clustering deployed but not active
- [ ] Monitoring stack operational
- [ ] Zero impact on current production

### Phase 2: Data Migration & Replication (Weeks 5-8)
**Objective**: Migrate existing data to sharded architecture with zero downtime

#### Week 5-6: Database Migration Strategy
```bash
# Create migration scripts
cat > scripts/franchise-data-migration.sql << 'EOF'
-- Create franchise mapping for existing data
INSERT INTO franchise_shard_map (franchise_id, shard_id, region)
SELECT 
  id as franchise_id,
  CASE 
    WHEN id <= 25000 THEN 1
    WHEN id <= 50000 THEN 2
    WHEN id <= 75000 THEN 3
    ELSE 4
  END as shard_id,
  CASE 
    WHEN id <= 25000 THEN 'us-east-1'
    WHEN id <= 50000 THEN 'us-west-2'
    WHEN id <= 75000 THEN 'eu-west-1'
    ELSE 'ap-southeast-1'
  END as region
FROM (SELECT ROW_NUMBER() OVER (ORDER BY created_at) as id FROM users WHERE role = 'SHOP_OWNER') t;
EOF

# Execute migration with zero downtime
python scripts/zero-downtime-migration.py
```

#### Week 7-8: Cache Migration
```bash
# Migrate Redis data to enterprise clusters
kubectl apply -f k8s/enterprise-scale/redis-cluster-enterprise.yaml

# Run cache warm-up
python scripts/cache-warmup.py --source=current --target=enterprise

# Verify cache consistency
python scripts/verify-cache-migration.py
```

**Success Criteria:**
- [ ] All existing data migrated to appropriate shards
- [ ] Cache clusters operational with full data
- [ ] Replication working across regions
- [ ] No data loss during migration
- [ ] Performance maintained during migration

### Phase 3: Traffic Migration (Weeks 9-12)
**Objective**: Gradually migrate traffic to enterprise infrastructure

#### Week 9-10: Canary Deployment
```bash
# Deploy enterprise version alongside current
kubectl apply -f k8s/enterprise-scale/backend-deployment-enterprise.yaml

# Configure traffic splitting (10% enterprise)
kubectl apply -f k8s/enterprise-scale/istio-traffic-split.yaml

# Monitor canary metrics
kubectl exec -n monitoring deployment/grafana -- \
  curl -H "Authorization: Bearer $GRAFANA_TOKEN" \
  'http://localhost:3000/api/dashboards/uid/franchise-canary'
```

#### Week 11-12: Progressive Rollout
```bash
# Week 11: 50% traffic to enterprise
kubectl patch virtualservice bookedbarber-traffic-split \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"enterprise"},"weight":50},{"destination":{"host":"current"},"weight":50}]}]}}'

# Week 12: 100% traffic to enterprise
kubectl patch virtualservice bookedbarber-traffic-split \
  -p '{"spec":{"http":[{"route":[{"destination":{"host":"enterprise"},"weight":100}]}]}}'

# Verify migration success
./scripts/verify-enterprise-migration.sh
```

**Success Criteria:**
- [ ] 100% traffic on enterprise infrastructure
- [ ] No performance degradation
- [ ] All franchise features working
- [ ] Old infrastructure ready for decommission

### Phase 4: Optimization & Scaling (Weeks 13-16)
**Objective**: Optimize enterprise infrastructure for maximum performance

#### Week 13-14: Performance Optimization
```bash
# Enable auto-scaling
kubectl apply -f k8s/enterprise-scale/hpa-vpa-scaling.yaml

# Optimize database connections
kubectl exec -n bookedbarber-enterprise deployment/pgbouncer-shard-1 -- \
  pgbouncer -R -d /etc/pgbouncer/pgbouncer.ini

# Cache optimization
python scripts/optimize-cache-strategy.py --profile=enterprise
```

#### Week 15-16: Load Testing & Validation
```bash
# Enterprise load testing
k6 run --vus 10000 --duration 30m scripts/enterprise-load-test.js

# Disaster recovery testing
python scripts/test-disaster-recovery.py --scenario=region-failure

# Franchise-specific testing
python scripts/test-franchise-operations.py --scale=100000
```

**Success Criteria:**
- [ ] Support 100,000+ concurrent users
- [ ] Sub-100ms API response times
- [ ] 99.99% uptime achieved
- [ ] Disaster recovery validated
- [ ] All franchise features scaled

## Migration Runbooks

### Runbook 1: Database Migration
```bash
#!/bin/bash
# Database Migration Runbook

set -e

echo "🚀 Starting BookedBarber V2 Database Migration to Enterprise Sharding"

# Pre-migration checks
echo "📋 Pre-migration verification..."
./scripts/pre-migration-checks.sh

# Create database backup
echo "💾 Creating full database backup..."
pg_dump $CURRENT_DATABASE_URL > backup/pre-migration-$(date +%Y%m%d-%H%M%S).sql

# Deploy sharded infrastructure
echo "🏗️ Deploying sharded database infrastructure..."
kubectl apply -f k8s/enterprise-scale/postgres-sharding-enterprise.yaml
kubectl wait --for=condition=ready pod -l app=postgres --timeout=600s

# Initialize shard routing
echo "🗺️ Initializing franchise shard routing..."
python scripts/initialize-franchise-routing.py

# Migrate data with zero downtime
echo "📦 Migrating data to shards..."
python scripts/zero-downtime-shard-migration.py --batch-size=10000

# Verify migration
echo "✅ Verifying migration integrity..."
python scripts/verify-shard-migration.py

# Update application configuration
echo "⚙️ Updating application configuration..."
kubectl patch configmap app-config -p '{"data":{"database_mode":"sharded"}}'

# Restart application pods
echo "🔄 Restarting application pods..."
kubectl rollout restart deployment/bookedbarber-backend-enterprise

echo "🎉 Database migration completed successfully!"
```

### Runbook 2: Traffic Migration
```bash
#!/bin/bash
# Traffic Migration Runbook

set -e

echo "🚦 Starting BookedBarber V2 Traffic Migration to Enterprise Infrastructure"

# Deploy enterprise services
echo "🚀 Deploying enterprise services..."
helm upgrade --install bookedbarber-enterprise ./helm/bookedbarber-enterprise \
  --namespace bookedbarber-enterprise \
  --values values/production-enterprise.yaml

# Health check enterprise services
echo "🏥 Health checking enterprise services..."
./scripts/health-check-enterprise.sh

# Configure traffic splitting
echo "🔀 Configuring traffic splitting..."
kubectl apply -f k8s/enterprise-scale/istio-traffic-split-10pct.yaml

# Monitor for 30 minutes
echo "📊 Monitoring 10% traffic for 30 minutes..."
./scripts/monitor-canary.sh --duration=30m --threshold=99.5

# Increase to 50% traffic
echo "📈 Increasing to 50% traffic..."
kubectl apply -f k8s/enterprise-scale/istio-traffic-split-50pct.yaml
./scripts/monitor-canary.sh --duration=30m --threshold=99.5

# Full migration to enterprise
echo "🎯 Full migration to enterprise infrastructure..."
kubectl apply -f k8s/enterprise-scale/istio-traffic-split-100pct.yaml

# Verify full migration
echo "✅ Verifying full migration..."
./scripts/verify-enterprise-traffic.sh

# Scale down old infrastructure
echo "📉 Scaling down old infrastructure..."
kubectl scale deployment bookedbarber-backend --replicas=0

echo "🎉 Traffic migration completed successfully!"
```

### Runbook 3: Rollback Procedures
```bash
#!/bin/bash
# Emergency Rollback Runbook

set -e

ROLLBACK_REASON=${1:-"Emergency rollback"}
echo "🚨 EMERGENCY ROLLBACK: $ROLLBACK_REASON"

# Immediate traffic rollback
echo "⚡ Rolling back traffic to old infrastructure..."
kubectl scale deployment bookedbarber-backend --replicas=50
kubectl wait --for=condition=available deployment/bookedbarber-backend --timeout=300s

# Switch traffic back
kubectl apply -f k8s/rollback/istio-traffic-rollback.yaml

# Verify old infrastructure health
echo "🏥 Verifying old infrastructure health..."
./scripts/health-check-current.sh

# Database rollback if needed
if [ "$2" = "database" ]; then
  echo "🗄️ Rolling back database..."
  python scripts/rollback-database.py --backup=latest
fi

# Cache rollback if needed
if [ "$2" = "cache" ]; then
  echo "🔄 Rolling back cache..."
  kubectl scale statefulset redis-cluster-primary --replicas=0
  kubectl scale deployment redis-current --replicas=3
fi

# Notify teams
echo "📢 Notifying teams of rollback..."
curl -X POST $SLACK_WEBHOOK_URL -d "{\"text\":\"🚨 BookedBarber V2 Emergency Rollback Completed: $ROLLBACK_REASON\"}"

echo "✅ Emergency rollback completed!"
```

## Risk Mitigation Strategies

### High-Risk Scenarios & Mitigation

#### 1. Database Migration Failure
**Risk**: Data corruption or loss during shard migration
**Mitigation**:
- Full database backup before migration
- Incremental migration with validation
- Parallel write capability during migration
- Automated rollback on failure detection

#### 2. Traffic Migration Issues
**Risk**: Performance degradation or service outage
**Mitigation**:
- Gradual traffic increase (10% → 50% → 100%)
- Real-time monitoring with automatic rollback
- Circuit breakers for enterprise services
- Immediate fallback to current infrastructure

#### 3. Cross-Region Replication Lag
**Risk**: Data inconsistency across regions
**Mitigation**:
- Eventually consistent read patterns
- Regional write isolation
- Conflict resolution strategies
- Monitoring replication lag thresholds

#### 4. Cache Cluster Failure
**Risk**: Performance impact from cache unavailability
**Mitigation**:
- Multi-tier cache fallback
- Database query optimization
- Cache cluster redundancy
- Graceful degradation patterns

## Validation & Testing Procedures

### Pre-Migration Testing
```bash
# Infrastructure validation
./scripts/validate-infrastructure.sh

# Database performance testing
./scripts/test-database-performance.sh --connections=1000

# Cache performance testing
./scripts/test-cache-performance.sh --operations=100000

# Application integration testing
./scripts/test-application-integration.sh --environment=enterprise
```

### Post-Migration Validation
```bash
# End-to-end franchise testing
./scripts/test-franchise-operations.sh --comprehensive

# Load testing at scale
k6 run --vus 50000 --duration 60m scripts/enterprise-load-test.js

# Disaster recovery testing
./scripts/test-disaster-recovery.sh --all-scenarios

# Performance benchmarking
./scripts/benchmark-enterprise-performance.sh
```

## Success Metrics & KPIs

### Technical Metrics
- **Uptime**: Maintain 99.99% availability
- **Response Time**: < 100ms p95 API response time
- **Throughput**: Support 100,000+ requests/second
- **Data Consistency**: 99.99% data integrity across shards
- **Cache Hit Rate**: > 95% cache efficiency

### Business Metrics
- **Zero Revenue Loss**: No booking or payment interruptions
- **User Experience**: No degradation in user satisfaction
- **Franchise Onboarding**: Support 1,000+ new franchises/month
- **Global Expansion**: Enable 4-region operations
- **Cost Efficiency**: Infrastructure cost per user reduction

## Monitoring & Alerting

### Critical Alerts
```yaml
# Migration progress alerts
- alert: MigrationStalled
  expr: migration_progress_percent{job="migration"} == 0
  for: 10m
  labels:
    severity: critical
  annotations:
    summary: "Database migration has stalled"

# Performance degradation alerts
- alert: PerformanceDegradation
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "API response time degradation during migration"

# Data consistency alerts
- alert: DataInconsistency
  expr: shard_consistency_check_failures > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Data inconsistency detected across shards"
```

## Communication Plan

### Stakeholder Communication
- **Weekly Reports**: Migration progress to executive team
- **Daily Standups**: Technical team coordination
- **Real-time Alerts**: Operations team notifications
- **User Communications**: Advance notice of any potential impacts

### Documentation Updates
- Update API documentation for new endpoints
- Revise deployment procedures
- Create franchise onboarding guides
- Document new monitoring procedures

## Timeline & Milestones

| Week | Phase | Key Deliverables | Success Criteria |
|------|-------|------------------|------------------|
| 1-4 | Infrastructure Foundation | Multi-region K8s, Database sharding ready | All infrastructure deployed |
| 5-8 | Data Migration | Zero-downtime data migration | 100% data migrated |
| 9-12 | Traffic Migration | Progressive traffic rollout | 100% traffic on enterprise |
| 13-16 | Optimization | Performance tuning, load testing | Scale targets achieved |

## Post-Migration Operations

### Ongoing Maintenance
- Regular performance tuning
- Capacity planning and scaling
- Security updates and patches
- Disaster recovery testing

### Continuous Improvement
- Monitor franchise growth patterns
- Optimize for regional usage
- Enhance monitoring and alerting
- Automate operational procedures

---

**This migration strategy provides a comprehensive roadmap to transform BookedBarber V2 into an enterprise-scale franchise platform while maintaining zero downtime and preserving data integrity throughout the process.**