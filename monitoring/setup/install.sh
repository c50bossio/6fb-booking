#!/bin/bash

# 6FB Booking Platform - Monitoring Setup Script
# This script sets up the comprehensive monitoring system

set -e

echo "🔧 Setting up 6FB Platform Monitoring System..."

# Create log directories
echo "📁 Creating log directories..."
sudo mkdir -p /var/log/6fb-monitoring/{metrics,errors,reports}
sudo chown -R $USER:$USER /var/log/6fb-monitoring
chmod -R 755 /var/log/6fb-monitoring

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Create systemd service files
echo "⚙️ Creating systemd services..."

# Uptime monitor service
sudo tee /etc/systemd/system/6fb-uptime-monitor.service > /dev/null <<EOF
[Unit]
Description=6FB Uptime Monitor
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/../scripts
ExecStart=/usr/bin/python3 uptime-monitor.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=$(pwd)/../scripts

[Install]
WantedBy=multi-user.target
EOF

# Performance monitor service
sudo tee /etc/systemd/system/6fb-performance-monitor.service > /dev/null <<EOF
[Unit]
Description=6FB Performance Monitor
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/../scripts
ExecStart=/usr/bin/python3 performance-monitor.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=$(pwd)/../scripts

[Install]
WantedBy=multi-user.target
EOF

# Deployment monitor service
sudo tee /etc/systemd/system/6fb-deployment-monitor.service > /dev/null <<EOF
[Unit]
Description=6FB Deployment Monitor
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/../scripts
ExecStart=/usr/bin/python3 deployment-monitor.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=$(pwd)/../scripts

[Install]
WantedBy=multi-user.target
EOF

# Error aggregator service
sudo tee /etc/systemd/system/6fb-error-aggregator.service > /dev/null <<EOF
[Unit]
Description=6FB Error Aggregator
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/../scripts
ExecStart=/usr/bin/python3 error-aggregator.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=$(pwd)/../scripts

[Install]
WantedBy=multi-user.target
EOF

# Status page service
sudo tee /etc/systemd/system/6fb-status-page.service > /dev/null <<EOF
[Unit]
Description=6FB Status Page
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/../status-page
ExecStart=/usr/bin/python3 api.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=$(pwd)/../status-page
Environment=STATUS_PAGE_PORT=8080

[Install]
WantedBy=multi-user.target
EOF

# Create cron job for daily health reports
echo "⏰ Setting up daily health reports..."
(crontab -l 2>/dev/null; echo "0 6 * * * cd $(pwd)/../scripts && /usr/bin/python3 daily-health-report.py") | crontab -

