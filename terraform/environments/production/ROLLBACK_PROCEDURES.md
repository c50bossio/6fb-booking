# BookedBarber V2 Production Rollback Procedures

## 🚨 Emergency Rollback Guide

### Immediate Actions (< 5 minutes)

#### 1. Stop All Application Traffic
```bash
# Disable auto-scaling (if configured)
aws application-autoscaling delete-scaling-policy \
  --policy-name bookedbarber-cpu-scaling \
  --service-namespace ecs \
  --resource-id service/bookedbarber-v2-production/backend \
  --scalable-dimension ecs:service:DesiredCount

# Scale down services to 0
aws ecs update-service \
  --cluster bookedbarber-v2-production \
  --service backend-service \
  --desired-count 0

aws ecs update-service \
  --cluster bookedbarber-v2-production \
  --service frontend-service \
  --desired-count 0
```

#### 2. Put Maintenance Page
```bash
# Update ALB to show maintenance page
# (Requires pre-configured maintenance target group)
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:004484441478:listener/app/bookedbarber-v2-production-alb/50f6547593d94f72/7169414911912249 \
  --default-actions Type=fixed-response,FixedResponseConfig='{MessageBody="Service temporarily unavailable for maintenance",StatusCode="503",ContentType="text/html"}'
```

## 🔄 Rollback Scenarios

### Scenario 1: Application Issues (Keep Infrastructure)

**Symptoms:** Application errors, but infrastructure is healthy

**Actions:**
1. **Rollback to Previous Task Definition**
```bash
# List previous task definitions
aws ecs describe-task-definition \
  --task-definition bookedbarber-backend \
  --query 'taskDefinition.revision'

# Rollback to previous revision (replace N with previous revision)
aws ecs update-service \
  --cluster bookedbarber-v2-production \
  --service backend-service \
  --task-definition bookedbarber-backend:N
```

2. **Database Rollback (if needed)**
```bash
# Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --target-db-instance-identifier bookedbarber-v2-production-postgres-restored \
  --source-db-instance-identifier bookedbarber-v2-production-postgres \
  --restore-time 2025-07-26T20:00:00.000Z
```

### Scenario 2: Infrastructure Issues (Partial Rollback)

**Symptoms:** Network, security, or service discovery issues

**Actions:**
1. **Check Infrastructure State**
```bash
cd /Users/bossio/6fb-booking/terraform/environments/production
terraform plan -var-file="terraform.tfvars"
```

2. **Rollback Specific Resources**
```bash
# Remove problematic resources
terraform state list
terraform destroy -target=aws_security_group.problematic_sg -var-file="terraform.tfvars"

# Reapply from known good state
terraform apply -var-file="terraform.tfvars"
```

### Scenario 3: Complete Infrastructure Rollback

**Symptoms:** Major infrastructure corruption or security breach

**⚠️ WARNING: This will destroy ALL production infrastructure**

**Pre-rollback Checklist:**
- [ ] Backup all data from RDS
- [ ] Export S3 bucket contents
- [ ] Document current state
- [ ] Notify all stakeholders
- [ ] Have recovery plan ready

**Complete Rollback Steps:**

1. **Data Backup (CRITICAL)**
```bash
# Create final RDS snapshot
aws rds create-db-snapshot \
  --db-instance-identifier bookedbarber-v2-production-postgres \
  --db-snapshot-identifier emergency-backup-$(date +%Y%m%d-%H%M%S)

# Sync all S3 data to backup location
aws s3 sync s3://bookedbarber-v2-production-static-assets ./backup/static-assets/
aws s3 sync s3://bookedbarber-v2-production-backups ./backup/backups/
```

2. **Export Terraform State**
```bash
# Backup current state
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d-%H%M%S)
terraform output -json > infrastructure-backup-$(date +%Y%m%d-%H%M%S).json
```

3. **Controlled Destruction**
```bash
cd /Users/bossio/6fb-booking/terraform/environments/production

# Disable deletion protection on RDS
aws rds modify-db-instance \
  --db-instance-identifier bookedbarber-v2-production-postgres \
  --no-deletion-protection \
  --apply-immediately

# Destroy infrastructure (will prompt for confirmation)
terraform destroy -var-file="terraform.tfvars"
```

