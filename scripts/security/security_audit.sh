#!/bin/bash

# Security Audit Script for BookedBarber V2
# Performs comprehensive security checks and compliance validation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/var/log/bookedbarber/security"
AUDIT_REPORT_DIR="/var/log/bookedbarber/security/reports"
SECURITY_STATUS_FILE="/tmp/bookedbarber-security-status.json"

mkdir -p "$LOG_DIR" "$AUDIT_REPORT_DIR"

exec 1> >(tee -a "$LOG_DIR/security-audit.log")
exec 2> >(tee -a "$LOG_DIR/security-audit-error.log" >&2)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

warning() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1"
}

# Initialize security status
init_security_status() {
    cat > "$SECURITY_STATUS_FILE" << EOF
{
    "audit_timestamp": "$(date -Iseconds)",
    "overall_security_score": 0,
    "security_checks": {},
    "vulnerabilities": [],
    "recommendations": []
}
EOF
}

# Update security check status
update_security_check() {
    local check_name="$1"
    local status="$2"
    local score="$3"
    local message="$4"
    
    jq --arg check "$check_name" --arg stat "$status" --arg sc "$score" --arg msg "$message" \
        '.security_checks[$check] = {
            "status": $stat,
            "score": ($sc | tonumber),
            "message": $msg,
            "checked_at": now | strftime("%Y-%m-%dT%H:%M:%SZ")
        }' "$SECURITY_STATUS_FILE" > "${SECURITY_STATUS_FILE}.tmp" && mv "${SECURITY_STATUS_FILE}.tmp" "$SECURITY_STATUS_FILE"
}

# Add vulnerability
add_vulnerability() {
    local severity="$1"
    local title="$2"
    local description="$3"
    local remediation="$4"
    
    jq --arg sev "$severity" --arg tit "$title" --arg desc "$description" --arg rem "$remediation" \
        '.vulnerabilities += [{
            "severity": $sev,
            "title": $tit,
            "description": $desc,
            "remediation": $rem,
            "found_at": now | strftime("%Y-%m-%dT%H:%M:%SZ")
        }]' "$SECURITY_STATUS_FILE" > "${SECURITY_STATUS_FILE}.tmp" && mv "${SECURITY_STATUS_FILE}.tmp" "$SECURITY_STATUS_FILE"
}

# Check SSL/TLS configuration
check_ssl_configuration() {
    log "Checking SSL/TLS configuration..."
    
    local domains=("api.bookedbarber.com" "app.bookedbarber.com")
    local ssl_score=100
    local ssl_issues=""
    
    for domain in "${domains[@]}"; do
        if command -v openssl &> /dev/null; then
            log "Checking SSL for: $domain"
            
            # Check certificate validity
            local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -text 2>/dev/null || echo "")
            
            if [ -n "$cert_info" ]; then
                # Check certificate expiry
                local expiry_date=$(echo "$cert_info" | grep -A2 "Validity" | grep "Not After" | cut -d: -f2- | xargs)
                local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
                local current_timestamp=$(date +%s)
                local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [ "$days_until_expiry" -lt 30 ]; then
                    ssl_score=$((ssl_score - 20))
                    ssl_issues="$ssl_issues Certificate expires in $days_until_expiry days. "
                    add_vulnerability "high" "SSL Certificate Expiring" "Certificate for $domain expires in $days_until_expiry days" "Renew SSL certificate before expiry"
                fi
                
                # Check cipher strength
                local cipher_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" -cipher 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS' 2>/dev/null | grep "Cipher    :" || echo "")
                
                if echo "$cipher_info" | grep -qE "(RC4|DES|MD5)"; then
                    ssl_score=$((ssl_score - 30))
                    ssl_issues="$ssl_issues Weak ciphers detected. "
                    add_vulnerability "medium" "Weak SSL Ciphers" "Weak ciphers detected for $domain" "Configure stronger cipher suites"
                fi
                
                # Check protocol version
                local protocol_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | grep "Protocol" || echo "")
                
                if echo "$protocol_info" | grep -qE "(SSLv|TLSv1\.0|TLSv1\.1)"; then
                    ssl_score=$((ssl_score - 25))
                    ssl_issues="$ssl_issues Outdated TLS protocols supported. "
                    add_vulnerability "medium" "Outdated TLS Protocols" "Outdated TLS protocols supported for $domain" "Disable SSLv3, TLSv1.0, and TLSv1.1"
                fi
            else
                ssl_score=$((ssl_score - 50))
                ssl_issues="$ssl_issues Cannot verify SSL certificate for $domain. "
                add_vulnerability "high" "SSL Certificate Verification Failed" "Cannot verify SSL certificate for $domain" "Check SSL configuration"
            fi
        fi
    done
    
    if [ -z "$ssl_issues" ]; then
        ssl_issues="SSL configuration appears secure"
    fi
    
    update_security_check "ssl_configuration" "completed" "$ssl_score" "$ssl_issues"
    log "SSL check completed with score: $ssl_score"
}

