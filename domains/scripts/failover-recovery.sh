#!/bin/bash

# BookedBarber V2 Failover and Disaster Recovery Script
# Handles automatic failover and recovery procedures for all domains

set -e

# Configuration
PRIMARY_SERVER="192.0.2.1"
BACKUP_SERVER="192.0.2.2"
HEALTH_CHECK_URL="https://api.bookedbarber.com/health"
DNS_PROVIDER="cloudflare"  # cloudflare, route53, or manual

# CloudFlare configuration
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"

# Route53 configuration
AWS_HOSTED_ZONE_ID="${AWS_HOSTED_ZONE_ID:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Failover settings
HEALTH_CHECK_INTERVAL=60  # seconds
FAILURE_THRESHOLD=3       # failures before triggering failover
RECOVERY_THRESHOLD=2      # successes before triggering recovery
RECOVERY_DELAY=300        # seconds to wait before checking recovery

# Notification settings
ALERT_EMAIL="admin@bookedbarber.com"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
LOG_FILE="/var/log/failover.log"
STATE_FILE="/var/run/failover-state.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to initialize state
init_state() {
    if [ ! -f "$STATE_FILE" ]; then
        cat > "$STATE_FILE" << EOF
{
    "current_server": "primary",
    "primary_ip": "$PRIMARY_SERVER",
    "backup_ip": "$BACKUP_SERVER",
    "failure_count": 0,
    "success_count": 0,
    "last_check": "$(date -Iseconds)",
    "last_failover": null,
    "last_recovery": null,
    "status": "healthy"
}
EOF
        log "Initialized failover state"
    fi
}

# Function to update state
update_state() {
    local key="$1"
    local value="$2"
    
    # Create temporary file with updated state
    jq --arg key "$key" --arg value "$value" '.[$key] = $value | .last_check = "'$(date -Iseconds)'"' "$STATE_FILE" > "$STATE_FILE.tmp"
    mv "$STATE_FILE.tmp" "$STATE_FILE"
}

# Function to get state value
get_state() {
    local key="$1"
    jq -r ".$key // \"\"" "$STATE_FILE"
}

# Function to check server health
check_server_health() {
    local server_ip="$1"
    local url=$(echo "$HEALTH_CHECK_URL" | sed "s/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}/$server_ip/")
    
    log "Checking health of server $server_ip..."
    
    # Perform health check
    local response=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" \
                    --max-time 10 \
                    --connect-timeout 5 \
                    "$url" 2>/dev/null || echo "000:0")
    
    IFS=':' read -r status_code response_time <<< "$response"
    
    if [ "$status_code" = "200" ]; then
        log "Server $server_ip is healthy (${response_time}s)"
        return 0
    else
        log "Server $server_ip health check failed (HTTP $status_code)"
        return 1
    fi
}

# Function to update DNS record (CloudFlare)
update_cloudflare_dns() {
    local new_ip="$1"
    local record_name="$2"
    
    log "Updating CloudFlare DNS: $record_name -> $new_ip"
    
    # Get record ID
    local record_id=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=$record_name" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" | \
        jq -r '.result[0].id // empty')
    
    if [ -z "$record_id" ]; then
        log "ERROR: Could not find DNS record for $record_name"
        return 1
    fi
    
    # Update record
    local response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$record_id" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{
            "type": "A",
            "name": "'$record_name'",
            "content": "'$new_ip'",
            "ttl": 60
        }')
    
    local success=$(echo "$response" | jq -r '.success')
    
    if [ "$success" = "true" ]; then
        log "Successfully updated DNS record: $record_name -> $new_ip"
        return 0
    else
        local error=$(echo "$response" | jq -r '.errors[0].message // "Unknown error"')
        log "ERROR: Failed to update DNS record: $error"
        return 1
    fi
}

