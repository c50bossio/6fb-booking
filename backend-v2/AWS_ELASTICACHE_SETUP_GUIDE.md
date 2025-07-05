# AWS ElastiCache Setup Guide - BookedBarber V2

## 🎯 Overview

This guide walks you through setting up AWS ElastiCache for your BookedBarber platform. ElastiCache will provide enterprise-grade Redis caching, rate limiting, and background job processing.

## 💰 Cost Breakdown

### Recommended Configurations by Business Size

| Business Type | Instance | Memory | Cost/Month | Capacity |
|---------------|----------|---------|------------|----------|
| **Small Shop (1-5 barbers)** | `cache.t4g.small` | 1.55 GB | ~$30 | 500+ users |
| **Medium Shop (5-15 barbers)** | `cache.t4g.medium` | 3.09 GB | ~$60 | 1,500+ users |
| **Large Chain (15+ locations)** | `cache.r6g.large` | 13.07 GB | ~$120 | 5,000+ users |
| **Enterprise** | `cache.r6g.xlarge` | 26.32 GB | ~$240 | 10,000+ users |

## 🏗️ Step-by-Step Setup

### Phase 1: Basic ElastiCache Cluster Creation

#### 1. **Access AWS Console**
```
1. Log into AWS Console (console.aws.amazon.com)
2. Navigate to ElastiCache service
3. Choose your region (same as your API deployment)
```

#### 2. **Create Redis Cluster**
```
1. Click "Create cluster"
2. Choose "Redis" as engine
3. Select configuration:
   - Engine version: 7.0 or latest
   - Port: 6379 (default)
   - Parameter group: default.redis7.x
   - Node type: cache.t4g.small (recommended)
```

#### 3. **Network & Security Settings**
```
Subnet group: Create new private subnet group
VPC: Select your application's VPC
Security groups: Create new (configure in next step)
Encryption:
  ✅ Encryption at rest: Enabled
  ✅ Encryption in transit: Enabled
  ✅ Redis AUTH: Enabled (set strong password)
```

#### 4. **Backup Configuration**
```
Backup retention period: 7 days
Backup window: 03:00-05:00 UTC (off-peak hours)
Maintenance window: Sunday 05:00-07:00 UTC
```

### Phase 2: Security Group Configuration

#### **Create ElastiCache Security Group**
```bash
# Security Group Name: bookedbarber-elasticache-sg
# Description: Redis access for BookedBarber API servers

# Inbound Rules:
Type: Custom TCP
Port: 6379
Source: bookedbarber-api-sg (your API security group)
Description: Redis access from API servers

# Outbound Rules:
Type: All traffic
Destination: 0.0.0.0/0
```

#### **Update API Security Group**
```bash
# Add outbound rule to your API security group:
Type: Custom TCP  
Port: 6379
Destination: bookedbarber-elasticache-sg
Description: Redis connection to ElastiCache
```

### Phase 3: Production Environment Configuration

#### **Get Connection Details**
After cluster creation, get your connection endpoint:
```
Primary Endpoint: your-cluster.xxxxx.cache.amazonaws.com:6379
```

#### **Update Environment Variables**
Update your `.env.production`:
```bash
# AWS ElastiCache Configuration
REDIS_URL=rediss://your-cluster.xxxxx.cache.amazonaws.com:6379
REDIS_PASSWORD=your-auth-token-here
REDIS_SSL=true
REDIS_MAX_CONNECTIONS=50
REDIS_CONNECTION_TIMEOUT=20
REDIS_SOCKET_TIMEOUT=5

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL_DEFAULT=300
CACHE_TTL_BOOKINGS=60
CACHE_TTL_ANALYTICS=1800

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
RATE_LIMIT_PER_DAY=10000
```

## 📊 CloudWatch Monitoring Setup

### **Enable Enhanced Monitoring**
```
1. In ElastiCache console, select your cluster
2. Go to "Monitoring" tab
3. Enable "Enhanced monitoring"
4. Set monitoring interval: 60 seconds
```

### **Create CloudWatch Dashboard**
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ElastiCache", "CacheHits", "CacheClusterId", "your-cluster-id"],
          [".", "CacheMisses", ".", "."],
          [".", "CPUUtilization", ".", "."],
          [".", "DatabaseMemoryUsagePercentage", ".", "."],
          [".", "NetworkBytesIn", ".", "."],
          [".", "NetworkBytesOut", ".", "."],
          [".", "CurrConnections", ".", "."]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "BookedBarber Redis Performance"
      }
    }
  ]
}
```

### **Set Up Critical Alerts**
```bash
# High Memory Usage Alert
Metric: DatabaseMemoryUsagePercentage
Threshold: > 80%
Action: Send SNS notification

# Low Cache Hit Rate Alert  
Metric: CacheHitRate
Threshold: < 85%
Action: Send SNS notification

# High Connection Count Alert
Metric: CurrConnections  
Threshold: > 45 (90% of max)
Action: Send SNS notification
```

## 🚀 Deployment Process

### **1. Test Connection**
Before deploying, test ElastiCache connectivity:
```python
# Test script (run from your API server)
import redis
import ssl