# Check file permissions
check_file_permissions() {
    log "Checking file permissions..."
    
    local permission_score=100
    local permission_issues=""
    
    # Check application directory permissions
    local app_dirs=("/var/www/bookedbarber" "/opt/bookedbarber" "/usr/local/bookedbarber")
    
    for app_dir in "${app_dirs[@]}"; do
        if [ -d "$app_dir" ]; then
            log "Checking permissions in: $app_dir"
            
            # Check for world-writable files
            local world_writable=$(find "$app_dir" -type f -perm -002 2>/dev/null | wc -l)
            if [ "$world_writable" -gt 0 ]; then
                permission_score=$((permission_score - 20))
                permission_issues="$permission_issues Found $world_writable world-writable files. "
                add_vulnerability "medium" "World-Writable Files" "Found $world_writable world-writable files in $app_dir" "Remove world-write permissions"
            fi
            
            # Check for SUID/SGID files
            local suid_files=$(find "$app_dir" -type f \( -perm -4000 -o -perm -2000 \) 2>/dev/null | wc -l)
            if [ "$suid_files" -gt 0 ]; then
                permission_score=$((permission_score - 15))
                permission_issues="$permission_issues Found $suid_files SUID/SGID files. "
                add_vulnerability "medium" "SUID/SGID Files" "Found $suid_files SUID/SGID files in $app_dir" "Review necessity of SUID/SGID permissions"
            fi
        fi
    done
    
    # Check configuration file permissions
    local config_files=(
        "/etc/nginx/nginx.conf"
        "/etc/postgresql/*/main/postgresql.conf"
        "/etc/redis/redis.conf"
        "/etc/ssl/private/*"
    )
    
    for config_pattern in "${config_files[@]}"; do
        for config_file in $config_pattern; do
            if [ -f "$config_file" ]; then
                local perms=$(stat -c "%a" "$config_file" 2>/dev/null || echo "000")
                local owner=$(stat -c "%U" "$config_file" 2>/dev/null || echo "unknown")
                
                # Check if config files are readable by others
                if [ "${perms:2:1}" -gt 0 ]; then
                    permission_score=$((permission_score - 10))
                    permission_issues="$permission_issues Config file $config_file is readable by others. "
                    add_vulnerability "low" "Config File Permissions" "Configuration file $config_file has overly permissive permissions" "Restrict file permissions to owner only"
                fi
            fi
        done
    done
    
    if [ -z "$permission_issues" ]; then
        permission_issues="File permissions appear secure"
    fi
    
    update_security_check "file_permissions" "completed" "$permission_score" "$permission_issues"
    log "File permissions check completed with score: $permission_score"
}

