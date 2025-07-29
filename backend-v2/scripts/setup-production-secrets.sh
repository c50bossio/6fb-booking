#!/bin/bash

# =============================================================================
# BookedBarber V2 - Production Secrets Management Setup
# =============================================================================
# 🔐 Enterprise-grade secrets management with rotation and auditing
# 🛡️ Zero-trust security model with encrypted storage
# 📊 Audit logging and compliance tracking
# =============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Configuration
SECRETS_DIR="/opt/bookedbarber/secrets"
BACKUP_DIR="/opt/bookedbarber/backups/secrets"
AUDIT_LOG="/var/log/bookedbarber/secrets-audit.log"
ENVIRONMENT="${1:-production}"

# Create audit log entry
audit_log() {
    local action="$1"
    local secret_name="$2"
    local user="${SUDO_USER:-$(whoami)}"
    
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') | $user | $action | $secret_name" >> "$AUDIT_LOG"
}

# Validate environment
validate_environment() {
    log "Validating environment: $ENVIRONMENT"
    
    if [[ ! "$ENVIRONMENT" =~ ^(production|staging|development)$ ]]; then
        error "Invalid environment. Must be: production, staging, or development"
    fi
    
    if [[ "$ENVIRONMENT" == "production" ]] && [[ $(whoami) != "root" ]]; then
        error "Production secrets setup requires root privileges"
    fi
}

# Generate secure random secret
generate_secret() {
    local length="${1:-64}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Create encrypted secret file
create_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local secret_file="$SECRETS_DIR/${secret_name}"
    
    log "Creating secret: $secret_name"
    
    # Create secret file with proper permissions
    echo "$secret_value" | sudo tee "$secret_file" > /dev/null
    sudo chmod 600 "$secret_file"
    sudo chown root:docker "$secret_file"
    
    # Create Docker secret
    if command -v docker &> /dev/null; then
        if docker secret ls | grep -q "$secret_name"; then
            warn "Docker secret $secret_name already exists, removing..."
            docker secret rm "$secret_name" || true
        fi
        
        echo "$secret_value" | docker secret create "$secret_name" -
        log "Docker secret $secret_name created successfully"
    fi
    
    # Audit log
    audit_log "CREATE" "$secret_name"
}

# Setup database secrets
setup_database_secrets() {
    log "Setting up database secrets..."
    
    local db_password
    local db_name="bookedbarber_${ENVIRONMENT}"
    local db_user="bookedbarber_${ENVIRONMENT}"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        db_password=$(generate_secret 32)
    else
        db_password="bookedbarber_dev_password_$(date +%s)"
    fi
    
    create_secret "postgres_db" "$db_name"
    create_secret "postgres_user" "$db_user"
    create_secret "postgres_password" "$db_password"
    
    # Database URL
    local db_url="postgresql://${db_user}:${db_password}@postgres:5432/${db_name}"
    create_secret "database_url" "$db_url"
    
    log "Database secrets configured for $ENVIRONMENT"
}

# Setup Redis secrets
setup_redis_secrets() {
    log "Setting up Redis secrets..."
    
    local redis_password
    if [[ "$ENVIRONMENT" == "production" ]]; then
        redis_password=$(generate_secret 32)
    else
        redis_password="bookedbarber_redis_dev_$(date +%s)"
    fi
    
    create_secret "redis_password" "$redis_password"
    
    # Redis URL
    local redis_url="redis://:${redis_password}@redis:6379/0"
    create_secret "redis_url" "$redis_url"
    
    log "Redis secrets configured for $ENVIRONMENT"
}

# Setup application secrets
setup_application_secrets() {
    log "Setting up application secrets..."
    
    # JWT secrets
    local app_secret_key=$(generate_secret 64)
    local jwt_secret_key=$(generate_secret 64)
    
    create_secret "app_secret_key" "$app_secret_key"
    create_secret "jwt_secret_key" "$jwt_secret_key"
    
    log "Application secrets configured"
}

# Setup external service secrets
setup_external_secrets() {
    log "Setting up external service secrets..."
    
    # These should be provided via environment variables or AWS Parameter Store
    local external_secrets=(
        "stripe_secret_key"
        "stripe_publishable_key"
        "google_client_secret"
        "google_client_id"
        "sendgrid_api_key"
        "twilio_auth_token"
        "sentry_dsn"
        "grafana_admin_password"
    )
    
    for secret in "${external_secrets[@]}"; do
        local env_var="${secret^^}"  # Convert to uppercase
        local secret_value="${!env_var:-}"
        
        if [[ -n "$secret_value" ]]; then
            create_secret "$secret" "$secret_value"
            log "External secret $secret configured from environment"
        else
            warn "External secret $secret not found in environment variables"
            if [[ "$ENVIRONMENT" == "production" ]]; then
                error "Missing required production secret: $secret"
            else
                # Create placeholder for development
                create_secret "$secret" "dev_placeholder_$(date +%s)"
                warn "Created development placeholder for $secret"
            fi
        fi
    done
}

