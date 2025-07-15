#!/bin/bash

# BookedBarber V2 Domain Health Monitoring Script
# Monitors all domains and subdomains for availability and performance

set -e

# Configuration
DOMAINS=(
    "https://bookedbarber.com"
    "https://www.bookedbarber.com"
    "https://api.bookedbarber.com"
    "https://app.bookedbarber.com"
    "https://admin.bookedbarber.com"
)

# Health check endpoints
HEALTH_ENDPOINTS=(
    "https://bookedbarber.com/health"
    "https://api.bookedbarber.com/health"
    "https://app.bookedbarber.com/health"
)

# Monitoring configuration
TIMEOUT=10
MAX_RESPONSE_TIME=2000  # milliseconds
ALERT_EMAIL="admin@bookedbarber.com"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
LOG_FILE="/var/log/domain-health.log"
STATUS_FILE="/tmp/domain-status.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if a URL is accessible
check_url() {
    local url="$1"
    local expected_status="${2:-200}"
    
    log "Checking $url..."
    
    # Use curl to check the URL
    local response=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}:%{time_connect}:%{time_starttransfer}" \
                    --max-time "$TIMEOUT" \
                    --connect-timeout 5 \
                    "$url" 2>/dev/null || echo "000:0:0:0")
    
    IFS=':' read -r status_code total_time connect_time start_transfer <<< "$response"
    
    # Convert to milliseconds
    local response_time_ms=$(echo "$total_time * 1000" | bc -l 2>/dev/null | cut -d. -f1)
    local connect_time_ms=$(echo "$connect_time * 1000" | bc -l 2>/dev/null | cut -d. -f1)
    local start_transfer_ms=$(echo "$start_transfer * 1000" | bc -l 2>/dev/null | cut -d. -f1)
    
    # Determine status
    local status="DOWN"
    local message=""
    
    if [ "$status_code" = "$expected_status" ]; then
        if [ "$response_time_ms" -le "$MAX_RESPONSE_TIME" ]; then
            status="UP"
            message="OK"
        else
            status="SLOW"
            message="Response time ${response_time_ms}ms exceeds threshold ${MAX_RESPONSE_TIME}ms"
        fi
    elif [ "$status_code" = "000" ]; then
        status="DOWN"
        message="Connection failed or timeout"
    else
        status="ERROR"
        message="HTTP $status_code"
    fi
    
    # Create result object
    local result=$(cat << EOF
{
    "url": "$url",
    "status": "$status",
    "http_code": "$status_code",
    "response_time_ms": $response_time_ms,
    "connect_time_ms": $connect_time_ms,
    "start_transfer_ms": $start_transfer_ms,
    "message": "$message",
    "timestamp": "$(date -Iseconds)"
}
EOF
)
    
    echo "$result"
}

# Function to check SSL certificate
check_ssl_cert() {
    local domain="$1"
    local hostname=$(echo "$domain" | sed 's|https\?://||' | sed 's|/.*||')
    
    log "Checking SSL certificate for $hostname..."
    
    local expiry_date=$(echo | openssl s_client -servername "$hostname" -connect "$hostname:443" 2>/dev/null | \
                      openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)
    
    if [ -n "$expiry_date" ]; then
        local expiry_epoch=$(date -d "$expiry_date" +%s)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))
        
        local status="VALID"
        local message="Certificate expires in $days_until_expiry days"
        
        if [ "$days_until_expiry" -lt 7 ]; then
            status="CRITICAL"
            message="Certificate expires in $days_until_expiry days - URGENT RENEWAL REQUIRED"
        elif [ "$days_until_expiry" -lt 30 ]; then
            status="WARNING"
            message="Certificate expires in $days_until_expiry days - renewal recommended"
        fi
        
        local result=$(cat << EOF
{
    "hostname": "$hostname",
    "status": "$status",
    "expiry_date": "$expiry_date",
    "days_until_expiry": $days_until_expiry,
    "message": "$message",
    "timestamp": "$(date -Iseconds)"
}
EOF
)
    else
        local result=$(cat << EOF
{
    "hostname": "$hostname",
    "status": "ERROR",
    "message": "Could not retrieve certificate information",
    "timestamp": "$(date -Iseconds)"
}
EOF
)
    fi
    
    echo "$result"
}

