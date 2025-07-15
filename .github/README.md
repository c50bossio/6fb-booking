# BookedBarber V2 - Enterprise CI/CD Pipeline

This directory contains the complete enterprise-grade CI/CD pipeline for BookedBarber V2, designed to handle production traffic with automated testing, security scanning, and zero-downtime deployments.

## 🚀 Pipeline Overview

The CI/CD pipeline implements a comprehensive DevOps workflow with the following stages:

1. **Code Quality & Security** - SAST, dependency scanning, secret detection
2. **Automated Testing** - Unit, integration, and load testing
3. **Build & Containerization** - Multi-arch Docker builds with caching
4. **Staging Deployment** - Blue-green deployment to staging environment
5. **Load Testing** - Performance validation under realistic load
6. **Production Approval** - Manual approval gate for production releases
7. **Production Deployment** - Blue-green deployment with automated rollback
8. **Post-Deployment Monitoring** - Health checks and automated alerting

## 📁 Directory Structure

```
.github/
├── workflows/
│   ├── ci-cd-pipeline.yml          # Main CI/CD workflow
│   └── security-scan.yml           # Security scanning workflow
├── deployment/
│   ├── deploy-blue-green.sh        # Blue-green deployment automation
│   ├── migration-safety-check.sh   # Database migration safety
│   ├── health-check.sh             # Comprehensive health checking
│   ├── rollback.sh                 # Automated rollback procedures
│   ├── monitor-deployment.sh       # Post-deployment monitoring
│   ├── smoke-tests.sh             # Post-deployment smoke tests
│   └── backup-production.sh        # Production backup automation
└── k8s/
    ├── base/                       # Base Kubernetes manifests
    ├── staging/                    # Staging environment config
    └── production/                 # Production environment config
```

## 🔧 Setup & Configuration

### Prerequisites

1. **GitHub Secrets** - Configure the following secrets in your repository:
   ```
   # Kubernetes Access
   STAGING_KUBECONFIG              # Base64 encoded kubeconfig for staging
   PRODUCTION_KUBECONFIG           # Base64 encoded kubeconfig for production
   
   # Database & Services
   DATABASE_URL                    # Production database connection string
   REDIS_URL                      # Redis connection string
   SECRET_KEY                     # Application secret key
   
   # Third-party Services
   STRIPE_SECRET_KEY              # Stripe API secret key
   STRIPE_WEBHOOK_SECRET          # Stripe webhook signing secret
   SENDGRID_API_KEY              # SendGrid email API key
   SENTRY_DSN                    # Sentry error tracking DSN
   
   # Notifications
   SLACK_WEBHOOK_URL             # Slack webhook for deployment notifications
   PAGERDUTY_ROUTING_KEY         # PagerDuty integration key
   
   # Monitoring
   DEPLOYMENT_DASHBOARD_URL       # Internal deployment dashboard
   DASHBOARD_TOKEN               # API token for dashboard
   
   # Cloud Storage (Optional)
   AWS_ACCESS_KEY_ID             # AWS access key for backups
   AWS_SECRET_ACCESS_KEY         # AWS secret key for backups
   BACKUP_S3_BUCKET              # S3 bucket for backup storage
   ```

2. **Kubernetes Cluster** - Ensure you have:
   - Staging and production Kubernetes clusters
   - NGINX Ingress Controller
   - cert-manager for SSL certificates
   - Persistent volume support
   - Metrics server (for HPA)

3. **Docker Registry** - The pipeline uses GitHub Container Registry (ghcr.io)

### Environment Configuration

#### Staging Environment
- **URL**: https://staging.bookedbarber.com
- **API URL**: https://staging-api.bookedbarber.com
- **Purpose**: Integration testing and QA validation
- **Auto-deploys**: On pushes to `deployment-clean` branch

#### Production Environment
- **URL**: https://bookedbarber.com
- **API URL**: https://api.bookedbarber.com
- **Purpose**: Live customer traffic
- **Deploys**: Manual approval required after staging validation

## 🔄 Deployment Workflow

### Trigger Points

1. **Feature Development**: Push to `feature/*` branches
   - Runs code quality checks and security scans
   - Runs unit and integration tests
   - Builds Docker images for testing

2. **Staging Deployment**: Push to `deployment-clean` branch
   - Full CI/CD pipeline execution
   - Automated deployment to staging
   - Load testing and smoke tests
   - Automated rollback on failure

3. **Production Deployment**: Push to `main` branch
   - All staging validations must pass
   - Manual approval required
   - Blue-green deployment to production
   - Automated monitoring and alerting

### Deployment Process

1. **Pre-Deployment**:
   - Database migration safety checks
   - Production backup creation
   - Blue-green environment preparation

2. **Deployment**:
   - Traffic gradually shifted to new version
   - Health checks at each stage
   - Automated rollback triggers on failure

3. **Post-Deployment**:
   - Smoke tests execution
   - 5-minute automated monitoring
   - Performance and error rate validation
   - Notification to stakeholders

## 🛡️ Security Features

### Static Application Security Testing (SAST)
- **Bandit**: Python security linting
- **Semgrep**: Multi-language security patterns
- **ESLint**: JavaScript/TypeScript security rules
- **Safety**: Python dependency vulnerability scanning

