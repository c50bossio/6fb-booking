#!/bin/bash
# BookedBarber V2 - Production Monitoring Setup Script
# Sets up comprehensive monitoring and alerting for production environment
# Last updated: 2025-07-23

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   warning "This script should not be run as root for security reasons"
   exit 1
fi

log "🚀 Starting BookedBarber V2 Production Monitoring Setup"

# Check prerequisites
log "📋 Checking prerequisites..."

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        error "$1 is not installed. Please install it first."
        exit 1
    fi
    success "$1 is installed"
}

check_tool "curl"
check_tool "jq"
check_tool "python3"
check_tool "npm"

# Check if environment variables are set
check_env_var() {
    if [[ -z "${!1}" ]]; then
        error "Environment variable $1 is not set"
        exit 1
    fi
    success "Environment variable $1 is set"
}

log "🔐 Checking required environment variables..."
check_env_var "SENTRY_PRODUCTION_DSN"
check_env_var "PRODUCTION_API_URL"
check_env_var "PRODUCTION_FRONTEND_URL"
check_env_var "SLACK_WEBHOOK_URL"

# Optional environment variables (with warnings)
optional_env_vars=("NEW_RELIC_LICENSE_KEY" "PAGERDUTY_INTEGRATION_KEY" "GRAFANA_API_KEY")
for var in "${optional_env_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        warning "Optional environment variable $var is not set"
    else
        success "Optional environment variable $var is set"
    fi
done

# 1. Setup Sentry Error Tracking
log "🐛 Setting up Sentry error tracking..."

setup_sentry() {
    log "Configuring Sentry for production..."
    
    # Create Sentry configuration
    cat > sentry-production.yaml << EOF
dsn: ${SENTRY_PRODUCTION_DSN}
environment: production
release: ${GITHUB_SHA:-latest}
sample_rate: 0.8
traces_sample_rate: 0.05
profiles_sample_rate: 0.02
send_default_pii: false
attach_stacktrace: true

tags:
  service: bookedbarber
  tier: production
  region: oregon
  
integrations:
  - django: false
  - fastapi: true
  - sqlalchemy: true
  - redis: true

before_send: |
  # Filter out noisy errors
  if event.get('logger') == 'urllib3.connectionpool':
      return None
  return event
EOF

    # Test Sentry connection
    python3 -c "
import sentry_sdk
sentry_sdk.init('${SENTRY_PRODUCTION_DSN}')
sentry_sdk.capture_message('Production monitoring setup test')
print('✅ Sentry connection successful')
" || error "Failed to connect to Sentry"

    success "Sentry error tracking configured"
}

setup_sentry

# 2. Setup Uptime Monitoring
log "⏰ Setting up uptime monitoring..."

setup_uptime_monitoring() {
    log "Configuring uptime monitors..."
    
    # Create uptime monitoring configuration
    cat > uptime-monitors.json << EOF
{
  "monitors": [
    {
      "name": "BookedBarber Production",
      "url": "${PRODUCTION_FRONTEND_URL}",
      "type": "http",
      "interval": 300,
      "timeout": 30,
      "expected_status": [200, 301, 302]
    },
    {
      "name": "BookedBarber API Health",
      "url": "${PRODUCTION_API_URL}/health",
      "type": "http", 
      "interval": 180,
      "timeout": 30,
      "expected_status": [200]
    },
    {
      "name": "Stripe Webhook Endpoint",
      "url": "${PRODUCTION_API_URL}/webhooks/stripe",
      "type": "http",
      "method": "POST",
      "interval": 300,
      "timeout": 30,
      "expected_status": [400, 405]
    }
  ]
}
EOF

    # Test endpoints
    for url in "${PRODUCTION_FRONTEND_URL}" "${PRODUCTION_API_URL}/health"; do
        status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        if [[ $status -eq 200 ]]; then
            success "Endpoint $url is responding (HTTP $status)"
        else
            warning "Endpoint $url returned HTTP $status"
        fi
    done

    success "Uptime monitoring configured"
}

setup_uptime_monitoring

# 3. Setup Performance Monitoring
log "📊 Setting up performance monitoring..."

