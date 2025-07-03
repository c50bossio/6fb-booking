# BookedBarber V2 - Terraform Deployment Guide

This guide provides step-by-step instructions for deploying BookedBarber V2 infrastructure using Terraform across AWS and Google Cloud Platform.

## 🚀 Quick Start

### Prerequisites

1. **Install Required Tools**
   ```bash
   # Terraform
   curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
   sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
   sudo apt-get update && sudo apt-get install terraform
   
   # AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip && sudo ./aws/install
   
   # Google Cloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL && gcloud init
   
   # jq for JSON processing
   sudo apt-get install jq
   ```

2. **Configure Cloud Provider Credentials**
   ```bash
   # AWS
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and default region
   
   # Google Cloud
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

### AWS Deployment (Recommended for Production)

1. **Clone and Setup**
   ```bash
   cd terraform/environments/production
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Configure Secrets in AWS Parameter Store**
   ```bash
   # Create required secrets
   aws ssm put-parameter --name "/bookedbarber/production/secrets/db_master_password" \
     --value "your-secure-password" --type "SecureString"
   
   aws ssm put-parameter --name "/bookedbarber/production/secrets/jwt_secret_key" \
     --value "your-jwt-secret" --type "SecureString"
   
   aws ssm put-parameter --name "/bookedbarber/production/secrets/stripe_secret_key" \
     --value "sk_live_your_stripe_key" --type "SecureString"
   
   aws ssm put-parameter --name "/bookedbarber/production/secrets/sendgrid_api_key" \
     --value "SG.your_sendgrid_key" --type "SecureString"
   
   aws ssm put-parameter --name "/bookedbarber/production/secrets/twilio_auth_token" \
     --value "your_twilio_token" --type "SecureString"
   
   aws ssm put-parameter --name "/bookedbarber/production/secrets/google_client_secret" \
     --value "your_google_secret" --type "SecureString"
   
   aws ssm put-parameter --name "/bookedbarber/production/secrets/sentry_dsn" \
     --value "https://your-sentry-dsn" --type "SecureString"
   ```

3. **Edit terraform.tfvars**
   ```hcl
   # Update with your actual values
   route53_zone_id = "Z1D633PJN98FT9"
   stripe_publishable_key = "pk_live_your_stripe_key"
   alert_email_addresses = ["devops@yourdomain.com"]
   ```

4. **Deploy Using Script**
   ```bash
   ../../scripts/deploy-production.sh
   ```

   Or manually:
   ```bash
   terraform init
   terraform plan -var-file="terraform.tfvars"
   terraform apply -var-file="terraform.tfvars"
   ```

### Google Cloud Deployment

