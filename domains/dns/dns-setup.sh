#!/bin/bash

# BookedBarber V2 DNS Setup Script
# Automatically configures DNS records for all subdomains and services

set -e

# Configuration
DOMAIN="bookedbarber.com"
SERVER_IP="192.0.2.1"  # UPDATE WITH YOUR ACTUAL SERVER IP
DNS_PROVIDER="cloudflare"  # cloudflare, route53, or manual

# CloudFlare configuration (if using CloudFlare)
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
CLOUDFLARE_ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"

# Route53 configuration (if using AWS Route53)
AWS_HOSTED_ZONE_ID="${AWS_HOSTED_ZONE_ID:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
LOG_FILE="/var/log/dns-setup.log"
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

echo -e "${GREEN}BookedBarber V2 DNS Setup${NC}"
echo "=================================="
echo "Domain: $DOMAIN"
echo "Server IP: $SERVER_IP"
echo "DNS Provider: $DNS_PROVIDER"
echo ""

# Function to validate IP address
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        IFS='.' read -ra ADDR <<< "$ip"
        for i in "${ADDR[@]}"; do
            if [[ $i -gt 255 ]]; then
                return 1
            fi
        done
        return 0
    else
        return 1
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to create CloudFlare DNS record
create_cloudflare_record() {
    local type=$1
    local name=$2
    local content=$3
    local proxied=${4:-true}
    
    local record_name
    if [ "$name" = "@" ]; then
        record_name="$DOMAIN"
    else
        record_name="$name.$DOMAIN"
    fi
    
    log "Creating CloudFlare $type record: $record_name -> $content"
    
    curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json" \
        --data '{
            "type": "'$type'",
            "name": "'$record_name'",
            "content": "'$content'",
            "proxied": '$proxied',
            "ttl": 1
        }' | jq -r '.success'
}

# Function to create Route53 DNS record
create_route53_record() {
    local type=$1
    local name=$2
    local content=$3
    local ttl=${4:-300}
    
    local record_name
    if [ "$name" = "@" ]; then
        record_name="$DOMAIN"
    else
        record_name="$name.$DOMAIN"
    fi
    
    log "Creating Route53 $type record: $record_name -> $content"
    
    aws route53 change-resource-record-sets \
        --hosted-zone-id "$AWS_HOSTED_ZONE_ID" \
        --change-batch '{
            "Changes": [{
                "Action": "UPSERT",
                "ResourceRecordSet": {
                    "Name": "'$record_name'",
                    "Type": "'$type'",
                    "TTL": '$ttl',
                    "ResourceRecords": [{"Value": "'$content'"}]
                }
            }]
        }' --region "$AWS_REGION"
}

# Function to setup CloudFlare DNS
setup_cloudflare_dns() {
    echo -e "${BLUE}Setting up CloudFlare DNS records...${NC}"
    
    if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
        echo -e "${RED}Error: CloudFlare API token and Zone ID are required${NC}"
        echo "Please set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID environment variables"
        exit 1
    fi
    
    # Main domain A record
    create_cloudflare_record "A" "@" "$SERVER_IP" true
    
    # WWW CNAME
    create_cloudflare_record "CNAME" "www" "$DOMAIN" true
    
    # API subdomain
    create_cloudflare_record "CNAME" "api" "$DOMAIN" true
    
    # App subdomain
    create_cloudflare_record "CNAME" "app" "$DOMAIN" true
    
    # Admin subdomain
    create_cloudflare_record "CNAME" "admin" "$DOMAIN" true
    
    # Staging subdomain (not proxied for direct access)
    create_cloudflare_record "CNAME" "staging" "$DOMAIN" false
    
    # Status page subdomain
    create_cloudflare_record "CNAME" "status" "stats.uptimerobot.com" false
    
    echo -e "${GREEN}CloudFlare DNS records created successfully${NC}"
}