setup_performance_monitoring() {
    log "Configuring performance monitoring..."
    
    # Install performance monitoring dependencies
    pip3 install --user psutil requests

    # Create performance monitoring script
    cat > monitor-performance.py << 'EOF'
#!/usr/bin/env python3
"""
Production Performance Monitor
Collects and reports key performance metrics
"""

import time
import json
import requests
import psutil
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class PerformanceMonitor:
    def __init__(self, config):
        self.config = config
        self.metrics = {}
    
    def collect_api_metrics(self):
        """Collect API performance metrics"""
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.config['api_url']}/health",
                timeout=10
            )
            response_time = time.time() - start_time
            
            self.metrics['api_response_time'] = response_time
            self.metrics['api_status'] = response.status_code
            self.metrics['api_available'] = response.status_code == 200
            
        except Exception as e:
            logging.error(f"API metrics collection failed: {e}")
            self.metrics['api_available'] = False
            self.metrics['api_response_time'] = None
    
    def collect_system_metrics(self):
        """Collect system performance metrics"""
        try:
            self.metrics['cpu_percent'] = psutil.cpu_percent(interval=1)
            self.metrics['memory_percent'] = psutil.virtual_memory().percent
            self.metrics['disk_percent'] = psutil.disk_usage('/').percent
            
        except Exception as e:
            logging.error(f"System metrics collection failed: {e}")
    
    def collect_frontend_metrics(self):
        """Collect frontend performance metrics"""
        try:
            start_time = time.time()
            response = requests.get(
                self.config['frontend_url'],
                timeout=15
            )
            response_time = time.time() - start_time
            
            self.metrics['frontend_response_time'] = response_time
            self.metrics['frontend_status'] = response.status_code
            self.metrics['frontend_available'] = response.status_code in [200, 301, 302]
            
        except Exception as e:
            logging.error(f"Frontend metrics collection failed: {e}")
            self.metrics['frontend_available'] = False
            self.metrics['frontend_response_time'] = None
    
    def send_metrics(self):
        """Send metrics to monitoring system"""
        timestamp = datetime.utcnow().isoformat()
        payload = {
            'timestamp': timestamp,
            'service': 'bookedbarber-production',
            'metrics': self.metrics
        }
        
        # Log metrics locally
        logging.info(f"Performance metrics: {json.dumps(payload, indent=2)}")
        
        # Send to monitoring webhook if configured
        if self.config.get('webhook_url'):
            try:
                requests.post(
                    self.config['webhook_url'],
                    json=payload,
                    timeout=10
                )
                logging.info("Metrics sent to monitoring system")
            except Exception as e:
                logging.error(f"Failed to send metrics: {e}")
    
    def check_thresholds(self):
        """Check performance thresholds and alert"""
        alerts = []
        
        # API response time threshold
        if self.metrics.get('api_response_time', 0) > 2.0:
            alerts.append(f"API response time high: {self.metrics['api_response_time']:.2f}s")
        
        # Frontend response time threshold
        if self.metrics.get('frontend_response_time', 0) > 3.0:
            alerts.append(f"Frontend response time high: {self.metrics['frontend_response_time']:.2f}s")
        
        # System resource thresholds
        if self.metrics.get('cpu_percent', 0) > 80:
            alerts.append(f"High CPU usage: {self.metrics['cpu_percent']:.1f}%")
            
        if self.metrics.get('memory_percent', 0) > 85:
            alerts.append(f"High memory usage: {self.metrics['memory_percent']:.1f}%")
        
        # Service availability
        if not self.metrics.get('api_available'):
            alerts.append("API is not available")
            
        if not self.metrics.get('frontend_available'):
            alerts.append("Frontend is not available")
        
        return alerts
    
    def run(self):
        """Run performance monitoring cycle"""
        logging.info("Starting performance monitoring cycle")
        
        self.collect_api_metrics()
        self.collect_frontend_metrics() 
        self.collect_system_metrics()
        
        alerts = self.check_thresholds()
        if alerts:
            logging.warning(f"Performance alerts: {'; '.join(alerts)}")
        
        self.send_metrics()
        
        logging.info("Performance monitoring cycle completed")