1. **Setup GCP Project**
   ```bash
   gcloud projects create bookedbarber-v2-prod
   gcloud config set project bookedbarber-v2-prod
   
   # Enable required APIs
   gcloud services enable compute.googleapis.com
   gcloud services enable container.googleapis.com
   gcloud services enable sql-component.googleapis.com
   gcloud services enable redis.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

2. **Configure Environment**
   ```bash
   cd terraform/environments/production-gcp
   cp gcp.tfvars.example gcp.tfvars
   # Edit with your GCP project details
   ```

3. **Deploy**
   ```bash
   terraform init
   terraform plan -var-file="gcp.tfvars"
   terraform apply -var-file="gcp.tfvars"
   ```

## 🏗️ Infrastructure Components

### AWS Infrastructure

#### Core Services
- **ECS Fargate**: Containerized application hosting
- **RDS PostgreSQL**: Primary database with Multi-AZ
- **ElastiCache Redis**: Session and API caching
- **Application Load Balancer**: Traffic distribution
- **CloudFront**: Global CDN
- **S3**: Static asset storage

#### Security
- **WAF**: Web application firewall
- **Security Groups**: Network-level security
- **Secrets Manager**: Secure credential storage
- **KMS**: Encryption key management
- **GuardDuty**: Threat detection

#### Monitoring
- **CloudWatch**: Metrics and logging
- **SNS**: Alert notifications
- **X-Ray**: Distributed tracing
- **Performance Insights**: Database monitoring

### Google Cloud Infrastructure

#### Core Services
- **Cloud Run**: Serverless container hosting
- **Cloud SQL**: Managed PostgreSQL
- **Cloud Memorystore**: Redis caching
- **Cloud Load Balancing**: Global load balancing
- **Cloud CDN**: Content delivery
- **Cloud Storage**: Object storage

#### Security
- **Cloud Armor**: DDoS protection and WAF
- **Cloud IAM**: Identity and access management
- **Secret Manager**: Secure credential storage
- **Cloud KMS**: Key management

#### Monitoring
- **Cloud Monitoring**: Metrics and alerting
- **Cloud Logging**: Centralized logging
- **Cloud Trace**: Performance monitoring
- **Error Reporting**: Application error tracking

## 🔧 Configuration Options

### Environment Sizing

#### Production (High Availability)
```hcl
# terraform.tfvars
database_instance_class = "db.r6g.xlarge"
redis_node_type = "cache.r6g.large"
min_capacity = 3
max_capacity = 50
backup_retention_days = 30
multi_az = true
```

#### Staging (Cost Optimized)
```hcl
# terraform.tfvars
database_instance_class = "db.t3.medium"
redis_node_type = "cache.t3.medium"
min_capacity = 1
max_capacity = 5
backup_retention_days = 7
multi_az = false
```

#### Development (Minimal)
```hcl
# terraform.tfvars
database_instance_class = "db.t3.small"
redis_node_type = "cache.t3.micro"
min_capacity = 1
max_capacity = 2
backup_retention_days = 1
multi_az = false
```

### Custom Domain Setup

1. **Purchase Domain** (if not already owned)
2. **Configure Route 53 Hosted Zone** (AWS) or **Cloud DNS** (GCP)
3. **Update terraform.tfvars**
   ```hcl
   domain_config = {
     root_domain = "yourdomain.com"
     api_subdomain = "api"
     app_subdomain = "app"
     cdn_subdomain = "cdn"
   }
   ```

### SSL Certificate Management

#### AWS (Automatic with ACM)
```hcl
# Certificates are automatically created and validated
ssl_certificate_arn = ""  # Leave empty for auto-creation
```

#### Manual Certificate
```hcl
# Use existing certificate
ssl_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
```

## 📊 Monitoring and Alerting

### Default Alerts

The infrastructure automatically creates alerts for:

- **High CPU Utilization** (>70%)
- **High Memory Usage** (>80%)
- **Database CPU** (>60%)
- **High Error Rate** (>1%)
- **Slow Response Time** (>1000ms)
- **Database Connection Issues**
- **Cache Connection Issues**

### Custom Monitoring

Add custom metrics:

```hcl
# terraform.tfvars
monitoring_config = {
  custom_alerts = {
    booking_rate = {
      threshold = 100
      period = 300
      comparison = "LessThanThreshold"
    }
  }
}
```

## 💰 Cost Management

### Budget Alerts

```hcl
# terraform.tfvars
monthly_budget_limit = 2000  # USD
budget_alert_threshold = 80  # 80% of budget
```

### Cost Optimization Features

- **Auto-scaling**: Scales down during low usage
- **Scheduled Scaling**: Scale down overnight (non-production)
- **Storage Lifecycle**: Automatic archival
- **Reserved Instances**: For production workloads

### Estimated Monthly Costs

| Environment | AWS Cost | GCP Cost |
|------------|----------|----------|
| Development | $100-200 | $80-150 |
| Staging | $300-500 | $250-400 |
| Production | $1000-2500 | $800-2000 |

*Costs vary based on traffic and usage patterns*

## 🔄 CI/CD Integration

### GitHub Actions (AWS)

```yaml
# .github/workflows/deploy-aws.yml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy Infrastructure
        run: |
          cd terraform/environments/production
          terraform init
          terraform apply -auto-approve
```

### Cloud Build (GCP)

Cloud Build triggers are automatically created and will deploy on git push to main branch.

## 🚨 Disaster Recovery

### Backup Strategy

#### AWS
- **RDS Automated Backups**: 30-day retention
- **Cross-Region Backup**: Optional
- **Point-in-Time Recovery**: Available
- **Snapshot Backups**: Weekly automated

#### GCP
- **Cloud SQL Backups**: Automated daily
- **Point-in-Time Recovery**: 7-day window
- **Cross-Region Replication**: Optional

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # AWS
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier restored-db \
     --db-snapshot-identifier snapshot-id
   
   # GCP
   gcloud sql backups restore backup-id \
     --restore-instance=restored-instance
   ```

2. **Application Recovery**
   - Infrastructure is recreated via Terraform
   - Container images pulled from registry
   - Configuration restored from parameter store/secret manager

## 🔐 Security Best Practices

### Network Security
- Private subnets for application and database
- Security groups with least-privilege access
- VPC endpoints for AWS services
- Network ACLs for additional protection

### Application Security
- All traffic encrypted in transit (HTTPS/TLS)
- Database encryption at rest
- Secrets stored in dedicated services
- Regular security patching via container updates

### Compliance
- CloudTrail/Cloud Audit Logs enabled
- GuardDuty/Cloud Security Command Center active
- Security Hub/Security Health Analytics configured
- Regular vulnerability scanning

## 🐛 Troubleshooting

### Common Issues

#### Terraform State Lock
```bash
# AWS
terraform force-unlock LOCK_ID

# Check DynamoDB table
aws dynamodb scan --table-name bookedbarber-terraform-locks
```

#### Certificate Validation Issues
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn YOUR_CERT_ARN

# Verify DNS records
dig _acme-challenge.yourdomain.com
```

#### Application Health Checks Failing
```bash
# Check ECS service status
aws ecs describe-services --cluster cluster-name --services service-name

# Check logs
aws logs tail /aws/ecs/bookedbarber-backend --follow
```

### Support Contacts

- **Infrastructure Issues**: DevOps Team
- **Application Issues**: Development Team  
- **Security Issues**: Security Team
- **Emergency**: On-call Engineer

## 📚 Additional Resources

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Google Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [BookedBarber V2 Architecture Documentation](../docs/ARCHITECTURE.md)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Google Cloud Architecture Center](https://cloud.google.com/architecture)

---

**Version**: 1.0.0  
**Last Updated**: 2025-07-03  
**Maintainer**: DevOps Team