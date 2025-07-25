#!/bin/bash

# Docker Authentication Monitoring Script
# Continuous monitoring and alerting for Docker auth consistency

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs/auth-monitoring"
RESULTS_DIR="$PROJECT_DIR/monitoring-results"
CONFIG_FILE="$PROJECT_DIR/auth-monitoring.conf"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
DEFAULT_INTERVAL=300  # 5 minutes
DEFAULT_THRESHOLD=90  # 90% success rate threshold
DEFAULT_MAX_FAILURES=3  # Alert after 3 consecutive failures
DEFAULT_ALERT_EMAIL=""
DEFAULT_SLACK_WEBHOOK=""

print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        print_status "Loaded configuration from $CONFIG_FILE"
    else
        print_status "Using default configuration"
    fi
    
    INTERVAL=${MONITOR_INTERVAL:-$DEFAULT_INTERVAL}
    THRESHOLD=${SUCCESS_THRESHOLD:-$DEFAULT_THRESHOLD}
    MAX_FAILURES=${MAX_CONSECUTIVE_FAILURES:-$DEFAULT_MAX_FAILURES}
    ALERT_EMAIL=${ALERT_EMAIL:-$DEFAULT_ALERT_EMAIL}
    SLACK_WEBHOOK=${SLACK_WEBHOOK:-$DEFAULT_SLACK_WEBHOOK}
}

# Create directories
setup_directories() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$RESULTS_DIR"
    print_status "Created monitoring directories"
}

# Check if Docker environment is ready
check_environment() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running"
        return 1
    fi
    
    if ! docker-compose -f "$PROJECT_DIR/docker-compose.yml" ps | grep -q "Up"; then
        print_error "BookedBarber containers are not running"
        return 1
    fi
    
    # Wait for backend to be ready
    local retries=0
    while [ $retries -lt 30 ]; do
        if curl -sf "http://localhost:8000/health" >/dev/null 2>&1; then
            return 0
        fi
        sleep 2
        ((retries++))
    done
    
    print_error "Backend is not responding after 60 seconds"
    return 1
}