# Function to setup Route53 DNS
setup_route53_dns() {
    echo -e "${BLUE}Setting up Route53 DNS records...${NC}"
    
    if [ -z "$AWS_HOSTED_ZONE_ID" ]; then
        echo -e "${RED}Error: AWS Hosted Zone ID is required${NC}"
        echo "Please set AWS_HOSTED_ZONE_ID environment variable"
        exit 1
    fi
    
    if ! command_exists aws; then
        echo -e "${RED}Error: AWS CLI is not installed${NC}"
        echo "Please install AWS CLI and configure credentials"
        exit 1
    fi
    
    # Main domain A record
    create_route53_record "A" "@" "$SERVER_IP" 300
    
    # WWW CNAME
    create_route53_record "CNAME" "www" "$DOMAIN" 3600
    
    # API subdomain
    create_route53_record "CNAME" "api" "$DOMAIN" 300
    
    # App subdomain
    create_route53_record "CNAME" "app" "$DOMAIN" 300
    
    # Admin subdomain
    create_route53_record "CNAME" "admin" "$DOMAIN" 300
    
    # Staging subdomain
    create_route53_record "CNAME" "staging" "$DOMAIN" 300
    
    echo -e "${GREEN}Route53 DNS records created successfully${NC}"
}

# Function to display manual DNS setup instructions
show_manual_instructions() {
    echo -e "${BLUE}Manual DNS Setup Instructions${NC}"
    echo "=============================="
    echo ""
    echo "Please create the following DNS records in your DNS provider:"
    echo ""
    echo -e "${YELLOW}A Records:${NC}"
    echo "  @                   -> $SERVER_IP (TTL: 300)"
    echo ""
    echo -e "${YELLOW}CNAME Records:${NC}"
    echo "  www                 -> $DOMAIN (TTL: 3600)"
    echo "  api                 -> $DOMAIN (TTL: 300)"
    echo "  app                 -> $DOMAIN (TTL: 300)"
    echo "  admin               -> $DOMAIN (TTL: 300)"
    echo "  staging             -> $DOMAIN (TTL: 300)"
    echo "  status              -> stats.uptimerobot.com (TTL: 3600)"
    echo ""
    echo -e "${YELLOW}Optional Security Records:${NC}"
    echo "  CAA    @            -> 0 issue \"letsencrypt.org\" (TTL: 86400)"
    echo "  CAA    @            -> 0 issuewild \"letsencrypt.org\" (TTL: 86400)"
    echo ""
    echo -e "${YELLOW}Email Records (if using email):${NC}"
    echo "  MX     @            -> 10 mx1.forwardemail.net (TTL: 3600)"
    echo "  MX     @            -> 20 mx2.forwardemail.net (TTL: 3600)"
    echo "  TXT    @            -> v=spf1 include:_spf.google.com ~all (TTL: 3600)"
    echo "  TXT    _dmarc       -> v=DMARC1; p=quarantine; rua=mailto:admin@$DOMAIN (TTL: 3600)"
    echo ""
}

# Function to test DNS resolution
test_dns_resolution() {
    echo -e "${BLUE}Testing DNS resolution...${NC}"
    
    local subdomains=("@" "www" "api" "app" "admin" "staging")
    
    for subdomain in "${subdomains[@]}"; do
        local test_domain
        if [ "$subdomain" = "@" ]; then
            test_domain="$DOMAIN"
        else
            test_domain="$subdomain.$DOMAIN"
        fi
        
        echo -n "Testing $test_domain... "
        
        if nslookup "$test_domain" >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
        fi
    done
}

# Function to validate prerequisites
validate_prerequisites() {
    echo -e "${BLUE}Validating prerequisites...${NC}"
    
    # Validate server IP
    if ! validate_ip "$SERVER_IP"; then
        echo -e "${RED}Error: Invalid server IP address: $SERVER_IP${NC}"
        echo "Please update the SERVER_IP variable with your actual server IP"
        exit 1
    fi
    
    # Check if required tools are available
    case $DNS_PROVIDER in
        "cloudflare")
            if ! command_exists curl; then
                echo -e "${RED}Error: curl is required for CloudFlare API${NC}"
                exit 1
            fi
            if ! command_exists jq; then
                echo -e "${YELLOW}Warning: jq is recommended for better output formatting${NC}"
            fi
            ;;
        "route53")
            if ! command_exists aws; then
                echo -e "${RED}Error: AWS CLI is required for Route53${NC}"
                exit 1
            fi
            ;;
    esac
    
    echo -e "${GREEN}Prerequisites validated${NC}"
}

