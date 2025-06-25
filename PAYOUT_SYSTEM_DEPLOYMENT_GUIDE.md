# Payout Background Job System Deployment Guide

## Overview

The automated payout processing system uses Celery for distributed task processing, providing scalable, reliable, and monitored payout operations for the Six Figure Barber platform.

## Architecture Components

### 1. Core Services
- **Celery Beat**: Schedules periodic tasks (daily payout checks, retries, reports)
- **Celery Workers**: Process payout jobs with priority queues
- **Redis**: Message broker and result backend
- **PostgreSQL**: Primary database for payout records
- **Monitoring Stack**: Flower, Prometheus, Grafana, AlertManager

### 2. Queue Structure
- **`payouts`** (Priority 8): Direct payout processing
- **`high_priority`** (Priority 10): Critical tasks and retries
- **`default`** (Priority 5): Regular processing tasks
- **`low_priority`** (Priority 1): Reports and cleanup

## Deployment Options

### Option 1: Docker Compose (Recommended for Single Server)

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env

# Start all services
docker-compose -f docker-compose.payout.yml up -d

# Scale workers as needed
docker-compose -f docker-compose.payout.yml up -d --scale celery-payout-worker=4

# View logs
docker-compose -f docker-compose.payout.yml logs -f celery-payout-worker-1
```

### Option 2: Kubernetes (For High Scale)

```yaml
# Apply Kubernetes manifests
kubectl apply -f k8s/payout-system/

# Scale workers
kubectl scale deployment payout-worker --replicas=10

# Check status
kubectl get pods -l app=payout-system
```

### Option 3: Manual Deployment

```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis

# Install dependencies
cd backend
pip install -r requirements.txt

# Start Celery Beat
celery -A config.celery_config:celery_app beat -l info --detach

# Start Workers
./scripts/start_payout_workers.sh --with-flower

# Monitor
celery -A config.celery_config:celery_app status
```

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# Database
DATABASE_URL=postgresql://user:pass@localhost/sixfb_booking

# Payment Services
STRIPE_SECRET_KEY=sk_live_xxx
SQUARE_ACCESS_TOKEN=xxx
DWOLLA_KEY=xxx
DWOLLA_SECRET=xxx

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
FLOWER_USER=admin
FLOWER_PASSWORD=secure_password_here

# Alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx
PAGERDUTY_API_KEY=xxx
```

### Celery Configuration

Key settings in `config/celery_config.py`:

```python
# Worker limits
task_time_limit = 600  # 10 minutes hard limit
task_soft_time_limit = 540  # 9 minutes soft limit
task_max_retries = 5
worker_max_tasks_per_child = 100  # Restart after 100 tasks

# Queue configuration
task_routes = {
    'tasks.payout_jobs.process_single_payout': {'queue': 'payouts', 'priority': 8},
    'tasks.payout_jobs.retry_failed_payout': {'queue': 'payouts', 'priority': 9},
}
```

## Monitoring Setup

### 1. Flower Dashboard
Access at `http://localhost:5555`
- Real-time task monitoring
- Worker status and performance
- Task history and failures

### 2. Prometheus Metrics
Access at `http://localhost:9090`
- System performance metrics
- Custom payout metrics
- Alert rules

### 3. Grafana Dashboards
Access at `http://localhost:3001`
- Payout processing dashboard
- System health overview
- Performance trends

### 4. Custom Monitoring API
```bash
# Check system status
curl http://localhost:8000/api/v1/payout-jobs/status

# View recent jobs
curl http://localhost:8000/api/v1/payout-jobs/jobs

# Get metrics
curl http://localhost:8000/api/v1/payout-jobs/metrics?time_range=24h
```

## Security Considerations

### 1. Network Security
- Redis should not be exposed to internet
- Use SSL/TLS for inter-service communication
- Implement IP whitelisting for monitoring tools

### 2. Access Control
- Secure Flower with strong authentication
- Use role-based access for API endpoints
- Rotate credentials regularly

### 3. Data Protection
- Encrypt sensitive payment data at rest
- Use secure connections to payment providers
- Implement audit logging for all payout operations

