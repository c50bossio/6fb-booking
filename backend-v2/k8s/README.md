# BookedBarber V2 Kubernetes Deployment

This directory contains production-ready Kubernetes manifests for deploying BookedBarber V2 at enterprise scale.

## Quick Start

```bash
# Review and update secrets
cp secrets.yaml secrets.production.yaml
vi secrets.production.yaml  # Replace all REPLACE_WITH_ACTUAL_* values

# Deploy to production
./production-deploy.sh
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NGINX Ingress │    │  Load Balancer  │    │   cert-manager  │
│   Controller    │────│   (Cloud LB)    │────│   (SSL/TLS)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │   Backend     │  │   Backend     │  │   Backend     │        │
│  │   Pod 1       │  │   Pod 2       │  │   Pod 3       │        │
│  │ (FastAPI+HPA) │  │ (FastAPI+HPA) │  │ (FastAPI+HPA) │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
│           │                   │                   │              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │  Celery       │  │  Celery       │  │  Celery Beat  │        │
│  │  Worker 1     │  │  Worker 2     │  │  (Scheduler)  │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
│           │                   │                   │              │
│           └─────────────────┬─────────────────────┘              │
│                             │                                    │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │  PostgreSQL   │  │     Redis     │  │  Prometheus   │        │
│  │  (Database)   │  │   (Cache)     │  │ (Monitoring)  │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Core Application
- **FastAPI Backend**: 3-10 auto-scaling replicas
- **Celery Workers**: Background job processing (2 replicas)
- **Celery Beat**: Scheduled task management (1 replica)
- **Celery Flower**: Task monitoring dashboard

### Infrastructure
- **PostgreSQL**: Primary database with persistence
- **Redis**: Cache and message broker with persistence
- **NGINX Ingress**: Load balancing and SSL termination
- **Prometheus**: Metrics collection and alerting

### Security & Networking
- **Network Policies**: Micro-segmentation
- **TLS/SSL**: End-to-end encryption
- **Secrets Management**: Kubernetes native
- **RBAC**: Role-based access control

## Files Description

| File | Purpose |
|------|---------|
| `namespace.yaml` | Kubernetes namespace definition |
| `configmap.yaml` | Non-sensitive configuration |
| `secrets.yaml` | Sensitive credentials (template) |
| `postgres-deployment.yaml` | PostgreSQL database deployment |
| `redis-deployment.yaml` | Redis cache deployment |
| `backend-deployment.yaml` | FastAPI backend with auto-scaling |
| `celery-deployment.yaml` | Background job workers |
| `ingress.yaml` | Load balancer and SSL configuration |
| `monitoring.yaml` | Prometheus monitoring stack |
| `network-policies.yaml` | Network security policies |
| `kustomization.yaml` | Kustomize configuration |
| `production-deploy.sh` | Automated deployment script |

## Resource Specifications

### Production Capacity
- **Concurrent Users**: 10,000+
- **API Requests**: 1,000/second sustained
- **Database Connections**: 100+ concurrent
- **Background Jobs**: 50+ concurrent tasks

### Resource Allocation
```yaml
Backend Pods (3-10 replicas):
  requests: 250m CPU, 512Mi memory
  limits: 500m CPU, 1Gi memory

Database:
  requests: 250m CPU, 256Mi memory
  limits: 500m CPU, 512Mi memory

Redis:
  requests: 100m CPU, 128Mi memory
  limits: 200m CPU, 256Mi memory

Celery Workers (2 replicas):
  requests: 100m CPU, 256Mi memory
  limits: 300m CPU, 512Mi memory
```

## Deployment Options

### Option 1: Automated Deployment (Recommended)
```bash
./production-deploy.sh
```

### Option 2: Manual Step-by-Step
```bash
# 1. Create namespace and configuration
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# 2. Deploy infrastructure
kubectl apply -f postgres-deployment.yaml
kubectl apply -f redis-deployment.yaml

# 3. Deploy application
kubectl apply -f backend-deployment.yaml
kubectl apply -f celery-deployment.yaml

# 4. Configure networking
kubectl apply -f network-policies.yaml
kubectl apply -f ingress.yaml

# 5. Deploy monitoring
kubectl apply -f monitoring.yaml
```

### Option 3: Kustomize Deployment
```bash
kubectl apply -k .
```

## Configuration Management

### Environment-Specific Configurations

**Development**: Use minimal resources, single replicas
**Staging**: Use production-like setup with reduced capacity
**Production**: Full resource allocation and high availability

### Secret Management

**Required Secrets**:
- Database credentials
- Redis connection string
- JWT signing keys
- Stripe API keys
- SendGrid API key
- Twilio credentials
- Google API credentials
- Meta Business API keys
- Sentry DSN

**Security Best Practices**:
- Rotate secrets regularly (quarterly)
- Use separate secrets per environment
- Enable secret encryption at rest
- Audit secret access

## Scaling Configuration

### Horizontal Pod Autoscaling (HPA)
```yaml
Backend Services:
  min: 3 replicas
  max: 10 replicas
  cpu: 70% threshold
  memory: 80% threshold

Celery Workers:
  min: 2 replicas
  max: 5 replicas
  queue: depth-based scaling