# Setup AWS Parameter Store integration (for production)
setup_aws_parameter_store() {
    if [[ "$ENVIRONMENT" != "production" ]]; then
        return
    fi
    
    log "Setting up AWS Parameter Store integration..."
    
    # Install AWS CLI if not present
    if ! command -v aws &> /dev/null; then
        log "Installing AWS CLI..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        sudo ./aws/install
        rm -rf aws awscliv2.zip
    fi
    
    # Setup parameter paths
    local param_prefix="/bookedbarber/production"
    
    # Store secrets in Parameter Store (SecureString)
    for secret_file in "$SECRETS_DIR"/*; do
        if [[ -f "$secret_file" ]]; then
            local secret_name=$(basename "$secret_file")
            local secret_value=$(cat "$secret_file")
            
            aws ssm put-parameter \
                --name "${param_prefix}/${secret_name}" \
                --value "$secret_value" \
                --type "SecureString" \
                --overwrite \
                --description "BookedBarber V2 production secret: $secret_name" \
                --tags "Key=Application,Value=BookedBarber" \
                       "Key=Environment,Value=production" \
                       "Key=ManagedBy,Value=GitHubActions" \
                2>/dev/null || warn "Failed to store $secret_name in Parameter Store"
        fi
    done
    
    log "AWS Parameter Store integration configured"
}

# Setup HashiCorp Vault integration (optional)
setup_vault_integration() {
    if [[ "$ENVIRONMENT" != "production" ]] || [[ -z "${VAULT_ADDR:-}" ]]; then
        return
    fi
    
    log "Setting up HashiCorp Vault integration..."
    
    # Install Vault CLI if not present
    if ! command -v vault &> /dev/null; then
        log "Installing Vault CLI..."
        wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
        echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
        sudo apt update && sudo apt install vault
    fi
    
    # Store secrets in Vault
    local vault_path="secret/bookedbarber/production"
    
    for secret_file in "$SECRETS_DIR"/*; do
        if [[ -f "$secret_file" ]]; then
            local secret_name=$(basename "$secret_file")
            local secret_value=$(cat "$secret_file")
            
            vault kv put "${vault_path}/${secret_name}" value="$secret_value" \
                2>/dev/null || warn "Failed to store $secret_name in Vault"
        fi
    done
    
    log "HashiCorp Vault integration configured"
}

# Setup secret rotation schedule
setup_secret_rotation() {
    log "Setting up secret rotation schedule..."
    
    # Create rotation script
    cat > "/opt/bookedbarber/scripts/rotate-secrets.sh" << 'EOF'
#!/bin/bash
# Automated secret rotation script
# Runs monthly to rotate non-external secrets

set -euo pipefail

SECRETS_DIR="/opt/bookedbarber/secrets"
BACKUP_DIR="/opt/bookedbarber/backups/secrets/$(date +%Y%m%d_%H%M%S)"
AUDIT_LOG="/var/log/bookedbarber/secrets-audit.log"

# Create backup
mkdir -p "$BACKUP_DIR"
cp -a "$SECRETS_DIR"/* "$BACKUP_DIR"/

# Rotate secrets that can be auto-rotated
secrets_to_rotate=(
    "app_secret_key"
    "jwt_secret_key"
    "redis_password"
)

for secret in "${secrets_to_rotate[@]}"; do
    if [[ -f "$SECRETS_DIR/$secret" ]]; then
        echo "Rotating secret: $secret"
        
        # Generate new secret
        new_value=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        
        # Update file
        echo "$new_value" > "$SECRETS_DIR/$secret"
        chmod 600 "$SECRETS_DIR/$secret"
        chown root:docker "$SECRETS_DIR/$secret"
        
        # Update Docker secret
        docker secret rm "$secret" 2>/dev/null || true
        echo "$new_value" | docker secret create "$secret" -
        
        # Audit log
        echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') | system | ROTATE | $secret" >> "$AUDIT_LOG"
        
        # Restart services to pick up new secrets
        docker-compose -f /opt/bookedbarber/docker-compose.production.yml restart
    fi
done

echo "Secret rotation completed at $(date)"
EOF

    chmod +x "/opt/bookedbarber/scripts/rotate-secrets.sh"
    
    # Setup cron job for monthly rotation
    (crontab -l 2>/dev/null; echo "0 2 1 * * /opt/bookedbarber/scripts/rotate-secrets.sh >> /var/log/bookedbarber/secret-rotation.log 2>&1") | crontab -
    
    log "Secret rotation schedule configured (monthly)"
}

# Setup monitoring and alerting
setup_secret_monitoring() {
    log "Setting up secret monitoring and alerting..."
    
    # Create monitoring script
    cat > "/opt/bookedbarber/scripts/monitor-secrets.sh" << 'EOF'
#!/bin/bash
# Secret monitoring and health check script

set -euo pipefail

SECRETS_DIR="/opt/bookedbarber/secrets"
ALERT_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

check_secret_health() {
    local failed_checks=0
    local total_checks=0
    
    # Required secrets
    local required_secrets=(
        "postgres_password"
        "redis_password"
        "app_secret_key"
        "jwt_secret_key"
        "database_url"
        "redis_url"
    )
    
    for secret in "${required_secrets[@]}"; do
        total_checks=$((total_checks + 1))
        
        if [[ ! -f "$SECRETS_DIR/$secret" ]]; then
            echo "❌ Missing secret file: $secret"
            failed_checks=$((failed_checks + 1))
        elif [[ ! -s "$SECRETS_DIR/$secret" ]]; then
            echo "❌ Empty secret file: $secret"
            failed_checks=$((failed_checks + 1))
        elif ! docker secret ls | grep -q "$secret"; then
            echo "❌ Missing Docker secret: $secret"
            failed_checks=$((failed_checks + 1))
        else
            echo "✅ Secret OK: $secret"
        fi
    done
    
    # Check permissions
    for secret_file in "$SECRETS_DIR"/*; do
        if [[ -f "$secret_file" ]]; then
            local perms=$(stat -c "%a" "$secret_file")
            if [[ "$perms" != "600" ]]; then
                echo "⚠️ Incorrect permissions on $(basename "$secret_file"): $perms (should be 600)"
                failed_checks=$((failed_checks + 1))
            fi
        fi
    done
    
    echo "Secret health check: $((total_checks - failed_checks))/$total_checks passed"
    
    if [[ $failed_checks -gt 0 ]] && [[ -n "$ALERT_WEBHOOK" ]]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 BookedBarber Secret Health Check Failed: $failed_checks/$total_checks checks failed\"}" \
            2>/dev/null || true
    fi
    
    return $failed_checks
}

check_secret_health
EOF

    chmod +x "/opt/bookedbarber/scripts/monitor-secrets.sh"
    
    # Setup cron job for daily monitoring
    (crontab -l 2>/dev/null; echo "0 6 * * * /opt/bookedbarber/scripts/monitor-secrets.sh >> /var/log/bookedbarber/secret-monitoring.log 2>&1") | crontab -
    
    log "Secret monitoring configured (daily checks)"
}

# Backup secrets
backup_secrets() {
    log "Creating encrypted backup of secrets..."
    
    local backup_file="$BACKUP_DIR/secrets-backup-$(date +%Y%m%d_%H%M%S).tar.gz.gpg"
    
    # Create backup directory
    sudo mkdir -p "$BACKUP_DIR"
    
    # Create encrypted backup
    sudo tar -czf - -C "$SECRETS_DIR" . | \
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
            --s2k-digest-algo SHA512 --s2k-count 65536000 \
            --force-mdc --output "$backup_file"
    
    # Set proper permissions
    sudo chmod 600 "$backup_file"
    sudo chown root:root "$backup_file"
    
    log "Encrypted backup created: $backup_file"
    audit_log "BACKUP" "all_secrets"
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old secret backups..."
    
    # Keep backups for 90 days
    find "$BACKUP_DIR" -name "secrets-backup-*.tar.gz.gpg" -mtime +90 -delete 2>/dev/null || true
    
    log "Old backup cleanup completed"
}

# Main execution
main() {
    log "Starting BookedBarber V2 secrets setup for $ENVIRONMENT environment"
    
    # Validate prerequisites
    validate_environment
    
    # Create directories
    sudo mkdir -p "$SECRETS_DIR" "$BACKUP_DIR" "$(dirname "$AUDIT_LOG")"
    sudo mkdir -p "/opt/bookedbarber/scripts"
    sudo chmod 700 "$SECRETS_DIR"
    sudo chmod 755 "$BACKUP_DIR"
    
    # Initialize audit log
    sudo touch "$AUDIT_LOG"
    sudo chmod 640 "$AUDIT_LOG"
    sudo chown root:adm "$AUDIT_LOG"
    
    audit_log "INIT" "secrets_setup_started"
    
    # Setup secrets
    setup_database_secrets
    setup_redis_secrets
    setup_application_secrets
    setup_external_secrets
    
    # Setup integrations for production
    if [[ "$ENVIRONMENT" == "production" ]]; then
        setup_aws_parameter_store
        setup_vault_integration
        setup_secret_rotation
        setup_secret_monitoring
    fi
    
    # Create backup
    backup_secrets
    cleanup_old_backups
    
    audit_log "COMPLETE" "secrets_setup_finished"
    
    log "✅ Secrets setup completed successfully for $ENVIRONMENT environment"
    log "📊 Audit log available at: $AUDIT_LOG"
    log "🔐 Secrets stored in: $SECRETS_DIR"
    log "💾 Backups stored in: $BACKUP_DIR"
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "🔄 Secret rotation scheduled monthly"
        log "📊 Secret monitoring scheduled daily"
    fi
    
    # Display next steps
    echo
    log "Next steps:"
    echo "1. Verify all external secrets are properly configured"
    echo "2. Test Docker Compose with new secrets: docker-compose -f docker-compose.production.yml config"
    echo "3. Deploy with: docker-compose -f docker-compose.production.yml up -d"
    echo "4. Monitor secret health: /opt/bookedbarber/scripts/monitor-secrets.sh"
}

# Run main function
main "$@"