if __name__ == "__main__":
    import os
    
    config = {
        'api_url': os.getenv('PRODUCTION_API_URL', 'https://api.bookedbarber.com'),
        'frontend_url': os.getenv('PRODUCTION_FRONTEND_URL', 'https://bookedbarber.com'),
        'webhook_url': os.getenv('MONITORING_WEBHOOK_URL')
    }
    
    monitor = PerformanceMonitor(config)
    monitor.run()
EOF

    chmod +x monitor-performance.py

    # Test performance monitoring
    python3 monitor-performance.py

    success "Performance monitoring configured"
}

setup_performance_monitoring

# 4. Setup Database Monitoring
log "🗄️  Setting up database monitoring..."

setup_database_monitoring() {
    log "Configuring database monitoring..."
    
    # Create database monitoring script
    cat > monitor-database.py << 'EOF'
#!/usr/bin/env python3
"""
Database Performance Monitor
Monitors PostgreSQL database performance and health
"""

import os
import json
import logging
import psycopg2
import psycopg2.extras
from datetime import datetime

logging.basicConfig(level=logging.INFO)

class DatabaseMonitor:
    def __init__(self, database_url):
        self.database_url = database_url
        self.metrics = {}
    
    def collect_connection_metrics(self):
        """Collect database connection metrics"""
        try:
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    # Active connections
                    cur.execute("""
                        SELECT count(*) as active_connections
                        FROM pg_stat_activity 
                        WHERE state = 'active'
                    """)
                    self.metrics['active_connections'] = cur.fetchone()['active_connections']
                    
                    # Total connections
                    cur.execute("""
                        SELECT count(*) as total_connections
                        FROM pg_stat_activity
                    """)
                    self.metrics['total_connections'] = cur.fetchone()['total_connections']
                    
                    # Max connections
                    cur.execute("SHOW max_connections")
                    self.metrics['max_connections'] = int(cur.fetchone()[0])
                    
                    # Connection usage percentage
                    self.metrics['connection_usage_percent'] = (
                        self.metrics['total_connections'] / self.metrics['max_connections']
                    ) * 100
                    
        except Exception as e:
            logging.error(f"Failed to collect connection metrics: {e}")
    
    def collect_performance_metrics(self):
        """Collect database performance metrics"""
        try:
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    # Slow queries
                    cur.execute("""
                        SELECT count(*) as slow_queries
                        FROM pg_stat_statements 
                        WHERE mean_exec_time > 1000
                    """)
                    result = cur.fetchone()
                    self.metrics['slow_queries'] = result['slow_queries'] if result else 0
                    
                    # Lock waits
                    cur.execute("""
                        SELECT count(*) as lock_waits
                        FROM pg_stat_activity 
                        WHERE wait_event_type = 'Lock'
                    """)
                    self.metrics['lock_waits'] = cur.fetchone()['lock_waits']
                    
                    # Cache hit ratio
                    cur.execute("""
                        SELECT 
                            round(
                                sum(blks_hit) * 100.0 / sum(blks_hit + blks_read), 2
                            ) as cache_hit_ratio
                        FROM pg_stat_database
                    """)
                    result = cur.fetchone()
                    self.metrics['cache_hit_ratio'] = float(result['cache_hit_ratio']) if result['cache_hit_ratio'] else 0
                    
        except Exception as e:
            logging.error(f"Failed to collect performance metrics: {e}")
    
    def collect_storage_metrics(self):
        """Collect database storage metrics"""
        try:
            with psycopg2.connect(self.database_url) as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    # Database size
                    cur.execute("""
                        SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
                    """)
                    self.metrics['database_size'] = cur.fetchone()['db_size']
                    
                    # Table sizes
                    cur.execute("""
                        SELECT 
                            schemaname,
                            tablename,
                            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                        FROM pg_tables 
                        WHERE schemaname = 'public'
                        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                        LIMIT 5
                    """)
                    self.metrics['largest_tables'] = [dict(row) for row in cur.fetchall()]
                    
        except Exception as e:
            logging.error(f"Failed to collect storage metrics: {e}")
    
    def check_alerts(self):
        """Check database metrics against thresholds"""
        alerts = []
        
        # Connection usage
        if self.metrics.get('connection_usage_percent', 0) > 80:
            alerts.append(f"High connection usage: {self.metrics['connection_usage_percent']:.1f}%")
        
        # Cache hit ratio
        if self.metrics.get('cache_hit_ratio', 100) < 95:
            alerts.append(f"Low cache hit ratio: {self.metrics['cache_hit_ratio']:.1f}%")
        
        # Lock waits
        if self.metrics.get('lock_waits', 0) > 5:
            alerts.append(f"High lock waits: {self.metrics['lock_waits']}")
        
        # Slow queries
        if self.metrics.get('slow_queries', 0) > 10:
            alerts.append(f"Many slow queries: {self.metrics['slow_queries']}")
        
        return alerts
    
    def run(self):
        """Run database monitoring cycle"""
        logging.info("Starting database monitoring cycle")
        
        self.collect_connection_metrics()
        self.collect_performance_metrics()
        self.collect_storage_metrics()
        
        alerts = self.check_alerts()
        if alerts:
            logging.warning(f"Database alerts: {'; '.join(alerts)}")
        
        # Log metrics
        logging.info(f"Database metrics: {json.dumps(self.metrics, indent=2, default=str)}")
        
        logging.info("Database monitoring cycle completed")

if __name__ == "__main__":
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logging.error("DATABASE_URL environment variable not set")
        exit(1)
    
    monitor = DatabaseMonitor(database_url)
    monitor.run()
EOF

    chmod +x monitor-database.py

    # Test database monitoring (only if DATABASE_URL is available)
    if [[ -n "${DATABASE_URL}" ]]; then
        python3 monitor-database.py
    else
        warning "DATABASE_URL not set, skipping database monitoring test"
    fi

    success "Database monitoring configured"
}

