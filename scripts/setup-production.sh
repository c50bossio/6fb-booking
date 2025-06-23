#!/bin/bash

# 6FB Booking Platform - Production Server Setup Script
# This script sets up a fresh server for production deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SETUP_LOG="/var/log/6fb-booking/setup-$(date +%Y%m%d-%H%M%S).log"
APP_USER="6fb-booking"
APP_GROUP="6fb-booking"
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${EMAIL:-admin@example.com}"

# Ensure running as root
if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root!" 
    exit 1
fi

# Ensure log directory exists
mkdir -p "$(dirname "$SETUP_LOG")"

# Logging function
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$SETUP_LOG"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$SETUP_LOG"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$SETUP_LOG"
}

# Update system packages
update_system() {
    log "Updating system packages..." "$BLUE"
    
    # Detect OS
    if [[ -f /etc/debian_version ]]; then
        OS="debian"
        apt-get update >> "$SETUP_LOG" 2>&1
        apt-get upgrade -y >> "$SETUP_LOG" 2>&1
    elif [[ -f /etc/redhat-release ]]; then
        OS="redhat"
        yum update -y >> "$SETUP_LOG" 2>&1
    else
        error "Unsupported operating system"
        exit 1
    fi
    
    log "System packages updated successfully"
}

# Install required packages
install_packages() {
    log "Installing required packages..." "$BLUE"
    
    if [[ "$OS" == "debian" ]]; then
        apt-get install -y \
            curl \
            wget \
            gnupg2 \
            software-properties-common \
            apt-transport-https \
            ca-certificates \
            lsb-release \
            git \
            build-essential \
            python3 \
            python3-pip \
            python3-venv \
            python3-dev \
            postgresql-client \
            libpq-dev \
            nginx \
            certbot \
            python3-certbot-nginx \
            ufw \
            fail2ban \
            supervisor \
            redis-server \
            htop \
            vim \
            unzip \
            >> "$SETUP_LOG" 2>&1
    elif [[ "$OS" == "redhat" ]]; then
        yum install -y \
            curl \
            wget \
            gnupg2 \
            git \
            gcc \
            gcc-c++ \
            make \
            python3 \
            python3-pip \
            python3-devel \
            postgresql-devel \
            nginx \
            certbot \
            python3-certbot-nginx \
            firewalld \
            fail2ban \
            supervisor \
            redis \
            htop \
            vim \
            unzip \
            >> "$SETUP_LOG" 2>&1
    fi
    
    log "Required packages installed successfully"
}

# Install Node.js
install_nodejs() {
    log "Installing Node.js..." "$BLUE"
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - >> "$SETUP_LOG" 2>&1
    
    if [[ "$OS" == "debian" ]]; then
        apt-get install -y nodejs >> "$SETUP_LOG" 2>&1
    elif [[ "$OS" == "redhat" ]]; then
        yum install -y nodejs >> "$SETUP_LOG" 2>&1
    fi
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    log "Node.js $NODE_VERSION and npm $NPM_VERSION installed successfully"
}

# Create application user
create_app_user() {
    log "Creating application user..." "$BLUE"
    
    # Create group if not exists
    if ! getent group "$APP_GROUP" >/dev/null; then
        groupadd "$APP_GROUP" >> "$SETUP_LOG" 2>&1
    fi
    
    # Create user if not exists
    if ! id "$APP_USER" >/dev/null 2>&1; then
        useradd -r -g "$APP_GROUP" -d "/home/$APP_USER" -s /bin/bash "$APP_USER" >> "$SETUP_LOG" 2>&1
        mkdir -p "/home/$APP_USER" >> "$SETUP_LOG" 2>&1
        chown "$APP_USER:$APP_GROUP" "/home/$APP_USER" >> "$SETUP_LOG" 2>&1
    fi
    
    # Add user to necessary groups
    usermod -a -G www-data "$APP_USER" >> "$SETUP_LOG" 2>&1
    
    log "Application user created successfully"
}

