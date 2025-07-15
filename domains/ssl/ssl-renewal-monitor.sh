#!/bin/bash

# BookedBarber V2 SSL Certificate Renewal Monitor
# This script monitors SSL certificate expiration and sends alerts

set -e

# Configuration
DOMAINS=(
    "bookedbarber.com"
    "api.bookedbarber.com"
    "app.bookedbarber.com"
    "admin.bookedbarber.com"
)

ALERT_EMAIL="admin@bookedbarber.com"
WARNING_DAYS=30
CRITICAL_DAYS=7

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
LOG_FILE="/var/log/ssl-monitor.log"
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check certificate expiration
check_certificate() {
    local domain=$1
    local cert_file="/etc/letsencrypt/live/$domain/cert.pem"
    
    if [ ! -f "$cert_file" ]; then
        log "ERROR: Certificate file not found for $domain"
        return 1
    fi
    
    # Get expiration date
    local exp_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    local exp_epoch=$(date -d "$exp_date" +%s)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( ($exp_epoch - $current_epoch) / 86400 ))
    
    echo "$days_until_expiry"
}

# Function to send alert email
send_alert() {
    local subject="$1"
    local message="$2"
    local priority="$3"
    
    # Use sendmail if available, otherwise log the alert
    if command -v sendmail &> /dev/null; then
        cat << EOF | sendmail "$ALERT_EMAIL"
Subject: $subject
From: ssl-monitor@bookedbarber.com
To: $ALERT_EMAIL
Priority: $priority

$message

--
BookedBarber V2 SSL Monitor
$(date)
EOF
    else
        log "ALERT: $subject - $message"
    fi
}

# Function to check all certificates
check_all_certificates() {
    local issues_found=0
    local status_report=""
    
    log "Starting SSL certificate check for all domains"
    
    for domain in "${DOMAINS[@]}"; do
        local days=$(check_certificate "$domain")
        
        if [ $? -eq 0 ]; then
            if [ $days -lt $CRITICAL_DAYS ]; then
                log "CRITICAL: Certificate for $domain expires in $days days"
                send_alert "CRITICAL: SSL Certificate Expiring Soon - $domain" \
                          "The SSL certificate for $domain will expire in $days days. Immediate action required!" \
                          "high"
                issues_found=1
                status_report+="\n❌ $domain: $days days (CRITICAL)"
            elif [ $days -lt $WARNING_DAYS ]; then
                log "WARNING: Certificate for $domain expires in $days days"
                send_alert "WARNING: SSL Certificate Expiring - $domain" \
                          "The SSL certificate for $domain will expire in $days days. Please renew soon." \
                          "normal"
                status_report+="\n⚠️  $domain: $days days (WARNING)"
            else
                log "OK: Certificate for $domain expires in $days days"
                status_report+="\n✅ $domain: $days days (OK)"
            fi
        else
            log "ERROR: Failed to check certificate for $domain"
            send_alert "ERROR: SSL Certificate Check Failed - $domain" \
                      "Failed to check SSL certificate for $domain. Please investigate." \
                      "high"
            issues_found=1
            status_report+="\n❌ $domain: Check failed (ERROR)"
        fi
    done
    
    # Generate summary report
    echo -e "\n=== SSL Certificate Status Report ===" | tee -a "$LOG_FILE"
    echo -e "$status_report" | tee -a "$LOG_FILE"
    echo -e "====================================\n" | tee -a "$LOG_FILE"
    
    return $issues_found
}

# Function to attempt certificate renewal
renew_certificates() {
    log "Attempting to renew SSL certificates"
    
    if certbot renew --quiet; then
        log "Certificate renewal successful"
        
        # Reload nginx if renewal was successful
        if systemctl reload nginx; then
            log "Nginx reloaded successfully"
        else
            log "ERROR: Failed to reload nginx after certificate renewal"
            send_alert "ERROR: Nginx Reload Failed" \
                      "SSL certificates were renewed successfully, but nginx failed to reload. Manual intervention required." \
                      "high"
        fi
        
        # Send success notification
        send_alert "SUCCESS: SSL Certificates Renewed" \
                  "SSL certificates for BookedBarber V2 have been successfully renewed." \
                  "low"
    else
        log "ERROR: Certificate renewal failed"
        send_alert "ERROR: SSL Certificate Renewal Failed" \
                  "Automatic SSL certificate renewal failed. Manual intervention required." \
                  "high"
        return 1
    fi
}

# Function to test SSL configuration
test_ssl_config() {
    log "Testing SSL configuration for all domains"
    
    for domain in "${DOMAINS[@]}"; do
        # Test SSL connection
        if echo | timeout 10 openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | grep -q "Verify return code: 0"; then
            log "SSL test passed for $domain"
        else
            log "ERROR: SSL test failed for $domain"
            send_alert "ERROR: SSL Configuration Issue - $domain" \
                      "SSL configuration test failed for $domain. Please check the configuration." \
                      "high"
        fi
    done
}

# Main function
main() {
    case "${1:-check}" in
        "check")
            check_all_certificates
            ;;
        "renew")
            renew_certificates
            ;;
        "test")
            test_ssl_config
            ;;
        "monitor")
            # Run continuous monitoring
            while true; do
                check_all_certificates
                sleep 86400  # Check once per day
            done
            ;;
        *)
            echo "Usage: $0 {check|renew|test|monitor}"
            echo "  check   - Check certificate expiration dates"
            echo "  renew   - Attempt to renew certificates"
            echo "  test    - Test SSL configuration"
            echo "  monitor - Run continuous monitoring (daemon mode)"
            exit 1
            ;;
    esac
}

# Ensure log directory exists
sudo mkdir -p "$(dirname "$LOG_FILE")"
sudo touch "$LOG_FILE"

# Run main function
main "$@"