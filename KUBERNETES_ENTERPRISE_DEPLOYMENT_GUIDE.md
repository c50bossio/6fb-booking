# BookedBarber V2 Enterprise Kubernetes Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying BookedBarber V2 as an enterprise-scale Kubernetes application implementing the Six Figure Barber methodology. The deployment supports 10,000+ concurrent users with high availability, auto-scaling, and comprehensive monitoring.

## Architecture Components

### Core Application Layer
- **Backend Deployment** - FastAPI application with Six Figure Barber methodology implementation
- **Frontend Deployment** - Next.js dashboard and client interface
- **Load Balancer & Ingress** - Enterprise-grade traffic management with SSL/TLS

### Data Layer
- **PostgreSQL StatefulSet** - Production-ready database with replication (3 replicas)
- **Redis Cluster** - High-performance caching and session management (6 nodes)

### Infrastructure Layer
- **Monitoring Stack** - Prometheus, Grafana, AlertManager with franchise-specific metrics
- **Service Mesh** - Istio for advanced networking and security
- **Autoscaling** - HPA and VPA for dynamic resource allocation

### Security & Compliance
- **RBAC** - Role-based access control with least privilege
- **Pod Security Policies** - Container security enforcement
- **Network Policies** - Micro-segmentation and traffic control
- **Secret Management** - Encrypted configuration and credentials

## Prerequisites

### Kubernetes Cluster Requirements
- **Kubernetes Version**: 1.25+ 
- **Node Count**: Minimum 3 nodes (recommended 5+ for production)
- **Node Resources**: 
  - CPU: 8+ cores per node
  - Memory: 32GB+ per node
  - Storage: 100GB+ SSD per node
- **Storage Classes**: 
  - `fast-ssd` for databases
  - `gp3-encrypted` for monitoring
- **Network**: Load balancer support, ingress controller

### Required Add-ons
- **NGINX Ingress Controller** (installed automatically)
- **cert-manager** (installed automatically)
- **Metrics Server** (for HPA)
- **Storage CSI Drivers** (cloud provider specific)

### Development Tools
- `kubectl` 1.25+
- `helm` 3.8+ (optional)
- `yq` or Python with YAML support

## Deployment Instructions

### Step 1: Prepare Environment

```bash
# Navigate to deployment directory
cd /Users/bossio/6fb-booking/k8s/enterprise-scale

# Verify cluster connectivity
kubectl cluster-info

# Check node resources
kubectl get nodes -o wide
kubectl describe nodes
```

### Step 2: Configure Secrets

Before deployment, update the following secrets in `configmaps-secrets.yaml`:

```yaml
# Critical secrets to update:
- secret-key: "your-secret-key-change-in-production"
- database-password: "your-database-password-change-in-production"
- redis-password: "your-redis-password-change-in-production"
- stripe-secret-key: "sk_live_your_stripe_secret_key"
- sendgrid-api-key: "SG.your_sendgrid_api_key"
- grafana-admin-password: "your-grafana-admin-password"
```

### Step 3: Validate Manifests

```bash
# Run comprehensive validation
./validate-manifests.sh

# Run deployment dry-run (requires cluster connection)
./deploy.sh --dry-run
```

### Step 4: Execute Deployment

```bash
# Full enterprise deployment
./deploy.sh

# Monitor deployment progress
kubectl get pods -n bookedbarber-v2 --watch
kubectl get pods -n monitoring --watch
```

## Deployment Order

The deployment script executes components in this order:

1. **Infrastructure Layer**
   - Namespaces and Resource Quotas
   - Service Accounts and RBAC
   - ConfigMaps and Secrets

2. **Data Layer**
   - PostgreSQL StatefulSet (3 replicas)
   - Redis Cluster (6 nodes)

3. **Application Layer**
   - Backend Deployment (FastAPI)
   - Frontend Deployment (Next.js)

4. **Networking Layer**
   - Ingress and Load Balancer
   - SSL/TLS Certificates
   - Network Policies

5. **Monitoring Layer**
   - Prometheus and AlertManager
   - Grafana with Franchise Dashboards

## Resource Allocation

### Total Resource Requirements

| Component | Replicas | CPU Request | Memory Request | CPU Limit | Memory Limit |
|-----------|----------|-------------|----------------|-----------|--------------|
| Backend | 2-50 (HPA) | 500m | 512Mi | 2000m | 2Gi |
| Frontend | 3-20 (HPA) | 250m | 512Mi | 1000m | 1Gi |
| PostgreSQL | 3 | 1000m | 2Gi | 4000m | 8Gi |
| Redis | 6 | 250m | 512Mi | 1000m | 2Gi |
| Prometheus | 2 | 1000m | 4Gi | 2000m | 8Gi |
| Grafana | 2 | 500m | 1Gi | 1000m | 2Gi |

**Total Minimum**: ~9 CPU cores, ~21 GB memory  
**Total with Limits**: ~50 CPU cores, ~100 GB memory

### Storage Requirements

| Component | Storage Size | Storage Class | Replicas | Total |
|-----------|-------------|---------------|----------|-------|
| PostgreSQL | 100Gi | fast-ssd | 3 | 300Gi |
| Redis | 20Gi | fast-ssd | 6 | 120Gi |
| Prometheus | 500Gi | gp3-encrypted | 1 | 500Gi |
| Grafana | 50Gi | gp3-encrypted | 1 | 50Gi |

**Total Storage**: ~970Gi

## Six Figure Barber Configuration

### Enterprise Features Enabled

```yaml
# Core Six Figure Barber Settings
SIX_FIGURE_BARBER_MODE: "enterprise"
FRANCHISE_MODE: "enabled"
MULTI_TENANT_SUPPORT: "true"
```