## Scaling Guidelines

### Horizontal Scaling
```bash
# Add more workers for high volume
docker-compose up -d --scale celery-payout-worker=10

# Dedicate workers to specific queues
celery worker -Q payouts -c 4 -n payout-dedicated@%h
```

### Vertical Scaling
- Increase worker concurrency for CPU-bound tasks
- Add more memory for large batch processing
- Use connection pooling for database

### Performance Tuning
```python
# Optimize for throughput
worker_prefetch_multiplier = 4  # Fetch more tasks
task_acks_late = True  # Acknowledge after completion

# Optimize for reliability
worker_prefetch_multiplier = 1  # One task at a time
task_reject_on_worker_lost = True  # Requeue on failure
```

## Maintenance Operations

### Daily Tasks
```bash
# Check worker health
celery -A config.celery_config:celery_app inspect active

# Monitor queue depths
celery -A config.celery_config:celery_app inspect reserved
```

### Weekly Tasks
```bash
# Clean up old logs
./scripts/cleanup_payout_logs.sh

# Review error patterns
python scripts/analyze_payout_failures.py
```

### Emergency Procedures

#### Stop All Processing
```bash
# Graceful shutdown
./scripts/stop_payout_workers.sh

# Emergency stop
celery -A config.celery_config:celery_app control shutdown
```

#### Retry Failed Payouts
```bash
# Via API
curl -X POST http://localhost:8000/api/v1/payout-jobs/retry/123

# Via Celery
celery -A config.celery_config:celery_app call tasks.payout_jobs.retry_failed_payouts
```

#### Manual Payout Processing
```python
# Emergency script
from tasks.payout_jobs import process_single_payout
result = process_single_payout.apply_async(args=[schedule_id])
print(f"Task ID: {result.id}")
```

## Troubleshooting

### Common Issues

1. **Workers Not Processing Tasks**
```bash
# Check worker status
celery -A config.celery_config:celery_app inspect active

# Restart workers
docker-compose restart celery-payout-worker-1
```

2. **High Queue Depth**
```bash
# Check queue sizes
redis-cli llen celery:payouts

# Add more workers
docker-compose up -d --scale celery-payout-worker=5
```

3. **Failed Payouts**
```bash
# Check logs
docker logs sixfb_payout_worker_1

# Review error details
python scripts/debug_failed_payout.py --payment-id 123
```

### Debug Mode
```bash
# Run worker in foreground with debug logging
celery -A config.celery_config:celery_app worker -l debug -Q payouts
```

## Performance Benchmarks

### Expected Throughput
- **Single Worker**: 50-100 payouts/minute
- **10 Workers**: 500-1000 payouts/minute
- **With Redis Cluster**: 2000+ payouts/minute

### Resource Requirements
- **Minimum**: 2 CPU, 4GB RAM, 20GB disk
- **Recommended**: 8 CPU, 16GB RAM, 100GB SSD
- **High Volume**: 32+ CPU, 64GB RAM, 500GB SSD

## Backup and Recovery

### Backup Strategy
```bash
# Backup Redis
redis-cli BGSAVE

# Backup Celery Beat schedule
cp /tmp/celerybeat-schedule /backup/

# Backup job history
pg_dump -t barber_payments -t payout_schedules > payout_backup.sql
```

### Recovery Procedures
```bash
# Restore Redis
redis-cli --rdb /backup/dump.rdb

# Restore database
psql sixfb_booking < payout_backup.sql

# Restart services
docker-compose -f docker-compose.payout.yml up -d
```

## Support and Monitoring Contacts

- **System Alerts**: alerts@sixfigurebarber.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Escalation**: engineering-lead@sixfigurebarber.com
- **Payment Provider Support**:
  - Stripe: https://support.stripe.com
  - Square: https://squareup.com/help

## Version History

- **v1.0.0** (2025-06-25): Initial deployment with Celery
- **v1.1.0**: Added retry logic and monitoring
- **v1.2.0**: Implemented priority queues
- **v1.3.0**: Added performance monitoring

---

For additional support or custom configurations, contact the engineering team.
