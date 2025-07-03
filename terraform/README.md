# BookedBarber V2 - Terraform Infrastructure

This directory contains Infrastructure as Code (IaC) for deploying BookedBarber V2 across multiple cloud providers and environments.

## 🏗️ Architecture Overview

BookedBarber V2 is a FastAPI + Next.js barbershop booking platform requiring:

- **Database**: PostgreSQL with automated backups
- **Cache**: Redis cluster for sessions and API caching
- **Backend**: FastAPI application with auto-scaling
- **Frontend**: Next.js application with CDN
- **Background Jobs**: Celery workers for notifications
- **Monitoring**: Sentry integration with cloud monitoring
- **Security**: SSL certificates, WAF, secrets management

## 📁 Directory Structure

```
terraform/
├── environments/          # Environment-specific configurations
│   ├── dev/              # Development environment
│   ├── staging/          # Staging environment
│   └── production/       # Production environment
├── modules/              # Reusable Terraform modules
│   ├── shared/           # Cloud-agnostic modules
│   ├── aws/             # AWS-specific modules
│   └── gcp/             # Google Cloud modules
└── scripts/             # Deployment and utility scripts
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install Terraform
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform

# Install cloud CLIs
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL && gcloud init
```

### Deploy to AWS (Production)

```bash
cd environments/production
terraform init
terraform plan -var-file="aws.tfvars"
terraform apply -var-file="aws.tfvars"
```

### Deploy to GCP (Staging)

```bash
cd environments/staging
terraform init
terraform plan -var-file="gcp.tfvars"
terraform apply -var-file="gcp.tfvars"
```

## 🔧 Configuration

### Environment Variables

Each environment requires specific configuration files:

- `aws.tfvars` - AWS-specific variables
- `gcp.tfvars` - GCP-specific variables
- `secrets.tfvars` - Sensitive data (not committed)

### Required Secrets

Create `secrets.tfvars` in each environment:

```hcl
# Database
db_master_password = "secure-password-here"

# Application secrets
jwt_secret_key = "your-jwt-secret"
stripe_secret_key = "sk_live_your_stripe_key"
sendgrid_api_key = "SG.your_sendgrid_key"
twilio_auth_token = "your_twilio_token"

# Google OAuth
google_client_secret = "your_google_oauth_secret"
```

## 🌍 Multi-Cloud Support

### AWS Infrastructure
- **Compute**: ECS Fargate with auto-scaling
- **Database**: RDS PostgreSQL with Multi-AZ
- **Cache**: ElastiCache Redis cluster
- **Storage**: S3 for static assets
- **CDN**: CloudFront distribution
- **Monitoring**: CloudWatch + AWS X-Ray

### Google Cloud Infrastructure
- **Compute**: Cloud Run with auto-scaling
- **Database**: Cloud SQL PostgreSQL with HA
- **Cache**: Cloud Memorystore Redis
- **Storage**: Cloud Storage for static assets
- **CDN**: Cloud CDN
- **Monitoring**: Cloud Monitoring + Cloud Trace

## 🔒 Security Features

- **Network**: Private subnets, NAT gateways, security groups
- **SSL**: Automated certificate management with Let's Encrypt
- **Secrets**: AWS Secrets Manager / Google Secret Manager
- **IAM**: Least-privilege access policies
- **WAF**: Application firewall protection
- **Encryption**: At-rest and in-transit encryption

## 📊 Monitoring & Observability

- **Application Monitoring**: Sentry error tracking
- **Infrastructure Monitoring**: CloudWatch/Stackdriver
- **Performance**: APM with distributed tracing
- **Alerting**: PagerDuty integration for critical issues
- **Dashboards**: Grafana for custom metrics

## 💰 Cost Optimization

- **Auto-scaling**: Scale down during low usage
- **Reserved Instances**: For predictable workloads
- **Spot Instances**: For non-critical background jobs
- **Storage Lifecycle**: Automated archival policies
- **Cost Alerts**: Budget monitoring and alerts

## 🚦 Environments

### Development
- **Purpose**: Individual developer environments
- **Scale**: Minimal resources, shared services
- **Cost**: ~$50-100/month

### Staging
- **Purpose**: Integration testing and QA
- **Scale**: Production-like but smaller
- **Cost**: ~$200-400/month

### Production
- **Purpose**: Live customer traffic
- **Scale**: High availability, auto-scaling
- **Cost**: ~$800-2000/month (scales with usage)

## 📋 Deployment Checklist

Before deploying to production:

- [ ] Review and approve all Terraform plans
- [ ] Verify secrets are properly configured
- [ ] Test disaster recovery procedures
- [ ] Configure monitoring and alerting
- [ ] Set up backup and retention policies
- [ ] Review security configurations
- [ ] Load test the infrastructure
- [ ] Document runbook procedures

## 🆘 Troubleshooting

### Common Issues

1. **Terraform State Lock**: 
   ```bash
   terraform force-unlock LOCK_ID
   ```

2. **Resource Dependencies**: Check dependency graph
   ```bash
   terraform graph | dot -Tsvg > graph.svg
   ```

3. **Provider Authentication**: Verify cloud credentials
   ```bash
   aws sts get-caller-identity  # AWS
   gcloud auth list             # GCP
   ```

### Support Contacts

- **Infrastructure**: DevOps team
- **Application**: Development team
- **Security**: Security team
- **Emergency**: On-call engineer

## 📚 Additional Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GCP Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [BookedBarber V2 Architecture Documentation](../docs/ARCHITECTURE.md)

---

**Version**: 1.0.0  
**Last Updated**: 2025-07-03  
**Maintainer**: DevOps Team