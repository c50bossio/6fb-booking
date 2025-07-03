# BookedBarber V2 - Kubernetes Deployment Guide

This comprehensive guide covers deploying BookedBarber V2 to production Kubernetes environments with Docker containers, Helm charts, and complete monitoring stack.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Production Deployment](#production-deployment)
5. [Security Features](#security-features)
6. [Monitoring & Observability](#monitoring--observability)
7. [Scaling & Performance](#scaling--performance)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

## 🏗️ Architecture Overview

### Container Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Frontend  │  │   Backend   │  │   Workers   │        │
│  │  (Next.js)  │  │  (FastAPI)  │  │  (Celery)   │        │
│  │   3 pods    │  │   5 pods    │  │   3 pods    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │               │               │                 │
│         └───────────────┼───────────────┘                 │
│                         │                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ PostgreSQL  │  │    Redis    │  │  Monitoring │        │
│  │(StatefulSet)│  │(StatefulSet)│  │(Prometheus) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Security Layers

- **Non-root containers**: All containers run as non-root users
- **Read-only filesystems**: Containers have read-only root filesystems
- **Network policies**: Traffic isolation between components
- **Security contexts**: Proper capabilities and security settings
- **Secrets management**: External secret management integration
- **TLS encryption**: End-to-end encryption with cert-manager

### High Availability Features

- **Multi-replica deployments**: 3-5 replicas per service
- **Auto-scaling**: CPU and memory-based horizontal pod autoscaling
- **Rolling updates**: Zero-downtime deployments
- **Health checks**: Comprehensive liveness, readiness, and startup probes
- **Resource limits**: Proper resource allocation and limits
- **Pod disruption budgets**: Ensures minimum availability during updates

## 🔧 Prerequisites

### Cluster Requirements

- **Kubernetes**: 1.24+ with RBAC enabled
- **Node capacity**: Minimum 4 CPU cores, 8GB RAM per node
- **Storage**: Dynamic persistent volume provisioning
- **Networking**: CNI plugin with NetworkPolicy support

### Required Components

```bash
# Install ingress-nginx controller
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Install cert-manager (production)
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.0 \
  --set installCRDs=true

# Install metrics-server (if not available)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Development Tools

- **Docker**: 20.10+ for building images
- **kubectl**: Latest version matching your cluster
- **Helm**: 3.8+ for package management
- **Git**: For source code management

## 🚀 Quick Start

### 1. Clone and Prepare

```bash
git clone <repository-url> bookedbarber-v2
cd bookedbarber-v2
```

### 2. Build and Deploy (Development)

```bash
# Deploy to development environment
./scripts/k8s/deploy.sh --environment development

# Setup monitoring (optional for dev)
./scripts/k8s/monitoring-setup.sh bookedbarber
```

### 3. Access Application

```bash
# Port forward for local access
kubectl -n bookedbarber port-forward svc/bookedbarber-frontend 3000:3000

# Access at http://localhost:3000
```

## 🏭 Production Deployment

### 1. Environment Preparation

```bash
# Create production namespace
kubectl create namespace bookedbarber-prod

# Setup external secrets (recommended)
# Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
```

### 2. External Services Setup

For production, use managed services:

```yaml
# External PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
externalDatabase:
  host: "prod-db.region.rds.amazonaws.com"
  port: 5432
  username: "bookedbarber_prod"
  database: "bookedbarber_prod"

# External Redis (AWS ElastiCache, Google Memorystore, etc.)
externalRedis:
  host: "prod-redis.region.cache.amazonaws.com"
  port: 6379
```

### 3. Production Deployment

```bash
# Deploy with production configuration
./scripts/k8s/deploy.sh \
  --environment production \
  --namespace bookedbarber-prod \
  --registry your-registry.com/bookedbarber

# Setup production monitoring
./scripts/k8s/monitoring-setup.sh bookedbarber-prod
```

### 4. TLS Certificate Setup

```bash
# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

## 🔒 Security Features

### Container Security

All containers implement security best practices:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
    add:
      - NET_BIND_SERVICE  # Only for services that need to bind to ports
```

### Network Security

Network policies implement zero-trust networking:

- **Default deny**: All traffic blocked by default
- **Explicit allow**: Only required communication paths allowed
- **Service isolation**: Frontend, backend, and data stores isolated
- **External access**: Controlled egress for API calls

### Secret Management

Production deployment supports external secret management:

```bash
# Example: AWS Secrets Manager integration
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace

# Create SecretStore and ExternalSecret resources
```

## 📊 Monitoring & Observability

### Metrics Collection

- **Application metrics**: Custom FastAPI and Next.js metrics
- **Infrastructure metrics**: CPU, memory, disk, network
- **Business metrics**: Bookings, payments, user activity

### Alerting Rules

Key alerts configured:

- High error rate (>10% 5xx responses)
- High latency (>1s 95th percentile)
- Pod crash looping
- High resource utilization
- Database connectivity issues

### Log Aggregation

```bash
# Install Loki for log aggregation (optional)
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false
```

### Dashboards

Pre-configured Grafana dashboards for:

- Application performance metrics
- Infrastructure monitoring
- Business KPIs
- Error tracking and analysis

## ⚡ Scaling & Performance

### Horizontal Pod Autoscaling

Automatic scaling based on:

```yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
- type: Resource
  resource:
    name: memory
    target:
      type: Utilization
      averageUtilization: 80
```

### Resource Optimization

Production resource allocation:

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas |
|-----------|-------------|-----------|----------------|--------------|----------|
| Frontend  | 200m        | 500m      | 256Mi          | 512Mi        | 3-15     |
| Backend   | 250m        | 1000m     | 512Mi          | 1Gi          | 3-20     |
| Worker    | 200m        | 500m      | 256Mi          | 512Mi        | 2-10     |

### Performance Tuning

- **Connection pooling**: PostgreSQL connection pooling with PgBouncer
- **Caching**: Redis for application and session caching
- **CDN**: Static asset delivery via CDN
- **Database optimization**: Proper indexing and query optimization

## 🔧 Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl -n bookedbarber get pods

# View pod events
kubectl -n bookedbarber describe pod <pod-name>

# Check logs
kubectl -n bookedbarber logs <pod-name> --previous
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl -n bookedbarber exec -it deployment/bookedbarber-backend -- \
  python -c "
import psycopg2
import os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
print('Database connection successful')
"
```

#### 3. Ingress Issues

```bash
# Check ingress status
kubectl -n bookedbarber get ingress -o wide

# Check ingress controller logs
kubectl -n ingress-nginx logs deployment/ingress-nginx-controller
```

### Debug Commands

```bash
# Get all resources
kubectl -n bookedbarber get all

# Check resource usage
kubectl top pods -n bookedbarber

# View service endpoints
kubectl -n bookedbarber get endpoints

# Check persistent volumes
kubectl get pv,pvc -n bookedbarber
```

## 🔄 Maintenance

### Updates and Upgrades

#### Rolling Updates

```bash
# Update application version
helm upgrade bookedbarber ./helm/bookedbarber \
  --namespace bookedbarber-prod \
  --set backend.image.tag=v2.1.0 \
  --set frontend.image.tag=v2.1.0
```

#### Database Migrations

```bash
# Run database migrations
kubectl -n bookedbarber create job --from=deployment/bookedbarber-backend migration-$(date +%s) -- \
  alembic upgrade head
```

### Backup Procedures

#### Database Backup

```bash
# Automated backup with CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15
            command:
            - /bin/bash
            - -c
            - |
              pg_dump $DATABASE_URL | gzip > /backup/backup-$(date +%Y%m%d%H%M%S).sql.gz
```

### Health Monitoring

```bash
# Check cluster health
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running

# Monitor resource usage
kubectl top nodes
kubectl top pods --all-namespaces --sort-by=memory
```

## 📚 Additional Resources

### Helm Commands Reference

```bash
# List releases
helm list -n bookedbarber

# Get values
helm get values bookedbarber -n bookedbarber

# Rollback
helm rollback bookedbarber 1 -n bookedbarber

# Uninstall
helm uninstall bookedbarber -n bookedbarber
```

### Useful kubectl Commands

```bash
# Scale deployment
kubectl -n bookedbarber scale deployment bookedbarber-backend --replicas=5

# Restart deployment
kubectl -n bookedbarber rollout restart deployment/bookedbarber-backend

# Watch rollout status
kubectl -n bookedbarber rollout status deployment/bookedbarber-backend
```

### Configuration Files

All configuration files are located in:

- `docker/`: Docker images and configurations
- `k8s/`: Raw Kubernetes manifests
- `helm/`: Helm chart and values files
- `scripts/k8s/`: Deployment and management scripts

For production deployments, always review and customize the configuration files to match your specific requirements and security policies.

---

**Security Note**: This guide provides a foundation for secure deployment. Always review security settings, update dependencies regularly, and implement additional security measures based on your organization's requirements.