# Function to update DNS record (Route53)
update_route53_dns() {
    local new_ip="$1"
    local record_name="$2"
    
    log "Updating Route53 DNS: $record_name -> $new_ip"
    
    local change_batch='{
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "'$record_name'",
                "Type": "A",
                "TTL": 60,
                "ResourceRecords": [{"Value": "'$new_ip'"}]
            }
        }]
    }'
    
    local response=$(aws route53 change-resource-record-sets \
        --hosted-zone-id "$AWS_HOSTED_ZONE_ID" \
        --change-batch "$change_batch" \
        --region "$AWS_REGION" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local change_id=$(echo "$response" | jq -r '.ChangeInfo.Id')
        log "Successfully submitted DNS change: $change_id"
        return 0
    else
        log "ERROR: Failed to update Route53 DNS record"
        return 1
    fi
}

# Function to update DNS records
update_dns() {
    local new_ip="$1"
    local domains=("bookedbarber.com" "api.bookedbarber.com" "app.bookedbarber.com" "admin.bookedbarber.com")
    
    case "$DNS_PROVIDER" in
        "cloudflare")
            for domain in "${domains[@]}"; do
                update_cloudflare_dns "$new_ip" "$domain"
            done
            ;;
        "route53")
            for domain in "${domains[@]}"; do
                update_route53_dns "$new_ip" "$domain"
            done
            ;;
        "manual")
            log "Manual DNS update required:"
            for domain in "${domains[@]}"; do
                log "  Update $domain A record to: $new_ip"
            done
            ;;
        *)
            log "ERROR: Unknown DNS provider: $DNS_PROVIDER"
            return 1
            ;;
    esac
}

# Function to send notification
send_notification() {
    local subject="$1"
    local message="$2"
    local severity="${3:-info}"
    
    log "NOTIFICATION [$severity]: $subject"
    
    # Send email
    if command -v sendmail &> /dev/null; then
        cat << EOF | sendmail "$ALERT_EMAIL"
Subject: [BookedBarber Failover] $subject
From: failover@bookedbarber.com
To: $ALERT_EMAIL

BookedBarber V2 Failover Notification

Severity: $severity
Subject: $subject
Message: $message

Current Status:
- Current server: $(get_state "current_server")
- Primary IP: $(get_state "primary_ip")
- Backup IP: $(get_state "backup_ip")
- Failure count: $(get_state "failure_count")
- Success count: $(get_state "success_count")

Timestamp: $(date)

--
BookedBarber V2 Failover System
EOF
    fi
    
    # Send Slack notification
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
                    \"title\": \"BookedBarber Failover Alert\",
                    \"fields\": [
                        {\"title\": \"Subject\", \"value\": \"$subject\", \"short\": true},
                        {\"title\": \"Severity\", \"value\": \"$severity\", \"short\": true},
                        {\"title\": \"Message\", \"value\": \"$message\", \"short\": false},
                        {\"title\": \"Current Server\", \"value\": \"$(get_state "current_server")\", \"short\": true}
                    ],
                    \"footer\": \"BookedBarber V2 Failover\",
                    \"ts\": $(date +%s)
                }]
            }" \
            "$SLACK_WEBHOOK" >/dev/null
    fi
}

# Function to trigger failover
trigger_failover() {
    local current_server=$(get_state "current_server")
    
    if [ "$current_server" = "primary" ]; then
        log "TRIGGERING FAILOVER: Primary -> Backup"
        
        if update_dns "$BACKUP_SERVER"; then
            update_state "current_server" "backup"
            update_state "last_failover" "$(date -Iseconds)"
            update_state "status" "failed_over"
            update_state "failure_count" "0"
            
            send_notification "Failover Triggered" \
                             "System has failed over from primary server ($PRIMARY_SERVER) to backup server ($BACKUP_SERVER) due to health check failures." \
                             "critical"
            
            log "Failover completed successfully"
            return 0
        else
            log "FAILOVER FAILED: Could not update DNS records"
            send_notification "Failover Failed" \
                             "Attempted to failover to backup server but DNS update failed. Manual intervention required." \
                             "critical"
            return 1
        fi
    else
        log "Already running on backup server - no failover needed"
        return 0
    fi
}