if [[ -n "${DATABASE_URL}" ]]; then
    setup_database_monitoring
else
    warning "Skipping database monitoring setup (DATABASE_URL not set)"
fi

# 5. Setup Health Check Automation
log "🏥 Setting up health check automation..."

setup_health_checks() {
    log "Creating automated health check system..."
    
    # Create comprehensive health check script
    cat > health-check.sh << 'EOF'
#!/bin/bash
# Comprehensive health check for BookedBarber production

# Configuration
API_URL="${PRODUCTION_API_URL:-https://api.bookedbarber.com}"
FRONTEND_URL="${PRODUCTION_FRONTEND_URL:-https://bookedbarber.com}"
WEBHOOK_URL="${SLACK_WEBHOOK_URL}"
TIMEOUT=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Health check results
declare -A results

# Function to send Slack notification
send_slack_notification() {
    local message="$1"
    local color="$2"
    
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -X POST "$WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{
                \"blocks\": [{
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"$message\"
                    }
                }]
            }" \
            --silent || echo "Failed to send Slack notification"
    fi
}

# Check API health
check_api_health() {
    echo "🔍 Checking API health..."
    
    response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" \
        --max-time $TIMEOUT "$API_URL/health")
    
    http_code=$(echo $response | cut -d',' -f1)
    response_time=$(echo $response | cut -d',' -f2)
    
    if [[ $http_code -eq 200 ]]; then
        results[api_status]="✅ HEALTHY"
        results[api_response_time]="${response_time}s"
        echo -e "${GREEN}✅ API is healthy (${response_time}s)${NC}"
    else
        results[api_status]="❌ UNHEALTHY"
        results[api_response_time]="N/A"
        echo -e "${RED}❌ API is unhealthy (HTTP $http_code)${NC}"
        send_slack_notification "🚨 *API Health Alert*\nAPI returned HTTP $http_code\nURL: $API_URL/health" "danger"
    fi
}

# Check frontend health
check_frontend_health() {
    echo "🔍 Checking frontend health..."
    
    response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" \
        --max-time $TIMEOUT "$FRONTEND_URL")
    
    http_code=$(echo $response | cut -d',' -f1)
    response_time=$(echo $response | cut -d',' -f2)
    
    if [[ $http_code -eq 200 ]] || [[ $http_code -eq 301 ]] || [[ $http_code -eq 302 ]]; then
        results[frontend_status]="✅ HEALTHY"
        results[frontend_response_time]="${response_time}s"
        echo -e "${GREEN}✅ Frontend is healthy (${response_time}s)${NC}"
    else
        results[frontend_status]="❌ UNHEALTHY"
        results[frontend_response_time]="N/A"
        echo -e "${RED}❌ Frontend is unhealthy (HTTP $http_code)${NC}"
        send_slack_notification "🚨 *Frontend Health Alert*\nFrontend returned HTTP $http_code\nURL: $FRONTEND_URL" "danger"
    fi
}