# Setup directory structure
setup_directories() {
    log "Setting up directory structure..." "$BLUE"
    
    # Application directories
    mkdir -p "/opt/6fb-booking"
    mkdir -p "/var/log/6fb-booking"
    mkdir -p "/var/lib/6fb-booking"
    mkdir -p "/var/backups/6fb-booking"
    mkdir -p "/etc/6fb-booking"
    
    # Set ownership
    chown -R "$APP_USER:$APP_GROUP" "/opt/6fb-booking"
    chown -R "$APP_USER:$APP_GROUP" "/var/log/6fb-booking"
    chown -R "$APP_USER:$APP_GROUP" "/var/lib/6fb-booking"
    chown -R "$APP_USER:$APP_GROUP" "/var/backups/6fb-booking"
    chown -R root:root "/etc/6fb-booking"
    
    # Set permissions
    chmod 755 "/opt/6fb-booking"
    chmod 755 "/var/log/6fb-booking"
    chmod 755 "/var/lib/6fb-booking"
    chmod 755 "/var/backups/6fb-booking"
    chmod 755 "/etc/6fb-booking"
    
    log "Directory structure created successfully"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..." "$BLUE"
    
    if [[ "$OS" == "debian" ]]; then
        # Configure UFW
        ufw --force reset >> "$SETUP_LOG" 2>&1
        ufw default deny incoming >> "$SETUP_LOG" 2>&1
        ufw default allow outgoing >> "$SETUP_LOG" 2>&1
        
        # Allow SSH
        ufw allow ssh >> "$SETUP_LOG" 2>&1
        
        # Allow HTTP/HTTPS
        ufw allow 'Nginx Full' >> "$SETUP_LOG" 2>&1
        
        # Allow application ports (only from localhost)
        ufw allow from 127.0.0.1 to any port 8000 >> "$SETUP_LOG" 2>&1
        ufw allow from 127.0.0.1 to any port 3000 >> "$SETUP_LOG" 2>&1
        
        # Enable firewall
        ufw --force enable >> "$SETUP_LOG" 2>&1
        
    elif [[ "$OS" == "redhat" ]]; then
        # Configure firewalld
        systemctl enable firewalld >> "$SETUP_LOG" 2>&1
        systemctl start firewalld >> "$SETUP_LOG" 2>&1
        
        # Allow HTTP/HTTPS
        firewall-cmd --permanent --add-service=http >> "$SETUP_LOG" 2>&1
        firewall-cmd --permanent --add-service=https >> "$SETUP_LOG" 2>&1
        firewall-cmd --permanent --add-service=ssh >> "$SETUP_LOG" 2>&1
        
        # Reload firewall
        firewall-cmd --reload >> "$SETUP_LOG" 2>&1
    fi
    
    log "Firewall configured successfully"
}

# Configure fail2ban
configure_fail2ban() {
    log "Configuring fail2ban..." "$BLUE"
    
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
banaction = iptables-multiport
banaction_allports = iptables-allports

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF
    
    systemctl enable fail2ban >> "$SETUP_LOG" 2>&1
    systemctl restart fail2ban >> "$SETUP_LOG" 2>&1
    
    log "Fail2ban configured successfully"
}

# Configure PostgreSQL client
configure_postgresql() {
    log "Configuring PostgreSQL client..." "$BLUE"
    
    # Install PostgreSQL client tools
    if [[ "$OS" == "debian" ]]; then
        wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - >> "$SETUP_LOG" 2>&1
        echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
        apt-get update >> "$SETUP_LOG" 2>&1
        apt-get install -y postgresql-client-14 >> "$SETUP_LOG" 2>&1
    fi
    
    log "PostgreSQL client configured successfully"
}