# Function to trigger recovery
trigger_recovery() {
    local current_server=$(get_state "current_server")
    
    if [ "$current_server" = "backup" ]; then
        log "TRIGGERING RECOVERY: Backup -> Primary"
        
        if update_dns "$PRIMARY_SERVER"; then
            update_state "current_server" "primary"
            update_state "last_recovery" "$(date -Iseconds)"
            update_state "status" "healthy"
            update_state "success_count" "0"
            
            send_notification "Recovery Completed" \
                             "System has recovered from backup server ($BACKUP_SERVER) to primary server ($PRIMARY_SERVER)." \
                             "info"
            
            log "Recovery completed successfully"
            return 0
        else
            log "RECOVERY FAILED: Could not update DNS records"
            send_notification "Recovery Failed" \
                             "Attempted to recover to primary server but DNS update failed. Manual intervention required." \
                             "warning"
            return 1
        fi
    else
        log "Already running on primary server - no recovery needed"
        return 0
    fi
}

# Function to perform health monitoring cycle
monitor_health() {
    local current_server=$(get_state "current_server")
    local current_ip
    
    if [ "$current_server" = "primary" ]; then
        current_ip="$PRIMARY_SERVER"
    else
        current_ip="$BACKUP_SERVER"
    fi
    
    log "Monitoring health cycle - current server: $current_server ($current_ip)"
    
    # Check current server health
    if check_server_health "$current_ip"; then
        # Server is healthy
        local success_count=$(get_state "success_count")
        success_count=$((success_count + 1))
        update_state "success_count" "$success_count"
        update_state "failure_count" "0"
        
        # If we're on backup server and primary is healthy, consider recovery
        if [ "$current_server" = "backup" ] && [ "$success_count" -ge "$RECOVERY_THRESHOLD" ]; then
            log "Backup server stable, checking if primary server is ready for recovery..."
            
            if check_server_health "$PRIMARY_SERVER"; then
                log "Primary server is healthy - triggering recovery"
                trigger_recovery
            else
                log "Primary server still unhealthy - remaining on backup"
                update_state "success_count" "0"  # Reset counter
            fi
        fi
    else
        # Server is unhealthy
        local failure_count=$(get_state "failure_count")
        failure_count=$((failure_count + 1))
        update_state "failure_count" "$failure_count"
        update_state "success_count" "0"
        
        log "Health check failed ($failure_count/$FAILURE_THRESHOLD)"
        
        # If we hit the failure threshold and we're on primary, trigger failover
        if [ "$current_server" = "primary" ] && [ "$failure_count" -ge "$FAILURE_THRESHOLD" ]; then
            log "Failure threshold reached - checking backup server health"
            
            if check_server_health "$BACKUP_SERVER"; then
                log "Backup server is healthy - triggering failover"
                trigger_failover
            else
                log "CRITICAL: Both servers are unhealthy!"
                send_notification "Critical System Failure" \
                                 "Both primary and backup servers are unhealthy. Manual intervention required immediately." \
                                 "critical"
                update_state "status" "critical"
            fi
        fi
    fi
}

# Function to show status
show_status() {
    echo -e "${BLUE}BookedBarber V2 Failover Status${NC}"
    echo "================================="
    echo ""
    
    if [ ! -f "$STATE_FILE" ]; then
        echo -e "${RED}No state file found. Run 'init' first.${NC}"
        return 1
    fi
    
    local current_server=$(get_state "current_server")
    local status=$(get_state "status")
    local failure_count=$(get_state "failure_count")
    local success_count=$(get_state "success_count")
    local last_check=$(get_state "last_check")
    local last_failover=$(get_state "last_failover")
    local last_recovery=$(get_state "last_recovery")
    
    echo "Current server: $current_server"
    echo "System status: $status"
    echo "Failure count: $failure_count"
    echo "Success count: $success_count"
    echo "Last check: $last_check"
    
    if [ "$last_failover" != "null" ] && [ -n "$last_failover" ]; then
        echo "Last failover: $last_failover"
    fi
    
    if [ "$last_recovery" != "null" ] && [ -n "$last_recovery" ]; then
        echo "Last recovery: $last_recovery"
    fi
    
    echo ""
    echo "Server IPs:"
    echo "  Primary: $PRIMARY_SERVER"
    echo "  Backup: $BACKUP_SERVER"
    
    echo ""
    echo "Configuration:"
    echo "  Health check interval: ${HEALTH_CHECK_INTERVAL}s"
    echo "  Failure threshold: $FAILURE_THRESHOLD"
    echo "  Recovery threshold: $RECOVERY_THRESHOLD"
    echo "  DNS provider: $DNS_PROVIDER"
}