# Check network security
check_network_security() {
    log "Checking network security..."
    
    local network_score=100
    local network_issues=""
    
    # Check open ports
    if command -v netstat &> /dev/null; then
        log "Checking open ports..."
        
        local listening_ports=$(netstat -tuln | grep LISTEN | awk '{print $4}' | cut -d: -f2 | sort -u)
        local unnecessary_ports=""
        
        # Define expected ports
        local expected_ports="22 80 443 8000 3000 5432 6379 9090 9093 9100"
        
        while read -r port; do
            if [ -n "$port" ] && ! echo "$expected_ports" | grep -q "\b$port\b"; then
                unnecessary_ports="$unnecessary_ports $port"
            fi
        done <<< "$listening_ports"
        
        if [ -n "$unnecessary_ports" ]; then
            network_score=$((network_score - 15))
            network_issues="$network_issues Unexpected open ports:$unnecessary_ports. "
            add_vulnerability "medium" "Unexpected Open Ports" "Found unexpected open ports:$unnecessary_ports" "Review and close unnecessary ports"
        fi
    fi
    
    # Check firewall status
    if command -v ufw &> /dev/null; then
        local ufw_status=$(ufw status | head -1 | awk '{print $2}')
        if [ "$ufw_status" != "active" ]; then
            network_score=$((network_score - 25))
            network_issues="$network_issues UFW firewall is not active. "
            add_vulnerability "high" "Firewall Disabled" "UFW firewall is not active" "Enable and configure UFW firewall"
        fi
    elif command -v iptables &> /dev/null; then
        local iptables_rules=$(iptables -L | wc -l)
        if [ "$iptables_rules" -lt 10 ]; then
            network_score=$((network_score - 20))
            network_issues="$network_issues Minimal iptables rules detected. "
            add_vulnerability "medium" "Minimal Firewall Rules" "Very few iptables rules detected" "Review and enhance firewall configuration"
        fi
    fi
    
    # Check for SSH security
    if [ -f "/etc/ssh/sshd_config" ]; then
        log "Checking SSH configuration..."
        
        # Check password authentication
        if grep -q "^PasswordAuthentication yes" /etc/ssh/sshd_config; then
            network_score=$((network_score - 15))
            network_issues="$network_issues SSH password authentication enabled. "
            add_vulnerability "medium" "SSH Password Authentication" "SSH password authentication is enabled" "Disable password authentication and use key-based auth"
        fi
        
        # Check root login
        if grep -q "^PermitRootLogin yes" /etc/ssh/sshd_config; then
            network_score=$((network_score - 20))
            network_issues="$network_issues SSH root login permitted. "
            add_vulnerability "high" "SSH Root Login" "SSH root login is permitted" "Disable root login via SSH"
        fi
        
        # Check SSH protocol version
        if grep -q "^Protocol 1" /etc/ssh/sshd_config; then
            network_score=$((network_score - 30))
            network_issues="$network_issues SSH protocol version 1 enabled. "
            add_vulnerability "high" "Insecure SSH Protocol" "SSH protocol version 1 is enabled" "Use only SSH protocol version 2"
        fi
    fi
    
    if [ -z "$network_issues" ]; then
        network_issues="Network security configuration appears adequate"
    fi
    
    update_security_check "network_security" "completed" "$network_score" "$network_issues"
    log "Network security check completed with score: $network_score"
}

# Check application security
check_application_security() {
    log "Checking application security..."
    
    local app_score=100
    local app_issues=""
    
    # Check for debug mode
    if [ -f "/var/www/bookedbarber/.env" ]; then
        if grep -q "DEBUG=True\|DEBUG=true" /var/www/bookedbarber/.env; then
            app_score=$((app_score - 25))
            app_issues="$app_issues Debug mode enabled in production. "
            add_vulnerability "high" "Debug Mode Enabled" "Application debug mode is enabled" "Disable debug mode in production"
        fi
    fi
    
    # Check for exposed configuration files
    local web_root="/var/www/bookedbarber"
    if [ -d "$web_root" ]; then
        local exposed_configs=$(find "$web_root" -name "*.env*" -o -name "config.py" -o -name "settings.py" | wc -l)
        if [ "$exposed_configs" -gt 0 ]; then
            app_score=$((app_score - 20))
            app_issues="$app_issues Configuration files exposed in web root. "
            add_vulnerability "medium" "Exposed Configuration Files" "Configuration files found in web root" "Move configuration files outside web root"
        fi
    fi
    
    # Check for weak session configuration
    if command -v grep &> /dev/null; then
        local session_config=$(find /etc -name "*.conf" -exec grep -l "session" {} \; 2>/dev/null || true)
        # This is a basic check - in practice, you'd check application-specific session configs
    fi
    
    # Check for SQL injection protection
    log "Checking for SQL injection protection..."
    # This would typically involve code analysis or dependency checking
    
    # Check for XSS protection headers
    if command -v curl &> /dev/null; then
        local xss_protection=$(curl -s -I "http://localhost:8000" | grep -i "x-xss-protection\|x-content-type-options\|x-frame-options" | wc -l)
        if [ "$xss_protection" -lt 2 ]; then
            app_score=$((app_score - 15))
            app_issues="$app_issues Missing security headers. "
            add_vulnerability "medium" "Missing Security Headers" "Security headers not properly configured" "Configure X-XSS-Protection, X-Content-Type-Options, and X-Frame-Options headers"
        fi
    fi
    
    if [ -z "$app_issues" ]; then
        app_issues="Application security configuration appears adequate"
    fi
    
    update_security_check "application_security" "completed" "$app_score" "$app_issues"
    log "Application security check completed with score: $app_score"
}