# Function to check DNS resolution
check_dns() {
    local domain="$1"
    local hostname=$(echo "$domain" | sed 's|https\?://||' | sed 's|/.*||')
    
    log "Checking DNS resolution for $hostname..."
    
    local ip_address=$(dig +short "$hostname" @8.8.8.8 2>/dev/null | tail -n1)
    local resolution_time=$(dig +short "$hostname" @8.8.8.8 | wc -l)
    
    local status="RESOLVED"
    local message="Resolved to $ip_address"
    
    if [ -z "$ip_address" ]; then
        status="FAILED"
        message="DNS resolution failed"
    fi
    
    local result=$(cat << EOF
{
    "hostname": "$hostname",
    "status": "$status",
    "ip_address": "$ip_address",
    "message": "$message",
    "timestamp": "$(date -Iseconds)"
}
EOF
)
    
    echo "$result"
}

# Function to send alert
send_alert() {
    local subject="$1"
    local message="$2"
    local severity="${3:-warning}"
    
    log "ALERT [$severity]: $subject - $message"
    
    # Send email alert
    if command -v sendmail &> /dev/null; then
        cat << EOF | sendmail "$ALERT_EMAIL"
Subject: [BookedBarber] $subject
From: monitoring@bookedbarber.com
To: $ALERT_EMAIL

BookedBarber V2 Monitoring Alert

Severity: $severity
Subject: $subject
Message: $message

Timestamp: $(date)

This is an automated alert from the BookedBarber V2 monitoring system.

--
BookedBarber V2 Monitoring
EOF
    fi
    
    # Send Slack alert
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color
        case "$severity" in
            "critical") color="danger" ;;
            "warning") color="warning" ;;
            *) color="good" ;;
        esac
        
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"BookedBarber Monitoring Alert\",
                    \"fields\": [
                        {\"title\": \"Subject\", \"value\": \"$subject\", \"short\": true},
                        {\"title\": \"Severity\", \"value\": \"$severity\", \"short\": true},
                        {\"title\": \"Message\", \"value\": \"$message\", \"short\": false}
                    ],
                    \"footer\": \"BookedBarber V2 Monitoring\",
                    \"ts\": $(date +%s)
                }]
            }" \
            "$SLACK_WEBHOOK" >/dev/null
    fi
}