# Make scripts executable
echo "🔑 Making scripts executable..."
chmod +x ../scripts/*.py
chmod +x ../status-page/api.py

# Create environment template
echo "📝 Creating environment template..."
cat > ../config/.env.monitoring.template << 'EOF'
# 6FB Monitoring Configuration

# Email Alerts
ENABLE_EMAIL_ALERTS=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SENDGRID_API_KEY=your_sendgrid_api_key_here
ALERT_FROM_EMAIL=monitoring@6fb-booking.com
ALERT_TO_EMAILS=admin@6fb-booking.com,tech@6fb-booking.com
DEPLOYMENT_ALERT_EMAILS=admin@6fb-booking.com
HEALTH_REPORT_RECIPIENTS=admin@6fb-booking.com,management@6fb-booking.com
REPORT_FROM_EMAIL=reports@6fb-booking.com

# Service URLs
FRONTEND_URL=https://6fb-booking.vercel.app
BACKEND_URL=https://sixfb-backend.onrender.com

# API Keys for monitoring authenticated endpoints
MONITORING_EMAIL=monitoring@6fb.com
MONITORING_PASSWORD=secure_monitoring_password_here
MONITORING_TOKEN=monitoring_jwt_token_here

# Deployment monitoring
RENDER_API_KEY=your_render_api_key_here
RENDER_BACKEND_SERVICE_ID=your_render_service_id_here
VERCEL_TOKEN=your_vercel_token_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=your_github_username
GITHUB_REPO=6fb-booking

# Webhook alerts
ENABLE_WEBHOOK_ALERTS=false
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Status page
STATUS_PAGE_PORT=8080
EOF

# Copy template to actual config if it doesn't exist
if [ ! -f ../config/.env.monitoring ]; then
    cp ../config/.env.monitoring.template ../config/.env.monitoring
    echo "📋 Environment template created at ../config/.env.monitoring"
    echo "Please edit this file with your actual configuration values."
fi

# Reload systemd
echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable services (but don't start them yet)
echo "✅ Enabling monitoring services..."
sudo systemctl enable 6fb-uptime-monitor.service
sudo systemctl enable 6fb-performance-monitor.service
sudo systemctl enable 6fb-deployment-monitor.service
sudo systemctl enable 6fb-error-aggregator.service
sudo systemctl enable 6fb-status-page.service

# Create monitoring control script
cat > ../scripts/monitoring-control.sh << 'EOF'
#!/bin/bash

# 6FB Monitoring Control Script

case "$1" in
    start)
        echo "Starting 6FB monitoring services..."
        sudo systemctl start 6fb-uptime-monitor.service
        sudo systemctl start 6fb-performance-monitor.service
        sudo systemctl start 6fb-deployment-monitor.service
        sudo systemctl start 6fb-error-aggregator.service
        sudo systemctl start 6fb-status-page.service
        echo "All monitoring services started."
        ;;
    stop)
        echo "Stopping 6FB monitoring services..."
        sudo systemctl stop 6fb-uptime-monitor.service
        sudo systemctl stop 6fb-performance-monitor.service
        sudo systemctl stop 6fb-deployment-monitor.service
        sudo systemctl stop 6fb-error-aggregator.service
        sudo systemctl stop 6fb-status-page.service
        echo "All monitoring services stopped."
        ;;
    restart)
        echo "Restarting 6FB monitoring services..."
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        echo "6FB Monitoring Services Status:"
        echo "================================"
        sudo systemctl status 6fb-uptime-monitor.service --no-pager -l
        echo ""
        sudo systemctl status 6fb-performance-monitor.service --no-pager -l
        echo ""
        sudo systemctl status 6fb-deployment-monitor.service --no-pager -l
        echo ""
        sudo systemctl status 6fb-error-aggregator.service --no-pager -l
        echo ""
        sudo systemctl status 6fb-status-page.service --no-pager -l
        ;;
    logs)
        echo "Recent monitoring logs:"
        echo "======================"
        tail -n 50 /var/log/6fb-monitoring/*.log
        ;;
    test)
        echo "Testing monitoring system..."
        cd ../scripts
        python3 -c "
import sys
import os
sys.path.append('.')

# Test imports
try:
    import requests
    import aiohttp
    import flask
    import matplotlib
    print('✅ All dependencies available')
except ImportError as e:
    print(f'❌ Missing dependency: {e}')
    sys.exit(1)

# Test log directories
log_dir = '/var/log/6fb-monitoring'
if os.path.exists(log_dir) and os.access(log_dir, os.W_OK):
    print('✅ Log directories accessible')
else:
    print('❌ Log directories not accessible')
    sys.exit(1)

print('✅ Monitoring system test passed')
"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|test}"
        exit 1
        ;;
esac
EOF

chmod +x ../scripts/monitoring-control.sh

echo ""
echo "🎉 6FB Monitoring System Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit the configuration: ../config/.env.monitoring"
echo "2. Test the system: ../scripts/monitoring-control.sh test"
echo "3. Start monitoring: ../scripts/monitoring-control.sh start"
echo "4. View status page: http://localhost:8080"
echo "5. Check service status: ../scripts/monitoring-control.sh status"
echo ""
echo "Log files are stored in: /var/log/6fb-monitoring/"
echo "Control script: ../scripts/monitoring-control.sh"
echo ""
echo "Daily health reports will be generated at 6 AM and emailed to configured recipients."