# Create systemd services
create_systemd_services() {
    log "Creating systemd services..." "$BLUE"
    
    # Backend service
    cat > /etc/systemd/system/6fb-backend.service << EOF
[Unit]
Description=6FB Booking Platform Backend
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=/opt/6fb-booking/backend
Environment=PATH=/opt/6fb-booking/backend/venv/bin
ExecStart=/opt/6fb-booking/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=6fb-backend

[Install]
WantedBy=multi-user.target
EOF

    # Frontend service
    cat > /etc/systemd/system/6fb-frontend.service << EOF
[Unit]
Description=6FB Booking Platform Frontend
After=network.target 6fb-backend.service
Wants=6fb-backend.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=/opt/6fb-booking/frontend
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=6fb-frontend

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    systemctl daemon-reload >> "$SETUP_LOG" 2>&1
    
    log "Systemd services created successfully"
}

# Configure Nginx
configure_nginx() {
    log "Configuring Nginx..." "$BLUE"
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create site configuration
    cat > "/etc/nginx/sites-available/6fb-booking" << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;

# Upstream backends
upstream backend {
    server 127.0.0.1:8000 fail_timeout=5s max_fails=3;
    keepalive 32;
}

upstream frontend {
    server 127.0.0.1:3000 fail_timeout=5s max_fails=3;
    keepalive 32;
}

server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://www.google-analytics.com; frame-src https://js.stripe.com;" always;
    
    # Hide Nginx version
    server_tokens off;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Client body size limit
    client_max_body_size 10M;
    
    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;
    
    # API routes
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Auth endpoints with stricter rate limiting
    location ~ ^/api/v1/(auth|users)/ {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files from Next.js
    location /_next/static/ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend routes
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
    
    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|log|ini|conf|bak|swp|tmp)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF
    
    # Enable site
    ln -sf "/etc/nginx/sites-available/6fb-booking" "/etc/nginx/sites-enabled/6fb-booking"
    
    # Test configuration
    nginx -t >> "$SETUP_LOG" 2>&1
    
    # Enable and start Nginx
    systemctl enable nginx >> "$SETUP_LOG" 2>&1
    systemctl restart nginx >> "$SETUP_LOG" 2>&1
    
    log "Nginx configured successfully"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log "Setting up SSL certificate..." "$BLUE"
    
    if [[ "$DOMAIN" != "localhost" ]]; then
        # Obtain SSL certificate
        certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive >> "$SETUP_LOG" 2>&1
        
        # Setup auto-renewal
        crontab -l 2>/dev/null | grep -v certbot | crontab -
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        
        log "SSL certificate configured successfully"
    else
        warning "Skipping SSL setup for localhost domain"
    fi
}

# Configure log rotation
configure_logrotate() {
    log "Configuring log rotation..." "$BLUE"
    
    cat > /etc/logrotate.d/6fb-booking << EOF
/var/log/6fb-booking/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su $APP_USER $APP_GROUP
}

/var/log/nginx/access.log /var/log/nginx/error.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 \$(cat /var/run/nginx.pid)
        fi
    endscript
}
EOF
    
    log "Log rotation configured successfully"
}

# Create maintenance scripts
create_maintenance_scripts() {
    log "Creating maintenance scripts..." "$BLUE"
    
    # Database backup script
    cat > /usr/local/bin/6fb-backup << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/6fb-booking"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db-backup-$TIMESTAMP.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Source environment variables
if [[ -f /etc/6fb-booking/environment ]]; then
    source /etc/6fb-booking/environment
fi

# Backup database
if [[ -n "${DATABASE_URL:-}" ]]; then
    if [[ "$DATABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
        DB_USER="${BASH_REMATCH[1]}"
        DB_PASS="${BASH_REMATCH[2]}"
        DB_HOST="${BASH_REMATCH[3]}"
        DB_PORT="${BASH_REMATCH[4]}"
        DB_NAME="${BASH_REMATCH[5]}"
        
        PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
        
        if [[ $? -eq 0 ]]; then
            echo "Database backup completed: $BACKUP_FILE"
            
            # Compress backup
            gzip "$BACKUP_FILE"
            
            # Remove backups older than 7 days
            find "$BACKUP_DIR" -name "db-backup-*.sql.gz" -mtime +7 -delete
        else
            echo "Database backup failed!"
            exit 1
        fi
    fi
else
    echo "DATABASE_URL not configured"
    exit 1
fi
EOF
    
    chmod +x /usr/local/bin/6fb-backup
    
    # Setup automated backups
    (crontab -u "$APP_USER" -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/6fb-backup") | crontab -u "$APP_USER" -
    
    log "Maintenance scripts created successfully"
}

# Configure Redis
configure_redis() {
    log "Configuring Redis..." "$BLUE"
    
    # Basic Redis configuration
    sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
    sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
    
    # Enable Redis
    systemctl enable redis-server >> "$SETUP_LOG" 2>&1
    systemctl restart redis-server >> "$SETUP_LOG" 2>&1
    
    log "Redis configured successfully"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up basic monitoring..." "$BLUE"
    
    # Create monitoring script
    cat > /usr/local/bin/6fb-monitor << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/6fb-booking/monitoring.log"

# Check services
services=("6fb-backend" "6fb-frontend" "nginx" "redis-server")
for service in "${services[@]}"; do
    if ! systemctl is-active --quiet "$service"; then
        echo "$(date): WARNING - $service is not running" >> "$LOG_FILE"
        systemctl restart "$service"
    fi
done

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 80 ]]; then
    echo "$(date): WARNING - Disk usage is ${DISK_USAGE}%" >> "$LOG_FILE"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [[ $MEM_USAGE -gt 85 ]]; then
    echo "$(date): WARNING - Memory usage is ${MEM_USAGE}%" >> "$LOG_FILE"
fi
EOF
    
    chmod +x /usr/local/bin/6fb-monitor
    
    # Setup monitoring cron job
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/6fb-monitor") | crontab -
    
    log "Basic monitoring configured successfully"
}

# Final system hardening
system_hardening() {
    log "Applying system hardening..." "$BLUE"
    
    # Disable unused services
    systemctl disable bluetooth >> "$SETUP_LOG" 2>&1 || true
    systemctl disable cups >> "$SETUP_LOG" 2>&1 || true
    
    # Set kernel parameters
    cat >> /etc/sysctl.conf << EOF

# 6FB Booking Platform optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 3
net.ipv4.ip_local_port_range = 1024 65535
vm.swappiness = 10
fs.file-max = 100000
EOF
    
    sysctl -p >> "$SETUP_LOG" 2>&1
    
    # Set limits
    cat >> /etc/security/limits.conf << EOF

# 6FB Booking Platform limits
$APP_USER soft nofile 65535
$APP_USER hard nofile 65535
$APP_USER soft nproc 32768
$APP_USER hard nproc 32768
EOF
    
    log "System hardening applied successfully"
}

# Main setup function
main() {
    log "Starting 6FB Booking Platform server setup..." "$GREEN"
    
    # System setup
    update_system
    install_packages
    install_nodejs
    
    # Application setup
    create_app_user
    setup_directories
    
    # Security setup
    configure_firewall
    configure_fail2ban
    system_hardening
    
    # Service setup
    configure_postgresql
    configure_redis
    create_systemd_services
    configure_nginx
    
    # SSL setup
    setup_ssl
    
    # Maintenance setup
    configure_logrotate
    create_maintenance_scripts
    setup_monitoring
    
    log "Production server setup completed successfully!" "$GREEN"
    log "Setup log: $SETUP_LOG"
    
    # Display next steps
    echo
    log "Next steps:" "$YELLOW"
    log "1. Copy your application code to /opt/6fb-booking"
    log "2. Create environment files in /etc/6fb-booking/"
    log "3. Run the deployment script: /opt/6fb-booking/scripts/deploy.sh"
    log "4. Configure your DNS to point to this server"
    log "5. Test the application with: /opt/6fb-booking/scripts/health-check.sh"
}

# Check arguments
if [[ $# -gt 0 ]]; then
    case $1 in
        --domain=*)
            DOMAIN="${1#*=}"
            ;;
        --email=*)
            EMAIL="${1#*=}"
            ;;
        --help)
            echo "Usage: $0 [--domain=your-domain.com] [--email=your-email@domain.com]"
            exit 0
            ;;
    esac
fi

# Run main function
main "$@"