# Function to create DNS backup
create_dns_backup() {
    echo -e "${BLUE}Creating DNS configuration backup...${NC}"
    
    local backup_file="dns-backup-$(date +%Y%m%d-%H%M%S).json"
    local backup_path="/var/backups/$backup_file"
    
    # Create backup directory if it doesn't exist
    sudo mkdir -p /var/backups
    
    cat > "$backup_path" << EOF
{
    "domain": "$DOMAIN",
    "server_ip": "$SERVER_IP",
    "dns_provider": "$DNS_PROVIDER",
    "timestamp": "$(date -Iseconds)",
    "records": {
        "main": "$DOMAIN -> $SERVER_IP",
        "www": "www.$DOMAIN -> $DOMAIN",
        "api": "api.$DOMAIN -> $DOMAIN",
        "app": "app.$DOMAIN -> $DOMAIN",
        "admin": "admin.$DOMAIN -> $DOMAIN",
        "staging": "staging.$DOMAIN -> $DOMAIN"
    }
}
EOF
    
    echo -e "${GREEN}Backup created: $backup_path${NC}"
}

# Function to monitor DNS propagation
monitor_dns_propagation() {
    echo -e "${BLUE}Monitoring DNS propagation...${NC}"
    echo "This may take a few minutes to complete globally"
    
    local test_domain="$DOMAIN"
    local expected_ip="$SERVER_IP"
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo -n "Attempt $attempt/$max_attempts: "
        
        local resolved_ip=$(dig +short "$test_domain" @8.8.8.8 | tail -n1)
        
        if [ "$resolved_ip" = "$expected_ip" ]; then
            echo -e "${GREEN}DNS propagated successfully!${NC}"
            return 0
        else
            echo -e "${YELLOW}Still propagating... (got: $resolved_ip, expected: $expected_ip)${NC}"
            sleep 10
            ((attempt++))
        fi
    done
    
    echo -e "${RED}DNS propagation taking longer than expected${NC}"
    echo "Please check your DNS configuration manually"
}

# Main execution
main() {
    log "Starting DNS setup for BookedBarber V2"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Create backup
    create_dns_backup
    
    # Confirm settings
    echo ""
    echo "Please review the following settings:"
    echo "Domain: $DOMAIN"
    echo "Server IP: $SERVER_IP"
    echo "DNS Provider: $DNS_PROVIDER"
    echo ""
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "DNS setup cancelled."
        exit 0
    fi
    
    # Setup DNS based on provider
    case $DNS_PROVIDER in
        "cloudflare")
            setup_cloudflare_dns
            ;;
        "route53")
            setup_route53_dns
            ;;
        "manual")
            show_manual_instructions
            echo ""
            read -p "Press Enter after you have created the DNS records manually..."
            ;;
        *)
            echo -e "${RED}Error: Unknown DNS provider: $DNS_PROVIDER${NC}"
            echo "Supported providers: cloudflare, route53, manual"
            exit 1
            ;;
    esac
    
    # Wait a moment for DNS propagation to start
    echo ""
    echo -e "${YELLOW}Waiting for DNS propagation to begin...${NC}"
    sleep 5
    
    # Test DNS resolution
    test_dns_resolution
    
    # Monitor propagation for automated setups
    if [ "$DNS_PROVIDER" != "manual" ]; then
        echo ""
        monitor_dns_propagation
    fi
    
    echo ""
    echo -e "${GREEN}DNS setup completed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Wait for full DNS propagation (up to 48 hours)"
    echo "2. Configure SSL certificates with the SSL setup script"
    echo "3. Update your nginx configuration"
    echo "4. Test all subdomains:"
    echo "   - https://$DOMAIN"
    echo "   - https://www.$DOMAIN"
    echo "   - https://api.$DOMAIN"
    echo "   - https://app.$DOMAIN"
    echo "   - https://admin.$DOMAIN"
    
    log "DNS setup completed successfully"
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi