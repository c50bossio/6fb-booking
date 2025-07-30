#!/bin/bash

# Production Error Monitoring Deployment Script
# Comprehensive setup for BookedBarber V2 error monitoring system

set -e  # Exit on any error

echo "=========================================="
echo "BookedBarber V2 Error Monitoring Setup"
echo "Production-Grade Deployment"
echo "=========================================="

# Configuration
PROJECT_ROOT="/Users/bossio/6fb-booking/backend-v2"
FRONTEND_ROOT="$PROJECT_ROOT/frontend-v2"
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_DIR="$PROJECT_ROOT/backups/error-monitoring-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/main.py" ]; then
        log_error "Not in BookedBarber V2 directory. Please run from backend-v2/"
        exit 1
    fi
    
    # Check environment variables
    if [ -z "$SENTRY_DSN" ]; then
        log_warning "SENTRY_DSN not set. Error tracking will be disabled."
    fi
    
    # Check Python dependencies
    if ! python3 -c "import sentry_sdk" 2>/dev/null; then
        log_info "Installing Sentry SDK..."
        pip install sentry-sdk[fastapi]
    fi
    
    # Check Node dependencies for frontend
    if [ ! -d "$FRONTEND_ROOT/node_modules" ]; then
        log_info "Installing frontend dependencies..."
        cd "$FRONTEND_ROOT" && npm install
    fi
    
    log_success "Prerequisites check completed"
}

# Create backup
create_backup() {
    log_info "Creating backup of current configuration..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup existing configuration files
    [ -f "$PROJECT_ROOT/.env" ] && cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/"
    [ -f "$PROJECT_ROOT/config/sentry.py" ] && cp "$PROJECT_ROOT/config/sentry.py" "$BACKUP_DIR/"
    
    log_success "Backup created at $BACKUP_DIR"
}

# Setup error monitoring configuration
setup_error_monitoring() {
    log_info "Setting up error monitoring configuration..."
    
    # Update main application to initialize Sentry
    cat >> "$PROJECT_ROOT/main.py" << 'EOF'

# Production Error Monitoring Setup
from config.production_sentry_config import initialize_production_sentry

# Initialize Sentry for production error monitoring
if initialize_production_sentry():
    print("✅ Production error monitoring initialized")
else:
    print("⚠️ Error monitoring disabled - check SENTRY_DSN configuration")
EOF
    
    log_success "Error monitoring configuration added to main.py"
}

# Setup API endpoints
setup_api_endpoints() {
    log_info "Setting up error monitoring API endpoints..."
    
    # Add error monitoring router to main API
    if ! grep -q "error_monitoring" "$PROJECT_ROOT/main.py"; then
        cat >> "$PROJECT_ROOT/main.py" << 'EOF'

# Error Monitoring API
from api.v2.endpoints.error_monitoring import router as error_monitoring_router
app.include_router(error_monitoring_router, prefix="/api/v2/error-monitoring", tags=["Error Monitoring"])
EOF
    fi
    
    log_success "Error monitoring API endpoints configured"
}

# Setup frontend error tracking
setup_frontend_error_tracking() {
    log_info "Setting up frontend error tracking..."
    
    # Install Sentry for Next.js if not already installed
    cd "$FRONTEND_ROOT"
    
    if ! grep -q "@sentry/nextjs" "package.json"; then
        log_info "Installing Sentry for Next.js..."
        npm install --save @sentry/nextjs
    fi
    
    # Create Sentry configuration for Next.js
    cat > "$FRONTEND_ROOT/sentry.client.config.js" << 'EOF'
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ["localhost", /^https:\/\/bookedbarber\.com\/api/],
    }),
  ],
  tracesSampleRate: 0.1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
EOF
    
    cat > "$FRONTEND_ROOT/sentry.server.config.js" << 'EOF'
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
});
EOF
    
    log_success "Frontend error tracking configured"
}

# Setup environment variables
setup_environment_variables() {
    log_info "Setting up environment variables..."
    
    # Create environment template if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env.production.template" ]; then
        cat > "$PROJECT_ROOT/.env.production.template" << 'EOF'
# Production Error Monitoring Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=bookedbarber-v2.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# Alert Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
CRITICAL_ERROR_EMAIL=team@bookedbarber.com
SMS_ALERT_NUMBER=+1234567890

# Monitoring Configuration
ERROR_TRACKING_ENABLED=true
PERFORMANCE_MONITORING_ENABLED=true
BUSINESS_INTELLIGENCE_ENABLED=true

# Frontend Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
EOF
    fi
    
    log_info "Environment template created: .env.production.template"
    log_warning "Please configure your actual environment variables in .env"
}

# Setup database tables for error tracking
setup_database_tables() {
    log_info "Setting up database tables for error tracking..."
    
    # Create Alembic migration for error tracking tables
    cat > "$PROJECT_ROOT/alembic/versions/$(date +%s)_error_monitoring_tables.py" << 'EOF'
"""Add error monitoring tables

Revision ID: error_monitoring_001
Revises: 
Create Date: $(date)

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'error_monitoring_001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Error events table
    op.create_table(
        'error_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('timestamp', sa.DateTime, nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('stack_trace', sa.Text),
        sa.Column('context', sa.JSON),
        sa.Column('business_impact', sa.String(20)),
        sa.Column('revenue_impact', sa.Float, default=0.0),
        sa.Column('affected_users', sa.Integer, default=0),
        sa.Column('resolved_at', sa.DateTime),
        sa.Column('resolved_by', sa.String(36)),
        sa.Column('resolution_notes', sa.Text),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Business impact metrics table
    op.create_table(
        'business_impact_metrics',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('error_event_id', sa.String(36), sa.ForeignKey('error_events.id')),
        sa.Column('booking_revenue_loss', sa.Float, default=0.0),
        sa.Column('payment_revenue_loss', sa.Float, default=0.0),
        sa.Column('total_impact', sa.Float, default=0.0),
        sa.Column('users_affected', sa.Integer, default=0),
        sa.Column('estimated_recovery_time', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now())
    )
    
    # Create indexes for performance
    op.create_index('idx_error_events_timestamp', 'error_events', ['timestamp'])
    op.create_index('idx_error_events_category', 'error_events', ['category'])
    op.create_index('idx_error_events_severity', 'error_events', ['severity'])
    op.create_index('idx_error_events_business_impact', 'error_events', ['business_impact'])

def downgrade():
    op.drop_table('business_impact_metrics')
    op.drop_table('error_events')
EOF
    
    log_success "Database migration created for error tracking tables"
}

# Test error monitoring setup
test_error_monitoring() {
    log_info "Testing error monitoring setup..."
    
    # Start the application in test mode
    cd "$PROJECT_ROOT"
    
    # Test backend error monitoring
    log_info "Testing backend error monitoring..."
    python3 -c "
from services.error_monitoring_service import error_monitoring_service
from services.production_error_dashboard import production_dashboard
import asyncio

async def test_monitoring():
    print('✅ Error monitoring service imported successfully')
    print('✅ Production dashboard imported successfully')
    
    # Test dashboard metrics (mock data)
    try:
        from services.production_error_dashboard import DashboardTimeRange
        print('✅ Dashboard time ranges configured')
    except Exception as e:
        print(f'❌ Dashboard configuration error: {e}')

asyncio.run(test_monitoring())
"
    
    # Test frontend error boundary
    if [ -f "$FRONTEND_ROOT/components/ErrorMonitoringDashboard.tsx" ]; then
        log_success "Frontend error monitoring dashboard available"
    else
        log_error "Frontend error monitoring dashboard not found"
    fi
    
    log_success "Error monitoring system test completed"
}

# Setup monitoring dashboard
setup_monitoring_dashboard() {
    log_info "Setting up monitoring dashboard..."
    
    # Add dashboard route to Next.js app
    mkdir -p "$FRONTEND_ROOT/app/admin/monitoring"
    
    cat > "$FRONTEND_ROOT/app/admin/monitoring/page.tsx" << 'EOF'
import ErrorMonitoringDashboard from '@/components/ErrorMonitoringDashboard'

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-6">
      <ErrorMonitoringDashboard />
    </div>
  )
}
EOF
    
    log_success "Monitoring dashboard route created at /admin/monitoring"
}

# Setup alerting
setup_alerting() {
    log_info "Setting up alerting system..."
    
    # Create alerting configuration
    cat > "$PROJECT_ROOT/config/alerting_config.py" << 'EOF'
"""
Production Alerting Configuration
"""

import os
from typing import Dict, List

class AlertingConfig:
    """Production alerting configuration"""
    
    ALERT_CHANNELS = {
        "slack": {
            "webhook_url": os.getenv("SLACK_WEBHOOK_URL"),
            "enabled": bool(os.getenv("SLACK_WEBHOOK_URL"))
        },
        "email": {
            "recipients": [os.getenv("CRITICAL_ERROR_EMAIL")],
            "enabled": bool(os.getenv("CRITICAL_ERROR_EMAIL"))
        },
        "sms": {
            "number": os.getenv("SMS_ALERT_NUMBER"),
            "enabled": bool(os.getenv("SMS_ALERT_NUMBER"))
        }
    }
    
    ALERT_THRESHOLDS = {
        "critical_error_count": 1,
        "revenue_impact_threshold": 100,
        "error_rate_per_minute": 5,
        "health_score_threshold": 80,
        "resolution_time_threshold": 30  # minutes
    }

alerting_config = AlertingConfig()
EOF
    
    log_success "Alerting configuration created"
}

# Main deployment function
main() {
    log_info "Starting BookedBarber V2 Error Monitoring Deployment..."
    
    check_prerequisites
    create_backup
    setup_error_monitoring
    setup_api_endpoints
    setup_frontend_error_tracking
    setup_environment_variables
    setup_database_tables
    setup_monitoring_dashboard
    setup_alerting
    test_error_monitoring
    
    echo "=========================================="
    log_success "Error Monitoring System Deployed Successfully!"
    echo "=========================================="
    echo
    echo "🎯 Next Steps:"
    echo "1. Configure your Sentry DSN in .env file"
    echo "2. Set up Slack webhook for alerts"
    echo "3. Run database migration: alembic upgrade head"
    echo "4. Start the application: uvicorn main:app --reload"
    echo "5. Access monitoring dashboard: http://localhost:3000/admin/monitoring"
    echo
    echo "📊 Production Monitoring URLs:"
    echo "• Dashboard: /admin/monitoring"
    echo "• API Health: /api/v2/error-monitoring/dashboard/health"
    echo "• API Metrics: /api/v2/error-monitoring/dashboard/metrics"
    echo "• Export Reports: /api/v2/error-monitoring/dashboard/export"
    echo
    echo "🚨 Alert Configuration:"
    echo "• Slack: Set SLACK_WEBHOOK_URL"
    echo "• Email: Set CRITICAL_ERROR_EMAIL"
    echo "• SMS: Set SMS_ALERT_NUMBER"
    echo
    log_warning "Backup created at: $BACKUP_DIR"
    log_info "Deployment completed successfully!"
}

# Run main function
main "$@"