# Function to test failover
test_failover() {
    echo -e "${YELLOW}Testing failover procedure...${NC}"
    echo ""
    echo "This will:"
    echo "1. Simulate primary server failure"
    echo "2. Trigger failover to backup server"
    echo "3. Wait for recovery test"
    echo "4. Trigger recovery to primary server"
    echo ""
    
    read -p "Continue with failover test? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Test cancelled."
        return 0
    fi
    
    # Simulate failover
    log "Starting failover test"
    
    # Force failure count to threshold
    update_state "failure_count" "$FAILURE_THRESHOLD"
    update_state "current_server" "primary"
    
    # Trigger failover
    trigger_failover
    
    echo "Failover test completed. Check DNS propagation with:"
    echo "  dig bookedbarber.com"
    echo ""
    echo "To test recovery, wait a few minutes then run:"
    echo "  $0 test-recovery"
}

# Function to test recovery
test_recovery() {
    echo -e "${YELLOW}Testing recovery procedure...${NC}"
    
    # Force success count to threshold
    update_state "success_count" "$RECOVERY_THRESHOLD"
    update_state "current_server" "backup"
    
    # Trigger recovery
    trigger_recovery
    
    echo "Recovery test completed."
}

# Function to run continuous monitoring
run_monitoring() {
    echo -e "${GREEN}Starting continuous failover monitoring...${NC}"
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Set up signal handler for graceful shutdown
    trap 'echo ""; log "Monitoring stopped by user"; exit 0' INT TERM
    
    while true; do
        monitor_health
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Main function
main() {
    case "${1:-monitor}" in
        "init")
            init_state
            echo -e "${GREEN}Failover system initialized${NC}"
            ;;
        "monitor")
            init_state
            run_monitoring
            ;;
        "check")
            init_state
            monitor_health
            ;;
        "status")
            show_status
            ;;
        "failover")
            init_state
            trigger_failover
            ;;
        "recovery")
            init_state
            trigger_recovery
            ;;
        "test-failover")
            init_state
            test_failover
            ;;
        "test-recovery")
            init_state
            test_recovery
            ;;
        *)
            echo "BookedBarber V2 Failover and Disaster Recovery"
            echo ""
            echo "Usage: $0 {init|monitor|check|status|failover|recovery|test-failover|test-recovery}"
            echo ""
            echo "Commands:"
            echo "  init          - Initialize failover system"
            echo "  monitor       - Run continuous monitoring (default)"
            echo "  check         - Perform single health check"
            echo "  status        - Show current failover status"
            echo "  failover      - Manually trigger failover"
            echo "  recovery      - Manually trigger recovery"
            echo "  test-failover - Test failover procedure"
            echo "  test-recovery - Test recovery procedure"
            echo ""
            echo "Environment variables:"
            echo "  CLOUDFLARE_API_TOKEN - CloudFlare API token"
            echo "  CLOUDFLARE_ZONE_ID   - CloudFlare zone ID"
            echo "  AWS_HOSTED_ZONE_ID   - Route53 hosted zone ID"
            echo "  SLACK_WEBHOOK_URL    - Slack webhook for notifications"
            exit 1
            ;;
    esac
}

# Ensure required directories exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$STATE_FILE")"

# Validate prerequisites
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required${NC}"
    exit 1
fi

case "$DNS_PROVIDER" in
    "cloudflare")
        if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
            echo -e "${RED}Error: CloudFlare API token and zone ID required${NC}"
            exit 1
        fi
        ;;
    "route53")
        if ! command -v aws &> /dev/null; then
            echo -e "${RED}Error: AWS CLI required for Route53${NC}"
            exit 1
        fi
        if [ -z "$AWS_HOSTED_ZONE_ID" ]; then
            echo -e "${RED}Error: AWS hosted zone ID required${NC}"
            exit 1
        fi
        ;;
esac

# Run main function
main "$@"