### Secret Detection
- **TruffleHog**: Git history secret scanning
- **GitLeaks**: Secret pattern detection
- **Automated**: Runs on every commit

### Container Security
- **Trivy**: Container vulnerability scanning
- **Docker Scout**: Security analysis
- **Multi-arch**: Supports AMD64 and ARM64

### Dynamic Application Security Testing (DAST)
- **OWASP ZAP**: Web application security testing
- **Nuclei**: Vulnerability scanner
- **Automated**: Runs against staging environment

## 📊 Monitoring & Alerting

### Health Checks
- **Kubernetes**: Pod and deployment health
- **HTTP Endpoints**: Response time and availability
- **Database**: Connection and query performance
- **Redis**: Cache connectivity and performance

### Automated Monitoring
- **Duration**: 5-minute post-deployment monitoring
- **Frequency**: Every 30 seconds
- **Thresholds**: 5 consecutive failures trigger rollback
- **Alerts**: Slack, PagerDuty, email notifications

### Rollback Triggers
- **Health Check Failures**: Consecutive endpoint failures
- **High Error Rates**: Application log error spikes
- **Performance Degradation**: Response time increases
- **Manual Trigger**: Emergency rollback capability

## 🧪 Testing Strategy

### Unit Tests
- **Backend**: pytest with 80% coverage requirement
- **Frontend**: Jest with React Testing Library
- **Parallel Execution**: Tests run in parallel for speed

### Integration Tests
- **Docker Compose**: Full stack testing environment
- **Database**: PostgreSQL with test data
- **Cache**: Redis for session management
- **APIs**: End-to-end API workflow testing

### Load Tests
- **k6**: Modern load testing framework
- **Scenarios**: Booking flow and API endpoints
- **Thresholds**: 95th percentile response times
- **Concurrent Users**: Up to 200 users for staging

### Smoke Tests
- **Post-Deployment**: Automated after each deployment
- **Coverage**: Core functionality verification
- **Performance**: Response time validation
- **Security**: Basic security header checks

## 🔧 Maintenance & Troubleshooting

### Common Issues

1. **Migration Failures**:
   ```bash
   # Check migration logs
   kubectl logs -n bookedbarber-production deployment/bookedbarber-backend
   
   # Manual migration rollback
   ./.github/deployment/rollback.sh production
   ```

2. **Health Check Failures**:
   ```bash
   # Run manual health check
   ./.github/deployment/health-check.sh production
   
   # Check pod status
   kubectl get pods -n bookedbarber-production
   ```

3. **Rollback Procedures**:
   ```bash
   # Automatic rollback (triggered by monitoring)
   ./.github/deployment/rollback.sh production
   
   # Emergency rollback (skips safety checks)
   ./.github/deployment/rollback.sh --emergency production
   ```

### Manual Operations

1. **Force Deployment**:
   ```bash
   # Trigger manual deployment
   gh workflow run ci-cd-pipeline.yml -f environment=production -f force_deploy=true
   ```

2. **Security Scan**:
   ```bash
   # Run security scan
   gh workflow run security-scan.yml
   ```

3. **Backup Creation**:
   ```bash
   # Manual backup
   ./.github/deployment/backup-production.sh full
   ```

### Monitoring Dashboards

- **GitHub Actions**: Workflow execution status
- **Kubernetes**: Pod and deployment metrics
- **Application**: Custom health dashboard
- **Security**: Security scan results and trends

## 📈 Performance Characteristics

### Deployment Speed
- **Total Pipeline**: ~15-20 minutes end-to-end
- **Blue-Green Deployment**: ~5 minutes
- **Rollback Time**: ~2 minutes
- **Health Check**: ~5 minutes

### Resource Requirements
- **Staging**: 2 CPU cores, 4GB RAM
- **Production**: 6 CPU cores, 12GB RAM
- **Database**: Separate managed service
- **Storage**: SSD persistent volumes

### Scalability
- **Auto-scaling**: HPA based on CPU/memory
- **Min Replicas**: 3 (production), 2 (staging)
- **Max Replicas**: 10 (production), 6 (staging)
- **Scale-up Time**: ~60 seconds

## 🔮 Future Enhancements

### Planned Features
- **Canary Deployments**: Gradual traffic shifting
- **Chaos Engineering**: Automated resilience testing
- **Performance Regression**: Automated performance baselines
- **Multi-Region**: Cross-region deployment support

### Integration Roadmap
- **ArgoCD**: GitOps deployment automation
- **Istio**: Service mesh for advanced traffic management
- **Prometheus**: Enhanced metrics and alerting
- **Grafana**: Advanced visualization dashboards

## 📝 Contributing

### Pipeline Changes
1. Test changes in feature branch
2. Update documentation
3. Get approval from DevOps team
4. Deploy to staging first
5. Monitor for issues before production

### Security Updates
1. All security tools are updated automatically
2. New vulnerabilities trigger alerts
3. Critical issues require immediate attention
4. Security reviews required for pipeline changes

## 📞 Support

For pipeline issues or questions:
- **Slack**: #devops-support
- **Email**: devops@bookedbarber.com
- **PagerDuty**: Critical production issues
- **GitHub Issues**: Non-urgent pipeline improvements

---

**Last Updated**: 2025-07-15
**Pipeline Version**: 2.0.0
**Maintainer**: DevOps Team