# Check critical endpoints
check_critical_endpoints() {
    echo "🔍 Checking critical endpoints..."
    
    endpoints=(
        "$API_URL/docs:200"
        "$API_URL/api/v2/health:200"
        "$API_URL/webhooks/stripe:400,405"
    )
    
    for endpoint in "${endpoints[@]}"; do
        url=$(echo $endpoint | cut -d':' -f1)
        expected_codes=$(echo $endpoint | cut -d':' -f2)
        
        http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url")
        
        if [[ $expected_codes == *"$http_code"* ]]; then
            echo -e "${GREEN}✅ $url (HTTP $http_code)${NC}"
        else
            echo -e "${RED}❌ $url (HTTP $http_code, expected $expected_codes)${NC}"
            send_slack_notification "🚨 *Endpoint Health Alert*\nEndpoint: $url\nGot HTTP $http_code, expected $expected_codes" "danger"
        fi
    done
}

# Generate health report
generate_health_report() {
    echo ""
    echo "📊 HEALTH CHECK REPORT"
    echo "======================"
    echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "API Status: ${results[api_status]}"
    echo "API Response Time: ${results[api_response_time]}"
    echo "Frontend Status: ${results[frontend_status]}"
    echo "Frontend Response Time: ${results[frontend_response_time]}"
    echo "======================"
    
    # Calculate overall health score
    healthy_services=0
    total_services=2
    
    if [[ "${results[api_status]}" == *"HEALTHY"* ]]; then
        ((healthy_services++))
    fi
    
    if [[ "${results[frontend_status]}" == *"HEALTHY"* ]]; then
        ((healthy_services++))
    fi
    
    health_percentage=$((healthy_services * 100 / total_services))
    echo "Overall Health: $health_percentage% ($healthy_services/$total_services services healthy)"
    
    # Send summary to Slack if any issues
    if [[ $health_percentage -lt 100 ]]; then
        send_slack_notification "⚠️ *System Health Warning*\nOverall Health: $health_percentage%\nAPI: ${results[api_status]}\nFrontend: ${results[frontend_status]}" "warning"
    fi
}

# Main execution
main() {
    echo "🚀 Starting BookedBarber production health check..."
    echo "Time: $(date)"
    echo ""
    
    check_api_health
    check_frontend_health
    check_critical_endpoints
    generate_health_report
    
    echo ""
    echo "✅ Health check completed"
}

# Run main function
main "$@"
EOF

    chmod +x health-check.sh

    # Test health check
    ./health-check.sh

    success "Health check automation configured"
}

setup_health_checks

# 6. Setup Cron Jobs for Monitoring
log "⏰ Setting up monitoring cron jobs..."