# Function to generate status report
generate_status_report() {
    local start_time=$(date +%s)
    
    echo -e "${BLUE}Starting health check for BookedBarber V2 domains...${NC}"
    
    # Initialize status file
    echo '{"timestamp": "'$(date -Iseconds)'", "checks": []}' > "$STATUS_FILE"
    
    local total_checks=0
    local failed_checks=0
    local slow_checks=0
    
    # Check domain availability
    echo -e "${YELLOW}Checking domain availability...${NC}"
    for domain in "${DOMAINS[@]}"; do
        local result=$(check_url "$domain")
        local status=$(echo "$result" | jq -r '.status')
        local url=$(echo "$result" | jq -r '.url')
        local message=$(echo "$result" | jq -r '.message')
        local response_time=$(echo "$result" | jq -r '.response_time_ms')
        
        # Add to status file
        echo "$result" | jq '. + {"type": "domain_check"}' >> "$STATUS_FILE.tmp"
        
        # Display result
        case "$status" in
            "UP")
                echo -e "  ${GREEN}✓${NC} $url (${response_time}ms)"
                ;;
            "SLOW")
                echo -e "  ${YELLOW}⚠${NC} $url (${response_time}ms) - SLOW"
                ((slow_checks++))
                ;;
            "DOWN"|"ERROR")
                echo -e "  ${RED}✗${NC} $url - $message"
                ((failed_checks++))
                send_alert "Domain Down: $url" "$message" "critical"
                ;;
        esac
        
        ((total_checks++))
    done
    
    # Check health endpoints
    echo -e "${YELLOW}Checking health endpoints...${NC}"
    for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
        local result=$(check_url "$endpoint")
        local status=$(echo "$result" | jq -r '.status')
        local url=$(echo "$result" | jq -r '.url')
        local message=$(echo "$result" | jq -r '.message')
        local response_time=$(echo "$result" | jq -r '.response_time_ms')
        
        # Add to status file
        echo "$result" | jq '. + {"type": "health_check"}' >> "$STATUS_FILE.tmp"
        
        # Display result
        case "$status" in
            "UP")
                echo -e "  ${GREEN}✓${NC} $url (${response_time}ms)"
                ;;
            "SLOW")
                echo -e "  ${YELLOW}⚠${NC} $url (${response_time}ms) - SLOW"
                ((slow_checks++))
                ;;
            "DOWN"|"ERROR")
                echo -e "  ${RED}✗${NC} $url - $message"
                ((failed_checks++))
                send_alert "Health Check Failed: $url" "$message" "critical"
                ;;
        esac
        
        ((total_checks++))
    done
    
    # Check SSL certificates
    echo -e "${YELLOW}Checking SSL certificates...${NC}"
    for domain in "${DOMAINS[@]}"; do
        local result=$(check_ssl_cert "$domain")
        local status=$(echo "$result" | jq -r '.status')
        local hostname=$(echo "$result" | jq -r '.hostname')
        local message=$(echo "$result" | jq -r '.message')
        
        # Add to status file
        echo "$result" | jq '. + {"type": "ssl_check"}' >> "$STATUS_FILE.tmp"
        
        # Display result
        case "$status" in
            "VALID")
                echo -e "  ${GREEN}✓${NC} $hostname - $message"
                ;;
            "WARNING")
                echo -e "  ${YELLOW}⚠${NC} $hostname - $message"
                send_alert "SSL Certificate Warning: $hostname" "$message" "warning"
                ;;
            "CRITICAL")
                echo -e "  ${RED}✗${NC} $hostname - $message"
                send_alert "SSL Certificate Critical: $hostname" "$message" "critical"
                ;;
            "ERROR")
                echo -e "  ${RED}✗${NC} $hostname - $message"
                ;;
        esac
    done
    
    # Check DNS resolution
    echo -e "${YELLOW}Checking DNS resolution...${NC}"
    for domain in "${DOMAINS[@]}"; do
        local result=$(check_dns "$domain")
        local status=$(echo "$result" | jq -r '.status')
        local hostname=$(echo "$result" | jq -r '.hostname')
        local message=$(echo "$result" | jq -r '.message')
        
        # Add to status file
        echo "$result" | jq '. + {"type": "dns_check"}' >> "$STATUS_FILE.tmp"
        
        # Display result
        case "$status" in
            "RESOLVED")
                echo -e "  ${GREEN}✓${NC} $hostname - $message"
                ;;
            "FAILED")
                echo -e "  ${RED}✗${NC} $hostname - $message"
                send_alert "DNS Resolution Failed: $hostname" "$message" "critical"
                ;;
        esac
    done
    
    # Finalize status file
    jq -s '{timestamp: "'$(date -Iseconds)'", checks: .}' "$STATUS_FILE.tmp" > "$STATUS_FILE"
    rm -f "$STATUS_FILE.tmp"
    
    # Generate summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo -e "${BLUE}Health Check Summary${NC}"
    echo "==================="
    echo "Total checks: $total_checks"
    echo "Failed checks: $failed_checks"
    echo "Slow responses: $slow_checks"
    echo "Duration: ${duration}s"
    echo "Status file: $STATUS_FILE"
    
    # Overall status
    if [ "$failed_checks" -eq 0 ]; then
        if [ "$slow_checks" -eq 0 ]; then
            echo -e "Overall status: ${GREEN}ALL SYSTEMS OPERATIONAL${NC}"
        else
            echo -e "Overall status: ${YELLOW}PERFORMANCE ISSUES DETECTED${NC}"
        fi
    else
        echo -e "Overall status: ${RED}SYSTEM ISSUES DETECTED${NC}"
        return 1
    fi
}