try:
    r = redis.Redis(
        host='your-cluster.xxxxx.cache.amazonaws.com',
        port=6379,
        password='your-auth-token',
        ssl=True,
        ssl_cert_reqs=ssl.CERT_REQUIRED,
        decode_responses=True
    )
    
    # Test connection
    r.ping()
    print("✅ ElastiCache connection successful")
    
    # Test basic operations
    r.set('test:key', 'test:value', ex=60)
    value = r.get('test:key')
    print(f"✅ Basic operations work: {value}")
    
    r.delete('test:key')
    print("✅ ElastiCache ready for production")
    
except Exception as e:
    print(f"❌ Connection failed: {e}")
```

### **2. Deploy Application**
```bash
# Update your deployment with new environment variables
export REDIS_URL="rediss://your-cluster.xxxxx.cache.amazonaws.com:6379"
export REDIS_PASSWORD="your-auth-token"
export REDIS_SSL="true"

# Deploy to your production environment
git push origin main  # (if using auto-deploy)
# OR deploy via your CI/CD pipeline
```

### **3. Verify Deployment**
```bash
# Check application logs for Redis connection
curl https://your-api-domain.com/api/v1/cache/health

# Expected response:
{
  "status": "healthy",
  "redis_available": true,
  "hit_rate": 0.0,
  "memory_usage": "12.5MB",
  "connections": 3
}
```

## 🎯 Performance Optimization

### **Optimal TTL Settings**
Based on barbershop booking patterns:
```bash
# Real-time data (booking availability)
CACHE_TTL_BOOKINGS=60  # 1 minute

# User preferences (timezone, settings)  
CACHE_TTL_USER_DATA=600  # 10 minutes

# Business hours and policies
CACHE_TTL_BUSINESS=86400  # 24 hours

# Analytics and reports
CACHE_TTL_ANALYTICS=1800  # 30 minutes

# Static content (services, prices)
CACHE_TTL_STATIC=3600  # 1 hour
```

### **Connection Pool Optimization**
```python
# Optimal settings for barbershop traffic patterns
REDIS_MAX_CONNECTIONS=50  # Handles 500+ concurrent users
REDIS_CONNECTION_TIMEOUT=20  # Generous timeout for mobile users
REDIS_SOCKET_TIMEOUT=5  # Quick failure detection
REDIS_SOCKET_KEEPALIVE=True  # Maintain connections
```

## 🔒 Security Best Practices

### **Network Security**
```
✅ VPC-only access (no public internet)
✅ Security groups restrict access to API servers only
✅ Encryption in transit (SSL/TLS)
✅ Encryption at rest
✅ Redis AUTH enabled with strong password
```

### **Access Control**
```
✅ IAM roles for API servers
✅ Principle of least privilege
✅ Regular password rotation (quarterly)
✅ VPC Flow Logs enabled
✅ CloudTrail logging enabled
```

## 📈 Scaling Strategy

### **Automatic Scaling Triggers**
```
Memory Usage > 80%: Scale up to next instance size
Connection Count > 90%: Enable cluster mode
CPU Usage > 70%: Consider read replicas
Cache Hit Rate < 85%: Review TTL settings
```

### **Scaling Options**
```bash
# Vertical Scaling (more memory/CPU)
t4g.small → t4g.medium → t4g.large → r6g.large

# Horizontal Scaling (multiple nodes)
Single node → Cluster mode → Multi-AZ → Cross-region
```

## 🆘 Troubleshooting Guide

### **Common Issues & Solutions**

#### **Connection Timeout**
```bash
# Symptoms: Redis connection timeouts
# Solution: Check security groups and VPC configuration
# Test: telnet your-cluster.xxxxx.cache.amazonaws.com 6379
```

#### **High Memory Usage**
```bash
# Symptoms: Memory usage > 90%
# Solution: Review TTL settings or scale up instance
# Monitor: CloudWatch DatabaseMemoryUsagePercentage
```

#### **Low Cache Hit Rate**
```bash
# Symptoms: Hit rate < 80%
# Solution: Optimize cache keys and TTL values
# Monitor: CacheHits vs CacheMisses metrics
```

#### **Authentication Failures**
```bash
# Symptoms: AUTH failed errors
# Solution: Verify REDIS_PASSWORD environment variable
# Test: Redis CLI with AUTH command
```

## 🎉 Success Metrics

After successful deployment, expect:

### **Performance Improvements**
- **Page Load Time**: 50-80% faster with caching
- **API Response Time**: <100ms for cached data
- **Database Load**: 60-80% reduction in database queries
- **Concurrent Users**: Support 5x more users than without caching

### **Reliability Improvements**
- **Uptime**: 99.9% availability with Multi-AZ
- **Rate Limiting**: Protection against traffic spikes
- **Background Jobs**: Reliable email/SMS delivery
- **Cache Hit Rate**: 85-95% (excellent performance)

## 💡 Next Steps

1. **Week 1**: Set up basic ElastiCache cluster and test connectivity
2. **Week 2**: Deploy to production and monitor performance
3. **Week 3**: Optimize TTL settings based on real traffic patterns
4. **Week 4**: Set up advanced monitoring and alerting

Your BookedBarber platform will have enterprise-grade Redis infrastructure that scales with your business growth! 🚀

---
**Estimated Setup Time**: 2-4 hours  
**Monthly Cost**: $30-60 for most barbershops  
**Performance Gain**: 5-10x improvement in response times  
**Scalability**: Supports growth from 100 to 10,000+ users