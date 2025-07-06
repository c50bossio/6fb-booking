# ElastiCache Deployment Guide

## ✅ Deployment Status

Your AWS ElastiCache Redis cluster has been successfully deployed!

### Cluster Details
- **Cluster ID**: bookedbarber-redis
- **Status**: Available
- **Endpoint**: bookedbarber-redis.at4sku.0001.use1.cache.amazonaws.com
- **Port**: 6379
- **Instance Type**: cache.t3.micro (Free tier eligible)
- **Region**: us-east-1
- **Redis Version**: 7.1.0

### Connection String
```
redis://bookedbarber-redis.at4sku.0001.use1.cache.amazonaws.com:6379/0
```

## 🔒 Security Configuration

ElastiCache is deployed within a VPC for security and is not directly accessible from the internet. This is AWS best practice.

### Current Setup
- ElastiCache is in the default VPC
- Using default security group
- Your IP (201.207.89.188) has been added to the security group for port 6379

## 🌐 Access Options

### Option 1: Deploy Application to AWS (Recommended for Production)
Deploy your BookedBarber application to AWS services in the same VPC:
- **AWS EC2**: Traditional server deployment
- **AWS ECS/Fargate**: Containerized deployment
- **AWS Elastic Beanstalk**: Managed platform deployment
- **AWS Lambda**: Serverless functions

### Option 2: SSH Tunnel (Development)
1. Launch a t2.micro EC2 instance in the same VPC
2. SSH to the instance and create a tunnel:
   ```bash
   ssh -L 6379:bookedbarber-redis.at4sku.0001.use1.cache.amazonaws.com:6379 ec2-user@your-ec2-instance
   ```
3. Connect to `localhost:6379` from your local machine

### Option 3: AWS VPN (Development)
Set up AWS Client VPN for secure access to your VPC resources.

### Option 4: Local Development with Fallback
Continue using local Redis for development and switch to ElastiCache in production:
```python
import os

if os.getenv('ENVIRONMENT') == 'production':
    REDIS_URL = os.getenv('REDIS_URL')  # ElastiCache URL
else:
    REDIS_URL = 'redis://localhost:6379/0'  # Local Redis
```

## 📋 Next Steps

### 1. Update Application Configuration
The `.env` file has been updated with ElastiCache settings:
```env
REDIS_URL=redis://bookedbarber-redis.at4sku.0001.use1.cache.amazonaws.com:6379/0
AWS_ELASTICACHE_ENABLED=true
```

### 2. Data Migration (When Deploying to AWS)
Use the migration script when your application is deployed to AWS:
```bash
python scripts/migrate_to_elasticache.py
```

### 3. Set Up Monitoring
Configure CloudWatch alarms for:
- CPU utilization
- Memory usage
- Connection count
- Evictions

### 4. Production Deployment
When ready to deploy to production:
1. Deploy application to AWS (EC2, ECS, etc.)
2. Ensure application is in the same VPC
3. Remove development IP from security group
4. Enable encryption in transit (optional)
5. Set up automated backups

## 🛠️ Management Scripts

### Test Connection (from AWS environment)
```bash
python scripts/test_elasticache_connection.py
```

### Check Status
```bash
python scripts/check_elasticache_status.py
```

### Enable/Disable Development Access
```bash
# Enable access for your current IP
python scripts/enable_dev_access_elasticache.py

# Remove access when done
python scripts/enable_dev_access_elasticache.py --remove
```

### Diagnose Network Issues
```bash
python scripts/diagnose_elasticache_network.py
```

## 💰 Cost Management

### Current Setup (Free Tier)
- **Instance**: cache.t3.micro
- **Cost**: Free for 750 hours/month (first 12 months)
- **After free tier**: ~$0.017/hour ($12-13/month)

### Cost Optimization Tips
1. Use Reserved Instances for long-term savings (up to 50% discount)
2. Monitor with CloudWatch to right-size your instance
3. Enable automatic snapshots for backup
4. Consider ElastiCache Serverless for variable workloads

## 🔐 Security Best Practices

1. **Never expose ElastiCache to the internet** (current setup is secure)
2. **Use VPC security groups** to control access
3. **Enable encryption** in transit and at rest for sensitive data
4. **Rotate credentials** if using AUTH tokens
5. **Monitor access** with CloudWatch and VPC Flow Logs

## 📊 Performance Optimization

### Connection Pooling
Your application is already configured with:
- Max connections: 20
- Connection timeout: 5 seconds
- Retry on timeout: Enabled

### Monitoring Metrics
Key metrics to watch:
- **Cache Hit Rate**: Should be >80%
- **CPU Utilization**: Keep below 75%
- **Network Throughput**: Monitor for spikes
- **Evictions**: Should be minimal

## 🚨 Troubleshooting

### Connection Timeouts
- Verify security group rules
- Check VPC network ACLs
- Ensure application is in same VPC

### High Latency
- Check CloudWatch metrics
- Consider upgrading instance type
- Review connection pool settings

### Memory Issues
- Monitor eviction metrics
- Implement proper TTLs
- Consider larger instance type

## 📚 Additional Resources

- [AWS ElastiCache Documentation](https://docs.aws.amazon.com/elasticache/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [VPC Security Best Practices](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-best-practices.html)