### Franchise-Specific Monitoring

The monitoring stack includes specialized metrics for:
- **Franchise Shard Monitoring** - Per-location performance tracking
- **Business Metrics** - Booking rates, revenue tracking, client retention
- **Performance Alerts** - High latency, system overload, payment failures
- **Operational Dashboards** - Real-time franchise operations overview

## Access Information

### Primary Endpoints

- **Frontend**: https://bookedbarber.com
- **Admin Dashboard**: https://app.bookedbarber.com  
- **API Documentation**: https://api.bookedbarber.com/docs
- **Health Checks**: https://api.bookedbarber.com/health

### Monitoring Access

```bash
# Port-forward to Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Port-forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Access URLs
# Grafana: http://localhost:3000 (admin/your-grafana-password)
# Prometheus: http://localhost:9090
```

## Scaling Operations

### Manual Scaling

```bash
# Scale backend for high traffic
kubectl scale deployment backend --replicas=10 -n bookedbarber-v2

# Scale frontend for load distribution
kubectl scale deployment frontend --replicas=8 -n bookedbarber-v2

# Scale database (StatefulSet)
kubectl scale statefulset postgres --replicas=5 -n bookedbarber-v2
```

### Auto-scaling Configuration

HPA is configured for:
- **Backend**: 2-50 replicas (70% CPU, 80% memory)
- **Frontend**: 3-20 replicas (70% CPU, 80% memory)

```bash
# Check HPA status
kubectl get hpa -n bookedbarber-v2

# Monitor scaling events
kubectl describe hpa backend-hpa -n bookedbarber-v2
```

## Troubleshooting

### Common Issues

1. **Pods Stuck in Pending**
   ```bash
   kubectl describe pod <pod-name> -n bookedbarber-v2
   # Check: Resource constraints, PVC binding, node capacity
   ```

2. **Database Connection Issues**
   ```bash
   kubectl logs deployment/backend -n bookedbarber-v2
   kubectl exec -it postgres-0 -n bookedbarber-v2 -- pg_isready
   ```

3. **Ingress Not Working**
   ```bash
   kubectl get ingress -n bookedbarber-v2
   kubectl describe ingress bookedbarber-ingress -n bookedbarber-v2
   ```

### Debug Commands

```bash
# View all resources
kubectl get all -n bookedbarber-v2
kubectl get all -n monitoring

# Check events
kubectl get events -n bookedbarber-v2 --sort-by='.lastTimestamp'

# View logs
kubectl logs -f deployment/backend -n bookedbarber-v2
kubectl logs -f deployment/frontend -n bookedbarber-v2

# Shell into containers
kubectl exec -it deployment/backend -n bookedbarber-v2 -- /bin/bash
```

## Security Considerations

### Network Security
- **Network Policies**: Micro-segmentation between tiers
- **Pod Security**: Non-root containers, read-only filesystems
- **TLS Encryption**: End-to-end encryption with cert-manager

### Secret Management
- **Kubernetes Secrets**: Encrypted at rest
- **RBAC**: Least privilege access
- **Service Accounts**: Dedicated accounts per service

### Monitoring & Alerting
- **Security Metrics**: Failed authentication attempts, unusual traffic
- **Compliance Monitoring**: Access logs, audit trails
- **Incident Response**: Automated alerting via AlertManager

## Maintenance Operations

### Regular Tasks

```bash
# Update deployments (rolling update)
kubectl set image deployment/backend backend=bookedbarber/backend:v2.1.0 -n bookedbarber-v2

# Backup database
kubectl exec postgres-0 -n bookedbarber-v2 -- pg_dump bookedbarber_v2 > backup.sql

# Check cluster health
kubectl get nodes
kubectl top nodes
kubectl top pods -n bookedbarber-v2
```

### Monitoring Health

```bash
# Check all deployments
kubectl get deployments -n bookedbarber-v2
kubectl get deployments -n monitoring

# Verify HPA functionality
kubectl get hpa -n bookedbarber-v2

# Check persistent volumes
kubectl get pv
kubectl get pvc -n bookedbarber-v2
```

## Performance Optimization

### Database Tuning
- **Connection Pooling**: 100 max connections
- **Query Optimization**: Slow query monitoring enabled
- **Backup Strategy**: Point-in-time recovery configured

### Cache Optimization  
- **Redis Cluster**: 6-node cluster for high availability
- **Cache Strategy**: LRU eviction with session persistence
- **Monitoring**: Redis performance metrics tracked

### Application Performance
- **Health Checks**: Comprehensive probes configured
- **Resource Limits**: Optimized for Six Figure Barber workloads
- **Metrics Collection**: Custom business metrics tracked

## Disaster Recovery

### Backup Strategy
- **Database**: Automated backups every 6 hours
- **Configuration**: GitOps approach with version control
- **Monitoring Data**: 30-day retention in Prometheus

### Recovery Procedures
- **RTO**: 15 minutes for application recovery
- **RPO**: 6 hours for data recovery
- **Failover**: Cross-zone deployment for availability

---

## Summary

This enterprise Kubernetes deployment provides:

✅ **High Availability**: Multi-replica deployments across zones  
✅ **Auto-scaling**: Dynamic resource allocation based on demand  
✅ **Monitoring**: Comprehensive observability with franchise-specific metrics  
✅ **Security**: Enterprise-grade security with RBAC and network policies  
✅ **Performance**: Optimized for 10,000+ concurrent users  
✅ **Six Figure Barber**: Full methodology implementation with franchise support  

The deployment is production-ready and follows Kubernetes best practices for enterprise applications.