# Run authentication test
run_auth_test() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local log_file="$LOG_DIR/auth_test_$timestamp.log"
    local result_file="$RESULTS_DIR/auth_result_$timestamp.json"
    
    print_status "Running authentication test..."
    
    cd "$PROJECT_DIR"
    
    # Run the automated test
    if python test_docker_auth_automated.py > "$log_file" 2>&1; then
        local exit_code=0
    else
        local exit_code=$?
    fi
    
    # Find the latest result file (cross-platform compatible)
    local latest_result=$(ls -t /tmp/docker_auth_test_results_*.json 2>/dev/null | head -1)
    
    if [ -n "$latest_result" ] && [ -f "$latest_result" ]; then
        cp "$latest_result" "$result_file"
        print_status "Test results saved to $result_file"
        
        # Extract key metrics
        local success_rate=$(python3 -c "
import json
with open('$result_file') as f:
    data = json.load(f)
    print(data['summary']['success_rate'])
" 2>/dev/null || echo "0")
        
        local total_tests=$(python3 -c "
import json
with open('$result_file') as f:
    data = json.load(f)
    print(data['summary']['total_tests'])
" 2>/dev/null || echo "0")
        
        local failed_tests=$(python3 -c "
import json
with open('$result_file') as f:
    data = json.load(f)
    print(data['summary']['failed_tests'])
" 2>/dev/null || echo "0")
        
        echo "$timestamp,$success_rate,$total_tests,$failed_tests,$exit_code" >> "$RESULTS_DIR/monitoring_history.csv"
        
        if (( $(echo "$success_rate >= $THRESHOLD" | bc -l) )); then
            print_success "Auth test passed: ${success_rate}% success rate"
            return 0
        else
            print_warning "Auth test below threshold: ${success_rate}% (threshold: ${THRESHOLD}%)"
            return 1
        fi
    else
        print_error "No test results found"
        echo "$timestamp,0,0,0,1" >> "$RESULTS_DIR/monitoring_history.csv"
        return 1
    fi
}

# Send alert notification
send_alert() {
    local alert_type="$1"
    local message="$2"
    local details="$3"
    
    local full_message="🚨 BookedBarber Docker Auth Alert

Type: $alert_type
Message: $message
Timestamp: $(date '+%Y-%m-%d %H:%M:%S UTC')
Environment: $(hostname)

Details:
$details

Please check the Docker authentication system immediately."
    
    print_error "ALERT: $alert_type - $message"
    
    # Email alert
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$full_message" | mail -s "🚨 BookedBarber Auth Alert: $alert_type" "$ALERT_EMAIL" 2>/dev/null || \
            print_warning "Failed to send email alert"
    fi
    
    # Slack alert
    if [ -n "$SLACK_WEBHOOK" ]; then
        local slack_payload=$(cat <<EOF
{
    "text": "🚨 BookedBarber Docker Auth Alert",
    "attachments": [
        {
            "color": "danger",
            "fields": [
                {
                    "title": "Alert Type",
                    "value": "$alert_type",
                    "short": true
                },
                {
                    "title": "Message",
                    "value": "$message",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date '+%Y-%m-%d %H:%M:%S UTC')",
                    "short": true
                },
                {
                    "title": "Environment",
                    "value": "$(hostname)",
                    "short": true
                }
            ],
            "text": "$details"
        }
    ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$slack_payload" \
            "$SLACK_WEBHOOK" >/dev/null 2>&1 || \
            print_warning "Failed to send Slack alert"
    fi
}

# Generate monitoring report
generate_report() {
    local report_file="$RESULTS_DIR/monitoring_report_$(date '+%Y%m%d').html"
    
    print_status "Generating monitoring report..."
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>BookedBarber Docker Auth Monitoring Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .chart { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .log { background: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; font-family: monospace; max-height: 400px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🐳 BookedBarber Docker Auth Monitoring</h1>
        <p>Generated: $(date '+%Y-%m-%d %H:%M:%S UTC')</p>
    </div>
EOF
    
    # Add metrics if history file exists
    if [ -f "$RESULTS_DIR/monitoring_history.csv" ]; then
        local latest_stats=$(tail -n 10 "$RESULTS_DIR/monitoring_history.csv" | python3 -c "
import sys
import csv
from io import StringIO

data = []
for line in sys.stdin:
    parts = line.strip().split(',')
    if len(parts) >= 4:
        try:
            success_rate = float(parts[1])
            total_tests = int(parts[2])
            failed_tests = int(parts[3])
            data.append((success_rate, total_tests, failed_tests))
        except ValueError:
            pass

if data:
    avg_success = sum(x[0] for x in data) / len(data)
    total_total = sum(x[1] for x in data)
    total_failed = sum(x[2] for x in data)
    print(f'{avg_success:.1f},{total_total},{total_failed},{len(data)}')
else:
    print('0,0,0,0')
")
        
        IFS=',' read -r avg_success total_tests total_failed num_samples <<< "$latest_stats"
        
        cat >> "$report_file" << EOF
    <div class="metrics">
        <div class="metric">
            <h3>Average Success Rate (Last 10 tests)</h3>
            <div class="value $([ $(echo "$avg_success >= 95" | bc -l) -eq 1 ] && echo "success" || [ $(echo "$avg_success >= 90" | bc -l) -eq 1 ] && echo "warning" || echo "danger")">${avg_success}%</div>
        </div>
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${total_tests}</div>
        </div>
        <div class="metric">
            <h3>Total Failures</h3>
            <div class="value $([ "$total_failed" -eq 0 ] && echo "success" || echo "danger")">${total_failed}</div>
        </div>
        <div class="metric">
            <h3>Monitoring Samples</h3>
            <div class="value">${num_samples}</div>
        </div>
    </div>
EOF
    fi
    
    # Add recent logs
    cat >> "$report_file" << EOF
    <div class="chart">
        <h3>Recent Test History</h3>
        <div class="log">
EOF
    
    if [ -f "$RESULTS_DIR/monitoring_history.csv" ]; then
        echo "<pre>" >> "$report_file"
        echo "Timestamp           Success%  Total  Failed  Status" >> "$report_file"
        echo "------------------------------------------------" >> "$report_file"
        tail -n 20 "$RESULTS_DIR/monitoring_history.csv" | while IFS=',' read -r timestamp success_rate total failed exit_code; do
            local status=$([ "$exit_code" -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")
            printf "%-19s %7s%% %6s %6s  %s\n" "$timestamp" "$success_rate" "$total" "$failed" "$status" >> "$report_file"
        done
        echo "</pre>" >> "$report_file"
    else
        echo "No monitoring history available." >> "$report_file"
    fi
    
    cat >> "$report_file" << 'EOF'
        </div>
    </div>
</body>
</html>
EOF
    
    print_success "Report generated: $report_file"
}

# Main monitoring loop
start_monitoring() {
    local consecutive_failures=0
    local last_alert_time=0
    local alert_cooldown=3600  # 1 hour cooldown between alerts
    
    print_status "Starting Docker auth monitoring (interval: ${INTERVAL}s, threshold: ${THRESHOLD}%)"
    
    # Initialize CSV header if file doesn't exist
    if [ ! -f "$RESULTS_DIR/monitoring_history.csv" ]; then
        echo "timestamp,success_rate,total_tests,failed_tests,exit_code" > "$RESULTS_DIR/monitoring_history.csv"
    fi
    
    while true; do
        if check_environment; then
            if run_auth_test; then
                consecutive_failures=0
                print_success "Monitoring check passed"
            else
                ((consecutive_failures++))
                print_warning "Monitoring check failed (${consecutive_failures}/${MAX_FAILURES})"
                
                # Send alert if threshold reached and cooldown period passed
                local current_time=$(date +%s)
                if [ $consecutive_failures -ge $MAX_FAILURES ] && [ $((current_time - last_alert_time)) -gt $alert_cooldown ]; then
                    local latest_result=$(ls -t "$RESULTS_DIR"/auth_result_*.json 2>/dev/null | head -1)
                    local details=""
                    if [ -f "$latest_result" ]; then
                        details=$(python3 -c "
import json
with open('$latest_result') as f:
    data = json.load(f)
    failed = [r for r in data['test_results'] if not r['success']]
    if failed:
        print('Failed tests:')
        for test in failed[:5]:  # Show first 5 failed tests
            print(f\"- {test['test_name']}: {test.get('error_message', 'Unknown error')}\")
    else:
        print('No specific test failures found')
" 2>/dev/null || echo "Could not parse test results")
                    fi
                    
                    send_alert "CONSECUTIVE_FAILURES" "Auth tests failed $consecutive_failures times in a row" "$details"
                    last_alert_time=$current_time
                fi
            fi
        else
            print_error "Environment check failed, skipping auth test"
            ((consecutive_failures++))
        fi
        
        # Generate daily report at midnight
        local current_hour=$(date '+%H')
        if [ "$current_hour" = "00" ]; then
            generate_report
        fi
        
        print_status "Waiting ${INTERVAL} seconds for next check..."
        sleep "$INTERVAL"
    done
}

# Create sample configuration file
create_sample_config() {
    cat > "$CONFIG_FILE" << EOF
# BookedBarber Docker Auth Monitoring Configuration

# Monitoring interval in seconds (default: 300 = 5 minutes)
MONITOR_INTERVAL=300

# Success rate threshold percentage (default: 90)
SUCCESS_THRESHOLD=90

# Maximum consecutive failures before alerting (default: 3)
MAX_CONSECUTIVE_FAILURES=3

# Email alert recipient (optional)
ALERT_EMAIL=""

# Slack webhook URL for alerts (optional)
SLACK_WEBHOOK=""

# Custom test parameters (optional)
# TEST_EMAIL="monitoring@example.com"
# TEST_PASSWORD="MonitorTest123#"
EOF
    
    print_success "Sample configuration created: $CONFIG_FILE"
    print_status "Edit this file to customize monitoring settings"
}

# Print usage information
usage() {
    cat << EOF
BookedBarber Docker Authentication Monitoring Script

Usage: $0 [command] [options]

Commands:
    start           Start continuous monitoring (default)
    test            Run a single test
    report          Generate monitoring report
    config          Create sample configuration file
    status          Show current status
    help            Show this help message

Options:
    --interval N    Set monitoring interval in seconds
    --threshold N   Set success rate threshold percentage
    --config FILE   Use custom configuration file

Examples:
    $0 start                    # Start monitoring with default settings
    $0 test                     # Run a single auth test
    $0 start --interval 600     # Monitor every 10 minutes
    $0 report                   # Generate current monitoring report
    $0 config                   # Create sample configuration file

Configuration:
    Edit $CONFIG_FILE to customize settings
EOF
}

# Parse command line arguments
case "${1:-start}" in
    "start")
        load_config
        setup_directories
        start_monitoring
        ;;
    "test")
        load_config
        setup_directories
        check_environment && run_auth_test
        ;;
    "report")
        setup_directories
        generate_report
        ;;
    "config")
        create_sample_config
        ;;
    "status")
        load_config
        print_status "Checking Docker auth monitoring status..."
        if check_environment; then
            print_success "Environment is ready for monitoring"
            if [ -f "$RESULTS_DIR/monitoring_history.csv" ]; then
                local last_test=$(tail -n 1 "$RESULTS_DIR/monitoring_history.csv" | cut -d',' -f1)
                local success_rate=$(tail -n 1 "$RESULTS_DIR/monitoring_history.csv" | cut -d',' -f2)
                print_status "Last test: $last_test (${success_rate}% success rate)"
            else
                print_status "No monitoring history found"
            fi
        else
            print_error "Environment is not ready"
        fi
        ;;
    "help"|*)
        usage
        exit 0
        ;;
esac