```

### Vertical Scaling
- Database: Scale vertically for storage performance
- Redis: Scale horizontally for distributed caching
- Backend: Scale horizontally for request processing

## Monitoring & Observability

### Health Checks
- **Liveness Probes**: Detect failed containers
- **Readiness Probes**: Manage traffic routing
- **Startup Probes**: Handle slow-starting containers

### Metrics Collection
- **Application Metrics**: Custom business metrics
- **Infrastructure Metrics**: CPU, memory, disk, network
- **Database Metrics**: Query performance, connections
- **Cache Metrics**: Hit rates, memory usage

### Alerting Rules
- High error rates (>1%)
- Slow response times (>2s p95)
- Resource exhaustion (>90% CPU/memory)
- Database connection failures
- Cache miss rate increases

## Security Features

### Network Security
- **Ingress**: TLS termination and rate limiting
- **Network Policies**: East-west traffic control
- **Service Mesh**: mTLS between services (optional)

### Container Security
- **Non-root User**: All containers run as non-root
- **Read-only Filesystem**: Immutable container filesystems
- **Security Contexts**: Restricted capabilities
- **Image Scanning**: Regular vulnerability scans

### Data Security
- **Encryption at Rest**: Database and volume encryption
- **Encryption in Transit**: TLS for all communications
- **Secret Rotation**: Automated credential rotation
- **Audit Logging**: Comprehensive access logs

## Performance Optimization

### Database Performance
- **Connection Pooling**: Optimized for high concurrency
- **Read Replicas**: Separate read and write workloads
- **Indexing**: Optimized for query patterns
- **Caching**: Redis for frequently accessed data

### Application Performance
- **Async Processing**: Non-blocking I/O operations
- **Background Jobs**: Offload heavy processing
- **CDN Integration**: Static asset delivery
- **Response Compression**: Reduced bandwidth usage

## Disaster Recovery

### Backup Strategy
- **Database**: Automated daily backups with 30-day retention
- **Redis**: Persistence enabled with snapshotting
- **Configuration**: Version controlled in Git
- **Secrets**: Encrypted backup to secure storage

### Recovery Procedures
1. **Infrastructure**: Restore from Infrastructure as Code
2. **Database**: Restore from latest backup
3. **Application**: Deploy from known good configuration
4. **Validation**: Automated health checks and smoke tests

### RTO/RPO Targets
- **Recovery Time Objective (RTO)**: 15 minutes
- **Recovery Point Objective (RPO)**: 1 hour
- **Availability Target**: 99.9% uptime

## Cost Optimization

### Resource Efficiency
- **Right-sizing**: Based on actual usage patterns
- **Auto-scaling**: Scale down during low traffic
- **Spot Instances**: Use for non-critical workloads
- **Resource Sharing**: Multi-tenant where appropriate

### Monitoring Costs
- **Resource Usage**: Track and optimize utilization
- **Cost Allocation**: Tag resources by environment/team
- **Budget Alerts**: Prevent cost overruns
- **Regular Reviews**: Monthly cost optimization reviews

## Troubleshooting

### Common Issues

**Pod CrashLoopBackOff**:
```bash
kubectl describe pod <pod-name> -n bookedbarber-v2
kubectl logs <pod-name> -n bookedbarber-v2 --previous
```

**Service Discovery Issues**:
```bash
kubectl get endpoints -n bookedbarber-v2
kubectl run debug --image=busybox -it --rm -- nslookup <service-name>
```

**Database Connection Problems**:
```bash
kubectl exec -it deployment/bookedbarber-backend -n bookedbarber-v2 -- python -c "from database import engine; print(engine.execute('SELECT 1').scalar())"
```

**Performance Issues**:
```bash
kubectl top pods -n bookedbarber-v2
kubectl get hpa -n bookedbarber-v2 -o wide
```

### Debug Commands
```bash
# View all resources
kubectl get all -n bookedbarber-v2

# Check pod logs
kubectl logs -f deployment/bookedbarber-backend -n bookedbarber-v2

# Execute commands in pods
kubectl exec -it deployment/bookedbarber-backend -n bookedbarber-v2 -- bash

# Port forward for local testing
kubectl port-forward svc/bookedbarber-backend-service 8080:80 -n bookedbarber-v2
```

## Maintenance

### Regular Tasks
- **Weekly**: Security updates and patches
- **Monthly**: Performance review and optimization
- **Quarterly**: Capacity planning and cost review
- **Annually**: Disaster recovery testing

### Update Procedures
```bash
# Rolling update
kubectl set image deployment/bookedbarber-backend backend=bookedbarber/backend:v2.1.0 -n bookedbarber-v2

# Monitor rollout
kubectl rollout status deployment/bookedbarber-backend -n bookedbarber-v2

# Rollback if needed
kubectl rollout undo deployment/bookedbarber-backend -n bookedbarber-v2
```

## Support

### Documentation
- [Deployment Guide](deployment-guide.md) - Comprehensive deployment instructions
- [Troubleshooting Guide](../docs/TROUBLESHOOTING.md) - Common issues and solutions
- [API Documentation](../docs/API_DOCUMENTATION.md) - API reference

### Monitoring Dashboards
- **Grafana**: Business and infrastructure metrics
- **Flower**: Celery task monitoring
- **Prometheus**: Raw metrics and alerting

### Emergency Contacts
- **Production Issues**: [Emergency Response Playbook]
- **Security Incidents**: [Security Response Playbook]
- **On-call Rotation**: [PagerDuty Integration]

---

**Production Status**: ✅ Ready for deployment
**Last Updated**: 2025-07-14
**Version**: v2.0.0