## 📊 Recovery Procedures

### Rapid Infrastructure Recovery
```bash
# Restore from Terraform configuration
cd /Users/bossio/6fb-booking/terraform/environments/production
terraform init
terraform apply -var-file="terraform.tfvars"

# Wait for infrastructure to be ready
aws rds wait db-instance-available --db-instance-identifier bookedbarber-v2-production-postgres
aws ecs wait services-stable --cluster bookedbarber-v2-production
```

### Database Recovery Options

#### Option 1: Point-in-Time Recovery
```bash
# Restore to specific time
aws rds restore-db-instance-to-point-in-time \
  --target-db-instance-identifier bookedbarber-v2-production-postgres-restored \
  --source-db-instance-identifier bookedbarber-v2-production-postgres \
  --restore-time 2025-07-26T19:30:00.000Z

# Update application to use restored database
# (Update connection strings in ECS task definitions)
```

#### Option 2: Snapshot Recovery
```bash
# List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier bookedbarber-v2-production-postgres

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier bookedbarber-v2-production-postgres-from-snapshot \
  --db-snapshot-identifier snapshot-name
```

### Application Recovery
```bash
# Redeploy known good application version
aws ecs update-service \
  --cluster bookedbarber-v2-production \
  --service backend-service \
  --task-definition bookedbarber-backend:KNOWN_GOOD_REVISION \
  --desired-count 2

aws ecs update-service \
  --cluster bookedbarber-v2-production \
  --service frontend-service \
  --task-definition bookedbarber-frontend:KNOWN_GOOD_REVISION \
  --desired-count 2
```

## 🔍 Monitoring During Rollback

### Health Checks
```bash
# Monitor ALB target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:004484441478:targetgroup/bb-prod-backend/8d09bb8118b49e10

# Monitor ECS service status
aws ecs describe-services \
  --cluster bookedbarber-v2-production \
  --services backend-service frontend-service
```

### Log Monitoring
```bash
# Monitor CloudWatch logs for errors
aws logs tail /ecs/bookedbarber-v2-production/backend --follow
aws logs tail /ecs/bookedbarber-v2-production/frontend --follow
```

## 🎯 Prevention & Best Practices

### Pre-deployment Checklist
- [ ] Test in staging environment first
- [ ] Create infrastructure snapshot
- [ ] Document rollback plan
- [ ] Verify backup integrity
- [ ] Plan communication strategy

### Deployment Safety
```bash
# Always use planned deployments
terraform plan -var-file="terraform.tfvars" -out=production.tfplan
# Review plan carefully before applying
terraform apply production.tfplan
```

### Monitoring Setup
```bash
# Set up CloudWatch alarms for critical metrics
aws cloudwatch put-metric-alarm \
  --alarm-name "RDS-CPU-High" \
  --alarm-description "RDS CPU utilization too high" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=bookedbarber-v2-production-postgres
```

## 📞 Emergency Contacts

### AWS Support
- **Account ID:** 004484441478
- **Support Plan:** Basic (upgrade to Business for 24/7 support)
- **Console:** https://console.aws.amazon.com/support/

### Infrastructure Components
- **Region:** us-east-1
- **VPC:** vpc-0b412de4b7e734658
- **ECS Cluster:** bookedbarber-v2-production
- **RDS Instance:** bookedbarber-v2-production-postgres
- **Load Balancer:** bookedbarber-v2-production-alb

### Key Commands Reference
```bash
# Quick status check
aws ecs describe-clusters --clusters bookedbarber-v2-production
aws rds describe-db-instances --db-instance-identifier bookedbarber-v2-production-postgres
aws elbv2 describe-load-balancers --names bookedbarber-v2-production-alb

# Emergency shutdown
terraform destroy -var-file="terraform.tfvars"

# Emergency restore
terraform apply -var-file="terraform.tfvars"
```

---

**Remember: Always test rollback procedures in a staging environment before executing in production.**