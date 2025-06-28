#!/bin/bash

# Setup script for automated codebase health monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/codebase-monitor.js"
LOG_DIR="$SCRIPT_DIR/monitoring/logs"

echo "🔧 Setting up automated codebase health monitoring..."

# Create necessary directories
mkdir -p "$LOG_DIR"

# Make scripts executable
chmod +x "$MONITOR_SCRIPT"
chmod +x "$SCRIPT_DIR/health-metrics-collector.js"

# Function to add cron job
add_cron_job() {
    local schedule="$1"
    local current_cron=$(crontab -l 2>/dev/null || echo "")
    local job_command="cd $SCRIPT_DIR && /usr/bin/env node $MONITOR_SCRIPT >> $LOG_DIR/monitor.log 2>&1"
    local cron_entry="$schedule $job_command"
    
    # Check if job already exists
    if echo "$current_cron" | grep -q "$MONITOR_SCRIPT"; then
        echo "⚠️  Monitoring cron job already exists. Updating..."
        # Remove existing job
        echo "$current_cron" | grep -v "$MONITOR_SCRIPT" | crontab -
        current_cron=$(crontab -l 2>/dev/null || echo "")
    fi
    
    # Add new job
    (echo "$current_cron"; echo "$cron_entry") | crontab -
    echo "✅ Cron job added: $cron_entry"
}

# Function to setup systemd timer (Linux)
setup_systemd_timer() {
    if [ ! -d "/etc/systemd/system" ]; then
        echo "⚠️  Systemd not available on this system"
        return 1
    fi
    
    # Create service file
    cat > /tmp/codebase-monitor.service <<EOF
[Unit]
Description=Codebase Health Monitor
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/env node $MONITOR_SCRIPT
WorkingDirectory=$SCRIPT_DIR
StandardOutput=append:$LOG_DIR/monitor.log
StandardError=append:$LOG_DIR/monitor.log

[Install]
WantedBy=multi-user.target
EOF

    # Create timer file
    cat > /tmp/codebase-monitor.timer <<EOF
[Unit]
Description=Run Codebase Health Monitor weekly
Requires=codebase-monitor.service

[Timer]
OnCalendar=weekly
OnCalendar=Mon 09:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Install files (requires sudo)
    if command -v sudo &> /dev/null; then
        sudo cp /tmp/codebase-monitor.service /etc/systemd/system/
        sudo cp /tmp/codebase-monitor.timer /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable codebase-monitor.timer
        sudo systemctl start codebase-monitor.timer
        echo "✅ Systemd timer configured"
    else
        echo "⚠️  Sudo required for systemd setup. Skipping..."
        return 1
    fi
}

# Function to setup launchd (macOS)
setup_launchd() {
    local plist_path="$HOME/Library/LaunchAgents/com.sixfb.codebase-monitor.plist"
    
    cat > "$plist_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sixfb.codebase-monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/env</string>
        <string>node</string>
        <string>$MONITOR_SCRIPT</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$SCRIPT_DIR</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>1</integer>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/monitor.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/monitor.log</string>
</dict>
</plist>
EOF

    launchctl load "$plist_path"
    echo "✅ Launchd job configured at: $plist_path"
}

# Detect OS and setup appropriate scheduler
echo "🔍 Detecting operating system..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 macOS detected"
    echo ""
    echo "Choose scheduling method:"
    echo "1) Cron (simple, traditional)"
    echo "2) Launchd (macOS native, recommended)"
    echo "3) Both"
    echo "4) Skip automation"
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            add_cron_job "0 9 * * 1"  # Weekly on Monday at 9 AM
            ;;
        2)
            setup_launchd
            ;;
        3)
            add_cron_job "0 9 * * 1"
            setup_launchd
            ;;
        4)
            echo "⏭️  Skipping automation setup"
            ;;
        *)
            echo "❌ Invalid choice"
            exit 1
            ;;
    esac
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Linux detected"
    echo ""
    echo "Choose scheduling method:"
    echo "1) Cron (simple, traditional)"
    echo "2) Systemd timer (modern, recommended if available)"
    echo "3) Both"
    echo "4) Skip automation"
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            add_cron_job "0 9 * * 1"  # Weekly on Monday at 9 AM
            ;;
        2)
            setup_systemd_timer || add_cron_job "0 9 * * 1"
            ;;
        3)
            add_cron_job "0 9 * * 1"
            setup_systemd_timer
            ;;
        4)
            echo "⏭️  Skipping automation setup"
            ;;
        *)
            echo "❌ Invalid choice"
            exit 1
            ;;
    esac
else
    echo "⚠️  Unknown OS: $OSTYPE"
    echo "Setting up cron job as fallback..."
    add_cron_job "0 9 * * 1"
fi

echo ""
echo "📋 Setup complete! Here's what you can do:"
echo ""
echo "Run manually:"
echo "  node $MONITOR_SCRIPT"
echo ""
echo "View latest report:"
echo "  cat $SCRIPT_DIR/monitoring/reports/health-report-latest.md"
echo ""
echo "View logs:"
echo "  tail -f $LOG_DIR/monitor.log"
echo ""
echo "Compare reports:"
echo "  node $MONITOR_SCRIPT compare <file1> <file2>"
echo ""
echo "Edit configuration:"
echo "  $EDITOR $SCRIPT_DIR/monitoring-config.json"
echo ""

# Run initial monitoring
read -p "Run initial health check now? (y/n): " run_now
if [[ "$run_now" == "y" || "$run_now" == "Y" ]]; then
    echo ""
    echo "🚀 Running initial health check..."
    node "$MONITOR_SCRIPT"
fi