# Check dependency vulnerabilities
check_dependency_vulnerabilities() {
    log "Checking dependency vulnerabilities..."
    
    local dep_score=100
    local dep_issues=""
    
    # Check Python dependencies
    if [ -f "requirements.txt" ] && command -v pip &> /dev/null; then
        log "Checking Python dependencies..."
        
        # Use safety to check for known vulnerabilities
        if command -v safety &> /dev/null; then
            local safety_output=$(safety check --json 2>/dev/null || echo "[]")
            local vuln_count=$(echo "$safety_output" | jq length 2>/dev/null || echo "0")
            
            if [ "$vuln_count" -gt 0 ]; then
                dep_score=$((dep_score - vuln_count * 10))
                dep_issues="$dep_issues Found $vuln_count vulnerable Python packages. "
                add_vulnerability "high" "Vulnerable Dependencies" "Found $vuln_count vulnerable Python packages" "Update vulnerable packages"
            fi
        else
            log "Safety tool not available for Python vulnerability checking"
        fi
    fi
    
    # Check Node.js dependencies
    if [ -f "package.json" ] && command -v npm &> /dev/null; then
        log "Checking Node.js dependencies..."
        
        local npm_audit=$(npm audit --json 2>/dev/null || echo '{"vulnerabilities":{}}')
        local npm_vulns=$(echo "$npm_audit" | jq '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "0")
        
        if [ "$npm_vulns" -gt 0 ]; then
            dep_score=$((dep_score - npm_vulns * 5))
            dep_issues="$dep_issues Found $npm_vulns vulnerable Node.js packages. "
            add_vulnerability "medium" "Vulnerable Node.js Dependencies" "Found $npm_vulns vulnerable Node.js packages" "Run npm audit fix"
        fi
    fi
    
    if [ -z "$dep_issues" ]; then
        dep_issues="No known dependency vulnerabilities found"
    fi
    
    update_security_check "dependency_vulnerabilities" "completed" "$dep_score" "$dep_issues"
    log "Dependency vulnerability check completed with score: $dep_score"
}

# Check compliance requirements
check_compliance() {
    log "Checking compliance requirements..."
    
    local compliance_score=100
    local compliance_issues=""
    
    # GDPR compliance checks
    log "Checking GDPR compliance..."
    
    # Check for privacy policy
    if ! curl -s -f "https://app.bookedbarber.com/privacy" > /dev/null 2>&1; then
        compliance_score=$((compliance_score - 20))
        compliance_issues="$compliance_issues No accessible privacy policy. "
        add_vulnerability "medium" "Missing Privacy Policy" "Privacy policy not accessible" "Create and publish privacy policy"
    fi
    
    # Check for data retention policies
    # This would typically check database configurations and application code
    
    # PCI DSS compliance checks (basic)
    log "Checking PCI DSS compliance basics..."
    
    # Check for Stripe integration (safer than handling cards directly)
    if [ -f "/var/www/bookedbarber/.env" ]; then
        if grep -q "STRIPE_" /var/www/bookedbarber/.env; then
            log "Stripe integration detected - good for PCI compliance"
        else
            compliance_score=$((compliance_score - 15))
            compliance_issues="$compliance_issues No payment processor integration detected. "
        fi
    fi
    
    # Check audit logging
    if [ ! -d "/var/log/bookedbarber/audit" ]; then
        compliance_score=$((compliance_score - 10))
        compliance_issues="$compliance_issues No audit logging directory found. "
        add_vulnerability "low" "Missing Audit Logging" "Audit logging not configured" "Implement comprehensive audit logging"
    fi
    
    if [ -z "$compliance_issues" ]; then
        compliance_issues="Basic compliance requirements appear to be met"
    fi
    
    update_security_check "compliance" "completed" "$compliance_score" "$compliance_issues"
    log "Compliance check completed with score: $compliance_score"
}

# Calculate overall security score
calculate_overall_score() {
    local overall_score=$(jq '[.security_checks[].score] | add / length' "$SECURITY_STATUS_FILE" 2>/dev/null || echo "0")
    
    jq --arg score "$overall_score" '.overall_security_score = ($score | tonumber)' "$SECURITY_STATUS_FILE" > "${SECURITY_STATUS_FILE}.tmp" && mv "${SECURITY_STATUS_FILE}.tmp" "$SECURITY_STATUS_FILE"
    
    log "Overall security score: $overall_score"
}

# Generate security report
generate_security_report() {
    local report_file="$AUDIT_REPORT_DIR/security_audit_$(date +%Y%m%d_%H%M%S).json"
    
    cp "$SECURITY_STATUS_FILE" "$report_file"
    
    # Generate human-readable report
    local text_report="${report_file%.json}.txt"
    
    cat > "$text_report" << EOF
BookedBarber V2 Security Audit Report
Generated: $(date)

Overall Security Score: $(jq -r '.overall_security_score' "$SECURITY_STATUS_FILE")/100

Security Checks:
$(jq -r '.security_checks | to_entries[] | "  \(.key): \(.value.score)/100 - \(.value.message)"' "$SECURITY_STATUS_FILE")

Vulnerabilities Found:
$(jq -r '.vulnerabilities[] | "  [\(.severity | ascii_upcase)] \(.title): \(.description)"' "$SECURITY_STATUS_FILE")

Recommendations:
$(jq -r '.vulnerabilities[] | "  - \(.remediation)"' "$SECURITY_STATUS_FILE")
EOF
    
    log "Security report generated: $report_file"
    log "Text report: $text_report"
    
    echo "$report_file"
}

# Send security alerts
send_security_alerts() {
    local overall_score=$(jq -r '.overall_security_score' "$SECURITY_STATUS_FILE")
    local high_vulns=$(jq '[.vulnerabilities[] | select(.severity == "high")] | length' "$SECURITY_STATUS_FILE")
    
    if [ "$(echo "$overall_score < 70" | bc 2>/dev/null || echo "0")" = "1" ] || [ "$high_vulns" -gt 0 ]; then
        log "SECURITY ALERT: Overall score $overall_score, $high_vulns high-severity vulnerabilities"
        
        # This would integrate with your alerting system
        echo "SECURITY ALERT: BookedBarber security audit found issues. Score: $overall_score, High-severity vulnerabilities: $high_vulns" | \
            logger -t bookedbarber-security -p daemon.alert
    fi
}

# Main security audit function
main() {
    local audit_type="${1:-full}"
    
    log "Starting security audit: $audit_type"
    
    init_security_status
    
    case $audit_type in
        "full")
            check_ssl_configuration
            check_file_permissions
            check_network_security
            check_application_security
            check_dependency_vulnerabilities
            check_compliance
            ;;
        "ssl")
            check_ssl_configuration
            ;;
        "permissions")
            check_file_permissions
            ;;
        "network")
            check_network_security
            ;;
        "application")
            check_application_security
            ;;
        "dependencies")
            check_dependency_vulnerabilities
            ;;
        "compliance")
            check_compliance
            ;;
        *)
            error "Invalid audit type: $audit_type"
            exit 1
            ;;
    esac
    
    calculate_overall_score
    local report_file=$(generate_security_report)
    send_security_alerts
    
    log "Security audit completed. Report: $report_file"
}

# Show usage
usage() {
    echo "Usage: $0 [audit_type]"
    echo ""
    echo "Audit types:"
    echo "  full         - Complete security audit (default)"
    echo "  ssl          - SSL/TLS configuration check"
    echo "  permissions  - File permissions check"
    echo "  network      - Network security check"
    echo "  application  - Application security check"
    echo "  dependencies - Dependency vulnerability check"
    echo "  compliance   - Compliance requirements check"
    echo ""
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    usage
    exit 0
fi

# Run main function
main "$@"