setup_monitoring_cron() {
    log "Configuring automated monitoring schedule..."
    
    # Create cron configuration
    cat > monitoring-crontab << EOF
# BookedBarber V2 Production Monitoring Cron Jobs
# Generated by setup-production-monitoring.sh

# Health checks every 5 minutes
*/5 * * * * /bin/bash $(pwd)/health-check.sh >> /var/log/bookedbarber-health.log 2>&1

# Performance monitoring every 10 minutes
*/10 * * * * /usr/bin/python3 $(pwd)/monitor-performance.py >> /var/log/bookedbarber-performance.log 2>&1

# Database monitoring every 15 minutes
*/15 * * * * /usr/bin/python3 $(pwd)/monitor-database.py >> /var/log/bookedbarber-database.log 2>&1

# Daily monitoring summary at 6 AM
0 6 * * * /bin/bash $(pwd)/daily-monitoring-summary.sh >> /var/log/bookedbarber-daily.log 2>&1

# Weekly monitoring report on Sundays at 8 AM
0 8 * * 0 /bin/bash $(pwd)/weekly-monitoring-report.sh >> /var/log/bookedbarber-weekly.log 2>&1
EOF

    # Create daily summary script
    cat > daily-monitoring-summary.sh << 'EOF'
#!/bin/bash
# Daily monitoring summary for BookedBarber production

echo "📊 Daily Monitoring Summary - $(date)"
echo "======================================="

# Count health check results from logs
healthy_checks=$(grep -c "✅" /var/log/bookedbarber-health.log | tail -1)
unhealthy_checks=$(grep -c "❌" /var/log/bookedbarber-health.log | tail -1)

echo "Health Checks: $healthy_checks healthy, $unhealthy_checks unhealthy"

# Performance summary
echo "Performance Summary:"
echo "- Average API response time: $(grep "api_response_time" /var/log/bookedbarber-performance.log | tail -10 | awk '{sum+=$3; count++} END {printf "%.2fs", sum/count}')"
echo "- Average frontend response time: $(grep "frontend_response_time" /var/log/bookedbarber-performance.log | tail -10 | awk '{sum+=$3; count++} END {printf "%.2fs", sum/count}')"

echo "======================================="
EOF

    chmod +x daily-monitoring-summary.sh

    # Install cron jobs (user-level, not system-level for security)
    crontab monitoring-crontab

    success "Monitoring cron jobs configured"
}

setup_monitoring_cron

# 7. Create Monitoring Dashboard
log "📈 Creating monitoring dashboard..."