# Function to run continuous monitoring
run_continuous_monitoring() {
    local interval="${1:-300}"  # Default: 5 minutes
    
    echo -e "${BLUE}Starting continuous monitoring (interval: ${interval}s)...${NC}"
    
    while true; do
        generate_status_report
        echo ""
        echo "Next check in $interval seconds..."
        sleep "$interval"
    done
}

# Function to show status dashboard
show_status_dashboard() {
    if [ ! -f "$STATUS_FILE" ]; then
        echo -e "${RED}No status data available. Run health check first.${NC}"
        return 1
    fi
    
    echo -e "${BLUE}BookedBarber V2 Status Dashboard${NC}"
    echo "=================================="
    echo ""
    
    local timestamp=$(jq -r '.timestamp' "$STATUS_FILE")
    echo "Last check: $timestamp"
    echo ""
    
    # Domain status
    echo -e "${YELLOW}Domain Status:${NC}"
    jq -r '.checks[] | select(.type == "domain_check") | "  " + (.status | if . == "UP" then "✓" elif . == "SLOW" then "⚠" else "✗" end) + " " + .url + " (" + (.response_time_ms | tostring) + "ms)"' "$STATUS_FILE"
    echo ""
    
    # Health endpoints
    echo -e "${YELLOW}Health Endpoints:${NC}"
    jq -r '.checks[] | select(.type == "health_check") | "  " + (.status | if . == "UP" then "✓" elif . == "SLOW" then "⚠" else "✗" end) + " " + .url + " (" + (.response_time_ms | tostring) + "ms)"' "$STATUS_FILE"
    echo ""
    
    # SSL certificates
    echo -e "${YELLOW}SSL Certificates:${NC}"
    jq -r '.checks[] | select(.type == "ssl_check") | "  " + (.status | if . == "VALID" then "✓" elif . == "WARNING" then "⚠" else "✗" end) + " " + .hostname + " - " + .message' "$STATUS_FILE"
    echo ""
    
    # DNS resolution
    echo -e "${YELLOW}DNS Resolution:${NC}"
    jq -r '.checks[] | select(.type == "dns_check") | "  " + (.status | if . == "RESOLVED" then "✓" else "✗" end) + " " + .hostname + " - " + .message' "$STATUS_FILE"
}

# Main function
main() {
    case "${1:-check}" in
        "check")
            generate_status_report
            ;;
        "monitor")
            local interval="${2:-300}"
            run_continuous_monitoring "$interval"
            ;;
        "status"|"dashboard")
            show_status_dashboard
            ;;
        "test-alert")
            send_alert "Test Alert" "This is a test alert from BookedBarber monitoring" "warning"
            echo "Test alert sent"
            ;;
        *)
            echo "BookedBarber V2 Domain Health Monitoring"
            echo ""
            echo "Usage: $0 {check|monitor|status|test-alert}"
            echo ""
            echo "Commands:"
            echo "  check                 - Run health check once (default)"
            echo "  monitor [interval]    - Run continuous monitoring (default: 300s)"
            echo "  status                - Show status dashboard"
            echo "  test-alert            - Send test alert"
            echo ""
            echo "Environment variables:"
            echo "  SLACK_WEBHOOK_URL     - Slack webhook URL for alerts"
            echo "  ALERT_EMAIL           - Email address for alerts (default: admin@bookedbarber.com)"
            exit 1
            ;;
    esac
}

# Check dependencies
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required for JSON processing${NC}"
    echo "Install with: sudo apt-get install jq (Ubuntu) or brew install jq (macOS)"
    exit 1
fi

if ! command -v bc &> /dev/null; then
    echo -e "${RED}Error: bc is required for calculations${NC}"
    echo "Install with: sudo apt-get install bc (Ubuntu) or brew install bc (macOS)"
    exit 1
fi

# Run main function
main "$@"