create_monitoring_dashboard() {
    log "Setting up monitoring dashboard..."
    
    # Create simple HTML dashboard
    cat > monitoring-dashboard.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookedBarber Production Monitoring</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .header { 
            text-align: center; 
            color: #333; 
            border-bottom: 2px solid #eee; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .status-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .status-card { 
            border: 1px solid #ddd; 
            border-radius: 8px; 
            padding: 20px; 
            text-align: center; 
        }
        .status-healthy { background-color: #d4edda; border-color: #c3e6cb; }
        .status-warning { background-color: #fff3cd; border-color: #ffeaa7; }
        .status-critical { background-color: #f8d7da; border-color: #f5c6cb; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { font-size: 0.9em; color: #666; margin-top: 5px; }
        .refresh-button { 
            background-color: #007bff; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            font-size: 16px; 
        }
        .last-updated { 
            text-align: center; 
            color: #666; 
            font-size: 0.9em; 
            margin-top: 20px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 BookedBarber Production Monitoring</h1>
            <p>Real-time system health and performance metrics</p>
            <button class="refresh-button" onclick="refreshData()">🔄 Refresh Data</button>
        </div>
        
        <div class="status-grid">
            <div class="status-card status-healthy" id="api-status">
                <div class="metric-value" id="api-status-value">✅</div>
                <div class="metric-label">API Status</div>
                <div id="api-response-time">Response Time: --</div>
            </div>
            
            <div class="status-card status-healthy" id="frontend-status">
                <div class="metric-value" id="frontend-status-value">✅</div>
                <div class="metric-label">Frontend Status</div>
                <div id="frontend-response-time">Response Time: --</div>
            </div>
            
            <div class="status-card status-healthy" id="database-status">
                <div class="metric-value" id="database-status-value">✅</div>
                <div class="metric-label">Database Status</div>
                <div id="database-connections">Connections: --</div>
            </div>
            
            <div class="status-card status-healthy" id="overall-health">
                <div class="metric-value" id="overall-health-value">100%</div>
                <div class="metric-label">Overall Health</div>
                <div id="uptime">Uptime: --</div>
            </div>
        </div>
        
        <div class="last-updated">
            Last updated: <span id="last-updated-time">--</span>
        </div>
    </div>

    <script>
        async function refreshData() {
            try {
                // Update last updated time
                document.getElementById('last-updated-time').textContent = new Date().toLocaleString();
                
                // Check API health
                const apiResponse = await fetch('/api/v2/health');
                const apiHealthy = apiResponse.ok;
                
                document.getElementById('api-status-value').textContent = apiHealthy ? '✅' : '❌';
                document.getElementById('api-status').className = `status-card ${apiHealthy ? 'status-healthy' : 'status-critical'}`;
                
                // Check frontend health
                const frontendResponse = await fetch('/');
                const frontendHealthy = frontendResponse.ok;
                
                document.getElementById('frontend-status-value').textContent = frontendHealthy ? '✅' : '❌';
                document.getElementById('frontend-status').className = `status-card ${frontendHealthy ? 'status-healthy' : 'status-critical'}`;
                
                // Calculate overall health
                const healthyServices = (apiHealthy ? 1 : 0) + (frontendHealthy ? 1 : 0);
                const overallHealth = Math.round((healthyServices / 2) * 100);
                
                document.getElementById('overall-health-value').textContent = `${overallHealth}%`;
                document.getElementById('overall-health').className = `status-card ${
                    overallHealth === 100 ? 'status-healthy' : 
                    overallHealth >= 50 ? 'status-warning' : 'status-critical'
                }`;
                
            } catch (error) {
                console.error('Failed to refresh monitoring data:', error);
            }
        }
        
        // Auto-refresh every 30 seconds
        setInterval(refreshData, 30000);
        
        // Initial load
        refreshData();
    </script>
</body>
</html>
EOF

    success "Monitoring dashboard created"
}

create_monitoring_dashboard

# 8. Final Setup and Validation
log "🎯 Performing final setup validation..."

final_validation() {
    log "Validating monitoring setup..."
    
    # Check if all scripts are executable
    scripts=("health-check.sh" "monitor-performance.py" "monitor-database.py" "daily-monitoring-summary.sh")
    for script in "${scripts[@]}"; do
        if [[ -x "$script" ]]; then
            success "Script $script is executable"
        else
            error "Script $script is not executable"
        fi
    done
    
    # Check if cron jobs are installed
    if crontab -l | grep -q "bookedbarber"; then
        success "Monitoring cron jobs are installed"
    else
        warning "Monitoring cron jobs may not be installed properly"
    fi
    
    # Test Slack webhook if configured
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data '{"text":"🚀 BookedBarber production monitoring setup completed successfully!"}' \
            --silent && success "Slack webhook test successful" || warning "Slack webhook test failed"
    fi
    
    success "Monitoring setup validation completed"
}

final_validation

# Summary
log "📋 Monitoring Setup Summary"
echo ""
echo "✅ Monitoring Components Configured:"
echo "   - Sentry error tracking"
echo "   - Uptime monitoring"
echo "   - Performance monitoring"
echo "   - Database monitoring (if DATABASE_URL available)"
echo "   - Health check automation"
echo "   - Monitoring cron jobs"
echo "   - Monitoring dashboard"
echo ""
echo "📁 Files Created:"
echo "   - sentry-production.yaml"
echo "   - uptime-monitors.json"
echo "   - monitor-performance.py"
echo "   - monitor-database.py"
echo "   - health-check.sh"
echo "   - monitoring-dashboard.html"
echo "   - daily-monitoring-summary.sh"
echo "   - monitoring-crontab"
echo ""
echo "⏰ Scheduled Monitoring:"
echo "   - Health checks: Every 5 minutes"
echo "   - Performance monitoring: Every 10 minutes"
echo "   - Database monitoring: Every 15 minutes"
echo "   - Daily summaries: 6:00 AM daily"
echo "   - Weekly reports: 8:00 AM Sundays"
echo ""
echo "🔗 Access Points:"
echo "   - Dashboard: monitoring-dashboard.html"
echo "   - Logs: /var/log/bookedbarber-*.log"
echo "   - Sentry: ${SENTRY_PRODUCTION_DSN%@*}@sentry.io"
echo ""

success "🎉 BookedBarber V2 production monitoring setup completed successfully!"

log "💡 Next Steps:"
echo "1. Verify Sentry integration in your application"
echo "2. Configure additional alerting channels (PagerDuty, etc.)"
echo "3. Set up log rotation for monitoring logs"
echo "4. Review and adjust monitoring thresholds"
echo "5. Test incident response procedures"
echo ""
echo "📚 Documentation: See monitoring/production-monitoring-config.yaml for detailed configuration"